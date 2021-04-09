import type {EntityLike} from "../define";
import {Api} from "../tl";
import {InlineResults} from "../tl/custom/inlineResults";
import GetInlineBotResults = Api.messages.GetInlineBotResults;
import type {TelegramClient} from "./TelegramClient";

// BotMethods
export async function inlineQuery(client: TelegramClient, bot: EntityLike, query: string, entity?: Api.InputPeerSelf | null,
                                  offset?: string, geoPoint?: Api.GeoPoint): Promise<InlineResults<Api.messages.BotResults>> {
    bot = await client.getInputEntity(bot);
    let peer = new Api.InputPeerSelf();
    if (entity) {
        peer = await client.getInputEntity(entity);
    }
    const result = await client.invoke(new GetInlineBotResults({
        bot: bot,
        peer: peer,
        query: query,
        offset: offset || '',
        geoPoint: geoPoint
    }));
    return new InlineResults(client, result, entity = entity ? peer : undefined);
}

