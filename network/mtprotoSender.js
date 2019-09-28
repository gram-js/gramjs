const MtProtoPlainSender = require("./MTProtoPlainSender");
const Helpers = require("../utils/Helpers");

/**
 * MTProto Mobile Protocol sender (https://core.telegram.org/mtproto/description)
 */
class MTProtoSender {
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
     * @param request {MtProtoPlainSender}
     * @param resend
     */
    send(request, resend = false) {
        let buffer;
        //If any message needs confirmation send an AckRequest first
        if (Boolean(this.needConfirmation.length)) {
            let msgsAck = MsgsAck(this.needConfirmation);

            buffer = msgsAck.onSend();
            this.sendPacket(buffer, msgsAck);
            this.needConfirmation.length = 0;
        }
        //Finally send our packed request
        buffer = request.on_send();
        this.sendPacket(buffer, request);

        //And update the saved session
        this.session.save();

    }

    receive(request) {
        try {
            //Try until we get an update
            while (!request.confirmReceive()) {
                let {seq, body} = this.transport.receive();
                let {message, remoteMsgId, remoteSequence} = this.decodeMsg(body);
                this.processMsg(remoteMsgId, remoteSequence, message, request);
            }
        } catch (e) {

        }
    }

    // region Low level processing
    /**
     * Sends the given packet bytes with the additional
     * information of the original request.
     * @param packet
     * @param request
     */
    sendPacket(packet, request) {
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
        first.writeUInt32LE(this.session.authKey.keyId, 0);
        let cipher = Buffer.concat([
            first,
            msgKey,
            cipherText,
        ]);
        this.transport.send(cipher);
    }

    decodeMsg(body) {
        if (body.length < 8) {
            throw Error("Can't decode packet");
        }
        let offset = 8;
        let msgKey = body.readIntLE(offset, 16);
        offset += 16;
        let {key, iv} = Helpers.calcKey(this.session.authKey.key, msgKey, false);
        let plainText = AES.decryptIge(body.readIntLE(offset, body.length - offset), key, iv);
        offset = 0;
        let remoteSalt = plainText.readBigInt64LE(offset);
        offset += 8;
        let remoteSessionId = plainText.readBigInt64LE(offset);
        offset += 8;
        let remoteSequence = plainText.readBigInt64LE(offset);
        offset += 8;
        let remoteMsgId = plainText.readInt32LE(offset);
        offset += 4;
        let msgLen = plainText.readInt32LE(offset);
        offset += 4;
        let message = plainText.readIntLE(offset, msgLen);
        return {message, remoteMsgId, remoteSequence}
    }

    processMsg(msgId, sequence, reader, offset, request = undefined) {
        this.needConfirmation.push(msgId);
        let code = reader.readUInt32LE(offset);
        offset -= 4;

        // The following codes are "parsed manually"
        if (code === 0xf35c6d01) {  //rpc_result, (response of an RPC call, i.e., we sent a request)
            return this.handleRpcResult(msgId, sequence, reader, request);
        }

        if (code === 0x73f1f8dc) {  //msg_container
            return this.handlerContainer(msgId, sequence, reader, request);
        }
        if (code === 0x3072cfa1) {  //gzip_packed
            return this.handlerGzipPacked(msgId, sequence, reader, request);
        }
        if (code === 0xedab447b) {  //bad_server_salt
            return this.handleBadServerSalt(msgId, sequence, reader, request);
        }
        if (code === 0xa7eff811) {  //bad_msg_notification
            return this.handleBadMsgNotification(msgId, sequence, reader);
        }
        /**
         * If the code is not parsed manually, then it was parsed by the code generator!
         * In this case, we will simply treat the incoming TLObject as an Update,
         * if we can first find a matching TLObject
         */
        if (tlobjects.contains(code)) {
            return this.handleUpdate(msgId, sequence, reader);
        }
        console.log("Unknown message");
        return false;
    }

    // region Message handling

    handleUpdate(msgId, sequence, reader) {
        let tlobject = Helpers.tgReadObject(reader);
        for (let handler of this.onUpdateHandlers) {
            handler(tlobject);
        }
        return Float32Array
    }

    handleContainer(msgId, sequence, reader, offset, request) {
        let code = reader.readUInt32LE(offset);
        offset += 4;
        let size = reader.readInt32LE(offset);
        offset += 4;
        for (let i = 0; i < size; i++) {
            let innerMsgId = reader.readBigUInt64LE(offset);
            offset += 8;
            let innerSequence = reader.readBigInt64LE(offset);
            offset += 8;
            let innerLength = reader.readInt32LE(offset);
            offset += 4;
            if (!this.processMsg(innerMsgId, sequence, reader, request)) {
                offset += innerLength;
            }
        }
        return false;
    }

    handleBadServerSalt(msgId, sequence, reader, offset, request) {
        let code = reader.readUInt32LE(offset);
        offset += 4;
        let badMsgId = reader.readUInt32LE(offset);
        offset += 4;
        let badMsgSeqNo = reader.readInt32LE(offset);
        offset += 4;
        let errorCode = reader.readInt32LE(offset);
        offset += 4;
        let newSalt = reader.readUInt32LE(offset);
        offset += 4;
        this.session.salt = newSalt;

        if (!request) {
            throw Error("Tried to handle a bad server salt with no request specified");
        }

        //Resend
        this.send(request, true);
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
        return BadMessageError(errorCode);
    }

    handleRpcResult(msgId, sequence, reader, offset, request) {
        if (!request) {
            throw Error("RPC results should only happen after a request was sent");
        }

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
            // TODO add rpc logic
            throw Error("error");
        } else {
            // TODO
        }
    }

    handleGzipPacked(msgId, sequence, reader, offset, request) {
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