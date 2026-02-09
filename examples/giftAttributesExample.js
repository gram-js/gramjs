/**
 * Получение ВСЕХ атрибутов подарка через GetStarGiftUpgradeAttributes
 * 
 * Метод: payments.GetStarGiftUpgradeAttributes
 * Возвращает все модели/узоры/фоны для указанного типа подарка
 * 
 * Использование: node examples/giftAttributesExample.js
 */

const { TelegramClient, Api } = require("../dist");
const { StringSession } = require("../dist/sessions");

const apiId = 21565462;
const apiHash = "6681a9a03f81caac5b43ff8dcc9c52fe";
const stringSession = "1BAAOMTQ5LjE1NC4xNjcuOTEAUCXkhkoTTCMLJ3K53SrJ+WMop7tl6gMESwHBYVzTqbn6kgVQKKpG/J1knonu9/XzPJOg9Np4/3fL0kGxJHe42JH08JTh9riHpJgvcGacUDywMJ/VWHqEze2Z1UmHIbJM82ZuLLI6O8TUrWpCklGMf/Fwl93pNyflSA28Vzt9ZJ/YGqnszgmOroNZTLlArbdBo0v2RJMjoDz0CRUQ6sZe6imHHUgboQeJRAaSqfEbJPEca8bJXI4Ncx7Sa0k8OLE3KWFsrIwgo+/PPEByisyASXQwyG4c1VMidJNSdct1/rvTDweD6rLwnY5dY6ou5ApYvMgv433eaEnBwm5nD4zYNvQ=";

(async () => {
    console.log('🔄 Загрузка...\n');

    const client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, {
        connectionRetries: 5,
    });

    await client.connect();
    console.log('✅ Подключено к Telegram\n');

    console.log('═'.repeat(70));
    console.log('🎨 payments.GetStarGiftUpgradeAttributes');
    console.log('═'.repeat(70));

    // Получаем список подарков
    const starGiftsResult = await client.invoke(
        new Api.payments.GetStarGifts({ hash: 0 })
    );

    const regularGifts = starGiftsResult.gifts?.filter(g => g.className === 'StarGift') || [];
    const upgradeableGifts = regularGifts.filter(g => g.upgradeStars && g.upgradeStars > 0);
    
    if (upgradeableGifts.length === 0) {
        console.log('❌ Не найдены подарки с возможностью улучшения');
        await client.disconnect();
        return;
    }

    // Берем случайный подарок
    const randomIndex = Math.floor(Math.random() * upgradeableGifts.length);
    const randomGift = upgradeableGifts[randomIndex];
    
    console.log(`\n📍 Выбран подарок: ${randomGift.title || 'Без названия'}`);
    console.log(`   Gift ID: ${randomGift.id}`);
    console.log(`   Цена: ${randomGift.stars} ⭐`);
    console.log(`   Улучшение: ${randomGift.upgradeStars} ⭐`);

    // ═══════════════════════════════════════════════════════════════════
    // ВЫЗОВ GetStarGiftUpgradeAttributes
    // ═══════════════════════════════════════════════════════════════════
    
    console.log('\n' + '─'.repeat(70));
    console.log('📡 Вызываем payments.GetStarGiftUpgradeAttributes...');
    console.log('─'.repeat(70));

    const result = await client.invoke(
        new Api.payments.GetStarGiftUpgradeAttributes({
            giftId: randomGift.id,
        })
    );

    const allAttributes = result.attributes || [];
    
    console.log(`\n📊 Всего атрибутов: ${allAttributes.length}\n`);

    // Разделяем по типам
    const models = allAttributes.filter(a => a.className === 'StarGiftAttributeModel');
    const patterns = allAttributes.filter(a => a.className === 'StarGiftAttributePattern');
    const backdrops = allAttributes.filter(a => a.className === 'StarGiftAttributeBackdrop');

    // ─────────────────────────────────────────────────────────────────
    // МОДЕЛИ
    // ─────────────────────────────────────────────────────────────────
    console.log('═'.repeat(70));
    console.log(`🎭 МОДЕЛИ (${models.length} шт.)`);
    console.log('═'.repeat(70));

    models.forEach((m, i) => {
        console.log(`\n  ${i + 1}. ${m.name}`);
        console.log(`     Редкость: ${(m.rarityPermille / 10).toFixed(1)}% (${m.rarityPermille}‰)`);
        if (m.document) {
            console.log(`     Document ID: ${m.document.id}`);
        }
    });

    // ─────────────────────────────────────────────────────────────────
    // УЗОРЫ
    // ─────────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(70));
    console.log(`🔲 УЗОРЫ / PATTERNS (${patterns.length} шт.)`);
    console.log('═'.repeat(70));

    patterns.forEach((p, i) => {
        console.log(`\n  ${i + 1}. ${p.name}`);
        console.log(`     Редкость: ${(p.rarityPermille / 10).toFixed(1)}% (${p.rarityPermille}‰)`);
        if (p.document) {
            console.log(`     Document ID: ${p.document.id}`);
        }
    });

    // ─────────────────────────────────────────────────────────────────
    // ФОНЫ
    // ─────────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(70));
    console.log(`🌈 ФОНЫ / BACKDROPS (${backdrops.length} шт.)`);
    console.log('═'.repeat(70));

    backdrops.forEach((b, i) => {
        const centerHex = b.centerColor?.toString(16).padStart(6, '0') || 'N/A';
        const edgeHex = b.edgeColor?.toString(16).padStart(6, '0') || 'N/A';
        const patternHex = b.patternColor?.toString(16).padStart(6, '0') || 'N/A';
        const textHex = b.textColor?.toString(16).padStart(6, '0') || 'N/A';

        console.log(`\n  ${i + 1}. ${b.name} (ID: ${b.backdropId})`);
        console.log(`     Редкость: ${(b.rarityPermille / 10).toFixed(1)}% (${b.rarityPermille}‰)`);
        console.log(`     Цвета:`);
        console.log(`       • Центр:  #${centerHex}`);
        console.log(`       • Край:   #${edgeHex}`);
        console.log(`       • Узор:   #${patternHex}`);
        console.log(`       • Текст:  #${textHex}`);
    });

    // ─────────────────────────────────────────────────────────────────
    // СТАТИСТИКА
    // ─────────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(70));
    console.log('📊 СТАТИСТИКА РЕДКОСТИ');
    console.log('═'.repeat(70));

    const sortedModels = [...models].sort((a, b) => a.rarityPermille - b.rarityPermille);
    console.log('\n🏆 Топ-3 редких моделей:');
    sortedModels.slice(0, 3).forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.name} - ${(m.rarityPermille / 10).toFixed(1)}%`);
    });

    const sortedPatterns = [...patterns].sort((a, b) => a.rarityPermille - b.rarityPermille);
    console.log('\n🏆 Топ-3 редких узоров:');
    sortedPatterns.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} - ${(p.rarityPermille / 10).toFixed(1)}%`);
    });

    const sortedBackdrops = [...backdrops].sort((a, b) => a.rarityPermille - b.rarityPermille);
    console.log('\n🏆 Топ-3 редких фонов:');
    sortedBackdrops.slice(0, 3).forEach((b, i) => {
        console.log(`   ${i + 1}. ${b.name} - ${(b.rarityPermille / 10).toFixed(1)}%`);
    });

    // ─────────────────────────────────────────────────────────────────
    // RAW JSON
    // ─────────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(70));
    console.log('📋 RAW ДАННЫЕ (JSON)');
    console.log('═'.repeat(70));

    const rawData = {
        giftId: randomGift.id.toString(),
        giftTitle: randomGift.title,
        totalAttributes: allAttributes.length,
        models: models.map(m => ({
            name: m.name,
            rarityPermille: m.rarityPermille,
            rarityPercent: (m.rarityPermille / 10).toFixed(1) + '%',
            documentId: m.document?.id?.toString(),
        })),
        patterns: patterns.map(p => ({
            name: p.name,
            rarityPermille: p.rarityPermille,
            rarityPercent: (p.rarityPermille / 10).toFixed(1) + '%',
            documentId: p.document?.id?.toString(),
        })),
        backdrops: backdrops.map(b => ({
            name: b.name,
            backdropId: b.backdropId,
            rarityPermille: b.rarityPermille,
            rarityPercent: (b.rarityPermille / 10).toFixed(1) + '%',
            colors: {
                center: '#' + b.centerColor?.toString(16).padStart(6, '0'),
                edge: '#' + b.edgeColor?.toString(16).padStart(6, '0'),
                pattern: '#' + b.patternColor?.toString(16).padStart(6, '0'),
                text: '#' + b.textColor?.toString(16).padStart(6, '0'),
            },
        })),
    };

    console.log(JSON.stringify(rawData, null, 2));

    console.log('\n' + '═'.repeat(70));
    console.log('✅ Готово!');
    console.log('═'.repeat(70) + '\n');

    await client.disconnect();
})();
