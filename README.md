# GramJS
**GramJS** is Telegram client implementation in JavaScript. It's _core_ is **completely based** on
[Telethon](https://github.com/LonamiWebs/Telethon), don't forget to take a look at the original project.

### Obtaining your `API ID` and `API HASH`
1. Open [this link](https://my.telegram.org) and login with your phone number.
2. Click under `API Development tools`.
3. A `Create new application` window will appear, then fill in your application details.
There is no need to enter any `URL`, and only the first two fields (`App title` and `Short name`) can be changed later.
4. Finally, click `Create application`. And you'll see your app's `API ID` and `API HASH`.

## Running GramJS
If you want to run in it in a browser, just use webpack (a configuration file is already present).
The output will be in the `browser` folder.
In the browser gramjs will use localstorage to not regenerate api methods each run.
check the `examples` folder for more info.
Docs are coming soon!

## Using the raw API
Currently, you can use any raw API function like this:
```
    await client.invoke(new RequestClass(args))
```
And tou can find all of the request classes and types at https://gram.js.org/q.
