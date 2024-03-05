"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._authFlow = exports.signInBot = exports.signInWithPassword = exports.sendCode = exports.signInUserWithQrCode = exports.signInUser = exports.checkAuthorization = exports.start = void 0;
const tl_1 = require("../tl");
const utils = __importStar(require("../Utils"));
const Helpers_1 = require("../Helpers");
const Password_1 = require("../Password");
const QR_CODE_TIMEOUT = 30000;
// region public methods
/** @hidden */
async function start(client, authParams) {
    if (!client.connected) {
        await client.connect();
    }
    if (await client.checkAuthorization()) {
        return;
    }
    const apiCredentials = {
        apiId: client.apiId,
        apiHash: client.apiHash,
    };
    await _authFlow(client, apiCredentials, authParams);
}
exports.start = start;
/** @hidden */
async function checkAuthorization(client) {
    try {
        await client.invoke(new tl_1.Api.updates.GetState());
        return true;
    }
    catch (e) {
        return false;
    }
}
exports.checkAuthorization = checkAuthorization;
/** @hidden */
async function signInUser(client, apiCredentials, authParams) {
    let phoneNumber;
    let phoneCodeHash;
    let isCodeViaApp = false;
    while (1) {
        try {
            if (typeof authParams.phoneNumber === "function") {
                try {
                    phoneNumber = await authParams.phoneNumber();
                }
                catch (err) {
                    if (err.errorMessage === "RESTART_AUTH_WITH_QR") {
                        return client.signInUserWithQrCode(apiCredentials, authParams);
                    }
                    throw err;
                }
            }
            else {
                phoneNumber = authParams.phoneNumber;
            }
            const sendCodeResult = await client.sendCode(apiCredentials, phoneNumber, authParams.forceSMS);
            phoneCodeHash = sendCodeResult.phoneCodeHash;
            isCodeViaApp = sendCodeResult.isCodeViaApp;
            if (typeof phoneCodeHash !== "string") {
                throw new Error("Failed to retrieve phone code hash");
            }
            break;
        }
        catch (err) {
            if (typeof authParams.phoneNumber !== "function") {
                throw err;
            }
            const shouldWeStop = await authParams.onError(err);
            if (shouldWeStop) {
                throw new Error("AUTH_USER_CANCEL");
            }
        }
    }
    let phoneCode;
    let isRegistrationRequired = false;
    let termsOfService;
    while (1) {
        try {
            try {
                phoneCode = await authParams.phoneCode(isCodeViaApp);
            }
            catch (err) {
                // This is the support for changing phone number from the phone code screen.
                if (err.errorMessage === "RESTART_AUTH") {
                    return client.signInUser(apiCredentials, authParams);
                }
            }
            if (!phoneCode) {
                throw new Error("Code is empty");
            }
            // May raise PhoneCodeEmptyError, PhoneCodeExpiredError,
            // PhoneCodeHashEmptyError or PhoneCodeInvalidError.
            const result = await client.invoke(new tl_1.Api.auth.SignIn({
                phoneNumber,
                phoneCodeHash,
                phoneCode,
            }));
            if (result instanceof tl_1.Api.auth.AuthorizationSignUpRequired) {
                isRegistrationRequired = true;
                termsOfService = result.termsOfService;
                break;
            }
            return result.user;
        }
        catch (err) {
            if (err.errorMessage === "SESSION_PASSWORD_NEEDED") {
                return client.signInWithPassword(apiCredentials, authParams);
            }
            else {
                const shouldWeStop = await authParams.onError(err);
                if (shouldWeStop) {
                    throw new Error("AUTH_USER_CANCEL");
                }
            }
        }
    }
    if (isRegistrationRequired) {
        while (1) {
            try {
                let lastName;
                let firstName = "first name";
                if (authParams.firstAndLastNames) {
                    const result = await authParams.firstAndLastNames();
                    firstName = result[0];
                    lastName = result[1];
                }
                if (!firstName) {
                    throw new Error("First name is required");
                }
                const { user } = (await client.invoke(new tl_1.Api.auth.SignUp({
                    phoneNumber,
                    phoneCodeHash,
                    firstName,
                    lastName,
                })));
                if (termsOfService) {
                    // This is a violation of Telegram rules: the user should be presented with and accept TOS.
                    await client.invoke(new tl_1.Api.help.AcceptTermsOfService({
                        id: termsOfService.id,
                    }));
                }
                return user;
            }
            catch (err) {
                const shouldWeStop = await authParams.onError(err);
                if (shouldWeStop) {
                    throw new Error("AUTH_USER_CANCEL");
                }
            }
        }
    }
    await authParams.onError(new Error("Auth failed"));
    return client.signInUser(apiCredentials, authParams);
}
exports.signInUser = signInUser;
/** @hidden */
async function signInUserWithQrCode(client, apiCredentials, authParams) {
    let isScanningComplete = false;
    if (authParams.qrCode == undefined) {
        throw new Error("qrCode callback not defined");
    }
    const inputPromise = (async () => {
        while (1) {
            if (isScanningComplete) {
                break;
            }
            const result = await client.invoke(new tl_1.Api.auth.ExportLoginToken({
                apiId: Number(apiCredentials.apiId),
                apiHash: apiCredentials.apiHash,
                exceptIds: [],
            }));
            if (!(result instanceof tl_1.Api.auth.LoginToken)) {
                throw new Error("Unexpected");
            }
            const { token, expires } = result;
            await Promise.race([
                authParams.qrCode({ token, expires }),
                (0, Helpers_1.sleep)(QR_CODE_TIMEOUT),
            ]);
            await (0, Helpers_1.sleep)(QR_CODE_TIMEOUT);
        }
    })();
    const updatePromise = new Promise((resolve) => {
        client.addEventHandler((update) => {
            if (update instanceof tl_1.Api.UpdateLoginToken) {
                resolve(undefined);
            }
        });
    });
    try {
        await Promise.race([updatePromise, inputPromise]);
    }
    catch (err) {
        throw err;
    }
    finally {
        isScanningComplete = true;
    }
    try {
        const result2 = await client.invoke(new tl_1.Api.auth.ExportLoginToken({
            apiId: Number(apiCredentials.apiId),
            apiHash: apiCredentials.apiHash,
            exceptIds: [],
        }));
        if (result2 instanceof tl_1.Api.auth.LoginTokenSuccess &&
            result2.authorization instanceof tl_1.Api.auth.Authorization) {
            return result2.authorization.user;
        }
        else if (result2 instanceof tl_1.Api.auth.LoginTokenMigrateTo) {
            await client._switchDC(result2.dcId);
            const migratedResult = await client.invoke(new tl_1.Api.auth.ImportLoginToken({
                token: result2.token,
            }));
            if (migratedResult instanceof tl_1.Api.auth.LoginTokenSuccess &&
                migratedResult.authorization instanceof tl_1.Api.auth.Authorization) {
                return migratedResult.authorization.user;
            }
            else {
                client._log.error(`Received unknown result while scanning QR ${result2.className}`);
                throw new Error(`Received unknown result while scanning QR ${result2.className}`);
            }
        }
        else {
            client._log.error(`Received unknown result while scanning QR ${result2.className}`);
            throw new Error(`Received unknown result while scanning QR ${result2.className}`);
        }
    }
    catch (err) {
        if (err.errorMessage === "SESSION_PASSWORD_NEEDED") {
            return client.signInWithPassword(apiCredentials, authParams);
        }
        throw err;
    }
    await authParams.onError(new Error("QR auth failed"));
    throw new Error("QR auth failed");
}
exports.signInUserWithQrCode = signInUserWithQrCode;
/** @hidden */
async function sendCode(client, apiCredentials, phoneNumber, forceSMS = false) {
    try {
        const { apiId, apiHash } = apiCredentials;
        const sendResult = await client.invoke(new tl_1.Api.auth.SendCode({
            phoneNumber,
            apiId,
            apiHash,
            settings: new tl_1.Api.CodeSettings({}),
        }));
        if (sendResult instanceof tl_1.Api.auth.SentCodeSuccess)
            throw new Error("logged in right after sending the code");
        // If we already sent a SMS, do not resend the phoneCode (hash may be empty)
        if (!forceSMS || sendResult.type instanceof tl_1.Api.auth.SentCodeTypeSms) {
            return {
                phoneCodeHash: sendResult.phoneCodeHash,
                isCodeViaApp: sendResult.type instanceof tl_1.Api.auth.SentCodeTypeApp,
            };
        }
        const resendResult = await client.invoke(new tl_1.Api.auth.ResendCode({
            phoneNumber,
            phoneCodeHash: sendResult.phoneCodeHash,
        }));
        if (resendResult instanceof tl_1.Api.auth.SentCodeSuccess)
            throw new Error("logged in right after resending the code");
        return {
            phoneCodeHash: resendResult.phoneCodeHash,
            isCodeViaApp: resendResult.type instanceof tl_1.Api.auth.SentCodeTypeApp,
        };
    }
    catch (err) {
        if (err.errorMessage === "AUTH_RESTART") {
            return client.sendCode(apiCredentials, phoneNumber, forceSMS);
        }
        else {
            throw err;
        }
    }
}
exports.sendCode = sendCode;
/** @hidden */
async function signInWithPassword(client, apiCredentials, authParams) {
    let emptyPassword = false;
    while (1) {
        try {
            const passwordSrpResult = await client.invoke(new tl_1.Api.account.GetPassword());
            if (!authParams.password) {
                emptyPassword = true;
                break;
            }
            const password = await authParams.password(passwordSrpResult.hint);
            if (!password) {
                throw new Error("Password is empty");
            }
            const passwordSrpCheck = await (0, Password_1.computeCheck)(passwordSrpResult, password);
            const { user } = (await client.invoke(new tl_1.Api.auth.CheckPassword({
                password: passwordSrpCheck,
            })));
            return user;
        }
        catch (err) {
            const shouldWeStop = await authParams.onError(err);
            if (shouldWeStop) {
                throw new Error("AUTH_USER_CANCEL");
            }
        }
    }
    if (emptyPassword) {
        throw new Error("Account has 2FA enabled.");
    }
    return undefined; // Never reached (TypeScript fix)
}
exports.signInWithPassword = signInWithPassword;
/** @hidden */
async function signInBot(client, apiCredentials, authParams) {
    const { apiId, apiHash } = apiCredentials;
    let { botAuthToken } = authParams;
    if (!botAuthToken) {
        throw new Error("a valid BotToken is required");
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
    const { user } = (await client.invoke(new tl_1.Api.auth.ImportBotAuthorization({
        apiId,
        apiHash,
        botAuthToken,
    })));
    return user;
}
exports.signInBot = signInBot;
/** @hidden */
async function _authFlow(client, apiCredentials, authParams) {
    const me = "phoneNumber" in authParams
        ? await client.signInUser(apiCredentials, authParams)
        : await client.signInBot(apiCredentials, authParams);
    client._log.info("Signed in successfully as " + utils.getDisplayName(me));
}
exports._authFlow = _authFlow;
