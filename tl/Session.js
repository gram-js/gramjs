const Helpers = require("../utils/Helpers");
const fs = require("fs");

class Session {
    constructor(sessionUserId) {
        this.sessionUserId = sessionUserId;
        this.serverAddress = "149.154.167.40";
        this.port = 80;
        this.authKey = undefined;
        this.id = Helpers.generateRandomLong(false);
        this.sequence = 0;
        this.salt = 0; // Unsigned long
        this.timeOffset = 0;
        this.lastMessageId = 0;
        this.user = undefined;
    }

    /**
     * Saves the current session object as session_user_id.session
     */
    async save() {
        if (this.sessionUserId) {
            await fs.writeFile(`${this.sessionUserId}.session`, JSON.stringify(this));
        }
    }

    static tryLoadOrCreateNew(sessionUserId) {
        if (sessionUserId === undefined) {
            return new Session();
        }
        let filepath = `${sessionUserId}.session`;
        if (fs.existsSync(filepath)) {
            return JSON.parse(fs.readFileSync(filepath, "utf-8"));
        } else {
            return Session(sessionUserId);
        }
    }

    getNewMsgId() {
        let msTime = new Date().getTime();
        let newMessageId = (BigInt(Math.floor(msTime / 1000) + this.timeOffset) << BigInt(32)) |
            ((msTime % 1000) << 22) |
            (Helpers.getRandomInt(0, 524288) << 2); // 2^19

        if (this.lastMessageId >= newMessageId) {
            newMessageId = this.lastMessageId + 4;
        }
        this.lastMessageId = newMessageId;
        return newMessageId;
    }
}

module.exports = Session;
