const { TelegramClient } = require('../gramjs');
const { StringSession } = require('../gramjs').sessions;


(async () => {
    console.log('Loading interactive example...')
    const sessionName = 'anon'
    const apiId = -1 // put your api id here [for example 123456789]
    const apiHash = "" // put your api hash here [for example '123456abcfghe']
    const client = new TelegramClient(new StringSession(''), apiId, apiHash)
    await client.connect()
    console.log('You should now be connected.')
})()
