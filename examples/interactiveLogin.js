const readline = require('readline-promise')
const { TelegramClient } = require('../gramjs')
const { Logger } = require('../gramjs/extensions')

const logger = new Logger('error')

const rl = readline.default.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
})

;(async () => {
    console.log('Loading interactive example...')

    const apiId = 12345 // Put your API ID here
    const apiHash = '123456789abcdef' // Put your API hash here

    // Create a client
    const client = new TelegramClient('gramjs', apiId, apiHash, { baseLogger: logger })
    await client.connect()

    // Send the code
    const phone = await rl.questionAsync('Please enter your phone number: ')
    await client.sendCodeRequest(phone, null)
    const code = await rl.questionAsync('Plase enter the code sent by Telegram: ')

    // Start the authentication proceedure and generate the session file
    await client.start({ phone, code })
    console.log(`Generated session file as gramjs.session`)
    client.disconnect().then(() => process.exit(0))
})()
