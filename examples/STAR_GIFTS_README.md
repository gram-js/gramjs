# Star Gifts API - Работа с подарками Telegram

Полное руководство по работе с Telegram Star Gifts через GramJS.

## 📋 Содержание

- [Быстрый старт](#быстрый-старт)
- [API методы](#api-методы)
- [Примеры использования](#примеры-использования)
- [Типы подарков](#типы-подарков)
- [Атрибуты подарков](#атрибуты-подарков)
- [Операции с подарками](#операции-с-подарками)

## 🚀 Быстрый старт

### Файлы

| Файл | Описание |
|------|----------|
| `telegram_bot.js` | Основной бот с автоматической обработкой подарков |
| `starGiftsExample.js` | Примеры работы с API подарков |

### Запуск

```bash
# Основной бот (обрабатывает входящие подарки + команда /gifts)
node examples/telegram_bot.js

# Примеры работы с API
node examples/starGiftsExample.js
```

## 📚 API методы

### payments.getSavedStarGifts

Получает список сохраненных подарков пользователя.

```javascript
const result = await client.invoke(
    new Api.payments.GetSavedStarGifts({
        peer: await client.getInputEntity('me'),
        offset: '',
        limit: 100,
        // Опциональные флаги для фильтрации:
        excludeUnsaved: false,      // исключить несохраненные
        excludeSaved: false,        // исключить сохраненные
        excludeUnlimited: false,    // исключить неограниченные
        excludeUnique: false,       // исключить уникальные
        sortByValue: true,          // сортировать по стоимости
        excludeUpgradable: false,   // исключить улучшаемые
        excludeUnupgradable: false, // исключить неулучшаемые
        peerColorAvailable: false,  // только с доступным цветом
        excludeHosted: false,       // исключить размещенные
    })
);

console.log(`Всего подарков: ${result.count}`);
result.gifts.forEach(gift => {
    console.log(gift);
});
```

### Структура ответа

```javascript
{
    count: 42,                    // общее количество подарков
    gifts: [SavedStarGift],      // массив подарков
    chats: [Chat],               // связанные чаты
    users: [User],               // связанные пользователи
    nextOffset: "...",           // для пагинации
    chatNotificationsEnabled: Bool // уведомления включены
}
```

## 🎁 Типы подарков

### 1. StarGiftUnique - Уникальный подарок

NFT-подобные уникальные подарки с атрибутами редкости.

```javascript
{
    className: 'StarGiftUnique',
    id: BigInt,                    // уникальный ID
    giftId: BigInt,                // ID типа подарка
    title: "Название",             // название подарка
    slug: "gift-slug",             // URL slug
    num: 42,                       // серийный номер
    ownerId: Peer,                 // текущий владелец
    ownerName: "Имя",              // имя владельца
    ownerAddress: "0x...",         // blockchain адрес
    attributes: [StarGiftAttribute], // атрибуты
    availabilityIssued: 100,       // выпущено
    availabilityTotal: 1000,       // всего
    giftAddress: "0x...",          // адрес подарка
    resellAmount: [StarsAmount],   // цена перепродажи
    releasedBy: Peer,              // кем выпущен
    valueAmount: BigInt,           // стоимость
    valueCurrency: "USD",          // валюта
    themePeer: Peer,               // тема для чата
    peerColor: PeerColor,          // цвет peer
    flags: {
        requirePremium: bool,      // требуется Premium
        resaleTonOnly: bool,       // перепродажа только за TON
        themeAvailable: bool,      // тема доступна
    }
}
```

### 2. StarGift - Обычный подарок

Стандартные подарки за Stars.

```javascript
{
    className: 'StarGift',
    id: BigInt,
    sticker: Document,             // стикер подарка
    stars: 100,                    // стоимость в Stars
    availabilityRemains: 50,       // осталось
    availabilityTotal: 100,        // всего
    availabilityResale: 10,        // доступно для перепродажи
    convertStars: 80,              // обмен на Stars
    firstSaleDate: 1234567890,     // дата начала продаж
    lastSaleDate: 1234567890,      // дата окончания
    upgradeStars: 50,              // стоимость улучшения
    resellMinStars: 90,            // мин. цена перепродажи
    title: "Название",             // название
    releasedBy: Peer,              // кем выпущен
    perUserTotal: 1,               // макс. на пользователя
    perUserRemains: 1,             // осталось на пользователя
    lockedUntilDate: 1234567890,   // заблокирован до
    flags: {
        limited: bool,             // лимитированный
        soldOut: bool,             // распродан
        birthday: bool,            // день рождения
        requirePremium: bool,      // требуется Premium
        limitedPerUser: bool,      // лимит на пользователя
        peerColorAvailable: bool,  // цвет доступен
    }
}
```

## 🎨 Атрибуты подарков

### StarGiftAttributeModel - Модель

```javascript
{
    className: 'StarGiftAttributeModel',
    name: "Dragon",               // название модели
    document: Document,           // 3D модель
    rarityPermille: 50,          // редкость (50 = 5%)
}
```

### StarGiftAttributePattern - Узор

```javascript
{
    className: 'StarGiftAttributePattern',
    name: "Geometric",            // название узора
    document: Document,           // текстура узора
    rarityPermille: 100,         // редкость (100 = 10%)
}
```

### StarGiftAttributeBackdrop - Фон

```javascript
{
    className: 'StarGiftAttributeBackdrop',
    name: "Sunset",               // название фона
    backdropId: 5,                // ID фона
    centerColor: 0xFF5733,        // цвет центра (hex)
    edgeColor: 0xC70039,          // цвет края
    patternColor: 0x900C3F,       // цвет узора
    textColor: 0xFFFFFF,          // цвет текста
    rarityPermille: 25,           // редкость (25 = 2.5%)
}
```

### StarGiftAttributeOriginalDetails - Оригинальные детали

```javascript
{
    className: 'StarGiftAttributeOriginalDetails',
    senderId: Peer,               // кто отправил
    recipientId: Peer,            // кто получил
    date: 1234567890,             // дата отправки
    message: TextWithEntities,    // сообщение
}
```

## 🔧 Операции с подарками

### SavedStarGift - Сохраненный подарок

```javascript
{
    className: 'SavedStarGift',
    fromId: Peer,                  // от кого
    date: 1234567890,              // дата получения
    gift: StarGift,                // сам подарок
    message: TextWithEntities,     // сообщение к подарку
    msgId: 12345,                  // ID сообщения
    savedId: BigInt,               // ID сохраненного
    convertStars: 80,              // обмен на Stars
    upgradeStars: 50,              // улучшение
    canExportAt: 1234567890,       // экспорт доступен
    transferStars: 100,            // стоимость передачи
    canTransferAt: 1234567890,     // передача доступна
    canResellAt: 1234567890,       // перепродажа доступна
    collectionId: [1, 2, 3],       // ID коллекций
    prepaidUpgradeHash: "abc123",  // хеш предоплаты
    dropOriginalDetailsStars: 10,  // сброс деталей
    flags: {
        nameHidden: bool,          // имя скрыто
        unsaved: bool,             // не сохранен
        refunded: bool,            // возвращен
        canUpgrade: bool,          // можно улучшить
        pinnedToTop: bool,         // закреплен сверху
        upgradeSeparate: bool,     // раздельное улучшение
    }
}
```

## 💡 Примеры использования

### 1. Получить свои подарки

```javascript
async function getMyGifts() {
    const peer = await client.getInputEntity('me');
    
    const result = await client.invoke(
        new Api.payments.GetSavedStarGifts({
            peer: peer,
            offset: '',
            limit: 100,
        })
    );
    
    console.log(`У вас ${result.count} подарков`);
    
    result.gifts.forEach(savedGift => {
        console.log(`Подарок: ${savedGift.gift.title}`);
        console.log(`От: ${savedGift.fromId}`);
        console.log(`Дата: ${new Date(savedGift.date * 1000)}`);
    });
}
```

### 2. Фильтровать только уникальные подарки

```javascript
const result = await client.invoke(
    new Api.payments.GetSavedStarGifts({
        peer: await client.getInputEntity('me'),
        offset: '',
        limit: 100,
        excludeSaved: false,
        excludeUnique: false,  // false = показать уникальные
        excludeUnlimited: true, // true = скрыть неограниченные
    })
);

const uniqueGifts = result.gifts.filter(
    g => g.gift.className === 'StarGiftUnique'
);

console.log(`Уникальных подарков: ${uniqueGifts.length}`);
```

### 3. Сортировка по стоимости

```javascript
const result = await client.invoke(
    new Api.payments.GetSavedStarGifts({
        peer: await client.getInputEntity('me'),
        offset: '',
        limit: 100,
        sortByValue: true, // сортировать по стоимости
    })
);
```

### 4. Получить подарки с возможностью улучшения

```javascript
const result = await client.invoke(
    new Api.payments.GetSavedStarGifts({
        peer: await client.getInputEntity('me'),
        offset: '',
        limit: 100,
        excludeUnupgradable: true, // исключить неулучшаемые
    })
);

const upgradableGifts = result.gifts.filter(g => g.canUpgrade);
console.log(`Можно улучшить: ${upgradableGifts.length}`);
```

### 5. Анализ редкости атрибутов

```javascript
async function analyzeRarity() {
    const result = await getUserStarGifts('me', 1000);
    
    const rarityStats = {};
    
    result.gifts.forEach(savedGift => {
        const gift = savedGift.gift;
        if (gift.className === 'StarGiftUnique' && gift.attributes) {
            gift.attributes.forEach(attr => {
                if (attr.rarityPermille) {
                    const rarity = attr.rarityPermille / 10; // в проценты
                    const type = attr.className;
                    
                    if (!rarityStats[type]) {
                        rarityStats[type] = [];
                    }
                    
                    rarityStats[type].push({
                        name: attr.name,
                        rarity: rarity
                    });
                }
            });
        }
    });
    
    // Выводим статистику
    Object.entries(rarityStats).forEach(([type, items]) => {
        console.log(`\n${type}:`);
        items.sort((a, b) => a.rarity - b.rarity);
        items.forEach(item => {
            console.log(`  ${item.name}: ${item.rarity}%`);
        });
    });
}
```

### 6. Пагинация для больших списков

```javascript
async function getAllGiftsPaginated() {
    let allGifts = [];
    let offset = '';
    const limit = 100;
    
    while (true) {
        const result = await client.invoke(
            new Api.payments.GetSavedStarGifts({
                peer: await client.getInputEntity('me'),
                offset: offset,
                limit: limit,
            })
        );
        
        allGifts = allGifts.concat(result.gifts);
        
        console.log(`Загружено: ${allGifts.length} из ${result.count}`);
        
        if (!result.nextOffset || result.gifts.length < limit) {
            break;
        }
        
        offset = result.nextOffset;
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Всего загружено: ${allGifts.length} подарков`);
    return allGifts;
}
```

### 7. Экспорт в JSON

```javascript
async function exportGiftsToJSON() {
    const result = await getUserStarGifts('me', 1000);
    
    const exportData = result.gifts.map(savedGift => ({
        id: savedGift.msgId || savedGift.savedId,
        date: new Date(savedGift.date * 1000).toISOString(),
        from: savedGift.fromId?.value || savedGift.fromId,
        message: savedGift.message?.text || null,
        gift: {
            type: savedGift.gift.className,
            title: savedGift.gift.title,
            ...(savedGift.gift.className === 'StarGiftUnique' ? {
                num: savedGift.gift.num,
                issued: savedGift.gift.availabilityIssued,
                total: savedGift.gift.availabilityTotal,
                attributes: savedGift.gift.attributes?.map(attr => ({
                    type: attr.className,
                    name: attr.name,
                    rarity: attr.rarityPermille ? attr.rarityPermille / 10 : null,
                }))
            } : {
                stars: savedGift.gift.stars,
                limited: savedGift.gift.limited,
            })
        }
    }));
    
    const fs = require('fs');
    fs.writeFileSync('my_gifts.json', JSON.stringify(exportData, null, 2));
    console.log('✅ Экспортировано в my_gifts.json');
}
```

## 🎯 Использование в боте

### Команда для получения подарков

```javascript
client.addEventHandler(async(event) => {
    const message = event.message;
    const text = message.text || '';
    
    if (text.toLowerCase().includes('/gifts')) {
        await getMyStarGifts();
    }
});
```

### Автоматическая обработка входящих подарков

См. `telegram_bot.js` для полного примера автоматической обработки входящих подарков с извлечением всех атрибутов.

## 📊 Статистика

Полный пример в `starGiftsExample.js` включает функцию `getGiftsStatistics()` для:
- Подсчета уникальных/обычных подарков
- Общей стоимости в Stars
- Количества улучшаемых подарков
- Количества передаваемых подарков

## ⚠️ Важные замечания

1. **Rate Limits**: Telegram имеет ограничения на частоту запросов. Используйте задержки между запросами.

2. **Пагинация**: Для больших списков используйте `nextOffset` из ответа.

3. **Редкость**: `rarityPermille` указывается в промилле (1000 = 100%), делите на 10 для процентов.

4. **Цвета**: Цвета в атрибутах фона хранятся как целые числа, конвертируйте в hex для отображения.

5. **Права доступа**: Вы можете получать только свои подарки или подарки пользователей, которые дали доступ.

## 🔗 См. также

- [MESSAGE_POLLING_README.md](MESSAGE_POLLING_README.md) - Мониторинг сообщений
- [MESSAGE_LISTENER_API.md](MESSAGE_LISTENER_API.md) - API обработки сообщений
- [Telegram API Docs](https://core.telegram.org/methods) - Официальная документация

---

**Версия:** 1.0  
**Дата:** 22 октября 2025


