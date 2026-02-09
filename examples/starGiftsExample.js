/**
 * Telegram Bot с автоматической обработкой подарков
 * 
 * Возможности:
 * - Автоматическое получение списка подарков при старте
 * - Команда /gifts или /подарки для вывода списка в любой момент
 * - Автоматическая обработка входящих уникальных подарков
 * - Детальная информация об атрибутах редкости
 * 
 * Использование:
 * 1. Заполните apiId, apiHash, stringSession
 * 2. Запустите: node examples/telegram_bot.js
 * 3. Отправьте себе в Saved Messages команду /gifts
 * 
 * См. также:
 * - starGiftsExample.js - примеры работы с API подарков
 * - STAR_GIFTS_README.md - полная документация
 */

const { TelegramClient, Api } = require("../dist");
const { StringSession } = require("../dist/sessions");
const { NewMessage } = require("../dist/events");


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

    const clientMe = await client.getMe();
    const clientMeId = clientMe.id;

    // Функция для получения списка моих подарков
    async function getMyStarGifts() {
        try {
            console.log('\n🎁 Получаю список ваших подарков...\n');

            // Получаем InputPeer для себя
            const mePeer = await client.getInputEntity('me');

            // Запрашиваем список подарков
            const result = await client.invoke(
                new Api.payments.GetSavedStarGifts({
                    peer: mePeer,
                    offset: '',
                    limit: 100,
                })
            );

            console.log(`📊 Всего подарков: ${result.count}`);
            console.log('═'.repeat(70));

            // Обрабатываем каждый подарок
            result.gifts.forEach((savedGift, index) => {
                const gift = savedGift.gift;

                console.log(`\n🎁 Подарок #${index + 1}`);
                console.log('─'.repeat(70));

                // Основная информация
                console.log(`ID: ${savedGift.msgId || savedGift.savedId || 'N/A'}`);
                console.log(`Дата: ${new Date(savedGift.date * 1000).toLocaleString()}`);

                // Информация о подарке
                if (gift.className === 'StarGiftUnique') {
                    console.log(`Тип: ⭐ Уникальный подарок`);
                    console.log(`Название: ${gift.title}`);
                    console.log(`Номер: #${gift.num}`);
                    console.log(`Выпущено: ${gift.availabilityIssued}/${gift.availabilityTotal}`);

                    // Владелец
                    if (gift.ownerId) {
                        console.log(`Владелец ID: ${gift.ownerId.value || gift.ownerId}`);
                    }
                    if (gift.ownerName) {
                        console.log(`Имя владельца: ${gift.ownerName}`);
                    }

                    // Атрибуты
                    if (gift.attributes && gift.attributes.length > 0) {
                        console.log('\n📋 Атрибуты:');
                        gift.attributes.forEach(attr => {
                            if (attr.className === 'StarGiftAttributeModel') {
                                console.log(`  • Модель: ${attr.name} (редкость: ${attr.rarityPermille / 10}%)`);
                            } else if (attr.className === 'StarGiftAttributePattern') {
                                console.log(`  • Узор: ${attr.name} (редкость: ${attr.rarityPermille / 10}%)`);
                            } else if (attr.className === 'StarGiftAttributeBackdrop') {
                                console.log(`  • Фон: ${attr.name} (редкость: ${attr.rarityPermille / 10}%)`);
                                console.log(`    Цвета - Центр: #${attr.centerColor.toString(16)}, Край: #${attr.edgeColor.toString(16)}`);
                            }
                        });
                    }

                    // Стоимость перепродажи
                    if (gift.resellAmount) {
                        console.log(`\n💰 Стоимость перепродажи:`);
                        gift.resellAmount.forEach(amount => {
                            console.log(`  • ${amount.amount} ${amount.currency || 'stars'}`);
                        });
                    }

                    // Возможность экспорта
                    if (savedGift.canExportAt) {
                        const exportDate = new Date(savedGift.canExportAt * 1000);
                        console.log(`📤 Экспорт доступен с: ${exportDate.toLocaleString()}`);
                    }

                    // Возможность передачи
                    if (savedGift.canTransferAt) {
                        const transferDate = new Date(savedGift.canTransferAt * 1000);
                        console.log(`� Передача доступна с: ${transferDate.toLocaleString()}`);
                    }

                } else {
                    // Обычный подарок
                    console.log(`Тип: Обычный подарок`);
                    if (gift.title) {
                        console.log(`Название: ${gift.title}`);
                    }
                    console.log(`Стоимость: ${gift.stars} ⭐`);

                    if (gift.limited) {
                        console.log(`🔥 Лимитированный: ${gift.availabilityRemains}/${gift.availabilityTotal}`);
                    }
                }

                // Сообщение к подарку
                if (savedGift.message) {
                    const msgText = savedGift.message.text || savedGift.message;
                    console.log(`💌 Сообщение: "${msgText}"`);
                }

                // От кого
                if (savedGift.fromId) {
                    console.log(`👤 От: ${savedGift.fromId.value || savedGift.fromId}`);
                }

                // Статусы
                const statuses = [];
                if (savedGift.pinned) statuses.push('📌 Закреплен');
                if (savedGift.unsaved) statuses.push('❌ Не сохранен');
                if (savedGift.refunded) statuses.push('💸 Возвращен');
                if (savedGift.canUpgrade) statuses.push('⬆️ Можно улучшить');

                if (statuses.length > 0) {
                    console.log(`\n${statuses.join(' | ')}`);
                }
            });

            console.log('\n═'.repeat(70));
            console.log(`\n✅ Показано подарков: ${result.gifts.length} из ${result.count}\n`);

            return result;
        } catch (error) {
            console.error('❌ Ошибка при получении подарков:', error);
            throw error;
        }
    }

    // Вызываем функцию для получения подарков при старте
    await getMyStarGifts();

    // Пример работы с конкретным пользователем (закомментировано)
    /*
    const user = await client.getEntity('fiscalforever');

    if (user.className !== "User") {
        console.log('Не удалось получить пользователя fiscalforever');
        return
    }

    const inputUser = new Api.InputUser({
        userId: user.id,
        accessHash: user.accessHash,
    });

    const usersMsgs = await client.getMessages(inputUser);

    const invoice = new Api.InputInvoiceStarGiftTransfer({
        msgId: 11169, // gift receive msg id
        toId: inputUser,
    });

    const form_info = await client.invoke(
        new Api.payments.GetPaymentForm({
            invoice: invoice
        })
    );

    await client.invoke(
        new Api.payments.SendStarsForm({
            formId: form_info.originalArgs.formId,
            invoice: invoice
        })
    )
    */

    client.addEventHandler(async(event) => {
        try {
            const message = event.message;
            if (!message) return;

            let senderId = null;

            if (event.className === "UpdateShortMessage") {
                senderId = event.userId.value;
            } else {
                if (!message.chatId) return;

                senderId = message.chatId.value;
            }

            if (!senderId) return;

            console.log(`Получено сообщение от пользователя ${senderId}`);

            // Обработка текстовых команд
            const text = message.text || message.message || '';

            // Команда для получения списка подарков
            if (text.toLowerCase().includes('/gifts') || text.toLowerCase().includes('/подарки')) {
                console.log('📝 Получена команда для вывода подарков');
                await getMyStarGifts();
                return;
            }

            const action = message?.action;
            if (!action) return;

            const gift = action?.gift;
            if (!gift || gift.className !== "StarGiftUnique") return;

            const giftOwnerId = gift.ownerId;

            if (Number(clientMeId) !== Number(giftOwnerId)) {
                console.log(`Подарок отправлен пользователю`);
                return;
            }

            const attributes = gift.originalArgs.attributes;
            let model = null,
                modelRarity = null;
            let pattern = null,
                patternRarity = null;
            let backdrop = null,
                backdropRarity = null;
            let backdropCenterColor = null,
                backdropEdgeColor = null,
                backdropPatternColor = null,
                backdropTextColor = null;

            for (const attribute of attributes) {
                const attribute_title = attribute.className;
                if (attribute_title === "StarGiftAttributeModel") {
                    model = attribute.name;
                    modelRarity = attribute.rarityPermille;
                } else if (attribute_title === "StarGiftAttributePattern") {
                    pattern = attribute.name;
                    patternRarity = attribute.rarityPermille;
                } else if (attribute_title === "StarGiftAttributeBackdrop") {
                    backdrop = attribute.name;
                    backdropRarity = attribute.rarityPermille;

                    const origBackdropArgs = attribute.originalArgs;
                    backdropCenterColor = origBackdropArgs.centerColor;
                    backdropEdgeColor = origBackdropArgs.edgeColor;
                    backdropPatternColor = origBackdropArgs.patternColor;
                    backdropTextColor = origBackdropArgs.textColor;
                }
            }

            // Выводим информацию о подарке в консоль
            console.log(`\n=== ПОЛУЧЕН ПОДАРОК ===`);
            console.log(`От пользователя: ${senderId}`);
            console.log(`ID подарка: ${gift.id.value}`);
            console.log(`Номер подарка: ${gift.num}`);
            console.log(`Название: ${gift.title}`);
            console.log(`Выпущено: ${gift.availabilityIssued}/${gift.availabilityTotal}`);
            console.log(`Владелец: ${giftOwnerId}`);

            console.log(`\n--- Атрибуты подарка ---`);
            if (model) console.log(`Модель: ${model} (редкость: ${modelRarity})`);
            if (pattern) console.log(`Узор: ${pattern} (редкость: ${patternRarity})`);
            if (backdrop) {
                console.log(`Фон: ${backdrop} (редкость: ${backdropRarity})`);
                console.log(`Цвета фона - Центр: ${backdropCenterColor}, Край: ${backdropEdgeColor}, Узор: ${backdropPatternColor}, Текст: ${backdropTextColor}`);
            }
            console.log(`========================\n`);
        } catch (error) {
            console.error('Ошибка при обработке события:', error);
        }
    });

    console.log('Юзербот запущен и слушает сообщения...');
})();
