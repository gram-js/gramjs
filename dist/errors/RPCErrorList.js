"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rpcErrorRe = exports.MsgWaitError = exports.EmailUnconfirmedError = exports.NetworkMigrateError = exports.FileMigrateError = exports.FloodTestPhoneWaitError = exports.FloodWaitError = exports.SlowModeWaitError = exports.PhoneMigrateError = exports.UserMigrateError = void 0;
const RPCBaseErrors_1 = require("./RPCBaseErrors");
class UserMigrateError extends RPCBaseErrors_1.InvalidDCError {
    constructor(args) {
        const newDc = Number(args.capture || 0);
        super(`The user whose identity is being used to execute queries is associated with DC ${newDc}` +
            RPCBaseErrors_1.RPCError._fmtRequest(args.request), args.request);
        this.message =
            `The user whose identity is being used to execute queries is associated with DC ${newDc}` +
                RPCBaseErrors_1.RPCError._fmtRequest(args.request);
        this.newDc = newDc;
    }
}
exports.UserMigrateError = UserMigrateError;
class PhoneMigrateError extends RPCBaseErrors_1.InvalidDCError {
    constructor(args) {
        const newDc = Number(args.capture || 0);
        super(`The phone number a user is trying to use for authorization is associated with DC ${newDc}` +
            RPCBaseErrors_1.RPCError._fmtRequest(args.request), args.request);
        this.message =
            `The phone number a user is trying to use for authorization is associated with DC ${newDc}` +
                RPCBaseErrors_1.RPCError._fmtRequest(args.request);
        this.newDc = newDc;
    }
}
exports.PhoneMigrateError = PhoneMigrateError;
class SlowModeWaitError extends RPCBaseErrors_1.FloodError {
    constructor(args) {
        const seconds = Number(args.capture || 0);
        super(`A wait of ${seconds} seconds is required before sending another message in this chat` +
            RPCBaseErrors_1.RPCError._fmtRequest(args.request), args.request);
        this.message =
            `A wait of ${seconds} seconds is required before sending another message in this chat` +
                RPCBaseErrors_1.RPCError._fmtRequest(args.request);
        this.seconds = seconds;
    }
}
exports.SlowModeWaitError = SlowModeWaitError;
class FloodWaitError extends RPCBaseErrors_1.FloodError {
    constructor(args) {
        const seconds = Number(args.capture || 0);
        super(`A wait of ${seconds} seconds is required` +
            RPCBaseErrors_1.RPCError._fmtRequest(args.request), args.request);
        this.message =
            `A wait of ${seconds} seconds is required` +
                RPCBaseErrors_1.RPCError._fmtRequest(args.request);
        this.seconds = seconds;
    }
}
exports.FloodWaitError = FloodWaitError;
class FloodTestPhoneWaitError extends RPCBaseErrors_1.FloodError {
    constructor(args) {
        const seconds = Number(args.capture || 0);
        super(`A wait of ${seconds} seconds is required in the test servers` +
            RPCBaseErrors_1.RPCError._fmtRequest(args.request), args.request);
        this.message =
            `A wait of ${seconds} seconds is required in the test servers` +
                RPCBaseErrors_1.RPCError._fmtRequest(args.request);
        this.seconds = seconds;
    }
}
exports.FloodTestPhoneWaitError = FloodTestPhoneWaitError;
class FileMigrateError extends RPCBaseErrors_1.InvalidDCError {
    constructor(args) {
        const newDc = Number(args.capture || 0);
        super(`The file to be accessed is currently stored in DC ${newDc}` +
            RPCBaseErrors_1.RPCError._fmtRequest(args.request), args.request);
        this.message =
            `The file to be accessed is currently stored in DC ${newDc}` +
                RPCBaseErrors_1.RPCError._fmtRequest(args.request);
        this.newDc = newDc;
    }
}
exports.FileMigrateError = FileMigrateError;
class NetworkMigrateError extends RPCBaseErrors_1.InvalidDCError {
    constructor(args) {
        const newDc = Number(args.capture || 0);
        super(`The source IP address is associated with DC ${newDc}` +
            RPCBaseErrors_1.RPCError._fmtRequest(args.request), args.request);
        this.message =
            `The source IP address is associated with DC ${newDc}` +
                RPCBaseErrors_1.RPCError._fmtRequest(args.request);
        this.newDc = newDc;
    }
}
exports.NetworkMigrateError = NetworkMigrateError;
class EmailUnconfirmedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
        const codeLength = Number(args.capture || 0);
        super(`Email unconfirmed, the length of the code must be ${codeLength}${RPCBaseErrors_1.RPCError._fmtRequest(args.request)}`, args.request, 400);
        // eslint-disable-next-line max-len
        this.message = `Email unconfirmed, the length of the code must be ${codeLength}${RPCBaseErrors_1.RPCError._fmtRequest(args.request)}`;
        this.codeLength = codeLength;
    }
}
exports.EmailUnconfirmedError = EmailUnconfirmedError;
class MsgWaitError extends RPCBaseErrors_1.FloodError {
    constructor(args) {
        super(`Message failed to be sent.${RPCBaseErrors_1.RPCError._fmtRequest(args.request)}`, args.request);
        this.message = `Message failed to be sent.${RPCBaseErrors_1.RPCError._fmtRequest(args.request)}`;
    }
}
exports.MsgWaitError = MsgWaitError;
exports.rpcErrorRe = new Map([
    [/FILE_MIGRATE_(\d+)/, FileMigrateError],
    [/FLOOD_TEST_PHONE_WAIT_(\d+)/, FloodTestPhoneWaitError],
    [/FLOOD_WAIT_(\d+)/, FloodWaitError],
    [/MSG_WAIT_(.*)/, MsgWaitError],
    [/PHONE_MIGRATE_(\d+)/, PhoneMigrateError],
    [/SLOWMODE_WAIT_(\d+)/, SlowModeWaitError],
    [/USER_MIGRATE_(\d+)/, UserMigrateError],
    [/NETWORK_MIGRATE_(\d+)/, NetworkMigrateError],
    [/EMAIL_UNCONFIRMED_(\d+)/, EmailUnconfirmedError],
]);
