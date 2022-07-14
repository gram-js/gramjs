const { TelegramClient } = require("telegram");
const { StoreSession } = require("telegram/sessions");
const input = require("input");
const { NewMessage } = require("telegram/events"); // npm i input

const API_ID = -1; // Fill your API ID
const API_HASH = ""; // Fill your API Hash
const STATES = {
  EMPTY: "no state (default)",
  ASK_FOR_NAME: "asks the user for a name",
  ASK_FOR_LAST_NAME: "asks the user for their last name",
  ASK_FOR_AGE: "asks the user for their age",
}; // different states
const storage = {}; // holds the states; can be saved to a json file on disconnect for consistency
function getState(event) {
  // gets the state for a new message event using chatId+senderId;
  return getData(event, "state") || STATES.EMPTY;
}

function setState(event, state) {
  // sets the state for a new message event
  setData(event, "state", state);
}

function setData(event, name, value) {
  // stores a value in storage
  const key =
    event.chatId.toString() + ":" + (event.senderId || "Admin").toString();
  if (!(key in storage)) {
    storage[key] = {};
  }
  storage[key][name] = value;
}

function getData(event, name) {
  const key =
    event.chatId.toString() + ":" + (event.senderId || "Admin").toString();
  if (!(key in storage)) {
    return undefined;
  }
  return storage[key][name];
}

(async () => {
  console.log("Loading interactive example...");
  const client = new TelegramClient(
    new StoreSession("session_name"),
    API_ID,
    API_HASH,
    {
      connectionRetries: 5,
    }
  );

  await client.start({
    botAuthToken: async () => await input.text("Please enter your bot token: "),
    onError: (err) => console.log(err),
  });
  console.log("You should now be connected.");
  client.addEventHandler(async (event) => {
    const message = event.message;
    const state = getState(message);
    switch (state) {
      case STATES.EMPTY:
        await message.reply({ message: "Heyy!. Please send your first name" });
        setState(message, STATES.ASK_FOR_NAME);
        break;
      case STATES.ASK_FOR_NAME:
        const name = message.text;
        setData(message, "firstName", name);
        await message.reply({ message: "Please send your last name" });
        setState(message, STATES.ASK_FOR_LAST_NAME);
        break;
      case STATES.ASK_FOR_LAST_NAME:
        const lastName = message.text;
        setData(message, "lastName", lastName);
        await message.reply({ message: "Please send your age as a number" });
        setState(message, STATES.ASK_FOR_AGE);
        break;
      case STATES.ASK_FOR_AGE:
        const age = message.text;
        if (Number.isNaN(Number(age))) {
          await message.reply({ message: "Wrong number; please try again" });
          break;
        }
        await message.reply({ message: "Thank you!." });
        await message.reply({
          message: "First Name: " + getData(message, "firstName"),
        });
        await message.reply({
          message: "Last Name: " + getData(message, "lastName"),
        });
        await message.reply({ message: "Age: " + age });
        setState(message, STATES.EMPTY);
    }
  }, new NewMessage());
})();
