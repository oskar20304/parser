const fs = require('fs');
const path = require('path');

// Поиск конкретных чисел в HTML файлах
function findExactNumbers() {
    console.log('🎯 Поиск конкретных чисел watchers в HTML файлах...\n');
    
    const debugDir = path.join(__dirname, 'debug');
    const files = fs.readdirSync(debugDir).filter(f => f.endsWith('.html'));
    
    // Целевые числа для каждого символа
    const targetNumbers = {
        'CLSK': ['51,527', '51527'],
        'HIVE': ['24,593', '24593']  
    };
    
    console.log('Ищем числа:');
    Object.entries(targetNumbers).forEach(([symbol, numbers]) => {
        console.log(`${symbol}: ${numbers.join(' или ')}`);
    });
    console.log('\n' + '='.repeat(50) + '\n');
    
    for (const file of files) {
        const symbol = file.match(/debug_([A-Z]+)_/)[1];
        console.log(`\n🔍 Анализ ${symbol} (${file}):`);
        
        if (!targetNumbers[symbol]) {
            console.log(`❌ Целевые числа для ${symbol} не определены`);
            continue;
        }
        
        const htmlContent = fs.readFileSync(path.join(debugDir, file), 'utf8');
        const lines = htmlContent.split('\n');
        
        let found = false;
        
        // Поиск каждого целевого числа
        for (const targetNumber of targetNumbers[symbol]) {
            console.log(`\n🎯 Поиск числа "${targetNumber}":`);
            
            const matches = [];
            
            lines.forEach((line, lineIndex) => {
                if (line.includes(targetNumber)) {
                    matches.push({
                        lineNumber: lineIndex + 1,
                        line: line.trim(),
                        // Найдем позицию числа в строке
                        position: line.indexOf(targetNumber)
                    });
                }
            });
            
            if (matches.length > 0) {
                found = true;
                console.log(`✅ Найдено ${matches.length} вхождений:`);
                
                matches.forEach((match, index) => {
                    console.log(`\n${index + 1}. Строка ${match.lineNumber}:`);
                    
                    // Показываем контекст вокруг числа
                    const beforeText = match.line.substring(0, match.position);
                    const afterText = match.line.substring(match.position + targetNumber.length);
                    
                    // Обрезаем для читаемости
                    const contextBefore = beforeText.length > 100 ? '...' + beforeText.slice(-100) : beforeText;
                    const contextAfter = afterText.length > 100 ? afterText.slice(0, 100) + '...' : afterText;
                    
                    console.log(`   Контекст: ${contextBefore}[${targetNumber}]${contextAfter}`);
                    
                    // Попробуем извлечь CSS селекторы из контекста
                    const classMatches = match.line.match(/class=["']([^"']*)["']/g);
                    if (classMatches) {
                        console.log(`   📋 CSS классы: ${classMatches.join(', ')}`);
                    }
                    
                    // Ищем идентификаторы
                    const idMatches = match.line.match(/id=["']([^"']*)["']/g);
                    if (idMatches) {
                        console.log(`   🆔 ID: ${idMatches.join(', ')}`);
                    }
                    
                    // Ищем data-атрибуты
                    const dataMatches = match.line.match(/data-[^=]*=["']([^"']*)["']/g);
                    if (dataMatches) {
                        console.log(`   📊 Data атрибуты: ${dataMatches.slice(0, 3).join(', ')}${dataMatches.length > 3 ? '...' : ''}`);
                    }
                    
                    // Попробуем определить тип элемента
                    const tagMatch = match.line.match(/<(\w+)[^>]*>/);
                    if (tagMatch) {
                        console.log(`   🏷️ HTML тег: <${tagMatch[1]}>`);
                    }
                });
                
                // Анализ паттернов для этого числа
                console.log(`\n🧠 Анализ паттернов для "${targetNumber}":`);
                analyzePatterns(matches, targetNumber);
                
            } else {
                console.log(`❌ Число "${targetNumber}" не найдено`);
            }
        }
        
        if (!found) {
            console.log(`\n💡 Попробуем поискать похожие числа (±100 от целевых):`);
            findSimilarNumbers(htmlContent, targetNumbers[symbol], symbol);
        }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n🎯 ВЫВОДЫ И РЕКОМЕНДАЦИИ:\n');
    
    // Здесь будут рекомендации для алгоритма
    console.log('1. Основываясь на найденных паттернах, рекомендуемые селекторы:');
    console.log('2. Наиболее вероятные места расположения числа watchers:');
    console.log('3. Рекомендуемый алгоритм поиска:');
}

function analyzePatterns(matches, targetNumber) {
    // Собираем все CSS классы
    const allClasses = [];
    const allTags = [];
    const commonKeywords = [];
    
    matches.forEach(match => {
        // CSS классы
        const classMatches = match.line.match(/class=["']([^"']*)["']/g);
        if (classMatches) {
            classMatches.forEach(cls => {
                const classes = cls.match(/class=["']([^"']*)["']/)[1].split(' ');
                allClasses.push(...classes);
            });
        }
        
        // HTML теги
        const tagMatch = match.line.match(/<(\w+)[^>]*>/);
        if (tagMatch) {
            allTags.push(tagMatch[1]);
        }
        
        // Ключевые слова рядом с числом
        const context = match.line.toLowerCase();
        const keywords = ['watch', 'watcher', 'watching', 'follow', 'follower', 'following', 'member', 'subscriber'];
        keywords.forEach(keyword => {
            if (context.includes(keyword)) {
                commonKeywords.push(keyword);
            }
        });
    });
    
    // Частотный анализ
    if (allClasses.length > 0) {
        const classFreq = {};
        allClasses.forEach(cls => {
            if (cls.trim()) {
                classFreq[cls] = (classFreq[cls] || 0) + 1;
            }
        });
        
        const topClasses = Object.entries(classFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        if (topClasses.length > 0) {
            console.log(`   📋 Наиболее частые CSS классы:`);
            topClasses.forEach(([cls, count]) => {
                console.log(`      .${cls} (${count}x)`);
            });
        }
    }
    
    if (allTags.length > 0) {
        console.log(`   🏷️ HTML теги: ${[...new Set(allTags)].join(', ')}`);
    }
    
    if (commonKeywords.length > 0) {
        console.log(`   🔑 Ключевые слова в контексте: ${[...new Set(commonKeywords)].join(', ')}`);
    }
}

function findSimilarNumbers(htmlContent, targetNumbers, symbol) {
    // Извлекаем числовые значения из целевых чисел
    const targetValues = targetNumbers.map(num => {
        return parseInt(num.replace(/,/g, ''));
    });
    
    // Ищем числа в диапазоне ±1000 от целевых
    const allNumbers = htmlContent.match(/\b\d{1,3}(,\d{3})*\b/g) || [];
    const similarNumbers = [];
    
    allNumbers.forEach(num => {
        const value = parseInt(num.replace(/,/g, ''));
        targetValues.forEach(target => {
            if (Math.abs(value - target) <= 1000 && value >= 10000) {
                similarNumbers.push({
                    number: num,
                    value: value,
                    target: target,
                    diff: Math.abs(value - target)
                });
            }
        });
    });
    
    // Убираем дубликаты и сортируем по близости к целевому
    const uniqueSimilar = similarNumbers
        .filter((num, index, self) => 
            index === self.findIndex(n => n.number === num.number)
        )
        .sort((a, b) => a.diff - b.diff)
        .slice(0, 5);
    
    if (uniqueSimilar.length > 0) {
        console.log(`   Похожие числа для ${symbol}:`);
        uniqueSimilar.forEach(num => {
            console.log(`   ${num.number} (отличается на ${num.diff} от ${num.target})`);
        });
    } else {
        console.log(`   Похожих чисел не найдено`);
    }
}

// Запуск поиска
findExactNumbers();