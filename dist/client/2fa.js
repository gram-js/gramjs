"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTwoFaSettings = void 0;
const Helpers_1 = require("../Helpers");
const Password_1 = require("../Password");
const tl_1 = require("../tl");
const index_1 = require("../index");
/**
 * Changes the 2FA settings of the logged in user.
 Note that this method may be *incredibly* slow depending on the
 prime numbers that must be used during the process to make sure
 that everything is safe.

 Has no effect if both current and new password are omitted.

 * @param client: The telegram client instance
 * @param isCheckPassword: Must be ``true`` if you want to check the current password
 * @param currentPassword: The current password, to authorize changing to ``new_password``.
 Must be set if changing existing 2FA settings.
 Must **not** be set if 2FA is currently disabled.
 Passing this by itself will remove 2FA (if correct).
 * @param newPassword: The password to set as 2FA.
 If 2FA was already enabled, ``currentPassword`` **must** be set.
 Leaving this blank or `undefined` will remove the password.
 * @param hint: Hint to be displayed by Telegram when it asks for 2FA.
 Must be set when changing or creating a new password.
 Has no effect if ``newPassword`` is not set.
 * @param email: Recovery and verification email. If present, you must also
 set `emailCodeCallback`, else it raises an Error.
 * @param emailCodeCallback: If an email is provided, a callback that returns the code sent
 to it must also be set. This callback may be asynchronous.
 It should return a string with the code. The length of the
 code will be passed to the callback as an input parameter.
 * @param onEmailCodeError: Called when an error happens while sending an email.

 If the callback returns an invalid code, it will raise an rpc error with the message
 ``CODE_INVALID``

 * @returns Promise<void>
 * @throws this method can throw:
 "PASSWORD_HASH_INVALID" if you entered a wrong password (or set it to undefined).
 "EMAIL_INVALID" if the entered email is wrong
 "EMAIL_HASH_EXPIRED" if the user took too long to verify their email
 */
async function updateTwoFaSettings(client, { isCheckPassword, currentPassword, newPassword, hint = "", email, emailCodeCallback, onEmailCodeError, }) {
    if (!newPassword && !currentPassword) {
        throw new Error("Neither `currentPassword` nor `newPassword` is present");
    }
    if (email && !(emailCodeCallback && onEmailCodeError)) {
        throw new Error("`email` present without `emailCodeCallback` and `onEmailCodeError`");
    }
    const pwd = await client.invoke(new tl_1.Api.account.GetPassword());
    if (!(pwd.newAlgo instanceof tl_1.Api.PasswordKdfAlgoUnknown)) {
        pwd.newAlgo.salt1 = Buffer.concat([
            pwd.newAlgo.salt1,
            (0, Helpers_1.generateRandomBytes)(32),
        ]);
    }
    if (!pwd.hasPassword && currentPassword) {
        currentPassword = undefined;
    }
    const password = currentPassword
        ? await (0, Password_1.computeCheck)(pwd, currentPassword)
        : new tl_1.Api.InputCheckPasswordEmpty();
    if (isCheckPassword) {
        await client.invoke(new tl_1.Api.auth.CheckPassword({ password }));
        return;
    }
    if (pwd.newAlgo instanceof tl_1.Api.PasswordKdfAlgoUnknown) {
        throw new Error("Unknown password encryption method");
    }
    try {
        await client.invoke(new tl_1.Api.account.UpdatePasswordSettings({
            password,
            newSettings: new tl_1.Api.account.PasswordInputSettings({
                newAlgo: pwd.newAlgo,
                newPasswordHash: newPassword
                    ? await (0, Password_1.computeDigest)(pwd.newAlgo, newPassword)
                    : Buffer.alloc(0),
                hint,
                email,
                // not explained what it does and it seems to always be set to empty in tdesktop
                newSecureSettings: undefined,
            }),
        }));
    }
    catch (e) {
        if (e instanceof index_1.errors.EmailUnconfirmedError) {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                try {
                    const code = await emailCodeCallback(e.codeLength);
                    if (!code) {
                        throw new Error("Code is empty");
                    }
                    await client.invoke(new tl_1.Api.account.ConfirmPasswordEmail({ code }));
                    break;
                }
                catch (err) {
                    onEmailCodeError(err);
                }
            }
        }
        else {
            throw e;
        }
    }
}
exports.updateTwoFaSettings = updateTwoFaSettings;
