"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tlobjects = exports.LAYER = void 0;
exports.LAYER = 165;
const _1 = require("./");
const tlobjects = {};
exports.tlobjects = tlobjects;
for (const tl of Object.values(_1.Api)) {
    if ("CONSTRUCTOR_ID" in tl) {
        tlobjects[tl.CONSTRUCTOR_ID] = tl;
    }
    else {
        for (const sub of Object.values(tl)) {
            tlobjects[sub.CONSTRUCTOR_ID] = sub;
        }
    }
}
