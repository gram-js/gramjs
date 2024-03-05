"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InlineResults = void 0;
const inlineResult_1 = require("./inlineResult");
const Helpers_1 = require("../../Helpers");
const inspect_1 = require("../../inspect");
class InlineResults extends Array {
    constructor(client, original, entity) {
        super(...original.results.map((res) => new inlineResult_1.InlineResult(client, res, original.queryId, entity)));
        this.result = original;
        this.queryId = original.queryId;
        this.cacheTime = original.cacheTime;
        this._validUntil = new Date().getTime() / 1000 + this.cacheTime;
        this.users = original.users;
        this.gallery = Boolean(original.gallery);
        this.nextOffset = original.nextOffset;
        this.switchPm = original.switchPm;
    }
    [inspect_1.inspect.custom]() {
        return (0, Helpers_1.betterConsoleLog)(this);
    }
    resultsValid() {
        return new Date().getTime() / 1000 < this._validUntil;
    }
}
exports.InlineResults = InlineResults;
