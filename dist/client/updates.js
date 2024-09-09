"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._updateLoop = exports._dispatchUpdate = exports._processUpdate = exports._handleUpdate = exports.catchUp = exports.listEventHandlers = exports.removeEventHandler = exports.addEventHandler = exports.on = exports.StopPropagation = void 0;
const tl_1 = require("../tl");
const network_1 = require("../network");
const index_1 = require("../index");
const Helpers_1 = require("../Helpers");
const Logger_1 = require("../extensions/Logger");
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
class StopPropagation extends Error {
}
exports.StopPropagation = StopPropagation;
/** @hidden */
function on(client, event) {
    return (f) => {
        client.addEventHandler(f, event);
        return f;
    };
}
exports.on = on;
/** @hidden */
function addEventHandler(client, callback, event) {
    if (event == undefined) {
        // recursive imports :(
        const raw = require("../events/Raw").Raw;
        event = new raw({});
    }
    event.client = client;
    client._eventBuilders.push([event, callback]);
}
exports.addEventHandler = addEventHandler;
/** @hidden */
function removeEventHandler(client, callback, event) {
    client._eventBuilders = client._eventBuilders.filter(function (item) {
        return item[0] !== event && item[1] !== callback;
    });
}
exports.removeEventHandler = removeEventHandler;
/** @hidden */
function listEventHandlers(client) {
    return client._eventBuilders;
}
exports.listEventHandlers = listEventHandlers;
/** @hidden */
function catchUp() {
    // TODO
}
exports.catchUp = catchUp;
/** @hidden */
function _handleUpdate(client, update) {
    if (typeof update === "number") {
        if ([-1, 0, 1].includes(update)) {
            _dispatchUpdate(client, {
                update: new network_1.UpdateConnectionState(update),
            });
            return;
        }
    }
    //this.session.processEntities(update)
    client._entityCache.add(update);
    client.session.processEntities(update);
    if (update instanceof tl_1.Api.Updates ||
        update instanceof tl_1.Api.UpdatesCombined) {
        // TODO deal with entities
        const entities = new Map();
        for (const x of [...update.users, ...update.chats]) {
            entities.set(index_1.utils.getPeerId(x), x);
        }
        for (const u of update.updates) {
            _processUpdate(client, u, update.updates, entities);
        }
    }
    else if (update instanceof tl_1.Api.UpdateShort) {
        _processUpdate(client, update.update, null);
    }
    else {
        _processUpdate(client, update, null);
    }
}
exports._handleUpdate = _handleUpdate;
/** @hidden */
function _processUpdate(client, update, others, entities) {
    update._entities = entities || new Map();
    const args = {
        update: update,
        others: others,
    };
    _dispatchUpdate(client, args);
}
exports._processUpdate = _processUpdate;
/** @hidden */
async function _dispatchUpdate(client, args) {
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
                }
                catch (e) {
                    // do nothing
                }
            }
            if (!(event instanceof network_1.UpdateConnectionState)) {
                // TODO fix me
            }
            // TODO fix others not being passed
            event = builder.build(event, callback, client._selfInputPeer
                ? (0, Helpers_1.returnBigInt)(client._selfInputPeer.userId)
                : undefined);
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
                }
                catch (e) {
                    if (e instanceof StopPropagation) {
                        break;
                    }
                    if (client._errorHandler) {
                        await client._errorHandler(e);
                    }
                    if (client._log.canSend(Logger_1.LogLevel.ERROR)) {
                        console.error(e);
                    }
                }
            }
        }
    }
}
exports._dispatchUpdate = _dispatchUpdate;
/** @hidden */
async function _updateLoop(client) {
    let lastPongAt;
    while (!client._destroyed) {
        await (0, Helpers_1.sleep)(PING_INTERVAL, true);
        if (client._destroyed)
            break;
        if (client._sender.isReconnecting || client._isSwitchingDc) {
            lastPongAt = undefined;
            continue;
        }
        try {
            const ping = () => {
                return client._sender.send(new tl_1.Api.PingDelayDisconnect({
                    pingId: (0, Helpers_1.returnBigInt)((0, Helpers_1.getRandomInt)(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)),
                    disconnectDelay: PING_DISCONNECT_DELAY,
                }));
            };
            const pingAt = Date.now();
            const lastInterval = lastPongAt ? pingAt - lastPongAt : undefined;
            if (!lastInterval || lastInterval < PING_INTERVAL_TO_WAKE_UP) {
                await attempts(() => timeout(ping, PING_TIMEOUT), PING_FAIL_ATTEMPTS, PING_FAIL_INTERVAL);
            }
            else {
                let wakeUpWarningTimeout = setTimeout(() => {
                    _handleUpdate(client, network_1.UpdateConnectionState.disconnected);
                    wakeUpWarningTimeout = undefined;
                }, PING_WAKE_UP_WARNING_TIMEOUT);
                await timeout(ping, PING_WAKE_UP_TIMEOUT);
                if (wakeUpWarningTimeout) {
                    clearTimeout(wakeUpWarningTimeout);
                    wakeUpWarningTimeout = undefined;
                }
                _handleUpdate(client, network_1.UpdateConnectionState.connected);
            }
            lastPongAt = Date.now();
        }
        catch (err) {
            // eslint-disable-next-line no-console
            if (client._errorHandler) {
                await client._errorHandler(err);
            }
            if (client._log.canSend(Logger_1.LogLevel.ERROR)) {
                console.error(err);
            }
            lastPongAt = undefined;
            if (client._sender.isReconnecting || client._isSwitchingDc) {
                continue;
            }
            client._sender.reconnect();
        }
        // We need to send some content-related request at least hourly
        // for Telegram to keep delivering updates, otherwise they will
        // just stop even if we're connected. Do so every 30 minutes.
        if (Date.now() - (client._lastRequest || 0) > 30 * 60 * 1000) {
            try {
                await client.invoke(new tl_1.Api.updates.GetState());
            }
            catch (e) {
                // we don't care about errors here
            }
            lastPongAt = undefined;
        }
    }
    await client.disconnect();
}
exports._updateLoop = _updateLoop;
/** @hidden */
async function attempts(cb, times, pause) {
    for (let i = 0; i < times; i++) {
        try {
            // We need to `return await` here so it can be caught locally
            return await cb();
        }
        catch (err) {
            if (i === times - 1) {
                throw err;
            }
            await (0, Helpers_1.sleep)(pause);
        }
    }
    return undefined;
}
/** @hidden */
function timeout(cb, ms) {
    let isResolved = false;
    return Promise.race([
        cb(),
        (0, Helpers_1.sleep)(ms).then(() => isResolved ? undefined : Promise.reject(new Error("TIMEOUT"))),
    ]).finally(() => {
        isResolved = true;
    });
}
