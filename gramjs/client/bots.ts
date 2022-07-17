import { Api } from "../tl";
import { InlineResults } from "../tl/custom/inlineResults";
import GetInlineBotResults = Api.messages.GetInlineBotResults;
import { AbstractTelegramClient } from "./AbstractTelegramClient";

// BotMethods
/** @hidden */
export async function inlineQuery(
    client: AbstractTelegramClient,
    bot: Api.TypeEntityLike,
    query: string,
    entity?: Api.InputPeerSelf,
    offset?: string,
    geoPoint?: Api.TypeInputGeoPoint
): Promise<InlineResults> {
    bot = await client.getInputEntity(bot);
    let peer: Api.TypeInputPeer = new Api.InputPeerSelf();
    if (entity) {
        peer = await client.getInputEntity(entity);
    }
    const result = await client.invoke(
        new GetInlineBotResults({
            bot: bot,
            peer: peer,
            query: query,
            offset: offset || "",
            geoPoint: geoPoint,
        })
    );
    return new InlineResults(client, result, entity ? peer : undefined);
}
