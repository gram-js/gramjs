// Be sure to run interactiveLogin.js before this in
// order to generate a session file.

const { TelegramClient } = require('../gramjs')

;(async () => {
    const apiId = 65534 // Put your API ID here
    const apiHash = 'e3e522e32853d0767df7b2113d5e2497' // Put your API hash here

    const client = new TelegramClient('gramjs', apiId, apiHash)
    await client.connect()

    // const me = await client.getMe()
    // console.log(me)
    // await client.disconnect()
    // process.exit(0)

    const iter = client.iterMessages(198850229)
    for await (const message of iter) {
        console.log(message)
    }
})()
