export const isDeno = "Deno" in globalThis;
export const isBrowser = !isDeno && typeof self !== "undefined";
export const isNode = !isBrowser;
