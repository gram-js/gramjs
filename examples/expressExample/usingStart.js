const express = require("express"); // npm i express
const bodyParser = require("body-parser"); // npm i body-parser

const { TelegramClient, utils } = require("telegram");
const { StoreSession } = require("telegram/sessions");
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const port = 8080; // default port to listen
const BASE_TEMPLATE = `
<!DOCTYPE html>
<html>
    <head>
        <meta charset='UTF-8'>
        <title>GramJS + Express</title>
    </head>
    <body>{{0}}</body>
</html>
`;

const PHONE_FORM = `
<form action='/' method='post'>
    Phone (international format): <input name='phone' type='text' placeholder='+34600000000'>
    <input type='submit'>
</form>
`;

const CODE_FORM = `
<form action='/' method='post'>
    Telegram code: <input name='code' type='text' placeholder='70707'>
    <input type='submit'>
</form>
`;

const PASSWORD_FORM = `
<form action='/' method='post'>
    Telegram password: <input name='password' type='text' placeholder='your password (leave empty if no password)'>
    <input type='submit'>
</form>
`;
const API_ID = -1; // Fill your API ID
const API_HASH = ""; // Fill your API Hash

// Single client; can use an object if you want to store multiple clients
const client = new TelegramClient(
  new StoreSession("session_name"),
  API_ID,
  API_HASH,
  {}
);
let phone;

// define a route handler for the default home page
app.get("/", async (req, res) => {
  if (await client.isUserAuthorized()) {
    const dialog = (await client.getDialogs({ limit: 1 }))[0];

    let result = `<h1>${dialog.title}</h1>.`;
    for (const m of await client.getMessages(dialog.entity, { limit: 10 })) {
      result += formatMessage(m);
    }

    return res.send(BASE_TEMPLATE.replace("{{0}}", result));
  } else {
    client.start({
      phoneNumber: async () => {
        return phoneCallback.promise;
      },
      phoneCode: async () => {
        return codeCallback.promise;
      },
      password: async () => {
        return passwordCallback.promise;
      },
      onError: (err) => console.log(err),
    });

    return res.send(BASE_TEMPLATE.replace("{{0}}", PHONE_FORM));
  }
});
app.post("/", async (req, res) => {
  //To access POST variable use req.body()methods.
  if ("phone" in req.body) {
    phone = req.body.phone;
    phoneCallback.resolve(phone);
    return res.send(BASE_TEMPLATE.replace("{{0}}", CODE_FORM));
  }

  if ("code" in req.body) {
    codeCallback.resolve(req.body.code);
    return res.send(BASE_TEMPLATE.replace("{{0}}", PASSWORD_FORM));
  }
  if ("password" in req.body) {
    passwordCallback.resolve(req.body.code);
    res.redirect("/");
  }
  console.log(req.body);
});

function callbackPromise() {
  // helper method for promises
  let resolve, reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function formatMessage(message) {
  let content = (message.text || "(action message or media)").replace(
    "\n",
    "<br>"
  );
  return `<p><strong>${utils.getDisplayName(
    message.sender
  )}</strong>: ${content}<sub>${message.date}</sub></p>`;
}

const phoneCallback = callbackPromise();
const codeCallback = callbackPromise();
const passwordCallback = callbackPromise();
// callbacks for code and password also
// then inside your grammy code when use sends phone do the following
// start the Express server
app.listen(port, async () => {
  client.session.setDC(2, "149.154.167.40", 80);
  client.setParseMode("html");
  // Connect before fully starting the server
  await client.connect();
  console.log(`server started at http://localhost:${port}`);
});
