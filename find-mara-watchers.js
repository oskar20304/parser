const fs = require('fs');
const path = require('path');

// Применяем точный алгоритм поиска для файла MARA
function findMaraWatchers() {
    console.log('🎯 Поиск watchers в файлах MARA используя универсальный алгоритм...\n');
    
    const debugDir = path.join(__dirname, 'debug');
    const maraFiles = fs.readdirSync(debugDir).filter(f => f.includes('MARA'));
    
    if (maraFiles.length === 0) {
        console.log('❌ Файлы MARA не найдены');
        return;
    }
    
    maraFiles.forEach((file, index) => {
        console.log(`📁 Анализируем файл ${index + 1}/${maraFiles.length}: ${file}\n`);
        
        const htmlContent = fs.readFileSync(path.join(debugDir, file), 'utf8');
        
        // АЛГОРИТМ 1: Поиск точного селектора SymbolHeader_watchers__nFkZq
        console.log('🔍 Алгоритм 1: Поиск по селектору ".SymbolHeader_watchers__nFkZq"');
        
        if (htmlContent.includes('SymbolHeader_watchers__nFkZq')) {
            console.log('✅ Найден CSS класс SymbolHeader_watchers__nFkZq');
            
            // Извлекаем содержимое элемента с этим классом
            const regex = /class="[^"]*SymbolHeader_watchers__nFkZq[^"]*"[^>]*>([^<]*)</g;
            const matches = [...htmlContent.matchAll(regex)];
            
            matches.forEach((match, i) => {
                const content = match[1].trim();
                console.log(`   Содержимое ${i + 1}: "${content}"`);
                
                // Ищем число в содержимом
                const numberMatch = content.match(/\d{1,3}(,\d{3})*/);
                if (numberMatch) {
                    console.log(`   🎯 НАЙДЕНО ЧИСЛО: ${numberMatch[0]}`);
                } else {
                    console.log('   ⚠️ Число не найдено в прямом содержимом');
                }
            });
            
            if (matches.length === 0) {
                console.log('   ⚠️ Не удалось извлечь содержимое элемента');
            }
            
        } else {
            console.log('❌ CSS класс SymbolHeader_watchers__nFkZq не найден');
        }
        
        console.log('');
        
        // АЛГОРИТМ 2: Поиск по контексту рядом с SymbolHeader_watchButton__E_8Jz
        console.log('🔍 Алгоритм 2: Поиск рядом с кнопкой Watch');
        
        if (htmlContent.includes('SymbolHeader_watchButton__E_8Jz')) {
            console.log('✅ Найдена кнопка Watch (SymbolHeader_watchButton__E_8Jz)');
            
            // Ищем числа перед кнопкой Watch в радиусе 200 символов
            const buttonIndex = htmlContent.indexOf('SymbolHeader_watchButton__E_8Jz');
            const contextBefore = htmlContent.substring(Math.max(0, buttonIndex - 200), buttonIndex);
            
            console.log('   Контекст перед кнопкой:', contextBefore.slice(-100) + '...');
            
            // Ищем числа в этом контексте
            const numbersInContext = contextBefore.match(/\d{1,3}(,\d{3})*/g);
            if (numbersInContext) {
                const validNumbers = numbersInContext.filter(num => {
                    const value = parseInt(num.replace(/,/g, ''));
                    return value >= 1000 && value <= 500000; // Разумный диапазон для watchers
                });
                
                if (validNumbers.length > 0) {
                    console.log(`   🎯 НАЙДЕННЫЕ ЧИСЛА: ${validNumbers.join(', ')}`);
                    console.log(`   ⭐ НАИБОЛЕЕ ВЕРОЯТНОЕ: ${validNumbers[validNumbers.length - 1]} (ближайшее к кнопке)`);
                } else {
                    console.log('   ⚠️ Подходящие числа не найдены в контексте');
                }
            } else {
                console.log('   ⚠️ Числа не найдены в контексте перед кнопкой');
            }
            
        } else {
            console.log('❌ Кнопка Watch не найдена');
        }
        
        console.log('');
        
        // АЛГОРИТМ 3: Поиск всех чисел в разумном диапазоне watchers
        console.log('🔍 Алгоритм 3: Поиск всех потенциальных чисел watchers');
        
        const allNumbers = htmlContent.match(/\d{1,3}(,\d{3})*/g) || [];
        const potentialWatchers = allNumbers
            .map(num => ({
                number: num,
                value: parseInt(num.replace(/,/g, ''))
            }))
            .filter(item => item.value >= 5000 && item.value <= 200000) // Диапазон для MARA
            .sort((a, b) => a.value - b.value);
        
        if (potentialWatchers.length > 0) {
            console.log(`   Найдено ${potentialWatchers.length} потенциальных чисел watchers:`);
            potentialWatchers.forEach((item, i) => {
                console.log(`   ${i + 1}. ${item.number} (${item.value})`);
            });
            
            // Выбираем наиболее вероятное (среднее значение)
            const middleIndex = Math.floor(potentialWatchers.length / 2);
            console.log(`   ⭐ РЕКОМЕНДАЦИЯ: ${potentialWatchers[middleIndex].number}`);
        } else {
            console.log('   ❌ Потенциальные числа watchers не найдены');
        }
        
        console.log('\n' + '='.repeat(80) + '\n');
    });
}

// Запуск поиска
findMaraWatchers();