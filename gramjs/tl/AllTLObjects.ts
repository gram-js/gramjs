export const LAYER = 143;

import { Api } from "./api";

const tlobjects: any = {};

for (const tl of Object.values(Api)) {
    if ("CONSTRUCTOR_ID" in tl) {
        tlobjects[tl.CONSTRUCTOR_ID] = tl;
    } else {
        for (const sub of Object.values(tl)) {
            tlobjects[sub.CONSTRUCTOR_ID] = sub;
        }
    }
}
export { tlobjects };
