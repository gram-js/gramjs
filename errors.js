/**
 * Occurs when a read operation was cancelled
 */
class ReadCancelledError extends Error {
    constructor() {
        super("You must run `python3 tl_generator.py` first. #ReadTheDocs!")
    }
}

/**
 * Occurs when you should've ran `tl_generator.py`, but you haven't
 */
class TLGeneratorNotRan extends Error {
    constructor() {
        super("You must run `python3 tl_generator.py` first. #ReadTheDocs!")
    }
}

/**
 * Occurs when an invalid parameter is given, for example,
 * when either A or B are required but none is given
 */
class InvalidParameterError extends Error {

}

/**
 * Occurs when a type is not found, for example,
 * when trying to read a TLObject with an invalid constructor code
 */
class TypeNotFoundError extends Error {
    constructor(invalidConstructorId) {
        super('Could not find a matching Constructor ID for the TLObject ' +
            'that was supposed to be read with ID {}. Most likely, a TLObject ' +
            'was trying to be read when it should not be read.'.replace("{}",
                invalidConstructorId.toString("16")));
        this.invalidConstructorId = invalidConstructorId;
    }
}

/**
 * Occurs when a read operation was cancelled
 */
class InvalidDCError extends Error {
    constructor(newDC) {
        super('Your phone number is registered to #{} DC. ' +
            'This should have been handled automatically; ' +
            'if it has not, please restart the app.'.replace("{}", newDC));
        this.newDC = newDC;
    }
}

/**
 * Occurs when an invalid checksum is passed
 */
class InvalidChecksumError extends Error {
    constructor(checksum, validChecksum) {
        super('Invalid checksum ({0} when {1} was expected). This packet should be skipped.'
            .replace("{0}", checksum).replace("{1}", validChecksum));
        this.checksum = checksum;
        this.validChecksum = validChecksum;

    }
}

class RPCError extends Error {
    static CodeMessages = {
        303: Array('ERROR_SEE_OTHER', 'The request must be repeated, but directed to a different data center.'),

        400: Array('BAD_REQUEST', 'The query contains errors. In the event that a request was created using a ' +
            'form and contains user generated data, the user should be notified that the ' +
            'data must be corrected before the query is repeated.'),

        401: Array('UNAUTHORIZED', 'There was an unauthorized attempt to use functionality available only to ' +
            'authorized users.'),

        403: Array('FORBIDDEN', 'Privacy violation. For example, an attempt to write a message to someone who ' +
            'has blacklisted the current user.'),

        404: Array('NOT_FOUND', 'An attempt to invoke a non-existent object, such as a method.'),

        420: Array('FLOOD', 'The maximum allowed number of attempts to invoke the given method with ' +
            'the given input parameters has been exceeded. For example, in an attempt ' +
            'to request a large number of text messages (SMS) for the same phone number.'),

        500: Array('INTERNAL', 'An internal server error occurred while a request was being processed; ' +
            'for example, there was a disruption while accessing a database or file storage.')
    };
    static ErrorMessages = {
        // 303 ERROR_SEE_OTHER
        'FILE_MIGRATE_(\\d+)': 'The file to be accessed is currently stored in a different data center (#{}).',

        'PHONE_MIGRATE_(\\d+)': 'The phone number a user is trying to use for authorization is associated ' +
            'with a different data center (#{}).',

        'NETWORK_MIGRATE_(\\d+)': 'The source IP address is associated with a different data center (#{}, ' +
            'for registration).',

        'USER_MIGRATE_(\\d+)': 'The user whose identity is being used to execute queries is associated with ' +
            'a different data center  (#{} for registration).',

        // 400 BAD_REQUEST
        'FIRSTNAME_INVALID': 'The first name is invalid.',

        'LASTNAME_INVALID': 'The last name is invalid.',

        'PHONE_NUMBER_INVALID': 'The phone number is invalid.',

        'PHONE_CODE_HASH_EMPTY': 'phone_code_hash is missing.',

        'PHONE_CODE_EMPTY': 'phone_code is missing.',

        'PHONE_CODE_EXPIRED': 'The confirmation code has expired.',

        'API_ID_INVALID': 'The api_id/api_hash combination is invalid.',

        'PHONE_NUMBER_OCCUPIED': 'The phone number is already in use.',

        'PHONE_NUMBER_UNOCCUPIED': 'The phone number is not yet being used.',

        'USERS_TOO_FEW': 'Not enough users (to create a chat, for example).',

        'USERS_TOO_MUCH': 'The maximum number of users has been exceeded (to create a chat, for example).',

        'TYPE_CONSTRUCTOR_INVALID': 'The type constructor is invalid.',

        'FILE_PART_INVALID': 'The file part number is invalid.',

        'FILE_PARTS_INVALID': 'The number of file parts is invalid.',

        'FILE_PART_(\\d+)_MISSING': 'Part {} of the file is missing from storage.',

        'MD5_CHECKSUM_INVALID': 'The MD5 checksums do not match.',

        'PHOTO_INVALID_DIMENSIONS': 'The photo dimensions are invalid.',

        'FIELD_NAME_INVALID': 'The field with the name FIELD_NAME is invalid.',

        'FIELD_NAME_EMPTY': 'The field with the name FIELD_NAME is missing.',

        'MSG_WAIT_FAILED': 'A waiting call returned an error.',

        'CHAT_ADMIN_REQUIRED': 'Chat admin privileges are required to do that in the specified chat ' +
            '(for example, to send a message in a channel which is not yours).',

        // 401 UNAUTHORIZED
        'AUTH_KEY_UNREGISTERED': 'The key is not registered in the system.',

        'AUTH_KEY_INVALID': 'The key is invalid.',

        'USER_DEACTIVATED': 'The user has been deleted/deactivated.',

        'SESSION_REVOKED': 'The authorization has been invalidated, because of the user terminating all sessions.',

        'SESSION_EXPIRED': 'The authorization has expired.',

        'ACTIVE_USER_REQUIRED': 'The method is only available to already activated users.',

        'AUTH_KEY_PERM_EMPTY': 'The method is unavailable for temporary authorization key, not bound to permanent.',

        // 420 FLOOD
        'FLOOD_WAIT_(\\d+)': 'A wait of {} seconds is required.'
    };
    constructor(code, message) {
        let codeMeaning = RPCError.CodeMessages[code];
        let mustResend = code === 303; // ERROR_SEE_OTHER, "The request must be repeated"

        let calledSuper = false;
        for (let item in RPCError.ErrorMessages) {

            let key = new RegExp(item);
            let errorMsg = RPCError.ErrorMessages[item];

            let match = message.match(key);

            if (match) {
            console.log(match[1]);
                // Get additionalData if any
                if (match.length === 2) {
                    console.log(errorMsg);
                    let additionalData = parseInt(match[1]);
                    super(errorMsg.replace("{}", additionalData));

                    this.additionalData = additionalData;
                } else {
                    super(errorMsg);
                }
                calledSuper = true;
                break;
            }

        }
        if (!calledSuper) {
            super("Unknown error message with code {0}: {1}"
                .replace("{0}", code).replace("{1}", message))
        }
        this.code = code;
        this.errorMessage = message;
        this.codeMeaning = codeMeaning;
        this.mustResend = mustResend;

    }
}


/**
 * Occurs when handling a badMessageNotification
 */
class BadMessageError extends Error {
    static ErrorMessages = {
        16: 'msg_id too low (most likely, client time is wrong it would be worthwhile to ' +
            'synchronize it using msg_id notifications and re-send the original message ' +
            'with the “correct” msg_id or wrap it in a container with a new msg_id if the ' +
            'original message had waited too long on the client to be transmitted).',

        17: 'msg_id too high (similar to the previous case, the client time has to be ' +
            'synchronized, and the message re-sent with the correct msg_id).',

        18: 'Incorrect two lower order msg_id bits (the server expects client message msg_id ' +
            'to be divisible by 4).',

        19: 'Container msg_id is the same as msg_id of a previously received message ' +
            '(this must never happen).',

        20: 'Message too old, and it cannot be verified whether the server has received a ' +
            'message with this msg_id or not.',

        32: 'msg_seqno too low (the server has already received a message with a lower ' +
            'msg_id but with either a higher or an equal and odd seqno).',

        33: 'msg_seqno too high (similarly, there is a message with a higher msg_id but with ' +
            'either a lower or an equal and odd seqno).',

        34: 'An even msg_seqno expected (irrelevant message), but odd received.',

        35: 'Odd msg_seqno expected (relevant message), but even received.',

        48: 'Incorrect server salt (in this case, the bad_server_salt response is received with ' +
            'the correct salt, and the message is to be re-sent with it).',

        64: 'Invalid container.'
    };

    constructor(code) {
        super(BadMessageError.ErrorMessages[code] || "Unknown error code (this should not happen): {}."
            .replace("{}", code));
    }

}

