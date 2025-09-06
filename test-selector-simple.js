const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { findWatchersNumber } = require('./universal-selector');

/**
 * Упрощенное тестирование универсального селектора
 */
async function testSelectorSimple() {
    console.log('🧪 Упрощенное тестирование универсального селектора...\n');
    
    const debugDir = path.join(__dirname, 'debug');
    const htmlFiles = fs.readdirSync(debugDir).filter(f => f.endsWith('.html'));
    
    console.log(`Найдено ${htmlFiles.length} HTML файлов для тестирования:\n`);
    
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        for (const file of htmlFiles) {
            const symbol = file.match(/debug_([A-Z]+)_/)?.[1] || 'UNKNOWN';
            console.log(`${'='.repeat(50)}`);
            console.log(`🔍 ТЕСТ: ${symbol} (${file})`);
            console.log(`${'='.repeat(50)}`);
            
            const htmlPath = path.join(debugDir, file);
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            const page = await browser.newPage();
            
            try {
                // Загружаем HTML контент напрямую
                await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
                
                console.log(`📂 Загружен файл: ${file}`);
                console.log(`📊 Размер файла: ${Math.round(htmlContent.length / 1024)}KB\n`);
                
                // Тестируем универсальный поиск
                const watchersNumber = await findWatchersNumber(page, symbol);
                
                if (watchersNumber) {
                    console.log(`✅ НАЙДЕНО: ${watchersNumber}\n`);
                    
                    // Проверяем ожидаемые числа
                    const expectedNumbers = {
                        'CLSK': '51,527',
                        'HIVE': '24,593'
                    };
                    
                    if (expectedNumbers[symbol]) {
                        const expected = expectedNumbers[symbol];
                        if (watchersNumber === expected) {
                            console.log(`🎯 ТОЧНОЕ СОВПАДЕНИЕ с ожидаемым: ${expected}`);
                        } else {
                            console.log(`⚠️ Найдено: "${watchersNumber}", ожидалось: "${expected}"`);
                        }
                    }
                } else {
                    console.log(`❌ Число watchers НЕ найдено\n`);
                    
                    // Попробуем найти хотя бы элементы с "watchers" в классе
                    console.log(`🔍 Поиск элементов с "watchers" в классе:`);
                    const watchersElements = await page.evaluate(() => {
                        const elements = Array.from(document.querySelectorAll('*'));
                        const matches = [];
                        
                        elements.forEach(el => {
                            if (el.className && el.className.toString().toLowerCase().includes('watchers')) {
                                matches.push({
                                    className: el.className.toString(),
                                    textContent: el.textContent?.trim().substring(0, 100) || '',
                                    tagName: el.tagName.toLowerCase()
                                });
                            }
                        });
                        
                        return matches.slice(0, 5);
                    });
                    
                    if (watchersElements.length > 0) {
                        console.log(`   Найдено ${watchersElements.length} элементов:`);
                        watchersElements.forEach((el, i) => {
                            console.log(`   ${i + 1}. <${el.tagName}> class="${el.className}"`);
                            console.log(`      Содержимое: "${el.textContent}"`);
                        });
                    } else {
                        console.log(`   ❌ Элементы с "watchers" не найдены`);
                    }
                }
                
            } catch (error) {
                console.error(`❌ Ошибка:`, error.message);
            } finally {
                await page.close();
            }
            
            console.log('');
        }
        
        console.log(`${'='.repeat(50)}`);
        console.log('🏁 ЗАВЕРШЕНИЕ ТЕСТИРОВАНИЯ');
        console.log(`${'='.repeat(50)}`);
        
    } finally {
        await browser.close();
    }
}

// Запуск
testSelectorSimple().catch(console.error);