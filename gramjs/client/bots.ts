import {EntityLike} from "../define";
import {Api} from "../tl";
import {InlineResults} from "../tl/custom/inlineResults";
import GetInlineBotResults = Api.messages.GetInlineBotResults;
import {UserMethods} from "./users";

export class BotMethods {
    async inlineQuery(bot: EntityLike, query: string, entity?: Api.InputPeerSelf | null,
                      offset?: string, geoPoint?: Api.GeoPoint): Promise<InlineResults<Api.messages.BotResults>> {
        bot = await this.getInputEntity(bot);
        let peer = new Api.InputPeerSelf();
        if (entity) {
            peer = await this.getInputEntity(entity);
        }
        const result = await this.invoke(new GetInlineBotResults({
            bot: bot,
            peer: peer,
            query: query,
            offset: offset || '',
            geoPoint: geoPoint
        }));
        // @ts-ignore
        return new InlineResults(this, result, entity = entity ? peer : undefined);
    }
}

export interface BotMethods extends UserMethods {

}

{

}
