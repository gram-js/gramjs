// Which updates have the following fields?

import {getInputPeer, getPeerId, isArrayLike} from "./Utils";
import {Api} from "./tl";

export class EntityCache {
    private cacheMap: Map<number, any>;

    constructor() {
        this.cacheMap = new Map();
    }

    add(entities: any) {

        const temp = [];
        if (!isArrayLike(entities)) {

            if ('chats' in entities) {
                temp.push(...entities.chats)
            }
            if ('users' in entities) {
                temp.push(...entities.users)
            }
            if ('user' in entities) {
                temp.push(entities.user)
            }
            if (temp.length) {
                entities = temp;
            } else {
                return;
            }
        }
        for (const entity of entities) {
            try {
                const pid = getPeerId(entity);
                if (!this.cacheMap.has(pid)) {
                    this.cacheMap.set(pid, getInputPeer(entity));
                }
            } catch (e) {

            }
        }
    }

    get(item: any) {
        if (!(typeof item === 'number') || item < 0) {
            let res;
            try {
                res = this.cacheMap.get(getPeerId(item));
                if (res) {
                    return res;
                }
            } catch (e) {
                throw new Error('Invalid key will not have entity')
            }
        }
        for (const cls of [Api.PeerUser, Api.PeerChat, Api.PeerChannel]) {
            // TODO remove these "as"
            const result = this.cacheMap.get(getPeerId(new cls({
                userId: item as number,
                chatId: item as number,
                channelId: item as number
            })));
            if (result) {
                return result;
            }
        }
        throw new Error('No cached entity for the given key');
    }


}
