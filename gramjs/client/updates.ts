import {EventBuilder} from "../events/common";
import {Api} from "../tl";
import {UserMethods} from "./users";
import {TelegramBaseClient} from "./telegramBaseClient";
import {helpers} from "../index";
import bigInt from 'big-integer';
import {UpdateConnectionState} from "../network";
import {Message} from "../tl/custom/message";
import {getMessageId, getPeerId} from "../Utils";

export class UpdateMethods {
    on(event: any) {
        return (f: CallableFunction) => {
            this.addEventHandler(f, event);
            return f;
        }
    }

    addEventHandler(callback: CallableFunction, event?: EventBuilder) {
        // TODO; add actual handling
        this._eventBuilders.push([event, callback])
    }

    removeEventHandler(callback: CallableFunction, event: EventBuilder) {
        this._eventBuilders = this._eventBuilders.filter(function (item) {
            return item !== [event, callback]
        })
    }

    listEventHandlers() {
        return this._eventBuilders;
    }

    catchUp() {
        // TODO
    }

    _handleUpdate(update: Api.TypeUpdate | number):void {
        if (typeof update === 'number') {
            if ([-1, 0, 1].includes(update)) {
                this._dispatchUpdate({update: new UpdateConnectionState(update)})
                return
            }
        }

        //this.session.processEntities(update)
        this._entityCache.add(update);
        this.session.processEntities(update);

        if (update instanceof Api.Updates || update instanceof Api.UpdatesCombined) {
            // TODO deal with entities
            const entities = []
            for (const x of [...update.users, ...update.chats]) {
                entities.push(x)
            }
            for (const u of update.updates) {
                this._processUpdate(u, update.updates, entities)
            }
        } else if (update instanceof Api.UpdateShort) {
            this._processUpdate(update.update, null)
        } else {
            this._processUpdate(update, null)
        }
        // TODO add caching
        // this._stateCache.update(update)
    }

    _processUpdate(update: any, others: any, entities?: any) {
        update._entities = entities || {};
        const args = {
            update: update,
            others: others,
        }
        this._dispatchUpdate(args)
    }

    async _dispatchUpdate(args: { update: UpdateConnectionState | any }):Promise<void> {
        for (const [builder, callback] of this._eventBuilders) {
            let event = args.update;
            if (event) {
                if (!this._selfInputPeer) {
                    await this.getMe(true)
                }
                if (!(event instanceof UpdateConnectionState)) {
                    if ('message' in event) {
                        event = new Message({
                            id: event.message.id,
                            peerId: await this._getPeer(event.message.peerId),
                            message: event.message,
                            date: event.message.date,
                            out: event.message.out,
                            media: event.message.media,
                            entities: event.message.entities,
                            replyMarkup: event.message.replyMarkup,
                            _entities: event._entities,
                        });
                        const entities = new Map();
                        for (const entity of event._entities) {
                            entities.set(getPeerId(entity), entity)
                        }
                        event._finishInit(this, entities);
                    }
                }
                await callback(event)
            }
        }
    }

    async _updateLoop():Promise<void> {
        while (this.connected) {
            const rnd = helpers.getRandomInt(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
            await helpers.sleep(1000 * 60)
            // We don't care about the result we just want to send it every
            // 60 seconds so telegram doesn't stop the connection
            try {
                this._sender.send(new Api.Ping({
                    pingId: bigInt(rnd),
                }))
            } catch (e) {

            }

            // We need to send some content-related request at least hourly
            // for Telegram to keep delivering updates, otherwise they will
            // just stop even if we're connected. Do so every 30 minutes.

            // TODO Call getDifference instead since it's more relevant
            if (!this._lastRequest  || new Date().getTime() - this._lastRequest > 30 * 60 * 1000) {
                try {
                    await this.invoke(new Api.updates.GetState())
                } catch (e) {

                }
            }
        }
    }


}

export interface UpdateMethods extends UserMethods, TelegramBaseClient {
}

