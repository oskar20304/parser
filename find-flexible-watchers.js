const fs = require('fs');
const path = require('path');

// Поиск watchers с гибким паттерном селекторов
function findFlexibleWatchers() {
    console.log('🎯 Поиск watchers с гибким паттерном классов...\n');
    
    const debugDir = path.join(__dirname, 'debug');
    const maraFiles = fs.readdirSync(debugDir).filter(f => f.includes('MARA'));
    
    if (maraFiles.length === 0) {
        console.log('❌ Файлы MARA не найдены');
        return;
    }
    
    maraFiles.forEach((file, index) => {
        console.log(`📁 Анализируем файл ${index + 1}: ${file}\n`);
        
        const htmlContent = fs.readFileSync(path.join(debugDir, file), 'utf8');
        
        // СТРАТЕГИЯ 1: Поиск классов начинающихся с SymbolHeader_watchers__
        console.log('🔍 Стратегия 1: Поиск классов SymbolHeader_watchers__*');
        
        const watchersClassPattern = /class="[^"]*SymbolHeader_watchers__[^"]*"/g;
        const watchersClasses = [...htmlContent.matchAll(watchersClassPattern)];
        
        if (watchersClasses.length > 0) {
            console.log(`✅ Найдено ${watchersClasses.length} классов с SymbolHeader_watchers__:`);
            
            watchersClasses.forEach((match, i) => {
                console.log(`   ${i + 1}. ${match[0]}`);
                
                // Извлекаем полный элемент с этим классом
                const elementPattern = new RegExp(match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^>]*>([^<]*)', 'g');
                const elementMatches = [...htmlContent.matchAll(elementPattern)];
                
                elementMatches.forEach((elementMatch, j) => {
                    const content = elementMatch[1].trim();
                    console.log(`      Содержимое ${j + 1}: "${content}"`);
                    
                    const numberMatch = content.match(/\d{1,3}(,\d{3})*/);
                    if (numberMatch) {
                        console.log(`      🎯 НАЙДЕНО ЧИСЛО: ${numberMatch[0]}`);
                    }
                });
            });
        } else {
            console.log('❌ Классы SymbolHeader_watchers__ не найдены');
        }
        
        console.log('');
        
        // СТРАТЕГИЯ 2: Поиск классов начинающихся с SymbolHeader_watchButton__
        console.log('🔍 Стратегия 2: Поиск кнопки SymbolHeader_watchButton__*');
        
        const watchButtonPattern = /SymbolHeader_watchButton__[a-zA-Z0-9_]+/g;
        const watchButtonClasses = [...htmlContent.matchAll(watchButtonPattern)];
        
        if (watchButtonClasses.length > 0) {
            console.log(`✅ Найдено ${watchButtonClasses.length} классов кнопки Watch:`);
            
            watchButtonClasses.forEach((match, i) => {
                console.log(`   ${i + 1}. ${match[0]}`);
            });
            
            // Ищем числа перед первой найденной кнопкой
            const firstButtonIndex = htmlContent.indexOf(watchButtonClasses[0][0]);
            const contextBefore = htmlContent.substring(Math.max(0, firstButtonIndex - 300), firstButtonIndex);
            
            console.log('   📋 Контекст перед кнопкой (последние 100 символов):');
            console.log(`   ...${contextBefore.slice(-100)}`);
            
            // Ищем числа в контексте
            const numbersInContext = contextBefore.match(/>\s*(\d{1,3}(?:,\d{3})*)\s*</g);
            if (numbersInContext) {
                const cleanNumbers = numbersInContext.map(n => n.match(/\d{1,3}(?:,\d{3})*/)[0]);
                console.log(`   🎯 ЧИСЛА ПЕРЕД КНОПКОЙ: ${cleanNumbers.join(', ')}`);
                
                // Фильтруем разумные числа для watchers
                const validNumbers = cleanNumbers.filter(num => {
                    const value = parseInt(num.replace(/,/g, ''));
                    return value >= 1000 && value <= 200000;
                });
                
                if (validNumbers.length > 0) {
                    console.log(`   ⭐ НАИБОЛЕЕ ВЕРОЯТНОЕ: ${validNumbers[validNumbers.length - 1]}`);
                } else {
                    console.log(`   ⚠️ Подходящие числа не найдены`);
                }
            } else {
                console.log('   ❌ Числа в контексте не найдены');
            }
        } else {
            console.log('❌ Классы SymbolHeader_watchButton__ не найдены');
        }
        
        console.log('');
        
        // СТРАТЕГИЯ 3: Поиск любых классов содержащих "watchers"
        console.log('🔍 Стратегия 3: Поиск классов содержащих "watchers"');
        
        const anyWatchersPattern = /class="[^"]*watchers[^"]*"/gi;
        const anyWatchersClasses = [...htmlContent.matchAll(anyWatchersPattern)];
        
        if (anyWatchersClasses.length > 0) {
            console.log(`✅ Найдено ${anyWatchersClasses.length} классов содержащих "watchers":`);
            
            anyWatchersClasses.slice(0, 5).forEach((match, i) => {
                console.log(`   ${i + 1}. ${match[0]}`);
                
                // Ищем элементы с этими классами и числа в них
                const classValue = match[0].match(/class="([^"]*)"/)[1];
                const elementRegex = new RegExp(`class="[^"]*${classValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*>([^<]*(?:<[^>]*>[^<]*)*?)(?=<(?!\/)|\s*$)`, 'g');
                
                const elementContent = [...htmlContent.matchAll(elementRegex)];
                elementContent.forEach((content, j) => {
                    const text = content[1].replace(/<[^>]*>/g, '').trim();
                    if (text) {
                        console.log(`      Содержимое ${j + 1}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
                        
                        const numberMatch = text.match(/\d{1,3}(?:,\d{3})*/);
                        if (numberMatch) {
                            console.log(`      🎯 ЧИСЛО: ${numberMatch[0]}`);
                        }
                    }
                });
            });
        } else {
            console.log('❌ Классы содержащие "watchers" не найдены');
        }
        
        console.log('\n' + '='.repeat(80) + '\n');
    });
}

// Запуск поиска
findFlexibleWatchers();