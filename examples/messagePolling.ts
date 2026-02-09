import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { Logger } from "telegram/extensions";
import * as readline from "readline";

// Fill these with your own values
const apiId = 0; // e.g. 123456789
const apiHash = ""; // e.g. 'abcd1234efgh5678'
const stringSession = ""; // Paste your STRING SESSION here (leave empty for first login)

const client = new TelegramClient(
    new StringSession(stringSession),
    apiId,
    apiHash,
    { connectionRetries: 5 }
);

// Helper function to read input from console
function input(prompt: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

// Event handler for all new messages
async function handleNewMessage(event: NewMessageEvent) {
    const message = event.message;

    console.log("\n" + "=".repeat(60));
    console.log("📨 NEW MESSAGE RECEIVED");
    console.log("=".repeat(60));

    // Basic message info
    console.log(`Message ID: ${message.id}`);
    console.log(`Date: ${new Date(message.date * 1000).toLocaleString()}`);
    console.log(`Text: ${message.text || "[No text]"}`);

    // Sender info
    if (message.senderId) {
        console.log(`Sender ID: ${message.senderId}`);
        try {
            const sender = await message.getSender();
            if (sender && "firstName" in sender) {
                console.log(`Sender: ${sender.firstName || ""} ${sender.lastName || ""} (@${sender.username || "no username"})`);
            }
        } catch (err) {
            console.log(`Sender: [Could not retrieve sender info]`);
        }
    }

    // Chat info
    if (message.chatId) {
        console.log(`Chat ID: ${message.chatId}`);
        try {
            const chat = await message.getChat();
            if (chat && "title" in chat) {
                console.log(`Chat: ${chat.title || "Unknown"}`);
            } else if (chat && "firstName" in chat) {
                console.log(`Chat: ${chat.firstName || "Unknown"}`);
            }
        } catch (err) {
            console.log(`Chat: [Could not retrieve chat info]`);
        }
    }

    // Message type
    if (event.isPrivate) {
        console.log(`Type: Private message`);
    } else if (event.isGroup) {
        console.log(`Type: Group message`);
    } else if (event.isChannel) {
        console.log(`Type: Channel message`);
    }

    // Additional message properties
    if (message.media) {
        console.log(`Has Media: Yes (${message.media.className})`);
    }
    if (message.replyTo) {
        console.log(`Reply to: Message ID ${message.replyTo.replyToMsgId}`);
    }
    if (message.fwdFrom) {
        console.log(`Forwarded: Yes`);
    }
    if (message.buttons && message.buttons.length > 0) {
        console.log(`Has Buttons: Yes (${message.buttons.length} button(s))`);
    }

    console.log("=".repeat(60) + "\n");
}

(async () => {
    console.log("🚀 Starting Message Polling Script...\n");

    try {
        // Enable debug logging if needed
        // Logger.setLevel("debug");

        console.log("📡 Connecting to Telegram...");

        // Start the client (will prompt for login if stringSession is empty)
        await client.start({
            phoneNumber: async () => {
                console.log("\n⚠️  No session found. Please login.");
                return await input("Enter your phone number (with country code, e.g. +1234567890): ");
            },
            password: async () => {
                return await input("Enter your 2FA password: ");
            },
            phoneCode: async () => {
                return await input("Enter the code you received: ");
            },
            onError: (err) => console.error("Login error:", err),
        });

        console.log("✅ Connected successfully!");

        // Get and display user info
        const me = await client.getMe();
        console.log(`\n👤 Logged in as: ${me.firstName || ""} ${me.lastName || ""} (@${me.username || "no username"})`);
        console.log(`User ID: ${me.id}`);

        // Save session for next time
        console.log(`\n🔑 Your session string (save this for next time):`);
        console.log(client.session.save());
        console.log("");

        // Add event handler for new messages
        client.addEventHandler(handleNewMessage, new NewMessage({}));

        console.log("👂 Listening for messages...");
        console.log("Press Ctrl+C to stop\n");

        // Keep the script running
        process.on('SIGINT', async () => {
            console.log("\n\n🛑 Stopping...");
            await client.disconnect();
            console.log("👋 Disconnected. Goodbye!");
            process.exit(0);
        });

    } catch (err) {
        console.error("❌ Error:", err);
        await client.disconnect();
        process.exit(1);
    }
})();


