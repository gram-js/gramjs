class EventBuilder {
    constructor(args = {
        chats: null,
        blacklistChats: null,
        func: null,
    }) {
        this.chats = args.chats
        this.blacklistChats = Boolean(args.blacklistChats)
        this.resolved = false
        this.func = args.func
    }

    build() {

    }
}

class EventCommon {

}

module.exports = { EventBuilder, EventCommon }
