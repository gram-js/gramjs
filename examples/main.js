const { TelegramClient } = require('../gramjs')
const log4js = require('log4js')
const { InputPeerChat } = require('../gramjs/tl/types')
const { SendMessageRequest } = require('../gramjs/tl/functions/messages')
const logger = log4js.getLogger('gramjs')

logger.level = 'debug'


console.log(message.bytes.toString('hex'));

(async () => {
    console.log('Loading interactive example...')
    const sessionName = 'anon'
    const apiId = -1
    const apiHash = ''
    const client = new TelegramClient(sessionName, apiId, apiHash)
    await client.connect()

    console.log('You should now be connected.')
})()
