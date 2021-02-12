import {Api} from "../tl";
import {Entity, EntityLike} from "../define";
import {getPeerId, isArrayLike} from "../Utils";
import {_entityType, _EntityType, sleep} from "../Helpers";
import {errors, utils} from "../index";
import {TelegramBaseClient} from "./telegramBaseClient";
import bigInt from 'big-integer';

export class UserMethods {
    // region Invoking Telegram request
    public _lastRequest?: number;

    /**
     * Invokes a MTProtoRequest (sends and receives it) and returns its result
     * @param request
     * @returns {Promise}
     */
    async invoke<R extends Api.AnyRequest>(request: R): Promise<R['__response']> {
        if (request.classType !== 'request') {
            throw new Error('You can only invoke MTProtoRequests')
        }
        // This causes issues for now because not enough utils
        // await request.resolve(this, utils)

        await request.resolve(this, utils);
        this._lastRequest = new Date().getTime();
        let attempt: number;
        for (attempt = 0; attempt < this._requestRetries; attempt++) {
            try {
                const promise = this._sender.send(request);
                const result = await promise;
                this.session.processEntities(result)
                this._entityCache.add(result);
                return result
            } catch (e) {
                if (e instanceof errors.ServerError || e.message === 'RPC_CALL_FAIL' ||
                    e.message === 'RPC_MCGET_FAIL') {
                    this._log.warn(`Telegram is having internal issues ${e.constructor.name}`);
                    await sleep(2000)
                } else if (e instanceof errors.FloodWaitError || e instanceof errors.FloodTestPhoneWaitError) {
                    if (e.seconds <= this.floodSleepThreshold) {
                        this._log.info(`Sleeping for ${e.seconds}s on flood wait`);
                        await sleep(e.seconds * 1000)
                    } else {
                        throw e
                    }
                } else if (e instanceof errors.PhoneMigrateError || e instanceof errors.NetworkMigrateError ||
                    e instanceof errors.UserMigrateError) {
                    this._log.info(`Phone migrated to ${e.newDc}`);
                    const shouldRaise = e instanceof errors.PhoneMigrateError || e instanceof errors.NetworkMigrateError;
                    if (shouldRaise && await this.isUserAuthorized()) {
                        throw e
                    }
                    await this._switchDC(e.newDc)
                } else {
                    throw e
                }
            }
        }
        throw new Error(`Request was unsuccessful ${attempt} time(s)`)
    }

    async getMe(inputPeer = false): Promise<Api.InputPeerUser | Api.User | undefined> {
        if (inputPeer && this._selfInputPeer) {
            return this._selfInputPeer;
        }
        try {
            const me = (await this.invoke(new Api.users
                .GetUsers({id: [new Api.InputUserSelf()]})))[0] as Api.User;
            this._bot = me.bot;

            if (!this._selfInputPeer) {
                this._selfInputPeer = utils.getInputPeer(me, true) as Api.InputPeerUser;
            }
            return inputPeer ? this._selfInputPeer : me;
        } catch (e) {
        }
    }

    async isBot() {
        if (this._bot === undefined) {
            const me = await this.getMe();
            if (me) {
                return !(me instanceof Api.InputPeerUser) ? me.bot : undefined;
            }
        }
        return this._bot;
    }

    async isUserAuthorized() {
        try {
            await this.invoke(new Api.updates.GetState());
            return true;
        } catch (e) {
            return false;
        }
    }

    async getEntity(entity: any): Promise<Entity> {
        const single = !isArrayLike(entity);

        if (single) {
            // TODO fix this
            // @ts-ignore
            entity = [entity];
        }
        const inputs = [];
        for (const x of entity) {
            if (typeof x === 'string') {
                inputs.push(x);
            } else {
                inputs.push(await this.getInputEntity(x));
            }
        }
        const lists = new Map<number, any[]>([
            [_EntityType.USER, []],
            [_EntityType.CHAT, []],
            [_EntityType.CHANNEL, []],
        ]);
        for (const x of inputs) {
            try {
                lists.get(_entityType(x))?.push(x);
            } catch (e) {

            }
        }
        let users = lists.get(_EntityType.USER);
        let chats = lists.get(_EntityType.CHAT);
        let channels = lists.get(_EntityType.CHANNEL);
        if (users) {
            const tmp = [];
            while (users) {
                let curr;
                [curr, users] = [users.slice(0, 200), users.slice(200)];
                tmp.push([...await this.invoke(new Api.users.GetUsers({
                    id: curr
                }))])
            }
            users = tmp;
        }
        if (chats) {
            const chatIds = chats.map((x) => x.chatId);
            chats = (await this.invoke(new Api.messages.GetChats({id: chatIds}))).chats;
        }
        if (channels) {
            channels = (await this.invoke(new Api.channels.GetChannels(({id: channels})))).chats;
        }
        const idEntity = new Map<number, any>();

        const res = [];
        if (users) {
            for (const user of users) {
                res.push([getPeerId(user), user])
            }
        }
        if (channels) {
            for (const channel of channels) {
                res.push([getPeerId(channel), channel])
            }
        }
        if (chats) {
            for (const chat of chats) {
                res.push([getPeerId(chat), chat])
            }
        }
        for (const x of res) {
            idEntity.set(x[0], x[1]);
        }
        const result = [];
        for (const x of inputs) {
            if (typeof x === 'string') {
                result.push(await this._getEntityFromString(x));
            } else if (x instanceof Api.InputPeerSelf) {
                result.push(idEntity.get(getPeerId(x)))
            } else {
                for (const [key, u] of idEntity.entries()) {
                    if (u instanceof Api.User && u.self) {
                        result.push(u);
                        break
                    }
                }
            }
        }
        return single ? result[0] : result;
    }

    async getInputEntity(peer: EntityLike): Promise<Api.TypeInputPeer> {
        // Short-circuit if the input parameter directly maps to an InputPeer
        try {
            return utils.getInputPeer(peer)
            // eslint-disable-next-line no-empty
        } catch (e) {
        }
        // Next in priority is having a peer (or its ID) cached in-memory
        try {
            // 0x2d45687 == crc32(b'Peer')
            if (typeof peer !== "string" && (typeof peer === 'number' || peer.SUBCLASS_OF_ID === 0x2d45687)) {
                const res = this._entityCache.get(peer);
                if (res) {
                    return res;
                }
            }
            // eslint-disable-next-line no-empty
        } catch (e) {
        }
        // Then come known strings that take precedence
        if (typeof peer == 'string') {
            if (['me', 'this', 'self'].includes(peer)) {
                return new Api.InputPeerSelf();
            }
        }

        // No InputPeer, cached peer, or known string. Fetch from disk cache
        try {
            return this.session.getInputEntity(peer)
            // eslint-disable-next-line no-empty
        } catch (e) {
        }
        // Only network left to try
        if (typeof peer === 'string') {
            return utils.getInputPeer(await this._getEntityFromString(peer))
        }
        // If we're a bot and the user has messaged us privately users.getUsers
        // will work with accessHash = 0. Similar for channels.getChannels.
        // If we're not a bot but the user is in our contacts, it seems to work
        // regardless. These are the only two special-cased requests.
        peer = utils.getPeer(peer);
        if (peer instanceof Api.PeerUser) {
            const users = await this.invoke(new Api.users.GetUsers({
                id: [new Api.InputUser({
                    userId: peer.userId,
                    accessHash: bigInt.zero,
                })],
            }));
            if (users && !(users[0] instanceof Api.UserEmpty)) {
                // If the user passed a valid ID they expect to work for
                // channels but would be valid for users, we get UserEmpty.
                // Avoid returning the invalid empty input peer for that.
                //
                // We *could* try to guess if it's a channel first, and if
                // it's not, work as a chat and try to validate it through
                // another request, but that becomes too much work.
                return utils.getInputPeer(users[0])
            }
        } else if (peer instanceof Api.PeerChat) {
            return new Api.InputPeerChat({
                chatId: peer.chatId,
            })
        } else if (peer instanceof Api.PeerChannel) {
            try {
                const channels = await this.invoke(new Api.channels.GetChannels({
                    id: [new Api.InputChannel({
                        channelId: peer.channelId,
                        accessHash: bigInt.zero,
                    })],
                }));

                return utils.getInputPeer(channels.chats[0])
                // eslint-disable-next-line no-empty
            } catch (e) {
                console.log(e)
            }
        }
        throw new Error(`Could not find the input entity for ${peer}.
         Please read https://` +
            'docs.telethon.dev/en/latest/concepts/entities.html to' +
            ' find out more details.',
        )
    }

    async _getEntityFromString(string: string) {
        const phone = utils.parsePhone(string);
        if (phone) {
            try {
                const result = await this.invoke(
                    new Api.contacts.GetContacts({
                        hash: 0
                    }));
                if (!(result instanceof Api.contacts.ContactsNotModified)) {
                    for (const user of result.users) {
                        if (!(user instanceof Api.User) || user.phone === phone) {
                            return user
                        }
                    }
                }

            } catch (e) {
                if (e.message === 'BOT_METHOD_INVALID') {
                    throw new Error('Cannot get entity by phone number as a ' +
                        'bot (try using integer IDs, not strings)')
                }
                throw e
            }
        } else if (['me', 'this'].includes(string.toLowerCase())) {
            return this.getMe()
        } else {
            const {username, isInvite} = utils.parseUsername(string);
            if (isInvite) {
                const invite = await this.invoke(new Api.messages.CheckChatInvite({
                    'hash': username,
                }));
                if (invite instanceof Api.ChatInvite) {
                    throw new Error('Cannot get entity from a channel (or group) ' +
                        'that you are not part of. Join the group and retry',
                    )
                } else if (invite instanceof Api.ChatInviteAlready) {
                    return invite.chat
                }
            } else if (username) {
                try {
                    const result = await this.invoke(
                        new Api.contacts.ResolveUsername({username: username}));
                    const pid = utils.getPeerId(result.peer, false);
                    if (result.peer instanceof Api.PeerUser) {
                        for (const x of result.users) {
                            if (x.id === pid) {
                                return x
                            }
                        }
                    } else {
                        for (const x of result.chats) {
                            if (x.id === pid) {
                                return x
                            }
                        }
                    }
                } catch (e) {
                    if (e.message === 'USERNAME_NOT_OCCUPIED') {
                        throw new Error(`No user has "${username}" as username`)
                    }
                    throw e
                }
            }
        }
        throw new Error(`Cannot find any entity corresponding to "${string}"`)
    }

    async getPeerId(peer: EntityLike, addMark = false) {
        if (typeof peer == 'number') {
            return utils.getPeerId(peer, addMark);
        }
        if (typeof peer == 'string') {
            peer = await this.getInputEntity(peer);
        }

        if (peer.SUBCLASS_OF_ID == 0x2d45687 || peer.SUBCLASS_OF_ID == 0xc91c90b6) {
            peer = await this.getInputEntity(peer);
        }
        if (peer instanceof Api.InputPeerSelf) {
            peer = await this.getMe(true);
        }
        return utils.getPeerId(peer, addMark);


    }

    async _getPeer(peer: EntityLike) {
        if (!peer) {
            return undefined;
        }
        const [i, cls] = utils.resolveId(await this.getPeerId(peer));
        return new cls({
            userId: i,
            channelId: i,
            chatId: i
        });
    }

    async _getInputDialog(dialog: any) {
        try {
            if (dialog.SUBCLASS_OF_ID == 0xa21c9795) { // crc32(b'InputDialogPeer')
                dialog.peer = await this.getInputEntity(dialog.peer);
                return dialog
            } else if (dialog.SUBCLASS_OF_ID == 0xc91c90b6) { //crc32(b'InputPeer')
                return new Api.InputDialogPeer({
                    peer: dialog,
                });
            }

        } catch (e) {

        }
        return new Api.InputDialogPeer({
            peer: dialog
        });
    }

    async _getInputNotify(notify: any) {
        try {
            if (notify.SUBCLASS_OF_ID == 0x58981615) {
                if (notify instanceof Api.InputNotifyPeer) {
                    notify.peer = await this.getInputEntity(notify.peer)
                }
                return notify;
            }
        } catch (e) {

        }
        return new Api.InputNotifyPeer({
            peer: await this.getInputEntity(notify)
        })

    }
}

export interface UserMethods extends TelegramBaseClient {

}
