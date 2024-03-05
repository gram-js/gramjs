/**
 * Base class for all Remote Procedure Call errors.
 */
import { Api } from "../tl";
import { CustomError } from "ts-custom-error";
export declare class RPCError extends CustomError {
    code: number | undefined;
    errorMessage: string;
    constructor(message: string, request: Api.AnyRequest, code?: number);
    static _fmtRequest(request: Api.AnyRequest): string;
}
/**
 * The request must be repeated, but directed to a different data center.
 */
export declare class InvalidDCError extends RPCError {
    constructor(message: string, request: Api.AnyRequest, code?: number);
}
/**
 * The query contains errors. In the event that a request was created
 * using a form and contains user generated data, the user should be
 * notified that the data must be corrected before the query is repeated.
 */
export declare class BadRequestError extends RPCError {
    code: number;
    errorMessage: string;
}
/**
 * There was an unauthorized attempt to use functionality available only
 * to authorized users.
 */
export declare class UnauthorizedError extends RPCError {
    code: number;
    errorMessage: string;
}
/**
 * Privacy violation. For example, an attempt to write a message to
 * someone who has blacklisted the current user.
 */
export declare class ForbiddenError extends RPCError {
    code: number;
    errorMessage: string;
}
/**
 * An attempt to invoke a non-existent object, such as a method.
 */
export declare class NotFoundError extends RPCError {
    code: number;
    errorMessage: string;
}
/**
 * Errors related to invalid authorization key, like
 * AUTH_KEY_DUPLICATED which can cause the connection to fail.
 */
export declare class AuthKeyError extends RPCError {
    code: number;
    errorMessage: string;
}
/**
 * The maximum allowed number of attempts to invoke the given method
 * with the given input parameters has been exceeded. For example, in an
 * attempt to request a large number of text messages (SMS) for the same
 * phone number.
 */
export declare class FloodError extends RPCError {
    code: number;
    errorMessage: string;
}
/**
 * An internal server error occurred while a request was being processed
 * for example, there was a disruption while accessing a database or file
 * storage
 */
export declare class ServerError extends RPCError {
    code: number;
    errorMessage: string;
}
/**
 * Clicking the inline buttons of bots that never (or take to long to)
 * call ``answerCallbackQuery`` will result in this "special" RPCError.
 */
export declare class TimedOutError extends RPCError {
    code: number;
    errorMessage: string;
}
