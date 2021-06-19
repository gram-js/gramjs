import { EventBuilder, EventCommon } from "./common";
import type { TelegramClient } from "..";
import { Api } from "../tl";

export interface RawInterface {
    /**
     * The types that the {@link Api.TypeUpdate} instance must be.
     * Equivalent to ``if (update instanceof type) return update``.
     */
    types?: Function[];
    func?: CallableFunction;
}

/**
 * The RAW updates that telegram sends. these are {@link Api.TypeUpdate} objects.
 * The are useful to handle custom events that you need like user typing or games.
 * @example
 * ```ts
 * client.addEventHandler((update) => {
 *   console.log("Received new Update");
 *   console.log(update);
 * });
 * ```
 */
export class Raw extends EventBuilder {
    private readonly types?: Function[];

    constructor(params: RawInterface) {
        super({ func: params.func });
        this.types = params.types;
    }

    async resolve(client: TelegramClient) {
        this.resolved = true;
    }

    build(update: Api.TypeUpdate, others: any = null): Api.TypeUpdate {
        return update;
    }

    filter(event: EventCommon) {
        if (this.types) {
            let correct = false;
            for (const type of this.types) {
                if (event instanceof type) {
                    correct = true;
                    break;
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
