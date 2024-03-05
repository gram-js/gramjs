"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNode = exports.isBrowser = exports.isDeno = void 0;
exports.isDeno = "Deno" in globalThis;
exports.isBrowser = !exports.isDeno && typeof window !== "undefined";
exports.isNode = !exports.isBrowser;
