const fs = require('fs');
const path = require('path');

// Извлекаем число watchers из элемента с классом SymbolWatchers_watchers__sp1FU
function extractMaraNumber() {
    console.log('🎯 Извлечение числа watchers из MARA с классом SymbolWatchers_watchers__sp1FU...\n');
    
    const debugDir = path.join(__dirname, 'debug');
    const maraFile = fs.readdirSync(debugDir).find(f => f.includes('MARA'));
    
    if (!maraFile) {
        console.log('❌ Файл MARA не найден');
        return;
    }
    
    console.log(`📁 Анализируем файл: ${maraFile}\n`);
    
    const htmlContent = fs.readFileSync(path.join(debugDir, maraFile), 'utf8');
    
    // Ищем элемент с классом SymbolWatchers_watchers__sp1FU
    console.log('🔍 Поиск элемента с классом SymbolWatchers_watchers__sp1FU...');
    
    // Регулярное выражение для поиска элемента с этим классом и его содержимого
    const classPattern = /class="[^"]*SymbolWatchers_watchers__sp1FU[^"]*"[^>]*>([^<]*(?:<[^>\/]*\/>[^<]*)*)/g;
    const matches = [...htmlContent.matchAll(classPattern)];
    
    if (matches.length > 0) {
        console.log(`✅ Найдено ${matches.length} элементов с классом SymbolWatchers_watchers__sp1FU:\n`);
        
        matches.forEach((match, index) => {
            console.log(`${index + 1}. Полное совпадение:`);
            console.log(`   Класс: ${match[0].substring(0, 100)}...`);
            console.log(`   Содержимое: "${match[1]}"`);
            
            // Ищем числа в содержимом
            const numbers = match[1].match(/\d{1,3}(,\d{3})*/g);
            if (numbers) {
                console.log(`   🎯 НАЙДЕННЫЕ ЧИСЛА: ${numbers.join(', ')}`);
                
                // Фильтруем разумные числа для watchers
                const validNumbers = numbers.filter(num => {
                    const value = parseInt(num.replace(/,/g, ''));
                    return value >= 1000 && value <= 200000;
                });
                
                if (validNumbers.length > 0) {
                    console.log(`   ⭐ ПОДХОДЯЩИЕ ЧИСЛА: ${validNumbers.join(', ')}`);
                } else {
                    console.log(`   ⚠️ Подходящие числа не найдены (вне диапазона 1,000-200,000)`);
                }
            } else {
                console.log(`   ❌ Числа в содержимом не найдены`);
            }
            
            console.log('');
        });
    } else {
        console.log('❌ Элементы с классом SymbolWatchers_watchers__sp1FU не найдены');
    }
    
    // Альтернативный поиск: ищем более широкий контекст вокруг этого класса
    console.log('🔍 Расширенный поиск в контексте класса...');
    
    const contextPattern = /SymbolWatchers_watchers__sp1FU[^>]*>[^<]*</g;
    const contextMatches = [...htmlContent.matchAll(contextPattern)];
    
    if (contextMatches.length > 0) {
        console.log(`✅ Найдено ${contextMatches.length} контекстов:`);
        
        contextMatches.forEach((match, index) => {
            console.log(`${index + 1}. ${match[0]}`);
            
            // Найдем положение этого элемента в HTML и посмотрим что рядом
            const position = htmlContent.indexOf(match[0]);
            const beforeContext = htmlContent.substring(Math.max(0, position - 100), position);
            const afterContext = htmlContent.substring(position + match[0].length, position + match[0].length + 200);
            
            console.log(`   Контекст ДО: ...${beforeContext.slice(-50)}`);
            console.log(`   Контекст ПОСЛЕ: ${afterContext.substring(0, 100)}...`);
            
            // Ищем числа в расширенном контексте
            const fullContext = beforeContext + match[0] + afterContext;
            const contextNumbers = fullContext.match(/>\s*(\d{1,3}(?:,\d{3})*)\s*</g);
            
            if (contextNumbers) {
                const cleanNumbers = contextNumbers.map(n => n.match(/\d{1,3}(?:,\d{3})*/)[0]);
                const uniqueNumbers = [...new Set(cleanNumbers)];
                
                console.log(`   🎯 ЧИСЛА В КОНТЕКСТЕ: ${uniqueNumbers.join(', ')}`);
                
                // Фильтруем разумные числа для watchers
                const validNumbers = uniqueNumbers.filter(num => {
                    const value = parseInt(num.replace(/,/g, ''));
                    return value >= 1000 && value <= 200000;
                });
                
                if (validNumbers.length > 0) {
                    console.log(`   ⭐ НАИБОЛЕЕ ВЕРОЯТНЫЕ WATCHERS: ${validNumbers.join(', ')}`);
                    
                    if (validNumbers.length === 1) {
                        console.log(`   🎉 РЕЗУЛЬТАТ: ${validNumbers[0]}`);
                    }
                }
            } else {
                console.log(`   ❌ Числа в расширенном контексте не найдены`);
            }
            
            console.log('');
        });
    }
    
    console.log('='.repeat(80));
}

// Запуск извлечения
extractMaraNumber();