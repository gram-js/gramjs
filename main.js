const {Helpers} = require("./utils/Helpers");
const {TelegramClient} = require("./tl/TelegramClient");

(async function () {
    console.log("Loading interactive example...");
    let settings = Helpers.loadSettings();
    let client = TelegramClient(settings["session_name"], 105, settings["api_id"], settings["api_hash"]);
    await client.connect();
    console.log("You should now be connected.");
})();