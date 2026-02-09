const { TelegramClient } = require("../dist");
const { StringSession } = require("../dist/sessions");
const { NewMessage } = require("../dist/events");

const apiId = 21565462; // e.g. 123456
const apiHash = "6681a9a03f81caac5b43ff8dcc9c52fe"; // e.g. 'abcd1234efgh5678'
const stringSession = "1BAAOMTQ5LjE1NC4xNjcuOTEAUCXkhkoTTCMLJ3K53SrJ+WMop7tl6gMESwHBYVzTqbn6kgVQKKpG/J1knonu9/XzPJOg9Np4/3fL0kGxJHe42JH08JTh9riHpJgvcGacUDywMJ/VWHqEze2Z1UmHIbJM82ZuLLI6O8TUrWpCklGMf/Fwl93pNyflSA28Vzt9ZJ/YGqnszgmOroNZTLlArbdBo0v2RJMjoDz0CRUQ6sZe6imHHUgboQeJRAaSqfEbJPEca8bJXI4Ncx7Sa0k8OLE3KWFsrIwgo+/PPEByisyASXQwyG4c1VMidJNSdct1/rvTDweD6rLwnY5dY6ou5ApYvMgv433eaEnBwm5nD4zYNvQ="; // Paste your STRING SESSION here

const client = new TelegramClient(
    new StringSession(stringSession),
    apiId,
    apiHash, { connectionRetries: 5 }
);

/**
 * Message Listener Class
 * Handles all incoming message events with structured processing
 */
class MessageListener {
    constructor(client) {
        this.client = client;
        this.handlers = new Map();
        this.isActive = false;
    }

    /**
     * Initialize and start listening for messages
     */
    init() {
        if (this.isActive) {
            console.warn("⚠️  Listener is already active");
            return;
        }

        this.client.addEventListener("message", this.handleNewMessage.bind(this));

        this.isActive = true;
        console.log("👂 Message listener initialized and active");
    }

    /**
     * Main message handler - processes all incoming messages
     */
    async handleNewMessage(event) {
        const message = event.message;

        const messageData = await this.extractMessageData(event, message);
        
        // Log the message
        this.logMessage(messageData);

        // Trigger custom handlers
        this.triggerHandlers("message", messageData);
    }

    /**
     * Extract structured data from message and event
     */
    async extractMessageData(event, message) {
        const data = {
            id: message.id,
            date: new Date(message.date * 1000),
            text: message.text || null,
            senderId: message.senderId,
            chatId: message.chatId,
            sender: null,
            chat: null,
            type: this.getMessageType(event),
            media: message.media ? message.media.className : null,
            isReply: !!message.replyTo,
            replyToMsgId: message.replyTo?.replyToMsgId || null,
            isForwarded: !!message.fwdFrom,
            hasButtons: message.buttons?.length > 0,
            buttonCount: message.buttons?.length || 0,
            raw: message,
        };

        // Fetch sender info
        if (message.senderId) {
            try {
                const sender = await message.getSender();
                if (sender) {
                    data.sender = {
                        id: sender.id,
                        firstName: sender.firstName || "",
                        lastName: sender.lastName || "",
                        username: sender.username || null,
                        fullName: `${sender.firstName || ""} ${sender.lastName || ""}`.trim(),
                    };
                }
            } catch (err) {
                data.sender = { error: "Could not retrieve sender info" };
            }
        }

        // Fetch chat info
        if (message.chatId) {
            try {
                const chat = await message.getChat();
                if (chat) {
                    data.chat = {
                        id: chat.id,
                        title: chat.title || chat.firstName || "Unknown",
                        username: chat.username || null,
                    };
                }
            } catch (err) {
                data.chat = { error: "Could not retrieve chat info" };
            }
        }

        return data;
    }

    /**
     * Determine message type from event
     */
    getMessageType(event) {
        if (event.isPrivate) return "private";
        if (event.isGroup) return "group";
        if (event.isChannel) return "channel";
        return "unknown";
    }

    /**
     * Log message data to console
     */
    logMessage(data) {
        console.log("\n" + "=".repeat(60));
        console.log("📨 NEW MESSAGE RECEIVED");
        console.log("=".repeat(60));
        
        console.log(`Message ID: ${data.id}`);
        console.log(`Date: ${data.date.toLocaleString()}`);
        console.log(`Text: ${data.text || "[No text]"}`);

        if (data.sender) {
            if (data.sender.error) {
                console.log(`Sender: [${data.sender.error}]`);
            } else {
                console.log(`Sender ID: ${data.senderId}`);
                console.log(`Sender: ${data.sender.fullName} (@${data.sender.username || "no username"})`);
            }
        }

        if (data.chat) {
            if (data.chat.error) {
                console.log(`Chat: [${data.chat.error}]`);
            } else {
                console.log(`Chat ID: ${data.chatId}`);
                console.log(`Chat: ${data.chat.title}`);
            }
        }

        console.log(`Type: ${data.type.charAt(0).toUpperCase() + data.type.slice(1)} message`);

        if (data.media) {
            console.log(`Has Media: Yes (${data.media})`);
        }
        if (data.isReply) {
            console.log(`Reply to: Message ID ${data.replyToMsgId}`);
        }
        if (data.isForwarded) {
            console.log(`Forwarded: Yes`);
        }
        if (data.hasButtons) {
            console.log(`Has Buttons: Yes (${data.buttonCount} button(s))`);
        }

        console.log("=".repeat(60) + "\n");
    }

    /**
     * Register custom handler for specific event type
     */
    on(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType).push(handler);
    }

    /**
     * Remove custom handler
     */
    off(eventType, handler) {
        if (!this.handlers.has(eventType)) return;
        
        const handlers = this.handlers.get(eventType);
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }

    /**
     * Trigger all registered handlers for event type
     */
    triggerHandlers(eventType, data) {
        if (!this.handlers.has(eventType)) return;
        
        const handlers = this.handlers.get(eventType);
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (err) {
                console.error(`Error in custom handler:`, err);
            }
        });
    }

    /**
     * Destroy the listener
     */
    destroy() {
        this.isActive = false;
        this.handlers.clear();
        console.log("🛑 Message listener destroyed");
    }
}

(async() => {
    console.log("🚀 Starting Message Polling Script...\n");

    // Create message listener instance
    const messageListener = new MessageListener(client);

    try {
        console.log("📡 Connecting to Telegram...");

        // Start the client (will prompt for login if stringSession is empty)
        await client.start({
            phoneNumber: async() => {
                console.log("\n⚠️  No session found. Please login.");
                const readline = require("readline").createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                return new Promise((resolve) => {
                    readline.question("Enter your phone number (with country code, e.g. +1234567890): ", (answer) => {
                        readline.close();
                        resolve(answer);
                    });
                });
            },
            password: async() => {
                const readline = require("readline").createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                return new Promise((resolve) => {
                    readline.question("Enter your 2FA password: ", (answer) => {
                        readline.close();
                        resolve(answer);
                    });
                });
            },
            phoneCode: async() => {
                const readline = require("readline").createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                return new Promise((resolve) => {
                    readline.question("Enter the code you received: ", (answer) => {
                        readline.close();
                        resolve(answer);
                    });
                });
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

        // Initialize message listener
        messageListener.init();

        // Example: Add custom handler (optional)
        messageListener.on("message", (data) => {
            // Custom processing can be done here
            // For example, save to database, trigger webhooks, etc.
            if (data.text && data.text.includes("важно")) {
                console.log("⚠️  ВАЖНОЕ СООБЩЕНИЕ ОБНАРУЖЕНО!");
            }
        });

        console.log("Press Ctrl+C to stop\n");

        // Keep the script running
        process.on('SIGINT', async() => {
            console.log("\n\n🛑 Stopping...");
            messageListener.destroy();
            await client.disconnect();
            console.log("👋 Disconnected. Goodbye!");
            process.exit(0);
        });

    } catch (err) {
        console.error("❌ Error:", err);
        messageListener.destroy();
        await client.disconnect();
        process.exit(1);
    }
})();
