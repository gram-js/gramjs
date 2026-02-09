# Парсинг подарков каналов

Инструкция по использованию функции парсинга подарков у каналов Telegram.

## 🚀 Быстрый старт

### Автоматический парсинг при старте

При запуске `telegram_bot.js` автоматически парсятся подарки:
1. Ваши личные подарки
2. Подарки канала **@tylerswall**

```bash
node examples/telegram_bot.js
```

## 📝 Команды в чате

После запуска бота, отправьте себе в Saved Messages любую из команд:

### Ваши подарки
```
/gifts
/подарки
```

### Подарки канала @tylerswall
```
/channel
/канал
```

### Подарки любого канала
```
/getchannel username
/получить username
```

**Примеры:**
- `/getchannel tylerswall`
- `/получить tylerswall`
- `/getchannel durov` (получить подарки канала @durov)

## 💻 Программное использование

### Функция getChannelStarGifts()

```javascript
// Получить подарки канала
await getChannelStarGifts('tylerswall');

// Получить подарки любого канала
await getChannelStarGifts('username');
```

### Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `channelUsername` | string | Username канала (без @) |

### Возвращаемое значение

Объект с полями:
```javascript
{
    count: 42,                    // всего подарков
    gifts: [SavedStarGift],      // массив подарков
    chats: [Chat],               // связанные чаты
    users: [User],               // связанные пользователи
    nextOffset: "...",           // для пагинации
}
```

## 📊 Пример вывода

```
📺 Получаю список подарков канала @tylerswall...

📊 Всего подарков у канала @tylerswall: 15
══════════════════════════════════════════════════════════════════════

🎁 Подарок #1
──────────────────────────────────────────────────────────────────────
ID: 12345
Дата: 22.10.2025, 15:30:00
Тип: ⭐ Уникальный подарок
Название: Golden Dragon
Номер: #42
Выпущено: 100/1000
🔗 Slug: golden-dragon-42

Владелец ID: 7123456789
Имя владельца: Tyler
Адрес владельца: 0xabc123...

📋 Атрибуты:
  • Модель: Dragon (редкость: 5%)
  • Узор: Geometric (редкость: 10%)
  • Фон: Sunset (редкость: 2.5%)
    Цвета - Центр: #ff5733, Край: #c70039

💰 Стоимость перепродажи:
  • 1000 stars
  • 0.5 TON

💵 Стоимость: 500 USD

👤 От: 987654321

══════════════════════════════════════════════════════════════════════
✅ Показано подарков: 15 из 15
```

## 🎯 Что показывается

Для каждого подарка канала:

✅ **Основная информация**
- ID подарка
- Дата получения
- Тип (уникальный/обычный)

✅ **Для уникальных подарков**
- Название
- Серийный номер (#42 из 1000)
- Slug для просмотра
- Владелец (ID, имя, адрес)
- Атрибуты редкости (модель, узор, фон)
- Цвета в hex формате
- Стоимость перепродажи (Stars/TON)
- Стоимость в фиатной валюте (USD/EUR)

✅ **Для обычных подарков**
- Название
- Стоимость в Stars
- Лимитированность

✅ **Дополнительно**
- Сообщение к подарку
- От кого получен
- Статусы (закреплен, возвращен, можно улучшить)

## ⚙️ Настройка

### Изменить канал по умолчанию

Откройте `telegram_bot.js` и найдите строку:

```javascript
// Получаем подарки канала @tylerswall
await getChannelStarGifts('tylerswall');
```

Замените `'tylerswall'` на нужный вам канал:

```javascript
await getChannelStarGifts('durov');
```

### Отключить автоматический парсинг

Закомментируйте строку:

```javascript
// await getChannelStarGifts('tylerswall');
```

### Парсить несколько каналов

```javascript
await getChannelStarGifts('tylerswall');
await getChannelStarGifts('durov');
await getChannelStarGifts('telegram');
```

## 🔧 Дополнительные возможности

### Пагинация для больших списков

```javascript
async function getAllChannelGifts(channelUsername) {
    let allGifts = [];
    let offset = '';
    const limit = 100;
    
    while (true) {
        const result = await client.invoke(
            new Api.payments.GetSavedStarGifts({
                peer: await client.getInputEntity(channelUsername),
                offset: offset,
                limit: limit,
            })
        );
        
        allGifts = allGifts.concat(result.gifts);
        
        if (!result.nextOffset || result.gifts.length < limit) {
            break;
        }
        
        offset = result.nextOffset;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return allGifts;
}
```

### Фильтрация только уникальных

```javascript
async function getUniqueChannelGifts(channelUsername) {
    const result = await client.invoke(
        new Api.payments.GetSavedStarGifts({
            peer: await client.getInputEntity(channelUsername),
            offset: '',
            limit: 100,
            excludeUnlimited: true,  // исключить обычные
        })
    );
    
    return result.gifts.filter(g => 
        g.gift.className === 'StarGiftUnique'
    );
}
```

### Сортировка по стоимости

```javascript
const result = await client.invoke(
    new Api.payments.GetSavedStarGifts({
        peer: await client.getInputEntity('tylerswall'),
        offset: '',
        limit: 100,
        sortByValue: true,  // сортировать по стоимости
    })
);
```

### Экспорт в JSON

```javascript
async function exportChannelGiftsToJSON(channelUsername) {
    const result = await getChannelStarGifts(channelUsername);
    
    const exportData = result.gifts.map(savedGift => ({
        id: savedGift.msgId || savedGift.savedId,
        date: new Date(savedGift.date * 1000).toISOString(),
        gift: {
            type: savedGift.gift.className,
            title: savedGift.gift.title,
            ...(savedGift.gift.className === 'StarGiftUnique' ? {
                num: savedGift.gift.num,
                slug: savedGift.gift.slug,
                owner: savedGift.gift.ownerName,
                attributes: savedGift.gift.attributes?.map(attr => ({
                    type: attr.className,
                    name: attr.name,
                    rarity: attr.rarityPermille / 10,
                }))
            } : {
                stars: savedGift.gift.stars,
            })
        }
    }));
    
    const fs = require('fs');
    fs.writeFileSync(
        `${channelUsername}_gifts.json`, 
        JSON.stringify(exportData, null, 2)
    );
    
    console.log(`✅ Экспортировано в ${channelUsername}_gifts.json`);
}

// Использование
await exportChannelGiftsToJSON('tylerswall');
```

## 📝 Примеры команд

```bash
# В Saved Messages отправьте:

# Получить подарки @tylerswall
/channel

# Получить подарки @durov
/getchannel durov

# Получить подарки @telegram
/получить telegram

# Получить свои подарки
/gifts
```

## ⚠️ Важно

1. **Доступ**: Вы можете получать подарки только публичных каналов или каналов, где у вас есть доступ
2. **Rate Limits**: Telegram ограничивает частоту запросов, используйте задержки
3. **Пагинация**: Для каналов с большим количеством подарков используйте `nextOffset`
4. **Приватность**: Некоторые данные могут быть скрыты настройками приватности

## 🔗 См. также

- [telegram_bot.js](telegram_bot.js) - основной бот
- [starGiftsExample.js](starGiftsExample.js) - примеры работы с подарками
- [STAR_GIFTS_README.md](STAR_GIFTS_README.md) - полная документация API

---

**Версия:** 1.0  
**Дата:** 22 октября 2025


