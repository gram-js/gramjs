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
export declare class Raw extends EventBuilder {
    private readonly types?;
    constructor(params: RawInterface);
    resolve(client: TelegramClient): Promise<void>;
    build(update: Api.TypeUpdate): Api.TypeUpdate;
    filter(event: EventCommon): EventCommon | import("./common").EventCommonSender | undefined;
}
