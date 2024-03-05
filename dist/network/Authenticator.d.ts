/**
 * Executes the authentication process with the Telegram servers.
 * @param sender a connected {MTProtoPlainSender}.
 * @param log
 * @returns {Promise<{authKey: *, timeOffset: *}>}
 */
import { MTProtoPlainSender } from "./MTProtoPlainSender";
import { AuthKey } from "../crypto/AuthKey";
export declare function doAuthentication(sender: MTProtoPlainSender, log: any): Promise<{
    authKey: AuthKey;
    timeOffset: number;
}>;
