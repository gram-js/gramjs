# GramJS

A Telegram client written in JavaScript for Node.js and browsers, with its core being based on
[Telethon](https://github.com/LonamiWebs/Telethon).

### Obtaining your app ID and hash

1. Follow [this link](https://my.telegram.org), and login with your phone number.
2. Click "API development tools".
3. Fill in your application details.
   There is no need to enter any URL, and only the first two fields (app title and short name)
   can be modified later.
4. Finally, click "Create application".

## Running GramJS

GramJS can run on Node.js, browsers and with frameworks like React.

In browsers, GramJS will be using the `localStorage` to cache the layers.

To get a browser bundle of GramJS, use the following command:

```bash
NODE_ENV=production npx webpack
```

## Calling the raw API
To use raw telegram API methods use [invoke function](https://gram.js.org/beta/classes/TelegramClient.html#invoke).

```javascript
await client.invoke(new RequestClass(args))
``` 

## Documentation

General documentation, use cases, quick start, refer to [gram.js.org](https://gram.js.org), or [older version of documentation](https://painor.gitbook.io/gramjs) (will be removed in the future).

For more advanced documentation refer to [gram.js.org/beta](https://gram.js.org/beta) (work in progress).

## Ask a question

If you have any questions about GramJS, feel free to open an issue or ask directly in our telegram group - [@GramJSChat](https://t.me/gramjschat).
