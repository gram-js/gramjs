import { Api } from "../tl";
import { RequestIter } from "../requestIter";
import { TelegramClient } from "../index";
import { Dialog } from "../tl/custom/dialog";
import { DateLike, EntityLike } from "../define";
import { TotalList } from "../Helpers";
export interface DialogsIterInterface {
    offsetDate: number;
    offsetId: number;
    offsetPeer: Api.TypePeer;
    ignorePinned: boolean;
    ignoreMigrated: boolean;
    folder: number;
}
export declare class _DialogsIter extends RequestIter {
    private request?;
    private seen?;
    private offsetDate?;
    private ignoreMigrated?;
    _init({ offsetDate, offsetId, offsetPeer, ignorePinned, ignoreMigrated, folder, }: DialogsIterInterface): Promise<true | undefined>;
    [Symbol.asyncIterator](): AsyncIterator<Dialog, any, undefined>;
    _loadNextChunk(): Promise<boolean | undefined>;
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
export declare function iterDialogs(client: TelegramClient, { limit, offsetDate, offsetId, offsetPeer, ignorePinned, ignoreMigrated, folder, archived, }: IterDialogsParams): _DialogsIter;
/** @hidden */
export declare function getDialogs(client: TelegramClient, params: IterDialogsParams): Promise<TotalList<Dialog>>;
