import {EventBuilder, EventCommon} from "./common";
import type {TelegramClient} from "../client/TelegramClient";
import {Api} from "../tl";

interface RawInterface {
    types?: Function[],
    func?: CallableFunction
}

export class Raw extends EventBuilder {
    private types?: Function[];

    constructor({types = undefined, func = undefined}: RawInterface) {
        super({func: func});
        this.types = types;
    }

    async resolve(client: TelegramClient) {
        this.resolved = true;
    }

    build(update: Api.TypeUpdate, others: any = null): Api.TypeUpdate {
        return update
    }

    filter(event: EventCommon) {

        if (this.types) {
            let correct = false;
            for (const type of this.types) {
                if (event instanceof type) {
                    correct = true;
                    break
                }
            }
            if (!correct) {
                return;
            }
        }
        if (this.func) {
            return this.func(event);
        }
        return event;
    }
}
