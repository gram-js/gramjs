import { EntityLike } from "../define";
import { Api } from "../tl";
import { EventBuilder, EventCommon, DefaultEventInterface } from "./common";
/**
 * Occurs whenever a message is deleted. Note that this event isn't 100%
 * reliable, since Telegram doesn't always notify the clients that a message
 * was deleted.
 *
 * @remarks
 * Telegram **does not** send information about *where* a message
 * was deleted if it occurs in private conversations with other users
 * or in small group chats, because message IDs are *unique* and you
 * can identify the chat with the message ID alone if you saved it
 * previously.
 *
 * GramJS **does not** save information of where messages occur,
 * so it cannot know in which chat a message was deleted (this will
 * only work in channels, where the channel ID *is* present).
 *
 * This means that the `chats:` parameter will not work reliably,
 * unless you intend on working with channels and super-groups only.
 *
 * @example
 * ```ts
 * async function deletedMessageEventPrint(event: DeletedMessageEvent) {
 *
 *   for (let index = 0; index < update.deletedIds.length; index++) {
 *     const deletedMsgId = update.deletedIds[index];
 *     console.log(`Message ${deletedMsgId} was deleted.`)
 *   }
 *
 * }
 * // adds an event handler for deleted messages
 * client.addEventHandler(deletedMessageEventPrint, new DeletedMessage({}));
 * ```
 */
export declare class DeletedMessage extends EventBuilder {
    constructor(eventParams: DefaultEventInterface);
    build(update: Api.TypeUpdate | Api.TypeUpdates, callback: undefined, selfId: bigInt.BigInteger): DeletedMessageEvent | undefined;
}
export declare class DeletedMessageEvent extends EventCommon {
    deletedIds: number[];
    peer?: EntityLike;
    constructor(deletedIds: number[], peer?: EntityLike);
}
