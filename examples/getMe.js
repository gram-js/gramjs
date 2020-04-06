// Be sure to run interactiveLogin.js before this in
// order to generate a session file.

const { TelegramClient } = require('../gramjs')

;(async () => {
    const apiId = 12345 // Put your API ID here
    const apiHash = '123456789abcdef' // Put your API hash here

    const client = new TelegramClient('gramjs', apiId, apiHash)
    await client.connect()

    console.log(await client.getMe())
    await client.disconnect().then(() => process.exit(0))
})()
