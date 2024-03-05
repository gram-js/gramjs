/// <reference types="node" />
import { Api } from "./tl";
/**
 *
 * @param algo {constructors.PasswordKdfAlgoSHA256SHA256PBKDF2HMACSHA512iter100000SHA256ModPow}
 * @param password
 */
declare function computeDigest(algo: Api.PasswordKdfAlgoSHA256SHA256PBKDF2HMACSHA512iter100000SHA256ModPow, password: string): Promise<Buffer>;
/**
 *
 * @param request {constructors.account.Password}
 * @param password {string}
 */
declare function computeCheck(request: Api.account.Password, password: string): Promise<Api.InputCheckPasswordSRP>;
export { computeCheck, computeDigest };
