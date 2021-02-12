import {Api} from "../tl";

export class EventBuilder {
    private chats: undefined;
    private blacklistChats: boolean;
    private resolved: boolean;
    private func: undefined;

    constructor({
                    chats = undefined, blacklistChats = false, func = undefined,
                },
    ) {
        this.chats = chats;
        this.blacklistChats = blacklistChats;
        this.resolved = false;
        this.func = func
    }

    build(update: Api.Updates, others = null) {

    }
}

export class EventCommon {

}

