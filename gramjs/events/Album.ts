import { DefaultEventInterface, EventBuilder, EventCommon } from "./common";
import { Entity, EntityLike } from "../define";
import { Api } from "../tl";
import { TelegramClient } from "..";
import { LogLevel } from "../extensions/Logger";

const _ALBUM_DELAY = 500; // 0.5 sec

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
export class Album extends EventBuilder {
    func?: { (event: Album): boolean };

    constructor(albumParams: DefaultEventInterface) {
        let { chats, func, blacklistChats = false } = albumParams;
        super({ chats, blacklistChats, func });
    }

    build(update: Api.TypeUpdate, dispatch?: CallableFunction): any {
        if (!("message" in update && update.message instanceof Api.Message)) {
            return;
        }

        const groupedId = update.message.groupedId;
        if (!groupedId) {
            return;
        }
        const albums = this.client!._ALBUMS;
        const oldTimeout = albums.get(groupedId.toString());
        let oldValues: Api.TypeUpdate[] = [];
        if (oldTimeout) {
            clearTimeout(oldTimeout[0]);
            oldValues.push(...oldTimeout[1]);
        }
        albums.set(groupedId.toString(), [
            setTimeout(() => {
                const values = albums.get(groupedId.toString());
                albums.delete(groupedId.toString());
                if (!values) {
                    return;
                }
                const updates = values[1];

                if (!updates) {
                    return;
                }
                const messages: Api.Message[] = [];
                for (const update of updates) {
                    // there is probably an easier way
                    if (
                        "message" in update &&
                        update.message instanceof Api.Message
                    ) {
                        messages.push(update.message);
                    }
                }
                const event = new AlbumEvent(messages, values[1]);
                event._setClient(this.client!);
                event._entities = messages[0]._entities!;
                dispatch!(event);
            }, _ALBUM_DELAY),
            [...oldValues, update],
        ]);
    }
}

export class AlbumEvent extends EventCommon {
    messages: Api.Message[];
    originalUpdates: (Api.TypeUpdate & { _entities?: Map<string, Entity> })[];

    constructor(messages: Api.Message[], originalUpdates: Api.TypeUpdate[]) {
        super({
            msgId: messages[0].id,
            chatPeer: messages[0].peerId,
            broadcast: messages[0].post,
        });
        this.originalUpdates = originalUpdates;
        this.messages = messages;
    }

    _setClient(client: TelegramClient) {
        super._setClient(client);
        for (let i = 0; i < this.messages.length; i++) {
            try {
                // todo make sure this never fails
                this.messages[i]._finishInit(
                    client,
                    this.originalUpdates[i]._entities || new Map(),
                    undefined
                );
            } catch (e) {
                client._log.error(
                    "Got error while trying to finish init message with id " +
                        this.messages[i].id
                );
                if (client._errorHandler) {
                    client._errorHandler(e as Error);
                }
                if (client._log.canSend(LogLevel.ERROR)) {
                    console.error(e);
                }
            }
        }
    }
}
