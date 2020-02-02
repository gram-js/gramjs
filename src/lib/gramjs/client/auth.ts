import { default as Api } from '../tl/api';
import TelegramClient from './TelegramClient';
import utils from '../Utils';
import { computeCheck as computePasswordSrpCheck } from '../Password';

export interface UserAuthParams {
    phoneNumber: string | (() => Promise<string>);
    phoneCode: () => Promise<string>;
    password: () => Promise<string>;
    firstAndLastNames: () => Promise<[string, string?]>;
    onError: (err: Error) => void;
    forceSMS?: boolean;
}

export interface BotAuthParams {
    botAuthToken: string;
}

interface ApiCredentials {
    apiId: number,
    apiHash: string,
}

export async function authFlow(
    client: TelegramClient,
    apiCredentials: ApiCredentials,
    authParams: UserAuthParams | BotAuthParams,
) {
    const me = 'phoneNumber' in authParams
        ? await signInUser(client, apiCredentials, authParams)
        : await signInBot(client, apiCredentials, authParams);

    // TODO @logger
    client._log.info('Signed in successfully as', utils.getDisplayName(me));
}


export async function checkAuthorization(client: TelegramClient) {
    try {
        await client.invoke(new Api.updates.GetState());
        return true;
    } catch (e) {
        return false;
    }
}

async function signInUser(
    client: TelegramClient, apiCredentials: ApiCredentials, authParams: UserAuthParams,
): Promise<Api.TypeUser> {
    let me: Api.TypeUser;

    let phoneNumber;
    let phoneCodeHash;

    while (1) {
        try {
            phoneNumber = typeof authParams.phoneNumber === 'function'
                ? await authParams.phoneNumber()
                : authParams.phoneNumber;
            phoneCodeHash = await sendCode(client, apiCredentials, phoneNumber, authParams.forceSMS);

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
    let isPasswordRequired = false;
    let isRegistrationRequired = false;
    let termsOfService;

    while (1) {
        try {
            try {
                phoneCode = await authParams.phoneCode();
            } catch (err) {
                // This is the support for changing phone number from the phone code screen.
                if (err.message === 'RESTART_AUTH') {
                    return signInUser(client, apiCredentials, authParams);
                }
            }

            if (!phoneCode) {
                throw new Error('Code is empty');
            }

            // May raise PhoneCodeEmptyError, PhoneCodeExpiredError,
            // PhoneCodeHashEmptyError or PhoneCodeInvalidError.
            const result = await client.invoke(new Api.auth.SignIn({
                phoneNumber,
                phoneCodeHash,
                phoneCode,
            }));

            if (result instanceof Api.auth.AuthorizationSignUpRequired) {
                isRegistrationRequired = true;
                termsOfService = result.termsOfService;
            } else {
                me = result.user;
            }

            break;
        } catch (err) {
            if (err.message === 'SESSION_PASSWORD_NEEDED') {
                isPasswordRequired = true;
                break;
            } else {
                authParams.onError(err);
            }
        }
    }

    if (isPasswordRequired) {
        while (1) {
            try {
                const password = await authParams.password();
                if (!password) {
                    throw new Error('Password is empty');
                }

                const passwordSrpResult = await client.invoke(new Api.account.GetPassword());
                const passwordSrpCheck = await computePasswordSrpCheck(passwordSrpResult, password);
                const { user } = await client.invoke(new Api.auth.CheckPassword({
                    password: passwordSrpCheck,
                })) as Api.auth.Authorization;
                me = user;

                break;
            } catch (err) {
                authParams.onError(err);
            }
        }
    }

    if (isRegistrationRequired) {
        while (1) {
            try {
                const [firstName, lastName] = await authParams.firstAndLastNames();
                if (!firstName) {
                    throw new Error('First name is required');
                }

                const { user } = await client.invoke(new Api.auth.SignUp({
                    phoneNumber,
                    phoneCodeHash,
                    firstName,
                    lastName,
                })) as Api.auth.Authorization;

                if (termsOfService) {
                    // This is a violation of Telegram rules: the user should be presented with and accept TOS.
                    await client.invoke(new Api.help.AcceptTermsOfService({ id: termsOfService.id }));
                }

                me = user;
            } catch (err) {
                authParams.onError(err);
            }
        }
    }

    return me!;
}

async function sendCode(
    client: TelegramClient, apiCredentials: ApiCredentials, phoneNumber: string, forceSMS = false,
): Promise<string | undefined> {
    try {
        const { apiId, apiHash } = apiCredentials;
        const sendResult = await client.invoke(new Api.auth.SendCode({
            phoneNumber,
            apiId,
            apiHash,
            settings: new Api.CodeSettings(),
        }));

        // If we already sent a SMS, do not resend the phoneCode (hash may be empty)
        if (!forceSMS || (sendResult.type instanceof Api.auth.SentCodeTypeSms)) {
            return sendResult.phoneCodeHash;
        }

        const resendResult = await client.invoke(new Api.auth.ResendCode({
            phoneNumber,
            phoneCodeHash: sendResult.phoneCodeHash,
        }));

        return resendResult.phoneCodeHash;
    } catch (err) {
        if (err.message === 'AUTH_RESTART') {
            return sendCode(client, apiCredentials, phoneNumber, forceSMS);
        } else {
            throw err;
        }
    }
}

async function signInBot(client: TelegramClient, apiCredentials: ApiCredentials, authParams: BotAuthParams) {
    const { apiId, apiHash } = apiCredentials;
    const { botAuthToken } = authParams;

    const { user } = await client.invoke(new Api.auth.ImportBotAuthorization({
        apiId,
        apiHash,
        botAuthToken,
    })) as Api.auth.Authorization;

    return user;
}
