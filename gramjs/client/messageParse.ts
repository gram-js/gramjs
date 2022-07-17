import { getPeerId, sanitizeParseMode } from "../Utils";
import { Api } from "../tl/api";
import { AbstractTelegramClient } from "./AbstractTelegramClient";
import * as utils from "../Utils";
import { isArrayLike } from "../Helpers";
import { _EntityType, _entityType } from "../tl/helpers";
import bigInt from "big-integer";
import { ParseInterface } from "./types";

/** @hidden */
export function _getResponseMessage(
    client: AbstractTelegramClient,
    request: any,
    result: any,
    inputChat: any
) {
    let updates = [];

    let entities = new Map();
    if (result instanceof Api.UpdateShort) {
        updates = [result.update];
    } else if (
        result instanceof Api.Updates ||
        result instanceof Api.UpdatesCombined
    ) {
        updates = result.updates;
        for (const x of [...result.users, ...result.chats]) {
            entities.set(utils.getPeerId(x), x);
        }
    } else {
        return;
    }
    const randomToId = new Map<string, number>();
    const idToMessage = new Map<number, Api.Message>();
    let schedMessage;
    for (const update of updates) {
        if (update instanceof Api.UpdateMessageID) {
            randomToId.set(update.randomId!.toString(), update.id);
        } else if (
            update instanceof Api.UpdateNewChannelMessage ||
            update instanceof Api.UpdateNewMessage
        ) {
            (update.message as unknown as Api.Message)._finishInit(
                client,
                entities,
                inputChat
            );
            if ("randomId" in request || isArrayLike(request)) {
                idToMessage.set(
                    update.message.id,
                    update.message as unknown as Api.Message
                );
            } else {
                return update.message as unknown as Api.Message;
            }
        } else if (
            update instanceof Api.UpdateEditMessage &&
            "peer" in request &&
            _entityType(request.peer) != _EntityType.CHANNEL
        ) {
            (update.message as unknown as Api.Message)._finishInit(
                client,
                entities,
                inputChat
            );
            if ("randomId" in request) {
                idToMessage.set(
                    update.message.id,
                    update.message as unknown as Api.Message
                );
            } else if ("id" in request && request.id === update.message.id) {
                return update.message;
            }
        } else if (
            update instanceof Api.UpdateEditChannelMessage &&
            "peer" in request &&
            getPeerId(request.peer) ==
                getPeerId((update.message as unknown as Api.Message).peerId!)
        ) {
            if (request.id == update.message.id) {
                (update.message as unknown as Api.Message)._finishInit(
                    client,
                    entities,
                    inputChat
                );
                return update.message;
            }
        } else if (update instanceof Api.UpdateNewScheduledMessage) {
            (update.message as unknown as Api.Message)._finishInit(
                client,
                entities,
                inputChat
            );
            schedMessage = update.message as unknown as Api.Message;
            idToMessage.set(
                update.message.id,
                update.message as unknown as Api.Message
            );
        } else if (update instanceof Api.UpdateMessagePoll) {
            if (request.media.poll.id == update.pollId) {
                const m = new Api.Message({
                    id: request.id,
                    peerId: utils.getPeerId(request.peer),
                    media: new Api.MessageMediaPoll({
                        poll: update.poll!,
                        results: update.results,
                    }),
                    message: "",
                    date: 0,
                });
                m._finishInit(client, entities, inputChat);
                return m;
            }
        }
    }
    if (request == undefined) {
        return idToMessage;
    }
    let randomId;
    if (
        isArrayLike(request) ||
        typeof request == "number" ||
        bigInt.isInstance(request)
    ) {
        randomId = request;
    } else {
        randomId = request.randomId;
    }
    if (!randomId) {
        if (schedMessage) {
            return schedMessage;
        }
        client._log.warn(
            `No randomId in ${request} to map to. returning undefined for ${result}`
        );
        return undefined;
    }
    if (!isArrayLike(randomId)) {
        let msg = idToMessage.get(randomToId.get(randomId.toString())!);
        if (!msg) {
            client._log.warn(
                `Request ${request.className} had missing message mapping ${result.className}`
            );
        }
        return msg;
    }
    const final = [];
    let warned = false;
    for (const rnd of randomId) {
        const tmp = randomToId.get((rnd as any).toString());
        if (!tmp) {
            warned = true;
            break;
        }
        const tmp2 = idToMessage.get(tmp);
        if (!tmp2) {
            warned = true;
            break;
        }
        final.push(tmp2);
    }
    if (warned) {
        client._log.warn(
            `Request ${request.className} had missing message mapping ${result.className}`
        );
    }
    const finalToReturn = [];
    for (const rnd of randomId) {
        finalToReturn.push(
            idToMessage.get(randomToId.get((rnd as any).toString())!)
        );
    }

    return finalToReturn;
}
