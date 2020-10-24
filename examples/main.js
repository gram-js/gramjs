const path = require('path')
const { TelegramClient } = require(path.resolve(__dirname, '../gramjs'))
const { validateEnv } = require(path.resolve(__dirname, './utils/validateEnv'));

(async () => {
    console.log('Loading interactive example...')

    // You must provide APP_ID and APP_HASH as env variables
    validateEnv()

    const sessionName = 'anon'
    const apiId = process.env.APP_ID // put your api id here [for example 123456789]
    const apiHash = process.env.APP_HASH // put your api hash here [for example '123456abcfghe']
    const client = new TelegramClient(sessionName, apiId, apiHash)
    await client.connect()

    console.log('You should now be connected.')
})()
