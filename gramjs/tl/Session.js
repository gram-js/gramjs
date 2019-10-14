const Helpers = require("../utils/Helpers");
const fs = require("fs").promises;
const {existsSync,readFileSync} = require("fs");

class Session {
    constructor(sessionUserId) {
        this.sessionUserId = sessionUserId;
        this.serverAddress = "149.154.167.40";
        this.port = 443;
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
            //await fs.writeFile(`${this.sessionUserId}.session`, JSON.stringify(this));
        }
    }

    static tryLoadOrCreateNew(sessionUserId) {
        if (sessionUserId === undefined) {
            return new Session();
        }
        let filepath = `${sessionUserId}.session`;
        if (existsSync(filepath)) {
            return JSON.parse(readFileSync(filepath, "utf-8"));
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

