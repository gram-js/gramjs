export const isDeno = "Deno" in globalThis;
export const isCloudflareWorker = typeof navigator !== "undefined" ? navigator.userAgent == "Cloudflare-Workers" : false //https://developers.cloudflare.com/workers/runtime-apis/web-standards/#navigatoruseragent
export const isBrowser = !isDeno && typeof window !== "undefined";
export const isNode = !isBrowser;