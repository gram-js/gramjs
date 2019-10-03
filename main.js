const Helpers = require("./utils/Helpers");
const TelegramClient = require("./tl/TelegramClient");

(async function () {
    console.log("Loading interactive example...");
    let settings = await Helpers.loadSettings();
    let client = new TelegramClient(settings["session_name"], 73, settings["api_id"], settings["api_hash"]);
    await client.connect();
    console.log("You should now be connected.");
})();
