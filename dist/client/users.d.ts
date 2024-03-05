import { Api } from "../tl";
import type { Entity, EntityLike } from "../define";
import type { TelegramClient } from "../";
import bigInt from "big-integer";
import { MTProtoSender } from "../network";
/** @hidden */
export declare function invoke<R extends Api.AnyRequest>(client: TelegramClient, request: R, dcId?: number, otherSender?: MTProtoSender): Promise<R["__response"]>;
/** @hidden */
export declare function getMe(client: TelegramClient, inputPeer?: boolean): Promise<Api.InputPeerUser | Api.User>;
/** @hidden */
export declare function isBot(client: TelegramClient): Promise<boolean | undefined>;
/** @hidden */
export declare function isUserAuthorized(client: TelegramClient): Promise<boolean>;
/** @hidden */
export declare function getEntity(client: TelegramClient, entity: EntityLike | EntityLike[]): Promise<Entity | Entity[]>;
/** @hidden */
export declare function getInputEntity(client: TelegramClient, peer: EntityLike): Promise<Api.TypeInputPeer>;
/** @hidden */
export declare function _getEntityFromString(client: TelegramClient, string: string): Promise<Api.TypeUser | Api.TypeInputPeer | Api.TypeChat>;
/** @hidden */
export declare function getPeerId(client: TelegramClient, peer: EntityLike, addMark?: boolean): Promise<string>;
/** @hidden */
export declare function _getPeer(client: TelegramClient, peer: EntityLike): Promise<Api.PeerUser | Api.PeerChat | Api.PeerChannel | undefined>;
/** @hidden */
export declare function _getInputDialog(client: TelegramClient, dialog: any): Promise<any>;
/** @hidden */
export declare function _getInputNotify(client: TelegramClient, notify: any): Promise<any>;
/** @hidden */
export declare function _selfId(client: TelegramClient): bigInt.BigInteger | undefined;
