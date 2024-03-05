import type { EntityLike } from "../define";
import { Api } from "../tl";
import { InlineResults } from "../tl/custom/inlineResults";
import type { TelegramClient } from "./TelegramClient";
/** @hidden */
export declare function inlineQuery(client: TelegramClient, bot: EntityLike, query: string, entity?: Api.InputPeerSelf, offset?: string, geoPoint?: Api.TypeInputGeoPoint): Promise<InlineResults>;
