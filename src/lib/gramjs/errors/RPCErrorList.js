const { RPCError, InvalidDCError, FloodError } = require('./RPCBaseErrors')
const format = require('string-format')


class UserMigrateError extends InvalidDCError {
    constructor(args) {
        const newDc = Number(args.capture || 0)
        super(format('The user whose identity is being used to execute queries is associated with DC {new_dc}', { newDc }) + RPCError._fmtRequest(args.request))
        this.message = format('The user whose identity is being used to execute queries is associated with DC {new_dc}', { newDc }) + RPCError._fmtRequest(args.request)
        this.newDc = newDc
    }
}


class PhoneMigrateError extends InvalidDCError {
    constructor(args) {
        const newDc = Number(args.capture || 0)
        super(format('The phone number a user is trying to use for authorization is associated with DC {new_dc}', { newDc }) + RPCError._fmtRequest(args.request))
        this.message = format('The phone number a user is trying to use for authorization is associated with DC {new_dc}', { newDc }) + RPCError._fmtRequest(args.request)
        this.newDc = newDc
    }
}

class SlowModeWaitError extends FloodError {
    constructor(args) {
        const seconds = Number(args.capture || 0)
        super(format('A wait of {seconds} seconds is required before sending another message in this chat', { seconds }) + RPCError._fmtRequest(args.request))
        this.message = format('A wait of {seconds} seconds is required before sending another message in this chat', { seconds }) + RPCError._fmtRequest(args.request)
        this.seconds = seconds
    }
}

class FloodWaitError extends FloodError {
    constructor(args) {
        const seconds = Number(args.capture || 0)
        super(format('A wait of {seconds} seconds is required', { seconds }) + RPCError._fmtRequest(args.request))
        this.message = format('A wait of {seconds} seconds is required', { seconds }) + RPCError._fmtRequest(args.request)
        this.seconds = seconds
    }
}

class FloodTestPhoneWaitError extends FloodError {
    constructor(args) {
        const seconds = Number(args.capture || 0)
        super(format('A wait of {seconds} seconds is required in the test servers', { seconds }) + RPCError._fmtRequest(args.request))
        this.message = format('A wait of {seconds} seconds is required in the test servers', { seconds }) + RPCError._fmtRequest(args.request)
        this.seconds = seconds
    }
}

class FileMigrateError extends InvalidDCError {
    constructor(args) {
        const newDc = Number(args.capture || 0)
        super(format('The file to be accessed is currently stored in DC {new_dc}', { newDc }) + RPCError._fmtRequest(args.request))
        this.message = format('The file to be accessed is currently stored in DC {new_dc}', { newDc }) + RPCError._fmtRequest(args.request)
        this.newDc = newDc
    }
}
class NetworkMigrateError extends InvalidDCError {
    constructor(args) {
        const newDc = Number(args.capture || 0);
        super(format('The source IP address is associated with DC {new_dc}', {newDc}) + RPCError._fmtRequest(args.request));
        this.message = format('The source IP address is associated with DC {new_dc}', {newDc}) + RPCError._fmtRequest(args.request);
        this.newDc = newDc;
    }
}

const rpcErrorRe = [
    [/FILE_MIGRATE_(\d+)/, FileMigrateError],
    [/FLOOD_TEST_PHONE_WAIT_(\d+)/, FloodTestPhoneWaitError],
    [/FLOOD_WAIT_(\d+)/, FloodWaitError],
    [/PHONE_MIGRATE_(\d+)/, PhoneMigrateError],
    [/SLOWMODE_WAIT_(\d+)/, SlowModeWaitError],
    [/USER_MIGRATE_(\d+)/, UserMigrateError],
    [/NETWORK_MIGRATE_(\d+)/, NetworkMigrateError],

]
module.exports = {
    rpcErrorRe,
    FileMigrateError,
    FloodTestPhoneWaitError,
    FloodWaitError,
    PhoneMigrateError,
    SlowModeWaitError,
    UserMigrateError,
    NetworkMigrateError
}
