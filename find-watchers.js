const fs = require('fs');
const path = require('path');

// Простой анализ HTML файлов для поиска паттернов watchers
function findWatchersInDebugFiles() {
    console.log('🔍 Поиск паттернов количества watchers в HTML файлах...\n');
    
    const debugDir = path.join(__dirname, 'debug');
    const files = fs.readdirSync(debugDir).filter(f => f.endsWith('.html'));
    
    console.log(`Найдено ${files.length} файлов для анализа:\n`);
    
    const results = {};
    
    for (const file of files) {
        const symbol = file.match(/debug_([A-Z]+)_/)[1];
        console.log(`\n=== Анализ ${symbol} ===`);
        
        const htmlContent = fs.readFileSync(path.join(debugDir, file), 'utf8');
        
        // Стратегия 1: Поиск текста содержащего "watcher" или "watching"
        console.log('\n🎯 Поиск контекста с "watcher/watching":');
        const watcherMatches = findWatcherContext(htmlContent);
        watcherMatches.forEach((match, index) => {
            console.log(`${index + 1}. ${match.number} - ${match.context.substring(0, 80)}...`);
        });
        
        // Стратегия 2: Поиск в структурированных данных (JSON-LD)
        console.log('\n📊 Поиск в структурированных данных:');
        const jsonMatches = findInStructuredData(htmlContent);
        jsonMatches.forEach((match, index) => {
            console.log(`${index + 1}. ${match.number} - ${match.source}`);
        });
        
        // Стратегия 3: Поиск по CSS селекторам с "watch" в названии
        console.log('\n🎨 Поиск по CSS классам с "watch":');
        const cssMatches = findByWatcherClasses(htmlContent);
        cssMatches.forEach((match, index) => {
            console.log(`${index + 1}. ${match.number} - Класс: ${match.className}`);
        });
        
        // Стратегия 4: Поиск чисел рядом с индикаторами "followers" или "members"
        console.log('\n👥 Поиск чисел рядом с "followers/members":');
        const followerMatches = findFollowerNumbers(htmlContent);
        followerMatches.forEach((match, index) => {
            console.log(`${index + 1}. ${match.number} - ${match.context.substring(0, 60)}...`);
        });
        
        results[symbol] = {
            watcherMatches,
            jsonMatches,
            cssMatches,
            followerMatches
        };
        
        console.log(`\n📋 Итого для ${symbol}: ${watcherMatches.length + jsonMatches.length + cssMatches.length + followerMatches.length} потенциальных совпадений`);
    }
    
    // Анализ общих паттернов
    console.log('\n\n🧠 АНАЛИЗ ОБЩИХ ПАТТЕРНОВ:');
    analyzeCommonPatterns(results);
    
    // Предлагаем наиболее вероятные числа
    console.log('\n\n🎯 НАИБОЛЕЕ ВЕРОЯТНЫЕ WATCHERS:');
    suggestMostLikelyWatchers(results);
}

function findWatcherContext(html) {
    const matches = [];
    const lines = html.split('\n');
    
    lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes('watch') || lowerLine.includes('follow')) {
            // Найти все числа в этой строке
            const numbers = line.match(/\b\d{1,3}(,\d{3})*\b/g);
            if (numbers) {
                numbers.forEach(num => {
                    const value = parseInt(num.replace(/,/g, ''));
                    // Фильтр для разумных значений watchers
                    if (value >= 1000 && value <= 500000) {
                        matches.push({
                            number: num,
                            value: value,
                            context: line.replace(/\s+/g, ' ').trim()
                        });
                    }
                });
            }
        }
    });
    
    // Убираем дубликаты и сортируем по значению
    const unique = matches.filter((match, index, self) => 
        index === self.findIndex(m => m.number === match.number)
    );
    
    return unique.sort((a, b) => b.value - a.value).slice(0, 5);
}

function findInStructuredData(html) {
    const matches = [];
    
    // Поиск JSON-LD данных
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis;
    let jsonMatch;
    
    while ((jsonMatch = jsonLdRegex.exec(html)) !== null) {
        try {
            const jsonData = JSON.parse(jsonMatch[1]);
            const jsonString = JSON.stringify(jsonData);
            
            // Ищем поля которые могут содержать количество watchers
            const fields = ['watchCount', 'followerCount', 'memberCount', 'subscriberCount'];
            
            fields.forEach(field => {
                const fieldRegex = new RegExp(`"${field}"[\\s]*:[\\s]*(\\d+)`, 'gi');
                const fieldMatch = fieldRegex.exec(jsonString);
                if (fieldMatch) {
                    const value = parseInt(fieldMatch[1]);
                    if (value >= 1000 && value <= 500000) {
                        matches.push({
                            number: value.toLocaleString(),
                            value: value,
                            source: `JSON-LD ${field}`
                        });
                    }
                }
            });
            
        } catch (e) {
            // Игнорируем ошибки парсинга JSON
        }
    }
    
    // Поиск в data-react-props или подобных
    const reactPropsRegex = /data-react-props=["']([^"']+)["']/gi;
    let propsMatch;
    
    while ((propsMatch = reactPropsRegex.exec(html)) !== null) {
        try {
            const decodedProps = decodeURIComponent(propsMatch[1]);
            const numbers = decodedProps.match(/\b\d{1,3}(,\d{3})*\b/g);
            
            if (numbers) {
                numbers.forEach(num => {
                    const value = parseInt(num.replace(/,/g, ''));
                    if (value >= 1000 && value <= 500000) {
                        // Проверяем контекст
                        const contextBefore = decodedProps.substring(Math.max(0, decodedProps.indexOf(num) - 50), decodedProps.indexOf(num));
                        const contextAfter = decodedProps.substring(decodedProps.indexOf(num) + num.length, decodedProps.indexOf(num) + num.length + 50);
                        const context = contextBefore + num + contextAfter;
                        
                        if (context.toLowerCase().includes('watch') || context.toLowerCase().includes('follow')) {
                            matches.push({
                                number: num,
                                value: value,
                                source: 'React Props (watcher context)'
                            });
                        }
                    }
                });
            }
        } catch (e) {
            // Игнорируем ошибки
        }
    }
    
    return matches.filter((match, index, self) => 
        index === self.findIndex(m => m.number === match.number)
    ).sort((a, b) => b.value - a.value).slice(0, 3);
}

function findByWatcherClasses(html) {
    const matches = [];
    
    // Поиск элементов с классами содержащими "watch", "follow", "member"
    const classRegex = /class=["']([^"']*(?:watch|Watch|follow|Follow|member|Member)[^"']*)["'][^>]*>([^<]*\d[^<]*)</gi;
    let classMatch;
    
    while ((classMatch = classRegex.exec(html)) !== null) {
        const className = classMatch[1];
        const content = classMatch[2];
        
        const numbers = content.match(/\b\d{1,3}(,\d{3})*\b/g);
        if (numbers) {
            numbers.forEach(num => {
                const value = parseInt(num.replace(/,/g, ''));
                if (value >= 1000 && value <= 500000) {
                    matches.push({
                        number: num,
                        value: value,
                        className: className
                    });
                }
            });
        }
    }
    
    return matches.filter((match, index, self) => 
        index === self.findIndex(m => m.number === match.number && m.className === match.className)
    ).sort((a, b) => b.value - a.value).slice(0, 3);
}

function findFollowerNumbers(html) {
    const matches = [];
    const lines = html.split('\n');
    
    lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes('follower') || lowerLine.includes('member') || lowerLine.includes('subscriber')) {
            const numbers = line.match(/\b\d{1,3}(,\d{3})*\b/g);
            if (numbers) {
                numbers.forEach(num => {
                    const value = parseInt(num.replace(/,/g, ''));
                    if (value >= 1000 && value <= 500000) {
                        matches.push({
                            number: num,
                            value: value,
                            context: line.replace(/\s+/g, ' ').trim()
                        });
                    }
                });
            }
        }
    });
    
    return matches.filter((match, index, self) => 
        index === self.findIndex(m => m.number === match.number)
    ).sort((a, b) => b.value - a.value).slice(0, 3);
}

function analyzeCommonPatterns(results) {
    const allNumbers = {};
    
    // Собираем все числа по символам
    Object.entries(results).forEach(([symbol, data]) => {
        const symbolNumbers = [];
        
        [...data.watcherMatches, ...data.jsonMatches, ...data.cssMatches, ...data.followerMatches].forEach(match => {
            symbolNumbers.push(match.number);
        });
        
        allNumbers[symbol] = [...new Set(symbolNumbers)]; // убираем дубликаты
        console.log(`${symbol}: [${allNumbers[symbol].join(', ')}]`);
    });
    
    // Ищем числа которые появляются в нескольких файлах
    const numberFrequency = {};
    Object.values(allNumbers).flat().forEach(num => {
        numberFrequency[num] = (numberFrequency[num] || 0) + 1;
    });
    
    console.log('\n📊 Частота чисел по файлам:');
    Object.entries(numberFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([num, count]) => {
            console.log(`${num}: ${count} файл(ов)`);
        });
}

function suggestMostLikelyWatchers(results) {
    console.log('\n🎯 Рекомендуемые числа для каждого символа:');
    
    Object.entries(results).forEach(([symbol, data]) => {
        // Приоритет: watcher context > CSS classes > followers > JSON
        const priorityNumbers = [];
        
        // Высший приоритет - числа с контекстом "watcher"
        data.watcherMatches.slice(0, 2).forEach(match => {
            priorityNumbers.push({
                number: match.number,
                value: match.value,
                priority: 4,
                reason: 'Watcher context'
            });
        });
        
        // Средний приоритет - CSS классы
        data.cssMatches.slice(0, 2).forEach(match => {
            priorityNumbers.push({
                number: match.number,
                value: match.value,
                priority: 3,
                reason: 'CSS watcher class'
            });
        });
        
        // Низкий приоритет - followers/members
        data.followerMatches.slice(0, 1).forEach(match => {
            priorityNumbers.push({
                number: match.number,
                value: match.value,
                priority: 2,
                reason: 'Follower/member context'
            });
        });
        
        // Самый низкий - JSON данные
        data.jsonMatches.slice(0, 1).forEach(match => {
            priorityNumbers.push({
                number: match.number,
                value: match.value,
                priority: 1,
                reason: 'Structured data'
            });
        });
        
        // Убираем дубликаты и сортируем по приоритету
        const uniqueNumbers = priorityNumbers.filter((num, index, self) => 
            index === self.findIndex(n => n.number === num.number)
        ).sort((a, b) => b.priority - a.priority);
        
        console.log(`\n${symbol}:`);
        uniqueNumbers.slice(0, 3).forEach((num, index) => {
            console.log(`  ${index + 1}. ${num.number} (${num.reason})`);
        });
        
        if (uniqueNumbers.length > 0) {
            console.log(`  ⭐ РЕКОМЕНДАЦИЯ: ${uniqueNumbers[0].number}`);
        }
    });
}

// Запуск анализа
findWatchersInDebugFiles();