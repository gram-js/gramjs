"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Raw = void 0;
const common_1 = require("./common");
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
class Raw extends common_1.EventBuilder {
    constructor(params) {
        super({ func: params.func });
        this.types = params.types;
    }
    async resolve(client) {
        this.resolved = true;
    }
    build(update) {
        return update;
    }
    filter(event) {
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
        return super.filter(event);
    }
}
exports.Raw = Raw;
