const MtProtoPlainSender = require("./MTProtoPlainSender");
const Helpers = require("../utils/Helpers");
const {MsgsAck} = require("../gramjs/tl/types");
const AES = require("../crypto/AES");
const {RPCError} = require("../errors");
const format = require('string-format');
const {BadMessageError} = require("../errors");
const {InvalidDCError} = require("../errors");
const {gzip, ungzip} = require('node-gzip');
//const {tlobjects} = require("../gramjs/tl/alltlobjects");
format.extend(String.prototype, {});

/**
 * MTProto Mobile Protocol sender (https://core.telegram.org/mtproto/description)
 */
class MTProtoSender {
    /**
     *
     * @param transport
     * @param session
     */
    constructor(transport, session) {
        this.transport = transport;
        this.session = session;
        this.needConfirmation = Array(); // Message IDs that need confirmation
        this.onUpdateHandlers = Array();

    }

    /**
     * Disconnects
     */
    disconnect() {
        this.setListenForUpdates(false);
        this.transport.close();
    }

    /**
     * Adds an update handler (a method with one argument, the received
     * TLObject) that is fired when there are updates available
     * @param handler {function}
     */
    addUpdateHandler(handler) {
        let firstHandler = Boolean(this.onUpdateHandlers.length);
        this.onUpdateHandlers.push(handler);
        // If this is the first added handler,
        // we must start receiving updates
        if (firstHandler) {
            this.setListenForUpdates(true);
        }
    }

    /**
     * Removes an update handler (a method with one argument, the received
     * TLObject) that is fired when there are updates available
     * @param handler {function}
     */
    removeUpdateHandler(handler) {
        let index = this.onUpdateHandlers.indexOf(handler);
        if (index !== -1) this.onUpdateHandlers.splice(index, 1);
        if (!Boolean(this.onUpdateHandlers.length)) {
            this.setListenForUpdates(false);

        }
    }

    /**
     *
     * @param confirmed {boolean}
     * @returns {number}
     */
    generateSequence(confirmed) {
        if (confirmed) {
            let result = this.session.sequence * 2 + 1;
            this.session.sequence += 1;
            return result;
        } else {
            return this.session.sequence * 2;
        }
    }

    /**
     * Sends the specified MTProtoRequest, previously sending any message
     * which needed confirmation. This also pauses the updates thread
     * @param request {MTProtoRequest}
     * @param resend
     */
    async send(request, resend = false) {
        let buffer;
        //If any message needs confirmation send an AckRequest first
        if (this.needConfirmation.length) {
            let msgsAck = new MsgsAck(
                {
                    msgIds:
                    this.needConfirmation
                });

            buffer = msgsAck.onSend();
            await this.sendPacket(buffer, msgsAck);
            this.needConfirmation.length = 0;
        }
        //Finally send our packed request

        buffer = request.onSend();
        await this.sendPacket(buffer, request);

        //And update the saved session
        this.session.save();

    }

    /**
     *
     * @param request
     */
    async receive(request) {
        try {
            //Try until we get an update
            while (!request.confirmReceived) {
                let {seq, body} = await this.transport.receive();
                let {message, remoteMsgId, remoteSequence} = this.decodeMsg(body);
                console.log("processing msg");
                await this.processMsg(remoteMsgId, remoteSequence, message, 0, request);
                console.log("finished processing msg");
            }
        } finally {
            // Todo
        }
    }

    // region Low level processing
    /**
     * Sends the given packet bytes with the additional
     * information of the original request.
     * @param packet
     * @param request
     */
    async sendPacket(packet, request) {
        request.msgId = this.session.getNewMsgId();
        // First Calculate plainText to encrypt it
        let first = Buffer.alloc(8);
        let second = Buffer.alloc(8);
        let third = Buffer.alloc(8);
        let forth = Buffer.alloc(4);
        let fifth = Buffer.alloc(4);
        first.writeBigUInt64LE(this.session.salt, 0);
        second.writeBigUInt64LE(this.session.id, 0);
        third.writeBigUInt64LE(request.msgId, 0);
        forth.writeInt32LE(this.generateSequence(request.confirmed), 0);
        fifth.writeInt32LE(packet.length, 0);
        let plain = Buffer.concat([
            first,
            second,
            third,
            forth,
            fifth,
            packet
        ]);
        let msgKey = Helpers.calcMsgKey(plain);
        let {key, iv} = Helpers.calcKey(this.session.authKey.key, msgKey, true);

        let cipherText = AES.encryptIge(plain, key, iv);

        //And then finally send the encrypted packet

        first = Buffer.alloc(8);
        first.writeBigUInt64LE(this.session.authKey.keyId, 0);
        let cipher = Buffer.concat([
            first,
            msgKey,
            cipherText,
        ]);
        await this.transport.send(cipher);
    }

    /**
     *
     * @param body {Buffer}
     * @returns {{remoteMsgId: number, remoteSequence: BigInt, message: Buffer}}
     */
    decodeMsg(body) {
        if (body.length < 8) {
            throw Error("Can't decode packet");
        }
        let remoteAuthKeyId = body.readBigInt64LE(0);
        let offset = 8;
        let msgKey = body.slice(offset, offset + 16);
        offset += 16;
        let {key, iv} = Helpers.calcKey(this.session.authKey.key, msgKey, false);
        let plainText = AES.decryptIge(body.slice(offset, body.length), key, iv);
        offset = 0;
        let remoteSalt = plainText.readBigInt64LE(offset);
        offset += 8;
        let remoteSessionId = plainText.readBigInt64LE(offset);
        offset += 8;
        let remoteMsgId = plainText.readBigInt64LE(offset);
        offset += 8;
        let remoteSequence = plainText.readInt32LE(offset);
        offset += 4;
        let msgLen = plainText.readInt32LE(offset);
        offset += 4;
        let message = plainText.slice(offset, offset + msgLen);
        return {message, remoteMsgId, remoteSequence}
    }

    async processMsg(msgId, sequence, reader, offset, request = undefined) {
        this.needConfirmation.push(msgId);
        let code = reader.readUInt32LE(offset);
        console.log("code is ", code);
        // The following codes are "parsed manually"
        if (code === 0xf35c6d01) {  //rpc_result, (response of an RPC call, i.e., we sent a request)
            console.log("got rpc result");
            return await this.handleRpcResult(msgId, sequence, reader, offset, request);
        }

        if (code === 0x73f1f8dc) {  //msg_container
            return this.handleContainer(msgId, sequence, reader, offset, request);
        }
        if (code === 0x3072cfa1) {  //gzip_packed
            return this.handleGzipPacked(msgId, sequence, reader, offset, request);
        }
        if (code === 0xedab447b) {  //bad_server_salt
            return await this.handleBadServerSalt(msgId, sequence, reader, offset, request);
        }
        if (code === 0xa7eff811) {  //bad_msg_notification
            console.log("bad msg notification");
            return this.handleBadMsgNotification(msgId, sequence, reader, offset);
        }
        /**
         * If the code is not parsed manually, then it was parsed by the code generator!
         * In this case, we will simply treat the incoming TLObject as an Update,
         * if we can first find a matching TLObject
         */
        console.log("code", code);
        if (code === 0x9ec20908) {
            return this.handleUpdate(msgId, sequence, reader, offset);
        } else {

            if (tlobjects.contains(code)) {
                return this.handleUpdate(msgId, sequence, reader);
            }
        }
        console.log("Unknown message");
        return false;
    }

    // region Message handling

    handleUpdate(msgId, sequence, reader, offset = 0) {
        let tlobject = Helpers.tgReadObject(reader,offset);
        for (let handler of this.onUpdateHandlers) {
            handler(tlobject);
        }
        return Float32Array
    }

    async handleContainer(msgId, sequence, reader, offset, request) {
        let code = reader.readUInt32LE(offset);
        offset += 4;
        let size = reader.readInt32LE(offset);
        offset += 4;
        for (let i = 0; i < size; i++) {
            let innerMsgId = reader.readBigUInt64LE(offset);
            offset += 8;
            let innerSequence = reader.readInt32LE(offset);
            offset += 4;
            let innerLength = reader.readInt32LE(offset);
            offset += 4;
            if (!(await this.processMsg(innerMsgId, sequence, reader, offset, request))) {
                offset += innerLength;
            }
        }
        return false;
    }

    async handleBadServerSalt(msgId, sequence, reader, offset, request) {
        let code = reader.readUInt32LE(offset);
        offset += 4;
        let badMsgId = reader.readBigUInt64LE(offset);
        offset += 8;
        let badMsgSeqNo = reader.readInt32LE(offset);
        offset += 4;
        let errorCode = reader.readInt32LE(offset);
        offset += 4;
        let newSalt = reader.readBigUInt64LE(offset);
        offset += 8;
        this.session.salt = newSalt;

        if (!request) {
            throw Error("Tried to handle a bad server salt with no request specified");
        }

        //Resend
        await this.send(request, true);
        return true;
    }

    handleBadMsgNotification(msgId, sequence, reader, offset) {
        let code = reader.readUInt32LE(offset);
        offset += 4;
        let requestId = reader.readUInt32LE(offset);
        offset += 4;
        let requestSequence = reader.readInt32LE(offset);
        offset += 4;
        let errorCode = reader.readInt32LE(offset);
        return new BadMessageError(errorCode);
    }

    async handleRpcResult(msgId, sequence, reader, offset, request) {
        if (!request) {
            throw Error("RPC results should only happen after a request was sent");
        }
        let buffer = Buffer.alloc(0);
        let code = reader.readUInt32LE(offset);
        offset += 4;
        let requestId = reader.readUInt32LE(offset);
        offset += 4;
        let innerCode = reader.readUInt32LE(offset);
        offset += 4;
        if (requestId === request.msgId) {
            request.confirmReceived = true;
        }

        if (innerCode === 0x2144ca19) {  // RPC Error
            console.log("Got an error");
            let errorCode = reader.readInt32LE(offset);
            offset += 4;
            let errorMessage = Helpers.tgReadString(reader, offset);
            offset = errorMessage.offset;
            errorMessage = errorMessage.data;
            let error = new RPCError(errorCode, errorMessage);
            if (error.mustResend) {
                request.confirmReceived = false;
            }
            if (error.message.startsWith("FLOOD_WAIT_")) {
                console.log("Should wait {}s. Sleeping until then.".format(error.additionalData));
                await Helpers.sleep();
            } else if (error.message.startsWith("PHONE_MIGRATE_")) {
                throw new InvalidDCError(error.additionalData);
            } else {
                throw error;
            }

        } else {
            console.log("no errors");
            if (innerCode === 0x3072cfa1) { //GZip packed
                console.log("Gzipped data");
                let res = Helpers.tgReadByte(reader, offset);
                let unpackedData = await ungzip(res.data);
                offset = res.offset;
                res = request.onResponse(unpackedData, offset);
                buffer = res.data;
                offset = res.offset;
            } else {
                console.log("plain data");
                offset -= 4;
                let res = request.onResponse(reader, offset);
                buffer = res.data;
                offset = res.offset;
            }
        }
        return {buffer, offset}

    }

    handleGzipPacked(msgId, sequence, reader, offset, request) {
        throw Error("not implemented");
        // TODO
    }

    setListenForUpdates(enabled) {

        if (enabled) {
            console.log("Enabled updates");
        } else {
            console.log("Disabled updates");
        }
    }

    updatesListenMethod() {
        while (true) {
            let {seq, body} = this.transport.receive();
            let {message, remoteMsgId, remoteSequence} = this.decodeMsg(body);
            this.processMsg(remoteMsgId, remoteSequence, message);

        }
    }
}

module.exports = MTProtoSender;