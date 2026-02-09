const { TelegramClient } = require("../dist");
const { StringSession } = require("../dist/sessions");

// Fill these with your own values
const apiId = 21565462; // e.g. 123456
const apiHash = "6681a9a03f81caac5b43ff8dcc9c52fe"; // e.g. 'abcd1234efgh5678'
const stringSession = "1BAAOMTQ5LjE1NC4xNjcuOTEAUCXkhkoTTCMLJ3K53SrJ+WMop7tl6gMESwHBYVzTqbn6kgVQKKpG/J1knonu9/XzPJOg9Np4/3fL0kGxJHe42JH08JTh9riHpJgvcGacUDywMJ/VWHqEze2Z1UmHIbJM82ZuLLI6O8TUrWpCklGMf/Fwl93pNyflSA28Vzt9ZJ/YGqnszgmOroNZTLlArbdBo0v2RJMjoDz0CRUQ6sZe6imHHUgboQeJRAaSqfEbJPEca8bJXI4Ncx7Sa0k8OLE3KWFsrIwgo+/PPEByisyASXQwyG4c1VMidJNSdct1/rvTDweD6rLwnY5dY6ou5ApYvMgv433eaEnBwm5nD4zYNvQ="; // Paste your STRING SESSION here

const client = new TelegramClient(
    new StringSession(stringSession),
    apiId,
    apiHash, { connectionRetries: 5 }
);

(async() => {
    try {
        console.log("Connecting...");
        await client.connect();

        const entity = await client.getEntity("none");
        console.log("Resolved 'none':", {
            id: entity.id,
            username: entity.username,
            firstName: entity.firstName,
            lastName: entity.lastName,
            className: entity.className,
        });
    } catch (err) {
        console.error("Error resolving 'none':", err);
    } finally {
        await client.disconnect();
    }
})();