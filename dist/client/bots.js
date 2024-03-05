"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inlineQuery = void 0;
const tl_1 = require("../tl");
const inlineResults_1 = require("../tl/custom/inlineResults");
var GetInlineBotResults = tl_1.Api.messages.GetInlineBotResults;
// BotMethods
/** @hidden */
async function inlineQuery(client, bot, query, entity, offset, geoPoint) {
    bot = await client.getInputEntity(bot);
    let peer = new tl_1.Api.InputPeerSelf();
    if (entity) {
        peer = await client.getInputEntity(entity);
    }
    const result = await client.invoke(new GetInlineBotResults({
        bot: bot,
        peer: peer,
        query: query,
        offset: offset || "",
        geoPoint: geoPoint,
    }));
    return new inlineResults_1.InlineResults(client, result, entity ? peer : undefined);
}
exports.inlineQuery = inlineQuery;
