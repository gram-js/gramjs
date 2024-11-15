# GramJS

A Telegram client written in JavaScript for Node.js and browsers, with its core being based on
[Telethon](https://github.com/LonamiWebs/Telethon).

## How to get started

Here you'll learn how to obtain necessary information to create telegram application, authorize into your account and send yourself a message.

> **Note** that if you want to use a GramJS inside of a browser, refer to [this instructions](https://gram.js.org/introduction/advanced-installation).

Install GramJS:

```bash
$ npm i telegram
```

After installation, you'll need to obtain an API ID and hash:

1. Login into your [telegram account](https://my.telegram.org/)
2. Then click "API development tools" and fill your application details (only app title and short name required)
3. Finally, click "Create application"

> **Never** share any API/authorization details, that will compromise your application and account.

When you've successfully created the application, change `apiId` and `apiHash` on what you got from telegram.

Then run this code to send a message to yourself.

```javascript
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import readline from "readline";

const apiId = 123456;
const apiHash = "123456abcdfg";
const stringSession = new StringSession(""); // fill this later with the value from session.save()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

(async () => {
  console.log("Loading interactive example...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.start({
    phoneNumber: async () =>
      new Promise((resolve) =>
        rl.question("Please enter your number: ", resolve)
      ),
    password: async () =>
      new Promise((resolve) =>
        rl.question("Please enter your password: ", resolve)
      ),
    phoneCode: async () =>
      new Promise((resolve) =>
        rl.question("Please enter the code you received: ", resolve)
      ),
    onError: (err) => console.log(err),
  });
  console.log("You should now be connected.");
  console.log(client.session.save()); // Save this string to avoid logging in again
  await client.sendMessage("me", { message: "Hello!" });
})();
```

> **Note** that you can also save auth key to a folder instead of a string, change `stringSession` into this:
>
> ```javascript
> const storeSession = new StoreSession("folder_name");
> ```

Be sure to save output of `client.session.save()` into `stringSession` or `storeSession` variable to avoid logging in again.

## Running GramJS inside browsers

GramJS works great in combination with frontend libraries such as React, Vue and others.

While working within browsers, GramJS is using `localStorage` to cache the layers.

To get a browser bundle of GramJS, use the following command:

```bash
NODE_ENV=production npx webpack
```

You can also use the helpful script `generate_webpack.js`

```bash
node generate_webpack.js
```

## Calling the raw API

To use raw telegram API methods use [invoke function](https://gram.js.org/beta/classes/TelegramClient.html#invoke).

```javascript
await client.invoke(new RequestClass(args));
```

## Documentation

General documentation, use cases, quick start, refer to [gram.js.org](https://gram.js.org), or [older version of documentation](https://painor.gitbook.io/gramjs) (will be removed in the future).

For more advanced documentation refer to [gram.js.org/beta](https://gram.js.org/beta) (work in progress).

If your ISP is blocking Telegram, you can check [My ISP blocks Telegram. How can I still use GramJS?](https://gist.github.com/SecurityAndStuff/7cd04b28216c49b73b30a64d56d630ab)

## Ask a question

If you have any questions about GramJS, feel free to open an issue or ask directly in our telegram group - [@GramJSChat](https://t.me/gramjschat).
