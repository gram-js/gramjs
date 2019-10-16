const Helpers = require("./gramjs/utils/Helpers");
const TelegramClient = require("./gramjs/tl/TelegramClient");
const {GetConfigRequest} = require("./gramjs/tl/functions/help");
const struct = require("python-struct");
const log4js = require('log4js');
const logger = log4js.getLogger("gramjs");

logger.level = 'debug';


(async function () {

    console.log("Loading interactive example...");
    let sessionName = "anon";
    let apiId = 139938;
    let apiHash = "284b4948be43b955f7398d2abf355b3f";
    let client = new TelegramClient(sessionName, apiId, apiHash);
    await client.connect();
    //let request = new GetConfigRequest();
    //let res =         await client._sender.send(new GetConfigRequest());
    //console.log(res)
    //await client.signIn({botToken: "773348:AAEL_68PNU0ekQhzpjBKj9U5S4WiINq-voY"});
    console.log("You should now be connected.");
})();

