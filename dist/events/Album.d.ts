import { DefaultEventInterface, EventBuilder, EventCommon } from "./common";
import { Entity } from "../define";
import { Api } from "../tl";
import { TelegramClient } from "..";
/**
 * Occurs whenever an album (multiple grouped messages with media) arrive.
 * @example
 * ```ts
 * // Albums are basically a list of messages. so event is a list
 *   async function listenForAlbums(event: AlbumEvent) {
 *       const messages = event.messages;
 *       for (const message of messages){
 *           console.log("Caption is",message.text);
 *           console.log("Message id is",message.id);
 *           console.log("Chat id is",message.chatId);
 *       }
 *   }
 * // adds an event handler for new messages
 * client.addEventHandler(listenForAlbums, new Album({}));
 * ```
 */
export declare class Album extends EventBuilder {
    func?: {
        (event: Album): boolean;
    };
    constructor(albumParams: DefaultEventInterface);
    build(update: Api.TypeUpdate, dispatch?: CallableFunction): any;
}
export declare class AlbumEvent extends EventCommon {
    messages: Api.Message[];
    originalUpdates: (Api.TypeUpdate & {
        _entities?: Map<string, Entity>;
    })[];
    constructor(messages: Api.Message[], originalUpdates: Api.TypeUpdate[]);
    _setClient(client: TelegramClient): void;
}
