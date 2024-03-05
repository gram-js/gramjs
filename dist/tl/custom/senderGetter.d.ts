/// <reference types="node" />
import type { Entity } from "../../define";
import type { TelegramClient } from "../..";
import { Api } from "../api";
import { ChatGetter } from "./chatGetter";
import bigInt from "big-integer";
import { inspect } from "../../inspect";
interface SenderGetterConstructorInterface {
    senderId?: bigInt.BigInteger;
    sender?: Entity;
    inputSender?: Api.TypeInputPeer;
}
export declare class SenderGetter extends ChatGetter {
    _senderId?: bigInt.BigInteger;
    _sender?: Entity;
    _inputSender?: Api.TypeInputPeer;
    _client?: TelegramClient;
    [inspect.custom](): {
        [key: string]: any;
    };
    static initSenderClass(c: any, { senderId, sender, inputSender }: SenderGetterConstructorInterface): void;
    get sender(): Entity | undefined;
    getSender(): Promise<Entity | undefined>;
    get inputSender(): Api.TypeInputPeer | undefined;
    getInputSender(): Promise<Api.TypeInputPeer | undefined>;
    get senderId(): bigInt.BigInteger | undefined;
    _refetchSender(): Promise<void>;
}
export {};
