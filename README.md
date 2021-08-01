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

## Running GramJS

If you want to run in it in a browser just use webpack (a configuration file is already present).
The output will be in `browser` folder.
In the browser gramjs will use localstorage to not regenerate api methods each run.
check the `examples` folder for more info.

## Generate Session String

To generate session string , simply run `npx tgsession` and provide required details

## Using raw api

Currently you can use any raw api function using `await client.invoke(new RequestClass(args))` .
you can find all the requests and types at https://gram.js.org/

## Docs

you can find the docs at https://painor.gitbook.io/gramjs/ or https://gram.js.org/  which has all the functions with a usage example

##Asking question

If you have any question about how to use the library feel free to open a github issue or join us at the telegram group [@GramJSChat](https://t.me/gramjschat)
