const Helpers = require("../utils/Helpers");
const fs = require("fs").promises;
const {existsSync, readFileSync} = require("fs");
const AuthKey = require("../crypto/AuthKey");
BigInt.toJSON = function () {
    return {fool: this.fool.toString("hex")}
};
BigInt.parseJson = function () {
    return {fool: BigInt("0x" + this.fool)}
};
const DEFAULT_DC_ID = 4;
const DEFAULT_IPV4_IP = '149.154.167.92';
const DEFAULT_IPV6_IP = '[2001:67c:4e8:f002::a]';
const DEFAULT_PORT = 443;

class Session {
    constructor(sessionUserId) {
        this.sessionUserId = sessionUserId;
        this.serverAddress = DEFAULT_IPV4_IP;
        this.port = DEFAULT_PORT;
        //this.serverAddress = "localhost";
        //this.port = 21;
        this.authKey = undefined;
        this.id = Helpers.generateRandomLong(false);
        this.sequence = 0;
        this.salt = 0n; // Unsigned long
        this.timeOffset = 0n;
        this.lastMessageId = 0n;
        this.user = undefined;


    }

    /**
     * Saves the current session object as session_user_id.session
     */
    async save() {
        if (this.sessionUserId) {
            let str = JSON.stringify(this, function (key, value) {
                if (typeof value === 'bigint') {
                    return value.toString() + "n";
                } else {
                    return value;
                }
            });


            await fs.writeFile(`${this.sessionUserId}.session`, str);
        }
    }

    static tryLoadOrCreateNew(sessionUserId) {
        if (sessionUserId === undefined) {
            return new Session();
        }
        let filepath = `${sessionUserId}.session`;
        if (existsSync(filepath)) {

            let ob = JSON.parse(readFileSync(filepath, "utf-8"), function (key, value) {
                if ((typeof value) == "string" && value.match(/(\d+)n/)) {
                    return BigInt(value.slice(0, -1));
                } else {
                    return value;
                }
            });


            let authKey = new AuthKey(Buffer.from(ob.authKey._key.data));
            let session = new Session(ob.sessionUserId);
            session.serverAddress = ob.serverAddress;
            session.port = ob.port;
            //this.serverAddress = "localhost";
            //this.port = 21;
            session.authKey = authKey;
            session.id = ob.id;
            session.sequence = ob.sequence;
            session.salt = ob.salt; // Unsigned long
            session.timeOffset = ob.timeOffset;
            session.lastMessageId = ob.lastMessageId;
            session.user = ob.user;
            return session;
        } else {
            return new Session(sessionUserId);
        }
    }

    getNewMsgId() {
        let msTime = new Date().getTime();
        let newMessageId = (BigInt(BigInt(Math.floor(msTime / 1000)) + this.timeOffset) << 32n) |
            (BigInt(msTime % 1000) << 22n) |
            (BigInt(Helpers.getRandomInt(0, 524288)) << 2n); // 2^19

        if (this.lastMessageId >= newMessageId) {
            newMessageId = this.lastMessageId + 4n;
        }
        this.lastMessageId = newMessageId;
        return newMessageId;
    }
}

module.exports = Session;

