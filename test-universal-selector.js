const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { findByPartialClass, findWatchersNumber, findAllByPartialClass } = require('./universal-selector');

/**
 * Тестирование универсального селектора на сохраненных HTML файлах
 */
async function testUniversalSelector() {
    console.log('🧪 Тестирование универсального селектора для CSS Modules...\n');
    
    const debugDir = path.join(__dirname, 'debug');
    const htmlFiles = fs.readdirSync(debugDir).filter(f => f.endsWith('.html'));
    
    if (htmlFiles.length === 0) {
        console.log('❌ HTML файлы для тестирования не найдены');
        return;
    }
    
    console.log(`Найдено ${htmlFiles.length} HTML файлов для тестирования:`);
    htmlFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file}`);
    });
    console.log('');
    
    // Запускаем браузер
    const browser = await puppeteer.launch({ headless: true });
    
    try {
        for (const file of htmlFiles) {
            const symbol = file.match(/debug_([A-Z]+)_/)?.[1] || 'UNKNOWN';
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔍 ТЕСТИРОВАНИЕ: ${symbol} (${file})`);
            console.log(`${'='.repeat(60)}\n`);
            
            const htmlPath = path.join(debugDir, file);
            const page = await browser.newPage();
            
            try {
                // Загружаем локальный HTML файл
                await page.goto(`file://${htmlPath}`, { waitUntil: 'domcontentloaded' });
                
                console.log(`📂 Загружен файл: ${htmlPath}\n`);
                
                // ТЕСТ 1: Поиск с помощью findWatchersNumber (универсальный поиск)
                console.log('🎯 ТЕСТ 1: Универсальный поиск числа watchers');
                const watchersNumber = await findWatchersNumber(page, symbol);
                
                if (watchersNumber) {
                    console.log(`✅ Результат: ${watchersNumber}`);
                } else {
                    console.log('❌ Число watchers не найдено универсальным методом');
                }
                
                console.log('\n' + '-'.repeat(40) + '\n');
                
                // ТЕСТ 2: Поиск конкретных паттернов
                console.log('🔍 ТЕСТ 2: Поиск по конкретным паттернам');
                
                const patterns = [
                    'SymbolHeader_watchers__',
                    'SymbolWatchers_watchers__',
                    'WatchersCount_',
                    'Watchers_'
                ];
                
                for (const pattern of patterns) {
                    console.log(`\n🔎 Паттерн: "${pattern}"`);
                    const result = await findByPartialClass(page, pattern, true);
                    
                    if (result) {
                        if (typeof result === 'string') {
                            console.log(`   ✅ Найдено число: ${result}`);
                        } else if (result.found) {
                            console.log(`   ✅ Найден элемент: ${result.className}`);
                            console.log(`   📋 Содержимое: "${result.textContent}"`);
                        }
                    } else {
                        console.log(`   ❌ Не найдено`);
                    }
                }
                
                console.log('\n' + '-'.repeat(40) + '\n');
                
                // ТЕСТ 3: Поиск всех элементов с "watchers" в названии класса
                console.log('🔍 ТЕСТ 3: Поиск всех элементов содержащих "watchers"');
                await findAllByPartialClass(page, 'watchers');
                
                console.log('\n' + '-'.repeat(40) + '\n');
                
                // ТЕСТ 4: Проверяем ожидаемые числа для известных символов
                console.log('🎯 ТЕСТ 4: Проверка ожидаемых чисел');
                const expectedNumbers = {
                    'CLSK': '51,527',
                    'HIVE': '24,593'
                };
                
                if (expectedNumbers[symbol]) {
                    const expected = expectedNumbers[symbol];
                    console.log(`Ожидаемое число для ${symbol}: ${expected}`);
                    
                    if (watchersNumber === expected) {
                        console.log(`✅ Точное совпадение!`);
                    } else {
                        console.log(`⚠️ Найдено: "${watchersNumber}", ожидалось: "${expected}"`);
                        
                        // Проверяем наличие ожидаемого числа на странице
                        const hasExpected = await page.evaluate((expected) => {
                            return document.body.textContent.includes(expected);
                        }, expected);
                        
                        if (hasExpected) {
                            console.log(`📋 Ожидаемое число "${expected}" присутствует на странице`);
                        } else {
                            console.log(`❌ Ожидаемое число "${expected}" НЕ найдено на странице`);
                        }
                    }
                } else {
                    console.log(`Для ${symbol} эталонное число не известно`);
                }
                
            } catch (error) {
                console.error(`❌ Ошибка при тестировании файла ${file}:`, error.message);
            } finally {
                await page.close();
            }
        }
        
        console.log(`\n${'='.repeat(60)}`);
        console.log('🏁 ИТОГИ ТЕСТИРОВАНИЯ');
        console.log(`${'='.repeat(60)}\n`);
        
        console.log('✅ Универсальная функция findByPartialClass создана');
        console.log('✅ Функция findWatchersNumber использует множественные стратегии');
        console.log('✅ Поддержка CSS Modules с динамическими суффиксами');
        console.log('✅ Автоматическое извлечение чисел из найденных элементов');
        console.log('✅ Валидация чисел в разумном диапазоне для watchers');
        
    } finally {
        await browser.close();
    }
}

// Запуск тестирования
if (require.main === module) {
    testUniversalSelector().catch(console.error);
}

module.exports = { testUniversalSelector };