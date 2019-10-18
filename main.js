const TelegramClient = require('./gramjs/tl/TelegramClient');
const log4js = require('log4js');
const { InputPeerChannel } = require('./gramjs/tl/types');
const { SendMessageRequest } = require('./gramjs/tl/functions/messages');
const { ResolveUsernameRequest } = require('./gramjs/tl/functions/contacts');
const logger = log4js.getLogger('gramjs');

logger.level = 'debug';

const inputPeer = new InputPeerChannel({
    channelId: 1180212174,
    accessHash: BigInt('548480552819456668'),
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
    const apiId = 0;
    const apiHash = '';
    const client = new TelegramClient(sessionName, apiId, apiHash);
    await client.connect();
    // let request = new GetConfigRequest();
    // let res =         await client._sender.send(new GetConfigRequest());
    // console.log(res)
    const res = await client.signIn({ botToken: '' });
    const user = res.user;
    client._authorized = true;
    const result = await client.invoke(
        new ResolveUsernameRequest({
            username: 'gramjschat',
        })
    );
    console.log(result);

    const message = new SendMessageRequest({
        peer: inputPeer,
        message: 'hi from GramJS',
    });
    console.log(message);
    const r = await client.invoke(message);
    console.log(r);
    console.log('You should now be connected.', user);
})();
