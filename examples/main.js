const { TelegramClient } = require('../gramjs')
const logger = require('log4js').getLogger()
logger.level = 'debug';

(async () => {
    console.log('Loading interactive example...')
    const sessionName = 'anon'
    const apiId = -1
    const apiHash = ''
    const client = new TelegramClient(sessionName, apiId, apiHash)
    await client.connect()

    console.log('You should now be connected.')
})()
