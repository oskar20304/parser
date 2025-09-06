const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Функция для поиска паттернов количества просмотров в HTML
function analyzeWatchersPatterns() {
    console.log('🔍 Анализ паттернов количества просмотров в debug файлах...\n');
    
    const debugDir = path.join(__dirname, 'debug');
    const files = fs.readdirSync(debugDir).filter(f => f.endsWith('.html'));
    
    const results = [];
    
    for (const file of files) {
        const symbol = file.match(/debug_([A-Z]+)_/)[1];
        console.log(`\n=== Анализ ${symbol} (${file}) ===`);
        
        const htmlContent = fs.readFileSync(path.join(debugDir, file), 'utf8');
        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;
        
        // Поиск различных паттернов
        const patterns = findWatcherPatterns(document, symbol);
        
        results.push({
            symbol,
            file,
            patterns
        });
        
        // Выводим результаты для каждого файла
        console.log(`Найдено ${patterns.length} потенциальных паттернов:`);
        patterns.forEach((pattern, index) => {
            console.log(`${index + 1}. ${pattern.number} - ${pattern.method} - ${pattern.context}`);
        });
    }
    
    // Анализ общих паттернов
    console.log('\n📊 АНАЛИЗ ОБЩИХ ПАТТЕРНОВ:\n');
    
    // Поиск селекторов, которые есть во всех файлах
    const commonSelectors = findCommonSelectors(results);
    console.log('🎯 Общие CSS селекторы:');
    commonSelectors.forEach(selector => {
        console.log(`   ${selector}`);
    });
    
    // Поиск общих ключевых слов
    const commonKeywords = findCommonKeywords(results);
    console.log('\n🔑 Общие ключевые слова:');
    commonKeywords.forEach(keyword => {
        console.log(`   "${keyword}"`);
    });
    
    // Предложение оптимального алгоритма
    console.log('\n💡 РЕКОМЕНДУЕМАЯ СТРАТЕГИЯ ПОИСКА:');
    suggestBestStrategy(results);
}

function findWatcherPatterns(document, symbol) {
    const patterns = [];
    
    // Стратегия 1: Поиск по классам содержащим "watcher"
    try {
        const watcherElements = document.querySelectorAll('[class*="watch"], [class*="Watch"], [class*="follow"], [class*="Follow"]');
        watcherElements.forEach(element => {
            const text = element.textContent.trim();
            const numbers = text.match(/\d{1,3}(,\d{3})*/g);
            if (numbers) {
                numbers.forEach(num => {
                    const value = parseInt(num.replace(/,/g, ''));
                    if (value >= 100 && value <= 500000) {
                        patterns.push({
                            number: num,
                            value: value,
                            method: 'CSS класс с "watch"',
                            context: element.className,
                            textContent: text.substring(0, 50) + '...'
                        });
                    }
                });
            }
        });
    } catch (e) {}
    
    // Стратегия 2: Поиск по aria-label или data атрибутам
    try {
        const ariaElements = document.querySelectorAll('[aria-label*="watch"], [aria-label*="follow"], [data-testid*="watch"], [data-testid*="follow"]');
        ariaElements.forEach(element => {
            const text = element.textContent.trim() + ' ' + (element.getAttribute('aria-label') || '');
            const numbers = text.match(/\d{1,3}(,\d{3})*/g);
            if (numbers) {
                numbers.forEach(num => {
                    const value = parseInt(num.replace(/,/g, ''));
                    if (value >= 100 && value <= 500000) {
                        patterns.push({
                            number: num,
                            value: value,
                            method: 'ARIA/Data атрибуты',
                            context: element.getAttribute('aria-label') || element.getAttribute('data-testid') || 'unknown',
                            textContent: text.substring(0, 50) + '...'
                        });
                    }
                });
            }
        });
    } catch (e) {}
    
    // Стратегия 3: Текстовый поиск с контекстом
    try {
        const walker = document.createTreeWalker(
            document.body,
            4, // NodeFilter.SHOW_TEXT
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent.trim().toLowerCase();
            
            // Ищем текст который содержит слова связанные с просмотрами/подписчиками
            const contextKeywords = ['watching', 'watcher', 'watch', 'follow', 'member', 'subscriber', 'user'];
            const hasContext = contextKeywords.some(keyword => text.includes(keyword));
            
            if (hasContext) {
                const parentText = node.parentElement ? node.parentElement.textContent : text;
                const numbers = parentText.match(/\d{1,3}(,\d{3})*/g);
                
                if (numbers) {
                    numbers.forEach(num => {
                        const value = parseInt(num.replace(/,/g, ''));
                        if (value >= 100 && value <= 500000) {
                            patterns.push({
                                number: num,
                                value: value,
                                method: 'Контекстный поиск',
                                context: `"${text.substring(0, 30)}..."`,
                                textContent: parentText.substring(0, 80) + '...'
                            });
                        }
                    });
                }
            }
        }
    } catch (e) {}
    
    // Стратегия 4: Поиск в мета-информации (JSON-LD, микроданные)
    try {
        const scripts = document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]');
        scripts.forEach(script => {
            try {
                const json = JSON.parse(script.textContent);
                const jsonString = JSON.stringify(json);
                const numbers = jsonString.match(/\d{1,3}(,\d{3})*/g);
                
                if (numbers) {
                    numbers.forEach(num => {
                        const value = parseInt(num.replace(/,/g, ''));
                        if (value >= 100 && value <= 500000) {
                            patterns.push({
                                number: num,
                                value: value,
                                method: 'JSON данные',
                                context: 'Structured data',
                                textContent: jsonString.substring(0, 100) + '...'
                            });
                        }
                    });
                }
            } catch (e) {}
        });
    } catch (e) {}
    
    // Удаляем дубликаты и сортируем по релевантности
    const uniquePatterns = patterns.filter((pattern, index, self) => 
        index === self.findIndex(p => p.number === pattern.number && p.method === pattern.method)
    );
    
    return uniquePatterns.sort((a, b) => {
        // Приоритет: контекстный поиск > CSS классы > ARIA > JSON
        const priority = {
            'Контекстный поиск': 4,
            'CSS класс с "watch"': 3,
            'ARIA/Data атрибуты': 2,
            'JSON данные': 1
        };
        return (priority[b.method] || 0) - (priority[a.method] || 0);
    });
}

function findCommonSelectors(results) {
    const selectorCounts = {};
    
    results.forEach(result => {
        result.patterns.forEach(pattern => {
            if (pattern.method.includes('CSS')) {
                const selector = pattern.context;
                selectorCounts[selector] = (selectorCounts[selector] || 0) + 1;
            }
        });
    });
    
    // Возвращаем селекторы которые встречаются в большинстве файлов
    const threshold = Math.ceil(results.length * 0.6); // 60% файлов
    return Object.entries(selectorCounts)
        .filter(([selector, count]) => count >= threshold)
        .map(([selector]) => selector);
}

function findCommonKeywords(results) {
    const keywordCounts = {};
    
    results.forEach(result => {
        result.patterns.forEach(pattern => {
            if (pattern.method === 'Контекстный поиск') {
                const words = pattern.context.toLowerCase().split(/\s+/);
                words.forEach(word => {
                    if (word.length > 3) {
                        keywordCounts[word] = (keywordCounts[word] || 0) + 1;
                    }
                });
            }
        });
    });
    
    const threshold = Math.ceil(results.length * 0.5);
    return Object.entries(keywordCounts)
        .filter(([word, count]) => count >= threshold)
        .map(([word]) => word)
        .slice(0, 10);
}

function suggestBestStrategy(results) {
    // Анализируем какая стратегия дает наиболее стабильные результаты
    const methodSuccess = {};
    const methodNumbers = {};
    
    results.forEach(result => {
        const seenNumbers = new Set();
        result.patterns.forEach(pattern => {
            if (!seenNumbers.has(pattern.number)) {
                seenNumbers.add(pattern.number);
                methodSuccess[pattern.method] = (methodSuccess[pattern.method] || 0) + 1;
                
                if (!methodNumbers[pattern.method]) {
                    methodNumbers[pattern.method] = [];
                }
                methodNumbers[pattern.method].push({
                    symbol: result.symbol,
                    number: pattern.number,
                    value: pattern.value
                });
            }
        });
    });
    
    console.log('🎯 Результативность методов:');
    Object.entries(methodSuccess)
        .sort(([,a], [,b]) => b - a)
        .forEach(([method, count]) => {
            console.log(`   ${method}: ${count}/${results.length} файлов`);
            if (methodNumbers[method]) {
                console.log(`      Найденные числа: ${methodNumbers[method].map(n => `${n.symbol}:${n.number}`).join(', ')}`);
            }
        });
    
    // Предлагаем лучший алгоритм
    console.log('\n🔧 РЕКОМЕНДУЕМЫЙ АЛГОРИТМ:');
    console.log('1. Искать элементы с классами содержащими "watch", "follow"');
    console.log('2. Проверять aria-label и data-testid атрибуты');  
    console.log('3. Искать числа рядом с ключевыми словами: "watching", "watcher", "follow"');
    console.log('4. Фильтровать числа в диапазоне 100-500,000');
    console.log('5. Приоритет отдавать элементам с явным контекстом наблюдения');
}

// Запуск анализа
try {
    analyzeWatchersPatterns();
} catch (error) {
    console.error('Ошибка анализа:', error);
}