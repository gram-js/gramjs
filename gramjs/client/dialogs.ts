import { Api } from "../tl";
import { RequestIter } from "../requestIter";
import { TelegramClient, utils } from "../index";
import { Dialog } from "../tl/custom/dialog";
import { DateLike, EntityLike } from "../define";
import { TotalList } from "../Helpers";
import bigInt from "big-integer";
import { LogLevel } from "../extensions/Logger";

const _MAX_CHUNK_SIZE = 100;

/**
 Get the key to get messages from a dialog.

 We cannot just use the message ID because channels share message IDs,
 and the peer ID is required to distinguish between them. But it is not
 necessary in small group chats and private chats.
 * @param {Api.TypePeer} [peer] the dialog peer
 * @param {number} [messageId] the message id
 * @return {[number,number]} the channel id and message id
 */
function _dialogMessageKey(peer: Api.TypePeer, messageId: number): string {
    // can't use arrays as keys for map :( need to convert to string.
    return (
        "" +
        [
            peer instanceof Api.PeerChannel ? peer.channelId : undefined,
            messageId,
        ]
    );
}

export interface DialogsIterInterface {
    offsetDate: number;
    offsetId: number;
    offsetPeer: Api.TypePeer;
    ignorePinned: boolean;
    ignoreMigrated: boolean;
    folder: number;
}

export class _DialogsIter extends RequestIter {
    private request?: Api.messages.GetDialogs;
    private seen?: Set<any>;
    private offsetDate?: number;
    private ignoreMigrated?: boolean;

    async _init({
        offsetDate,
        offsetId,
        offsetPeer,
        ignorePinned,
        ignoreMigrated,
        folder,
    }: DialogsIterInterface) {
        this.request = new Api.messages.GetDialogs({
            offsetDate,
            offsetId,
            offsetPeer,
            limit: 1,
            hash: bigInt.zero,
            excludePinned: ignorePinned,
            folderId: folder,
        });
        if (this.limit <= 0) {
            // Special case, get a single dialog and determine count
            const dialogs = await this.client.invoke(this.request);
            if ("count" in dialogs) {
                this.total = dialogs.count;
            } else {
                this.total = dialogs.dialogs.length;
            }

            return true;
        }

        this.seen = new Set();
        this.offsetDate = offsetDate;
        this.ignoreMigrated = ignoreMigrated;
    }
    [Symbol.asyncIterator](): AsyncIterator<Dialog, any, undefined> {
        return super[Symbol.asyncIterator]();
    }

    async _loadNextChunk(): Promise<boolean | undefined> {
        if (!this.request || !this.seen || !this.buffer) {
            return;
        }
        this.request.limit = Math.min(this.left, _MAX_CHUNK_SIZE);
        const r = await this.client.invoke(this.request);
        if (r instanceof Api.messages.DialogsNotModified) {
            return;
        }
        if ("count" in r) {
            this.total = r.count;
        } else {
            this.total = r.dialogs.length;
        }
        const entities = new Map<string, Api.TypeUser | Api.TypeChat>();
        const messages = new Map<string, Api.Message>();

        for (const entity of [...r.users, ...r.chats]) {
            if (
                entity instanceof Api.UserEmpty ||
                entity instanceof Api.ChatEmpty
            ) {
                continue;
            }
            entities.set(utils.getPeerId(entity), entity);
        }
        for (const m of r.messages) {
            let message = m as unknown as Api.Message;
            try {
                if (message && "_finishInit" in message) {
                    // todo make sure this never fails
                    message._finishInit(this.client, entities, undefined);
                }
            } catch (e) {
                console.log("msg", message);

                this.client._log.error(
                    "Got error while trying to finish init message with id " +
                        m.id
                );
                if (this.client._log.canSend(LogLevel.ERROR)) {
                    console.error(e);
                }
                if (this.client._errorHandler) {
                    await this.client._errorHandler(e as Error);
                }
            }
            messages.set(
                _dialogMessageKey(message.peerId!, message.id),
                message
            );
        }

        for (const d of r.dialogs) {
            if (d instanceof Api.DialogFolder) {
                continue;
            }
            const message = messages.get(
                _dialogMessageKey(d.peer, d.topMessage)
            );
            if (this.offsetDate != undefined) {
                const date = message?.date!;
                if (date == undefined || date > this.offsetDate) {
                    continue;
                }
            }
            const peerId = utils.getPeerId(d.peer);
            if (!this.seen.has(peerId)) {
                this.seen.add(peerId);
                if (!entities.has(peerId)) {
                    /*
                     > In which case can a UserEmpty appear in the list of banned members?
                     > In a very rare cases. This is possible but isn't an expected behavior.
                     Real world example: https://t.me/TelethonChat/271471
                     */
                    continue;
                }
                const cd = new Dialog(this.client, d, entities, message);
                if (
                    !this.ignoreMigrated ||
                    (cd.entity != undefined && "migratedTo" in cd.entity)
                ) {
                    this.buffer.push(cd);
                }
            }
        }
        if (
            r.dialogs.length < this.request.limit ||
            !(r instanceof Api.messages.DialogsSlice)
        ) {
            return true;
        }
        let lastMessage;
        for (let dialog of r.dialogs.reverse()) {
            lastMessage = messages.get(
                _dialogMessageKey(dialog.peer, dialog.topMessage)
            );
            if (lastMessage) {
                break;
            }
        }
        this.request.excludePinned = true;
        this.request.offsetId = lastMessage ? lastMessage.id : 0;
        this.request.offsetDate = lastMessage ? lastMessage.date! : 0;
        this.request.offsetPeer =
            this.buffer[this.buffer.length - 1]?.inputEntity;
    }
}

/** interface for iterating and getting dialogs. */
export interface IterDialogsParams {
    /**  How many dialogs to be retrieved as maximum. Can be set to undefined to retrieve all dialogs.<br/>
     * Note that this may take whole minutes if you have hundreds of dialogs, as Telegram will tell the library to slow down through a FloodWaitError.*/
    limit?: number;
    /** The offset date of last message of dialog to be used. */
    offsetDate?: DateLike;
    /** The message ID to be used as offset. */
    offsetId?: number;
    /** offset Peer to be used (defaults to Empty = no offset) */
    offsetPeer?: EntityLike;
    /** Whether pinned dialogs should be ignored or not. When set to true, these won't be yielded at all. */
    ignorePinned?: boolean;
    /**  Whether Chat that have migratedTo a Supergroup should be included or not.<br/>
     * By default all the chats in your dialogs are returned, but setting this to True will ignore (i.e. skip) them in the same way official applications do.*/
    ignoreMigrated?: boolean;
    /** The folder from which the dialogs should be retrieved.<br/>
     * If left unspecified, all dialogs (including those from folders) will be returned.<br/>
     * If set to 0, all dialogs that don't belong to any folder will be returned.<br/>
     * If set to a folder number like 1, only those from said folder will be returned.<br/>
     * By default Telegram assigns the folder ID 1 to archived chats, so you should use that if you need to fetch the archived dialogs.<br/> */
    folder?: number;
    /**  Alias for folder. If unspecified, all will be returned, false implies `folder:0` and True implies `folder:1`.*/
    archived?: boolean;
}

/** @hidden */
export function iterDialogs(
    client: TelegramClient,
    {
        limit = undefined,
        offsetDate = undefined,
        offsetId = 0,
        offsetPeer = new Api.InputPeerEmpty(),
        ignorePinned = false,
        ignoreMigrated = false,
        folder = undefined,
        archived = undefined,
    }: IterDialogsParams
): _DialogsIter {
    if (archived != undefined) {
        folder = archived ? 1 : 0;
    }

    return new _DialogsIter(
        client,
        limit,
        {},
        {
            offsetDate,
            offsetId,
            offsetPeer,
            ignorePinned,
            ignoreMigrated,
            folder,
        }
    );
}

/** @hidden */
export async function getDialogs(
    client: TelegramClient,
    params: IterDialogsParams
): Promise<TotalList<Dialog>> {
    return (await client.iterDialogs(params).collect()) as TotalList<Dialog>;
}
