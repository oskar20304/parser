/**
 * Универсальный селектор для поиска элементов по частичному совпадению CSS класса
 * Решает проблему CSS Modules с динамическими хешированными суффиксами
 * 
 * Например: 
 * SymbolHeader_watchers__nFkZq -> findByPartialClass(page, 'SymbolHeader_watchers__')
 * SymbolWatchers_watchers__sp1FU -> findByPartialClass(page, 'SymbolWatchers_watchers__')
 */

/**
 * Находит элемент по частичному совпадению CSS класса
 * @param {Page} page - Puppeteer page объект
 * @param {string} partialClass - Частичное имя класса (без динамического суффикса)
 * @param {boolean} getTextContent - Если true, возвращает текстовое содержимое элемента
 * @returns {Promise<string|null>} Текстовое содержимое или null если элемент не найден
 */
async function findByPartialClass(page, partialClass, getTextContent = true) {
    console.log(`🔍 Поиск элемента по частичному классу: "${partialClass}"`);
    
    const result = await page.evaluate((partialClass, getTextContent) => {
        // Находим все элементы на странице
        const allElements = document.querySelectorAll('*');
        
        for (let element of allElements) {
            // Проверяем className элемента
            if (element.className && typeof element.className === 'string') {
                // Разбиваем классы по пробелам
                const classNames = element.className.split(' ');
                
                // Ищем класс, который начинается с partialClass
                const matchingClass = classNames.find(className => 
                    className.startsWith(partialClass)
                );
                
                if (matchingClass) {
                    console.log(`✅ Найден элемент с классом: "${matchingClass}"`);
                    
                    if (getTextContent) {
                        const textContent = element.textContent?.trim() || '';
                        console.log(`📋 Содержимое элемента: "${textContent}"`);
                        return {
                            found: true,
                            className: matchingClass,
                            textContent: textContent,
                            innerHTML: element.innerHTML,
                            tagName: element.tagName.toLowerCase()
                        };
                    } else {
                        return {
                            found: true,
                            className: matchingClass,
                            tagName: element.tagName.toLowerCase()
                        };
                    }
                }
            }
        }
        
        return { found: false };
    }, partialClass, getTextContent);
    
    if (result.found) {
        console.log(`✅ Найден элемент с динамическим классом: ${result.className}`);
        console.log(`📋 Тег: <${result.tagName}>`);
        
        if (getTextContent && result.textContent) {
            console.log(`📄 Содержимое: "${result.textContent}"`);
            
            // Попробуем извлечь число из содержимого
            const numberMatch = result.textContent.match(/\d{1,3}(,\d{3})*/);
            if (numberMatch) {
                console.log(`🎯 Найдено число: ${numberMatch[0]}`);
                return numberMatch[0];
            }
        }
        
        return result;
    } else {
        console.log(`❌ Элемент с частичным классом "${partialClass}" не найден`);
        return null;
    }
}

/**
 * Находит число watchers используя множественные стратегии поиска
 * @param {Page} page - Puppeteer page объект
 * @param {string} symbol - Символ акции (для логирования)
 * @returns {Promise<string|null>} Число watchers или null
 */
async function findWatchersNumber(page, symbol) {
    console.log(`\n🎯 Поиск числа watchers для символа: ${symbol}`);
    
    // Список возможных паттернов классов для watchers
    const watcherPatterns = [
        'SymbolHeader_watchers__',
        'SymbolWatchers_watchers__',
        'WatchersCount_',
        'Watchers_',
        'watchers__',
        'watch-count__',
        'symbol-watchers__'
    ];
    
    // Пробуем каждый паттерн
    for (const pattern of watcherPatterns) {
        console.log(`\n🔍 Попытка ${pattern}...`);
        
        const result = await findByPartialClass(page, pattern, true);
        
        if (result && typeof result === 'string') {
            // Если нашли число, проверяем что оно в разумном диапазоне для watchers
            const numericValue = parseInt(result.replace(/,/g, ''));
            if (numericValue >= 1000 && numericValue <= 500000) {
                console.log(`✅ Найдено число watchers: ${result} (используя паттерн: ${pattern})`);
                return result;
            } else {
                console.log(`⚠️ Число ${result} вне разумного диапазона для watchers`);
            }
        }
    }
    
    console.log(`❌ Число watchers не найдено ни одним из паттернов`);
    return null;
}

/**
 * Находит все элементы с частичным совпадением класса (для отладки)
 * @param {Page} page - Puppeteer page объект
 * @param {string} partialClass - Частичное имя класса
 * @returns {Promise<Array>} Массив найденных элементов
 */
async function findAllByPartialClass(page, partialClass) {
    console.log(`🔍 Поиск всех элементов с частичным классом: "${partialClass}"`);
    
    const results = await page.evaluate((partialClass) => {
        const allElements = document.querySelectorAll('*');
        const matches = [];
        
        for (let element of allElements) {
            if (element.className && typeof element.className === 'string') {
                const classNames = element.className.split(' ');
                const matchingClass = classNames.find(className => 
                    className.startsWith(partialClass)
                );
                
                if (matchingClass) {
                    matches.push({
                        className: matchingClass,
                        textContent: element.textContent?.trim() || '',
                        tagName: element.tagName.toLowerCase(),
                        innerHTML: element.innerHTML
                    });
                }
            }
        }
        
        return matches;
    }, partialClass);
    
    console.log(`✅ Найдено ${results.length} элементов с частичным классом "${partialClass}"`);
    
    results.forEach((result, index) => {
        console.log(`${index + 1}. Класс: ${result.className}`);
        console.log(`   Тег: <${result.tagName}>`);
        console.log(`   Содержимое: "${result.textContent.substring(0, 100)}${result.textContent.length > 100 ? '...' : ''}"`);
        
        // Ищем числа в содержимом
        const numberMatch = result.textContent.match(/\d{1,3}(,\d{3})*/);
        if (numberMatch) {
            console.log(`   🎯 Число: ${numberMatch[0]}`);
        }
        console.log('');
    });
    
    return results;
}

module.exports = {
    findByPartialClass,
    findWatchersNumber,
    findAllByPartialClass
};