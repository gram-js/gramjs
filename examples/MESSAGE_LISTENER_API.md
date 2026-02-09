# MessageListener API Documentation

Структурированный listener для обработки сообщений в GramJS, созданный по паттерну connector/handler.

## 📖 Содержание

- [Быстрый старт](#быстрый-старт)
- [API Reference](#api-reference)
- [Примеры использования](#примеры-использования)
- [Структура данных](#структура-данных)

## Быстрый старт

### Базовое использование

```javascript
const { TelegramClient } = require("../dist");
const { StringSession } = require("../dist/sessions");

const client = new TelegramClient(/* ... */);
const messageListener = new MessageListener(client);

await client.connect();

// Инициализация listener'а
messageListener.init();

// Добавление обработчиков
messageListener.on("message", (data) => {
    console.log(`Получено сообщение: ${data.text}`);
});
```

## API Reference

### Constructor

```javascript
new MessageListener(client)
```

**Параметры:**
- `client` - экземпляр TelegramClient

**Возвращает:** экземпляр MessageListener

---

### Methods

#### `init()`

Инициализирует listener и начинает прослушивание сообщений.

```javascript
messageListener.init();
```

**Возвращает:** `void`

**Особенности:**
- Защита от повторной инициализации
- Автоматически регистрирует обработчик в TelegramClient
- Выводит сообщение о успешной инициализации

---

#### `on(eventType, handler)`

Регистрирует пользовательский обработчик для событий.

```javascript
messageListener.on("message", (data) => {
    // Ваш код обработки
});
```

**Параметры:**
- `eventType` (string) - тип события (сейчас поддерживается только `"message"`)
- `handler` (function) - функция-обработчик, принимает объект данных сообщения

**Возвращает:** `this` (для цепочки вызовов)

**Пример цепочки:**
```javascript
messageListener
    .on("message", handler1)
    .on("message", handler2)
    .on("message", handler3);
```

---

#### `off(eventType, handler)`

Удаляет зарегистрированный обработчик.

```javascript
const myHandler = (data) => { /* ... */ };
messageListener.on("message", myHandler);
// Позже...
messageListener.off("message", myHandler);
```

**Параметры:**
- `eventType` (string) - тип события
- `handler` (function) - ссылка на функцию-обработчик

**Возвращает:** `this` (для цепочки вызовов)

---

#### `getStats()`

Возвращает статистику работы listener'а.

```javascript
const stats = messageListener.getStats();
console.log(stats);
// {
//   messageCount: 42,
//   uptime: 120000,
//   uptimeMinutes: 2,
//   messagesPerMinute: "21.00"
// }
```

**Возвращает:** объект со статистикой
- `messageCount` - количество обработанных сообщений
- `uptime` - время работы в миллисекундах
- `uptimeMinutes` - время работы в минутах
- `messagesPerMinute` - среднее количество сообщений в минуту

---

#### `destroy()`

Останавливает listener и очищает все обработчики.

```javascript
messageListener.destroy();
```

**Возвращает:** `void`

**Особенности:**
- Очищает все зарегистрированные обработчики
- Выводит финальную статистику
- Устанавливает флаг `isActive = false`

---

## Структура данных

### Объект MessageData

Структура данных, передаваемая в обработчики:

```javascript
{
    id: 12345,                          // ID сообщения
    date: Date,                         // Объект Date
    text: "Hello world",                // Текст сообщения или null
    senderId: 987654321,                // ID отправителя
    chatId: 987654321,                  // ID чата
    
    sender: {                           // Информация об отправителе
        id: 987654321,
        firstName: "John",
        lastName: "Doe",
        username: "johndoe",
        fullName: "John Doe"
    },
    
    chat: {                             // Информация о чате
        id: 987654321,
        title: "My Group",
        username: "mygroup"
    },
    
    type: "private",                    // "private" | "group" | "channel"
    media: "MessageMediaPhoto",         // Тип медиа или null
    isReply: false,                     // Является ли ответом
    replyToMsgId: null,                 // ID сообщения, на которое отвечают
    isForwarded: false,                 // Является ли пересланным
    hasButtons: false,                  // Есть ли кнопки
    buttonCount: 0,                     // Количество кнопок
    raw: Message                        // Оригинальный объект Message
}
```

## Примеры использования

### 1. Базовый мониторинг

```javascript
const messageListener = new MessageListener(client);
messageListener.init();

messageListener.on("message", (data) => {
    console.log(`[${data.type}] ${data.sender?.fullName}: ${data.text}`);
});
```

### 2. Фильтрация по типу сообщения

```javascript
// Только личные сообщения
messageListener.on("message", (data) => {
    if (data.type === "private") {
        console.log(`Private message: ${data.text}`);
    }
});

// Только групповые сообщения
messageListener.on("message", (data) => {
    if (data.type === "group") {
        console.log(`Group message: ${data.text}`);
    }
});
```

### 3. Детекция ключевых слов

```javascript
const keywords = ["важно", "срочно", "alarm"];

messageListener.on("message", (data) => {
    if (data.text) {
        const lowerText = data.text.toLowerCase();
        const foundKeyword = keywords.find(kw => lowerText.includes(kw));
        
        if (foundKeyword) {
            console.log(`🚨 Keyword "${foundKeyword}" detected!`);
            console.log(`From: ${data.sender?.fullName}`);
            console.log(`Text: ${data.text}`);
        }
    }
});
```

### 4. Авто-ответ

```javascript
messageListener.on("message", async (data) => {
    if (data.text && data.text.toLowerCase() === "ping") {
        await client.sendMessage(data.chatId, {
            message: "Pong! 🏓"
        });
    }
});
```

### 5. Сохранение истории сообщений

```javascript
const messageHistory = [];

messageListener.on("message", (data) => {
    messageHistory.push({
        id: data.id,
        date: data.date,
        text: data.text,
        sender: data.sender?.fullName,
        chat: data.chat?.title,
    });
    
    // Ограничение размера истории
    if (messageHistory.length > 1000) {
        messageHistory.shift();
    }
});

// Позже можно получить последние сообщения
const last10 = messageHistory.slice(-10);
```

### 6. Статистика по отправителям

```javascript
const senderStats = new Map();

messageListener.on("message", (data) => {
    const senderId = data.senderId;
    const count = senderStats.get(senderId) || 0;
    senderStats.set(senderId, count + 1);
});

// Топ-10 отправителей каждые 5 минут
setInterval(() => {
    const sorted = [...senderStats.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    console.log("\n📊 Top 10 Senders:");
    sorted.forEach(([id, count], index) => {
        console.log(`${index + 1}. User ${id}: ${count} messages`);
    });
}, 300000);
```

### 7. Обработка медиа

```javascript
messageListener.on("message", (data) => {
    if (data.media) {
        console.log(`📎 Media message received:`);
        console.log(`  Type: ${data.media}`);
        console.log(`  From: ${data.sender?.fullName}`);
        console.log(`  Chat: ${data.chat?.title}`);
        
        // Скачать медиа
        if (data.media === "MessageMediaPhoto") {
            // await data.raw.downloadMedia();
        }
    }
});
```

### 8. Webhook интеграция

```javascript
const axios = require("axios");

messageListener.on("message", async (data) => {
    // Отправка в webhook
    try {
        await axios.post("https://your-webhook.com/messages", {
            messageId: data.id,
            text: data.text,
            sender: data.sender?.fullName,
            timestamp: data.date.toISOString(),
        });
    } catch (err) {
        console.error("Webhook error:", err.message);
    }
});
```

### 9. Логирование в файл

```javascript
const fs = require("fs");

messageListener.on("message", (data) => {
    const logEntry = {
        timestamp: data.date.toISOString(),
        messageId: data.id,
        sender: data.sender?.fullName,
        chat: data.chat?.title,
        text: data.text,
    };
    
    fs.appendFileSync(
        "messages.log",
        JSON.stringify(logEntry) + "\n"
    );
});
```

### 10. Множественные обработчики

```javascript
// Логирование
messageListener.on("message", (data) => {
    console.log(`[LOG] Message ${data.id}`);
});

// Статистика
messageListener.on("message", (data) => {
    // Update statistics
});

// Обработка команд
messageListener.on("message", async (data) => {
    if (data.text?.startsWith("/")) {
        // Handle command
    }
});

// Детекция спама
messageListener.on("message", (data) => {
    // Spam detection logic
});
```

## Лучшие практики

### 1. Обработка ошибок

```javascript
messageListener.on("message", async (data) => {
    try {
        // Ваш код
        await someAsyncOperation(data);
    } catch (err) {
        console.error("Handler error:", err);
        // Не пробрасывайте ошибку дальше
    }
});
```

### 2. Очистка ресурсов

```javascript
process.on('SIGINT', async () => {
    console.log("\nShutting down...");
    messageListener.destroy();
    await client.disconnect();
    process.exit(0);
});
```

### 3. Производительность

```javascript
// Используйте debounce для частых операций
const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

const saveToDatabase = debounce(async (data) => {
    // Сохранение в БД
}, 1000);

messageListener.on("message", (data) => {
    saveToDatabase(data);
});
```

## Отличия от базового подхода

### До (базовый подход):

```javascript
client.addEventHandler(async (event) => {
    const message = event.message;
    // Вся логика здесь в одной функции
    console.log(message.text);
}, new NewMessage({}));
```

### После (MessageListener):

```javascript
const listener = new MessageListener(client);
listener.init();

// Модульная обработка
listener.on("message", handler1);
listener.on("message", handler2);
listener.on("message", handler3);

// Получение структурированных данных
listener.on("message", (data) => {
    // data уже содержит все необходимые поля
    console.log(data.sender.fullName);
});
```

## Преимущества

✅ **Структурированные данные** - все данные извлекаются и форматируются автоматически  
✅ **Множественные обработчики** - легко добавлять/удалять обработчики  
✅ **Обработка ошибок** - ошибки в одном обработчике не влияют на другие  
✅ **Статистика** - встроенный подсчет сообщений и времени работы  
✅ **Расширяемость** - легко добавить новые методы и функциональность  
✅ **Тестируемость** - изолированные обработчики легче тестировать  

## Запуск примеров

```bash
# Базовый пример
node examples/messagePolling.js

# Продвинутый пример со всеми возможностями
node examples/messagePollingAdvanced.js
```


