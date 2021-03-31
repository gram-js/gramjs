import {Api} from '../tl';
import * as utils from '../Utils';
import {sleep} from '../Helpers';
import {computeCheck as computePasswordSrpCheck} from '../Password';
import {TelegramClient} from "../index";
import {AccountMethods} from "./account";
import {DownloadMethods} from "./downloads";
import {DialogMethods} from "./dialogs";
import {ChatMethods} from "./chats";
import {BotMethods} from "./bots";
import {MessageMethods} from "./messages";
import {ButtonMethods} from "./buttons";
import {UpdateMethods} from "./updates";
import {MessageParseMethods} from "./messageParse";
import {UserMethods} from "./users";
import {TelegramBaseClient} from "./telegramBaseClient";

export interface UserAuthParams {
    phoneNumber: string | (() => Promise<string>);
    phoneCode: (isCodeViaApp?: boolean) => Promise<string>;
    password: (hint?: string) => Promise<string>;
    firstAndLastNames?: () => Promise<[string, string?]>;
    qrCode?: (qrCode: { token: Buffer, expires: number }) => Promise<void>;
    onError: (err: Error) => void;
    forceSMS?: boolean;
}

interface ReturnString {
    (): string
}

export interface BotAuthParams {
    botAuthToken: string | ReturnString;
}

interface ApiCredentials {
    apiId: number,
    apiHash: string,
}

const QR_CODE_TIMEOUT = 30000;


export class AuthMethods {


    // region public methods

    async start(authParams: UserAuthParams | BotAuthParams) {
        if (!this.connected) {
            await this.connect();
        }

        if (await this.checkAuthorization()) {
            return;
        }

        const apiCredentials = {
            apiId: this.apiId,
            apiHash: this.apiHash,
        };

        await this.authFlow(apiCredentials, authParams);
    }

    async checkAuthorization() {
        try {
            await this.invoke(new Api.updates.GetState());
            return true;
        } catch (e) {
            return false;
        }
    }

    async signInUser(
        apiCredentials: ApiCredentials, authParams: UserAuthParams,
    ): Promise<Api.TypeUser> {
        let phoneNumber;
        let phoneCodeHash;
        let isCodeViaApp = false;

        while (1) {
            try {
                if (typeof authParams.phoneNumber === 'function') {
                    try {
                        phoneNumber = await authParams.phoneNumber();
                    } catch (err) {
                        if (err.message === 'RESTART_AUTH_WITH_QR') {
                            return this.signInUserWithQrCode(apiCredentials, authParams);
                        }

                        throw err;
                    }
                } else {
                    phoneNumber = authParams.phoneNumber;
                }
                const sendCodeResult = await this.sendCode(apiCredentials, phoneNumber, authParams.forceSMS);
                phoneCodeHash = sendCodeResult.phoneCodeHash;
                isCodeViaApp = sendCodeResult.isCodeViaApp;

                if (typeof phoneCodeHash !== 'string') {
                    throw new Error('Failed to retrieve phone code hash');
                }

                break;
            } catch (err) {
                if (typeof authParams.phoneNumber !== 'function') {
                    throw err;
                }

                authParams.onError(err);
            }
        }

        let phoneCode;
        let isRegistrationRequired = false;
        let termsOfService;

        while (1) {
            try {
                try {
                    phoneCode = await authParams.phoneCode(isCodeViaApp);
                } catch (err) {
                    // This is the support for changing phone number from the phone code screen.
                    if (err.message === 'RESTART_AUTH') {
                        return this.signInUser(apiCredentials, authParams);
                    }
                }

                if (!phoneCode) {
                    throw new Error('Code is empty');
                }

                // May raise PhoneCodeEmptyError, PhoneCodeExpiredError,
                // PhoneCodeHashEmptyError or PhoneCodeInvalidError.
                const result = await this.invoke(new Api.auth.SignIn({
                    phoneNumber,
                    phoneCodeHash,
                    phoneCode,
                }));

                if (result instanceof Api.auth.AuthorizationSignUpRequired) {
                    isRegistrationRequired = true;
                    termsOfService = result.termsOfService;
                    break;
                }

                return result.user;
            } catch (err) {
                if (err.message === 'SESSION_PASSWORD_NEEDED') {
                    return this.signInWithPassword(apiCredentials, authParams);
                } else {
                    authParams.onError(err);
                }
            }
        }

        if (isRegistrationRequired) {
            while (1) {
                try {
                    let lastName;
                    let  firstName = "first name";
                    if (authParams.firstAndLastNames){
                        const result = await authParams.firstAndLastNames();
                        firstName = result[0];
                        lastName = result[1];
                    }
                    if (!firstName) {
                        throw new Error('First name is required');
                    }

                    const {user} = await this.invoke(new Api.auth.SignUp({
                        phoneNumber,
                        phoneCodeHash,
                        firstName,
                        lastName,
                    })) as Api.auth.Authorization;

                    if (termsOfService) {
                        // This is a violation of Telegram rules: the user should be presented with and accept TOS.
                        await this.invoke(new Api.help.AcceptTermsOfService({id: termsOfService.id}));
                    }

                    return user;
                } catch (err) {
                    authParams.onError(err);
                }
            }
        }

        authParams.onError(new Error('Auth failed'));
        return this.signInUser(apiCredentials, authParams);
    }

    async signInUserWithQrCode(
        apiCredentials: ApiCredentials, authParams: UserAuthParams,
    ): Promise<Api.TypeUser> {
        const inputPromise = (async () => {
            while (1) {
                const result = await this.invoke(new Api.auth.ExportLoginToken({
                    apiId: Number(process.env.TELEGRAM_T_API_ID),
                    apiHash: process.env.TELEGRAM_T_API_HASH,
                    exceptIds: [],
                }));

                if (!(result instanceof Api.auth.LoginToken)) {
                    throw new Error('Unexpected');
                }

                const {token, expires} = result;
                if (authParams.qrCode){
                    await Promise.race([
                        authParams.qrCode({token, expires}),
                        sleep(QR_CODE_TIMEOUT),
                    ]);
                }
            }
        })();

        const updatePromise = new Promise((resolve) => {
            this.addEventHandler((update: Api.TypeUpdate) => {
                if (update instanceof Api.UpdateLoginToken) {
                    resolve(undefined);
                }
            });
        });

        try {
            await Promise.race([updatePromise, inputPromise]);
        } catch (err) {
            if (err.message === 'RESTART_AUTH') {
                return this.signInUser(apiCredentials, authParams);
            }

            throw err;
        }

        try {
            const result2 = await this.invoke(new Api.auth.ExportLoginToken({
                apiId: Number(process.env.TELEGRAM_T_API_ID),
                apiHash: process.env.TELEGRAM_T_API_HASH,
                exceptIds: [],
            }));

            if (result2 instanceof Api.auth.LoginTokenSuccess && result2.authorization instanceof Api.auth.Authorization) {
                return result2.authorization.user;
            } else if (result2 instanceof Api.auth.LoginTokenMigrateTo) {
                await this._switchDC(result2.dcId);
                const migratedResult = await this.invoke(new Api.auth.ImportLoginToken({
                    token: result2.token,
                }));

                if (migratedResult instanceof Api.auth.LoginTokenSuccess && migratedResult.authorization instanceof Api.auth.Authorization) {
                    return migratedResult.authorization.user;
                }
            }
        } catch (err) {
            if (err.message === 'SESSION_PASSWORD_NEEDED') {
                return this.signInWithPassword(apiCredentials, authParams);
            }
        }

        authParams.onError(new Error('QR auth failed'));
        return this.signInUser(apiCredentials, authParams);
    }

    async sendCode(apiCredentials: ApiCredentials, phoneNumber: string, forceSMS = false,
    ): Promise<{
        phoneCodeHash: string;
        isCodeViaApp: boolean;
    }> {
        try {
            const {apiId, apiHash} = apiCredentials;
            const sendResult = await this.invoke(new Api.auth.SendCode({
                phoneNumber,
                apiId,
                apiHash,
                settings: new Api.CodeSettings(),
            }));

            // If we already sent a SMS, do not resend the phoneCode (hash may be empty)
            if (!forceSMS || (sendResult.type instanceof Api.auth.SentCodeTypeSms)) {
                return {
                    phoneCodeHash: sendResult.phoneCodeHash,
                    isCodeViaApp: sendResult.type instanceof Api.auth.SentCodeTypeApp,
                };
            }

            const resendResult = await this.invoke(new Api.auth.ResendCode({
                phoneNumber,
                phoneCodeHash: sendResult.phoneCodeHash,
            }));

            return {
                phoneCodeHash: resendResult.phoneCodeHash,
                isCodeViaApp: resendResult.type instanceof Api.auth.SentCodeTypeApp,
            };
        } catch (err) {
            if (err.message === 'AUTH_RESTART') {
                return this.sendCode(apiCredentials, phoneNumber, forceSMS);
            } else {
                throw err;
            }
        }
    }

    async signInWithPassword(apiCredentials: ApiCredentials, authParams: UserAuthParams,
    ): Promise<Api.TypeUser> {
        while (1) {
            try {
                const passwordSrpResult = await this.invoke(new Api.account.GetPassword());
                const password = await authParams.password(passwordSrpResult.hint);
                if (!password) {
                    throw new Error('Password is empty');
                }

                const passwordSrpCheck = await computePasswordSrpCheck(passwordSrpResult, password);
                const {user} = await this.invoke(new Api.auth.CheckPassword({
                    password: passwordSrpCheck,
                })) as Api.auth.Authorization;

                return user;
            } catch (err) {
                authParams.onError(err);
            }
        }

        return undefined!; // Never reached (TypeScript fix)
    }

    async signInBot(apiCredentials: ApiCredentials, authParams: BotAuthParams) {
        const {apiId, apiHash} = apiCredentials;
        let {botAuthToken} = authParams;
        if (!botAuthToken) {
            throw new Error('a valid BotToken is required');
        }
        if (typeof botAuthToken === "function") {
            let token;
            while (true) {
                token = await botAuthToken();
                if (token) {
                    botAuthToken = token;
                    break;
                }
            }
        }

        console.dir(botAuthToken);
        const {user} = await this.invoke(new Api.auth.ImportBotAuthorization({
            apiId,
            apiHash,
            botAuthToken,
        })) as Api.auth.Authorization;
        return user;
    }

    async authFlow(
        apiCredentials: ApiCredentials,
        authParams: UserAuthParams | BotAuthParams,
    ) {
        const me = 'phoneNumber' in authParams
            ? await this.signInUser(apiCredentials, authParams)
            : await this.signInBot(apiCredentials, authParams);

        // TODO @logger
        this._log.info('Signed in successfully as ' + utils.getDisplayName(me));
    }
}

export interface AuthMethods extends UserMethods, UpdateMethods {
}

