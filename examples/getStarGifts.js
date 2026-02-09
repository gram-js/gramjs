/**
 * Простой скрипт для вызова метода GetStarGifts
 * 
 * Использование:
 * 1. Заполните apiId, apiHash, stringSession
 * 2. Запустите: node examples/getStarGifts.js
 */

const { TelegramClient, Api } = require("../dist");
const { StringSession } = require("../dist/sessions");

const phoneNumber = "+19374685627";
const faCode = "";

const apiId = 21565462; // e.g. 123456
const apiHash = "6681a9a03f81caac5b43ff8dcc9c52fe"; // e.g. 'abcd1234efgh5678'
const stringSession = "1BAAOMTQ5LjE1NC4xNjcuOTEAUCXkhkoTTCMLJ3K53SrJ+WMop7tl6gMESwHBYVzTqbn6kgVQKKpG/J1knonu9/XzPJOg9Np4/3fL0kGxJHe42JH08JTh9riHpJgvcGacUDywMJ/VWHqEze2Z1UmHIbJM82ZuLLI6O8TUrWpCklGMf/Fwl93pNyflSA28Vzt9ZJ/YGqnszgmOroNZTLlArbdBo0v2RJMjoDz0CRUQ6sZe6imHHUgboQeJRAaSqfEbJPEca8bJXI4Ncx7Sa0k8OLE3KWFsrIwgo+/PPEByisyASXQwyG4c1VMidJNSdct1/rvTDweD6rLwnY5dY6ou5ApYvMgv433eaEnBwm5nD4zYNvQ="; // Paste your STRING SESSION here

(async() => {
    console.log('Загрузка...');

    const client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, {
        connectionRetries: 5,
    });

    await client.start({
        phoneNumber: phoneNumber,
        password: async() => faCode,
        phoneCode: async() => '123456',
        onError: (err) => console.log(err),
    });

    console.log(client.session.save());

    console.log('Успешный вход');

    try {
        console.log('\n🎁 Вызываю метод GetStarGifts...\n');

        // Вызываем GetStarGifts с hash=0 (получить полный список)
        const result = await client.invoke(
            new Api.payments.GetStarGifts({
                hash: 0,
            })
        );

        console.log('✅ Результат GetStarGifts:');
        console.log(JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('❌ Ошибка при вызове GetStarGifts:', error);
    }

    await client.disconnect();
})();


