# Инструкция по обновлению библиотеки GramJS

Это руководство описывает процесс обновления библиотеки GramJS до новой версии Telegram API (нового Layer).

## Содержание

1. [Получение новой схемы API](#получение-новой-схемы-api)
2. [Обновление файла схемы](#обновление-файла-схемы)
3. [Генерация кода](#генерация-кода)
4. [Проверка изменений](#проверка-изменений)
5. [Тестирование](#тестирование)

---

## Получение новой схемы API

### Способ 1: Официальный репозиторий Telegram

1. Перейдите на https://github.com/telegramdesktop/tdesktop/tree/dev/Telegram/Resources/tl
2. Откройте файл `api.tl`
3. Скопируйте содержимое файла

### Способ 2: Telegram API Documentation

1. Посетите https://core.telegram.org/schema
2. Найдите актуальную версию схемы (Layer number)
3. Скачайте или скопируйте схему

---

## Обновление файла схемы

1. Откройте файл схемы в проекте:
   ```
   gramjs/tl/static/api.tl
   ```

2. Замените содержимое файла на новую схему

3. Убедитесь, что в конце файла указан правильный номер Layer:
   ```
   // LAYER 216
   ```

---

## Генерация кода

### Предварительные требования

Убедитесь, что установлены все зависимости:

```bash
npm install
```

### Запуск генерации

Выполните команду для генерации TypeScript типов и JavaScript модулей:

```bash
node gramjs/tl/generateModule.js
```

или с использованием ts-node:

```bash
npx ts-node gramjs/tl/generateModule.js
```

### Что генерируется

Скрипт генерации создаёт/обновляет следующие файлы:

- `gramjs/tl/api.d.ts` - TypeScript определения для всех типов и методов API
- `gramjs/tl/apiTl.js` - JavaScript модуль с TL схемой API
- `gramjs/tl/schemaTl.js` - JavaScript модуль с базовой схемой MTProto

---

## Проверка изменений

### 1. Проверьте изменённые файлы

```bash
git status
```

Обычно изменяются файлы:
- `gramjs/tl/static/api.tl`
- `gramjs/tl/api.d.ts`
- `gramjs/tl/apiTl.js`
- `gramjs/tl/schemaTl.js`

### 2. Просмотрите diff изменений

```bash
git diff gramjs/tl/api.d.ts
```

Обратите внимание на:
- Новые типы (constructors)
- Новые методы (functions)
- Изменения в существующих типах (новые/удалённые поля)
- Изменения CONSTRUCTOR_ID (может указывать на breaking changes)

### 3. Проверьте компиляцию TypeScript

```bash
npx tsc --noEmit
```

Если есть ошибки типов, возможно потребуется обновить код, использующий изменённые API.

---

## Тестирование

### 1. Запустите существующие тесты

```bash
npm test
```

### 2. Проверьте базовую функциональность

Создайте тестовый скрипт для проверки основных операций:

```javascript
const { TelegramClient } = require('./gramjs');
const { StringSession } = require('./gramjs/sessions');

async function testConnection() {
    const client = new TelegramClient(
        new StringSession(''),
        apiId,
        apiHash,
        { connectionRetries: 5 }
    );
    
    await client.connect();
    console.log('✅ Подключение успешно!');
    
    // Тестируйте основные операции
    const me = await client.getMe();
    console.log('✅ Получение информации о себе:', me);
    
    await client.disconnect();
}

testConnection().catch(console.error);
```

### 3. Проверьте новые возможности API

Если в новом Layer добавлены новые методы или типы, создайте тесты для их проверки.

---

## Распространённые проблемы

### Ошибка парсинга схемы

Если при генерации возникает ошибка типа `Cannot parse TLObject`, это может быть связано со специальными строками в схеме:

```
Error: Cannot parse TLObject int ? = Int;
```

**Решение:** Парсер в `gramjs/tl/generationHelpers.ts` должен корректно обрабатывать такие строки. Проверьте наличие пропуска для:
- Базовых типов: `int ? = Int;`, `long ? = Long;` и т.д.
- Векторов: `vector {t:Type} # [ t ] = Vector t;`
- Массивов: `int128 4*[ int ] = Int128;`

### Breaking Changes

Если CONSTRUCTOR_ID изменился для существующего типа, это breaking change. Проверьте:

1. Где используется этот тип в вашем коде
2. Обновите соответствующие части кода
3. Обновите версию библиотеки (major version bump)

### Новые обязательные поля

Если в существующий тип добавлено новое обязательное поле (не optional), это также breaking change:

```typescript
// Было
export class SomeType {
    field1: string;
}

// Стало
export class SomeType {
    field1: string;
    field2: number; // новое обязательное поле
}
```

Найдите все места использования и обновите код.

---

## Контрольный список обновления

- [ ] Получена новая схема API
- [ ] Обновлён файл `gramjs/tl/static/api.tl`
- [ ] Выполнена генерация кода (`node gramjs/tl/generateModule.js`)
- [ ] Проверены изменения через `git diff`
- [ ] Проверена компиляция TypeScript
- [ ] Запущены тесты
- [ ] Протестирована базовая функциональность
- [ ] Обновлена версия в `package.json` (если публикуете)
- [ ] Обновлён CHANGELOG.md с описанием изменений
- [ ] Закоммичены изменения

---

## Публикация новой версии

### 1. Обновите версию

```bash
npm version patch  # для багфиксов
npm version minor  # для новых фич
npm version major  # для breaking changes
```

### 2. Обновите CHANGELOG

Добавьте в `CHANGELOG.md`:

```markdown
## [2.28.0] - 2024-01-15

### Added
- Updated to Telegram API Layer 216
- Added new method `messages.sendSomething`
- Added new type `SomeNewType`

### Changed
- Updated `UserFull` type with new `note` field

### Breaking Changes
- `MessageActionStarGiftUnique` constructor ID changed
```

### 3. Опубликуйте

```bash
npm publish
```

или через скрипт:

```bash
npm run publish
```

---

## Полезные ссылки

- [Telegram API Documentation](https://core.telegram.org/api)
- [TL Language Documentation](https://core.telegram.org/mtproto/TL)
- [Telegram API Changelog](https://core.telegram.org/api/changelog)
- [GramJS Repository](https://github.com/gram-js/gramjs)

---

## Примечания

- Всегда тестируйте изменения перед публикацией
- Следите за breaking changes в новых версиях API
- Сохраняйте обратную совместимость когда возможно
- Документируйте все значительные изменения

