const helper = require("../utils/Helpers").helpers;

class AuthKey {
    constructor(data) {
        this.data = data;

        let buffer = Buffer.from(helper.sha1(data));

        this.aux_hash = buffer.slice(0, 8).readBigUInt64LE();
        this.key_id = buffer.slice(12, 20).readBigUInt64LE();

    }

    calcNewNonceHash(new_nonce, number) {
        let buffer = Buffer.concat([new_nonce, number, this.aux_hash]);
        return helper.calcMsgKey(buffer);
    }

}

