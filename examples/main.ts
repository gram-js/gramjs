import { Logger } from "telegram/extensions";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import { NewMessageEvent } from "telegram/events/NewMessage";
import { Message } from "telegram/tl/custom/message";

const apiId = 0;
const apiHash = "";
const stringSession = "";

async function eventPrint(event: NewMessageEvent) {
  const message = event.message as Message;

  // Checks if it's a private message (from user or bot)
  if (event.isPrivate) {
    // prints sender id
    console.log(message.senderId);
    // read message
    if (message.text == "hello") {
      const sender = await message.getSender();
      console.log("sender is", sender);
      await client.sendMessage(sender, {
        message: `hi your id is ${message.senderId}`,
      });
    }
  }
}
const client = new TelegramClient(
  new StringSession(stringSession),
  apiId,
  apiHash,
  { connectionRetries: 5 }
);

(async () => {
  Logger.setLevel("debug");
  console.log("Loading interactive example...");
  await client.start({
    botAuthToken: "",
  });

  console.log(await client.getEntity("me"));
  console.log(client.session.save());
})();

// adds an event handler for new messages
client.addEventHandler(eventPrint, new NewMessage({}));
