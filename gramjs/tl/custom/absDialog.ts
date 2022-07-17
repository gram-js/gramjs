import { Api } from "../api";
import { Draft } from "./draft";
import bigInt from "big-integer";

export abstract class Dialog {
    abstract dialog: Api.Dialog;
    abstract pinned: boolean;
    abstract folderId?: number;
    abstract archived: boolean;
    abstract message?: Api.Message;
    abstract date: number;
    abstract entity?: Api.TypeEntity;
    abstract inputEntity: Api.TypeInputPeer;
    abstract id?: bigInt.BigInteger;
    abstract name?: string;
    abstract title?: string;
    abstract unreadCount: number;
    abstract unreadMentionsCount: number;
    abstract draft: Draft;
    abstract isUser: boolean;
    abstract isGroup: boolean;
    abstract isChannel: boolean;
}
