const APP_ID = null // put your api id here [for example 123456789]
const APP_HASH = null // put your api hash here [for example '123456abcfghe']

if (!APP_ID || !APP_HASH) {
    alert('You must provide APP_ID and APP_HASH in the simpleLogin.js')
}

const phoneDiv = document.getElementById('phoneDiv')
const phone = document.getElementById('phone')
const phoneSend = document.getElementById('phoneSend')
const codeDiv = document.getElementById('codeDiv')
const code = document.getElementById('code')
const codeSend = document.getElementById('codeSend')
const passDiv = document.getElementById('passDiv')
const pass = document.getElementById('pass')
const passSend = document.getElementById('passSend')
const logger = document.getElementById('log')

function phoneCallback() {
    phone.disabled = false
    phoneSend.disabled = false

    return new Promise(resolve => {
        phoneSend.addEventListener('click', function() {
            phone.disabled = true
            phoneSend.disabled = true
            resolve(phone.value)
        })
    })
}


function passwordCallback() {
    passDiv.style.visibility = 'visible'

    return new Promise(resolve => {
        passSend.addEventListener('click', function() {
            code.disabled = true
            codeSend.disabled = true

            resolve(pass.value)
            alert('welcome')

        })
    })
}

function codeCallback() {
    code.disabled = false
    codeSend.disabled = false

    codeDiv.style.visibility = 'visible'

    return new Promise(resolve => {
        codeSend.addEventListener('click', function() {
            code.disabled = true
            codeSend.disabled = true
            resolve(code.value)
        })
    })
}


const { TelegramClient } = gramjs
const { StringSession } = gramjs.session
const apiId = APP_ID // put your api id here [for example 123456789]
const apiHash = APP_HASH // put your api hash here [for example '123456abcfghe']

const client = new TelegramClient(new StringSession(''), apiId, apiHash) // you can pass a string session here from previous logins.
// If you want to run this example in the test servers uncomment this line
// client.session.setDC(2, '149.154.167.40', 80)

client.start({
    phone: phoneCallback,
    password: passwordCallback,
    code: codeCallback,
}).then(() => {
    console.log('%c you should now be connected', 'color:#B54128')
    console.log('%c your string session is ' + client.session.save(), 'color:#B54128')
    console.log('%c you can save it to login with it next time', 'color:#B54128')

})



