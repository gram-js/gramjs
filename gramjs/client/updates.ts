import type { EventBuilder } from "../events/common";
import { Api } from "../tl";
import type { TelegramClient } from "../";
import { UpdateConnectionState } from "../network";
import type { Raw } from "../events";
import { utils } from "../index";
import { getRandomInt, returnBigInt, sleep } from "../Helpers";
import { LogLevel } from "../extensions/Logger";
import Timeout = NodeJS.Timeout;

const PING_INTERVAL = 9000; // 9 sec
const PING_TIMEOUT = 10000; // 10 sec
const PING_FAIL_ATTEMPTS = 3;
const PING_FAIL_INTERVAL = 100; // ms
const PING_DISCONNECT_DELAY = 60000; // 1 min
// An unusually long interval is a sign of returning from background mode...
const PING_INTERVAL_TO_WAKE_UP = 5000; // 5 sec
// ... so we send a quick "wake-up" ping to confirm than connection was dropped ASAP
const PING_WAKE_UP_TIMEOUT = 3000; // 3 sec
// We also send a warning to the user even a bit more quickly
const PING_WAKE_UP_WARNING_TIMEOUT = 1000; // 1 sec

/**
 If this exception is raised in any of the handlers for a given event,
 it will stop the execution of all other registered event handlers.
 It can be seen as the ``StopIteration`` in a for loop but for events.
 */
export class StopPropagation extends Error {}

/** @hidden */
export function on(client: TelegramClient, event?: EventBuilder) {
    return (f: { (event: any): void }) => {
        client.addEventHandler(f, event);
        return f;
    };
}

/** @hidden */
export function addEventHandler(
    client: TelegramClient,
    callback: CallableFunction,
    event?: EventBuilder
) {
    if (event == undefined) {
        // recursive imports :(
        const raw = require("../events/Raw").Raw;
        event = new raw({}) as Raw;
    }
    event.client = client;
    client._eventBuilders.push([event, callback]);
}

/** @hidden */
export function removeEventHandler(
    client: TelegramClient,
    callback: CallableFunction,
    event: EventBuilder
) {
    client._eventBuilders = client._eventBuilders.filter(function (item) {
        return item[0] !== event && item[1] !== callback;
    });
}

/** @hidden */
export function listEventHandlers(client: TelegramClient) {
    return client._eventBuilders;
}

/** @hidden */
export function catchUp() {
    // TODO
}

/** @hidden */
export function _handleUpdate(
    client: TelegramClient,
    update: Api.TypeUpdate | number
): void {
    if (typeof update === "number") {
        if ([-1, 0, 1].includes(update)) {
            _dispatchUpdate(client, {
                update: new UpdateConnectionState(update),
            });
            return;
        }
    }

    //this.session.processEntities(update)
    client._entityCache.add(update);
    client.session.processEntities(update);

    if (
        update instanceof Api.Updates ||
        update instanceof Api.UpdatesCombined
    ) {
        // TODO deal with entities
        const entities = new Map();
        for (const x of [...update.users, ...update.chats]) {
            entities.set(utils.getPeerId(x), x);
        }
        for (const u of update.updates) {
            _processUpdate(client, u, update.updates, entities);
        }
    } else if (update instanceof Api.UpdateShort) {
        _processUpdate(client, update.update, null);
    } else {
        _processUpdate(client, update, null);
    }
}

/** @hidden */
export function _processUpdate(
    client: TelegramClient,
    update: any,
    others: any,
    entities?: any
) {
    update._entities = entities || new Map();
    const args = {
        update: update,
        others: others,
    };

    _dispatchUpdate(client, args);
}

/** @hidden */
export async function _dispatchUpdate(
    client: TelegramClient,
    args: { update: UpdateConnectionState | any }
): Promise<void> {
    for (const [builder, callback] of client._eventBuilders) {
        if (!builder || !callback) {
            continue;
        }
        if (!builder.resolved) {
            await builder.resolve(client);
        }
        let event = args.update;
        if (event) {
            if (!client._selfInputPeer) {
                try {
                    await client.getMe(true);
                } catch (e) {
                    // do nothing
                }
            }
            if (!(event instanceof UpdateConnectionState)) {
                // TODO fix me
            }
            // TODO fix others not being passed
            event = builder.build(
                event,
                callback,
                client._selfInputPeer
                    ? returnBigInt(client._selfInputPeer.userId)
                    : undefined
            );
            if (event) {
                event._client = client;

                if ("_eventName" in event) {
                    event._setClient(client);
                    event.originalUpdate = args.update;
                    event._entities = args.update._entities;
                }
                const filter = await builder.filter(event);
                if (!filter) {
                    continue;
                }
                try {
                    await callback(event);
                } catch (e) {
                    if (e instanceof StopPropagation) {
                        break;
                    }
                    if (client._errorHandler) {
                        await client._errorHandler(e as Error);
                    }
                    if (client._log.canSend(LogLevel.ERROR)) {
                        console.error(e);
                    }
                }
            }
        }
    }
}

/** @hidden */
export async function _updateLoop(client: TelegramClient) {
    let lastPongAt;
    while (!client._destroyed) {
        await sleep(PING_INTERVAL, true);
        if (client._destroyed) break;
        if (client._sender!.isReconnecting || client._isSwitchingDc) {
            lastPongAt = undefined;
            continue;
        }

        try {
            const ping = () => {
                return client._sender!.send(
                    new Api.PingDelayDisconnect({
                        pingId: returnBigInt(
                            getRandomInt(
                                Number.MIN_SAFE_INTEGER,
                                Number.MAX_SAFE_INTEGER
                            )
                        ),
                        disconnectDelay: PING_DISCONNECT_DELAY,
                    })
                );
            };

            const pingAt = Date.now();
            const lastInterval = lastPongAt ? pingAt - lastPongAt : undefined;

            if (!lastInterval || lastInterval < PING_INTERVAL_TO_WAKE_UP) {
                await attempts(
                    () => timeout(ping, PING_TIMEOUT),
                    PING_FAIL_ATTEMPTS,
                    PING_FAIL_INTERVAL
                );
            } else {
                let wakeUpWarningTimeout: Timeout | undefined | number =
                    setTimeout(() => {
                        _handleUpdate(
                            client,
                            UpdateConnectionState.disconnected
                        );
                        wakeUpWarningTimeout = undefined;
                    }, PING_WAKE_UP_WARNING_TIMEOUT);

                await timeout(ping, PING_WAKE_UP_TIMEOUT);

                if (wakeUpWarningTimeout) {
                    clearTimeout(wakeUpWarningTimeout);
                    wakeUpWarningTimeout = undefined;
                }

                _handleUpdate(client, UpdateConnectionState.connected);
            }

            lastPongAt = Date.now();
        } catch (err) {
            // eslint-disable-next-line no-console
            if (client._errorHandler) {
                await client._errorHandler(err as Error);
            }
            if (client._log.canSend(LogLevel.ERROR)) {
                console.error(err);
            }

            lastPongAt = undefined;

            if (client._sender!.isReconnecting || client._isSwitchingDc) {
                continue;
            }
            client._sender!.reconnect();
        }

        // We need to send some content-related request at least hourly
        // for Telegram to keep delivering updates, otherwise they will
        // just stop even if we're connected. Do so every 30 minutes.

        if (Date.now() - (client._lastRequest || 0) > 30 * 60 * 1000) {
            try {
                await client.invoke(new Api.updates.GetState());
            } catch (e) {
                // we don't care about errors here
            }

            lastPongAt = undefined;
        }
    }
    await client.disconnect();
}

/** @hidden */
async function attempts(cb: CallableFunction, times: number, pause: number) {
    for (let i = 0; i < times; i++) {
        try {
            // We need to `return await` here so it can be caught locally
            return await cb();
        } catch (err: any) {
            if (i === times - 1) {
                throw err;
            }

            await sleep(pause);
        }
    }
    return undefined;
}

/** @hidden */
function timeout(cb: any, ms: any) {
    let isResolved = false;

    return Promise.race([
        cb(),
        sleep(ms).then(() =>
            isResolved ? undefined : Promise.reject(new Error("TIMEOUT"))
        ),
    ]).finally(() => {
        isResolved = true;
    });
}
