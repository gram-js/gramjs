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

## Using the raw API

Currently, you can call any raw API method like `await client.invoke(new RequestClass(args))` .
You can find all methods and types at [gram.js.org](https://gram.js.org).

## Docs

Youu can find the docs at [painor.gitbook.io/gramjs](https://painor.gitbook.io/gramjs) visit [gram.js.org](https://gram.js.org) to see all supported API methods and types.

## Asking questions

If you have any question about GramJS, feel free to open a issue or join us at the Telegram group, [@GramJSChat](https://t.me/gramjschat).
