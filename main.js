const Helpers = require("./gramjs/utils/Helpers");
const TelegramClient = require("./gramjs/tl/TelegramClient");
(async function () {
    console.log("Loading interactive example...");
    let sessionName = "anon";
    let apiId = 17349;
    let apiHash = "344583e45741c457fe1862106095a5eb";
    let client = new TelegramClient(sessionName, 73, apiId, apiHash);
    await client.connect();
    console.log("You should now be connected.");
})();
