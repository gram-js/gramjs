"use strict";
// Which updates have the following fields?
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityCache = void 0;
const Utils_1 = require("./Utils");
const Helpers_1 = require("./Helpers");
const tl_1 = require("./tl");
const big_integer_1 = __importDefault(require("big-integer"));
class EntityCache {
    constructor() {
        this.cacheMap = new Map();
    }
    add(entities) {
        const temp = [];
        if (!(0, Helpers_1.isArrayLike)(entities)) {
            if (entities != undefined) {
                if (typeof entities == "object") {
                    if ("chats" in entities) {
                        temp.push(...entities.chats);
                    }
                    if ("users" in entities) {
                        temp.push(...entities.users);
                    }
                    if ("user" in entities) {
                        temp.push(entities.user);
                    }
                }
            }
            if (temp.length) {
                entities = temp;
            }
            else {
                return;
            }
        }
        for (const entity of entities) {
            try {
                const pid = (0, Utils_1.getPeerId)(entity);
                if (!this.cacheMap.has(pid.toString())) {
                    this.cacheMap.set(pid.toString(), (0, Utils_1.getInputPeer)(entity));
                }
            }
            catch (e) { }
        }
    }
    get(item) {
        if (item == undefined) {
            throw new Error("No cached entity for the given key");
        }
        item = (0, Helpers_1.returnBigInt)(item);
        if (item.lesser(big_integer_1.default.zero)) {
            let res;
            try {
                res = this.cacheMap.get((0, Utils_1.getPeerId)(item).toString());
                if (res) {
                    return res;
                }
            }
            catch (e) {
                throw new Error("Invalid key will not have entity");
            }
        }
        for (const cls of [tl_1.Api.PeerUser, tl_1.Api.PeerChat, tl_1.Api.PeerChannel]) {
            const result = this.cacheMap.get((0, Utils_1.getPeerId)(new cls({
                userId: item,
                chatId: item,
                channelId: item,
            })).toString());
            if (result) {
                return result;
            }
        }
        throw new Error("No cached entity for the given key");
    }
}
exports.EntityCache = EntityCache;
