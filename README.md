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
First of all, you need to run the `index.js` by issuing `node index.js gen`. This will generate all the
TLObjects from the given `scheme.tl` file.
Then check the `examples` folder to check how to use the library

## Using raw api
Currently you can use any raw api function using `await client.invoke(new RequestClass(args))` .
you can find all the requests and types at https://gram.js.org/
