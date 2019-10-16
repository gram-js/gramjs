const Helpers = require("./gramjs/utils/Helpers");
const TelegramClient = require("./gramjs/tl/TelegramClient");
const {GetConfigRequest} = require("./gramjs/tl/functions/help");
const struct = require("python-struct");
const log4js = require('log4js');
const {InputPeerChannel} = require("./gramjs/tl/types");
const {SendMessageRequest} = require("./gramjs/tl/functions/messages");
const {InputPeerUser} = require("./gramjs/tl/types");
const {ResolveUsernameRequest} = require("./gramjs/tl/functions/contacts");
const logger = log4js.getLogger("gramjs");

logger.level = 'debug';

let painorId = 400319287;
let painorHash = 4770003194588524965n;

let input_peer = new InputPeerChannel({
    channelId: 1180212174,
    accessHash: 548480552819456668n,
});
let message = new SendMessageRequest({
    peer: input_peer,
    message: "hi",
    randomId: 5,
});
console.log(message.bytes.toString("hex"));

(async function () {


    console.log("Loading interactive example...");
    let sessionName = "anon";
    let apiId = ;
    let apiHash = "";
    let client = new TelegramClient(sessionName, apiId, apiHash);
    await client.connect();
    //let request = new GetConfigRequest();
    //let res =         await client._sender.send(new GetConfigRequest());
    //console.log(res)
    let res = await client.signIn({botToken: ""});
    let user = res.user;
    client._authorized = true;
    let result = await client.invoke(new ResolveUsernameRequest({
            username: 'gramjschat'
        }
    ));
    console.log(result);

    let message = new SendMessageRequest({
        peer: input_peer,
        message: "hi from GramJS",
    });
    console.log(message);
    let r = await client.invoke(message);
    console.log(r);
    console.log("You should now be connected.", user);
})();

