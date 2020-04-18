// Be sure to run interactiveLogin.js before this in
// order to generate a session file.

const { TelegramClient } = require('../gramjs')

;(async () => {
    const apiId = 12345 // Put your API ID here
    const apiHash = '123456789abcdef' // Put your API hash here

    const client = new TelegramClient('gramjs', apiId, apiHash)
    await client.connect()

    const me = await client.getMe()
    console.log(me)
    await client.disconnect()
    process.exit(0)
})()
