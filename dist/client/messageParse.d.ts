import { Api } from "../tl/api";
import type { EntityLike } from "../define";
import type { TelegramClient } from "./TelegramClient";
export declare type messageEntities = typeof Api.MessageEntityBold | typeof Api.MessageEntityItalic | typeof Api.MessageEntityStrike | typeof Api.MessageEntityCode | typeof Api.MessageEntityPre;
export declare const DEFAULT_DELIMITERS: {
    [key: string]: messageEntities;
};
export interface ParseInterface {
    parse: (message: string) => [string, Api.TypeMessageEntity[]];
    unparse: (text: string, entities: Api.TypeMessageEntity[]) => string;
}
/** @hidden */
export declare function _replaceWithMention(client: TelegramClient, entities: Api.TypeMessageEntity[], i: number, user: EntityLike): Promise<boolean>;
/** @hidden */
export declare function _parseMessageText(client: TelegramClient, message: string, parseMode: false | string | ParseInterface): Promise<[string, Api.TypeMessageEntity[]]>;
/** @hidden */
export declare function _getResponseMessage(client: TelegramClient, request: any, result: any, inputChat: any): Api.TypeMessage | Map<number, Api.Message> | (Api.Message | undefined)[] | undefined;
