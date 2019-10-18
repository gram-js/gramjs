const {TelegramClient} = require('../gramjs');
const log4js = require('log4js');
const {InputPeerChat} = require('../gramjs/tl/types');
const {SendMessageRequest} = require('../gramjs/tl/functions/messages');
const {ResolveUsernameRequest} = require('../gramjs/tl/functions/contacts');
const logger = log4js.getLogger('gramjs');

logger.level = 'debug';

const inputPeer = new InputPeerChat({
    chatId: 400319287,
    accessHash: 4770003194588524965n,
});
const message = new SendMessageRequest({
    peer: inputPeer,
    message: 'hi',
    randomId: 5,
});
console.log(message.bytes.toString('hex'));

(async () => {
    console.log('Loading interactive example...');
    const sessionName = 'anon';
    const apiId = 17349;
    const apiHash = '344583e45741c457fe1862106095a5eb';
    const client = new TelegramClient(sessionName, apiId, apiHash);
    await client.connect();


    client._authorized = true;

    const message = new SendMessageRequest({
        peer: inputPeer,
        message: 'hi from GramJS',
    });
    const r = await client.invoke(message);
    console.log(r);
    console.log('You should now be connected.');
})();
