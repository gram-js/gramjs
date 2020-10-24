# GramJS
**GramJS** is Telegram client implementation in Javascript. This project's _core_ is **completely based** on
[Telethon](https://github.com/LonamiWebs/Telethon). All the files which are fully based on it.
don't forget to have a look to the original project.

### Obtaining your `API ID` and `Hash`
1. Follow [this link](https://my.telegram.org) and login with your phone number.
2. Click under `API Development tools`.
3. A `Create new application` window will appear. Fill in your application details.
There is no need to enter any `URL`, and only the first two fields (`App title` and `Short name`)
can be changed later as long as I'm aware.
4. Click on `Create application` at the end. Now that you have the `API ID` and `Hash`

## Installing
1. Clone a repository `git clone https://github.com/gram-js/gramjs.git`.
2. Install dependencies `npm i`.
3. Generate all the TLObjects from the given `scheme.tl` file `node index.js gen`.
4. Check out examples for [terminal](#terminal-example) or [browser](#browser-example).

## Examples
### Terminal example
1. Obtain your `API ID` and `Hash`. [How to](#obtaining-your-api-id-and-hash).
2. From a root folder run `node ./examples/main.js APP_ID=your_apps_id APP_HASH=your_apps_hash`.

### Browser example
1. Obtain your `API ID` and `Hash`. [How to](#obtaining-your-api-id-and-hash).
2. Open `examples/simpleLogin.js`
3. Set constants `APP_ID` and `APP_HASH` values on the top of the file.
4. Open `examples/simpleLogin.html` with your favorite browser.

## Using raw api
Currently you can use any raw api function using `await client.invoke(new RequestClass(args))` .
you can find all the requests and types at https://gram.js.org/
