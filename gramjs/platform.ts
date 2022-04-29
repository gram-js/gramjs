export const isDeno = "Deno" in globalThis;
export const isBrowser = !isDeno && typeof window !== "undefined";
export const isNode = !isBrowser;
