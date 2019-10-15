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

            let s = Buffer.from("2451F2CA6D89757A4B2A46571C9414A68F3531EF7DDC99B5DDDD33803E8D6FA27CEA148E5B8F0B414074DD6B767A7C64D9FCF2E5EA82F919A6274FF8E7ED392264EEC400DBFDB930CA7F4D992172427B4CD5663006F8C158D0F97F3D845565A6A100BF328548DD7E8213295988B43E7FDC7F5001265AF143DEA7A97BAFF9479C0257B26491F282DAB5CB5408F0A5B2430FE97248DFD26BC7974CE5AC7AB71B1B78C0C5ECCA4B7B704227913DD8937068118A90282A3FF1F2D53550C28F3F45817676A4B8751495D9ACCA323FF714BA7A103237C17EF508506B846C9FD357E9DB8C3FD38AE4E595A7B67D7D48D97AC9D332983025A18F4816104D414952DD35D0", "hex");


            let authKey = new AuthKey(s);
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

