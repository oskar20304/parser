const fs = require('fs');
const path = require('path');

// Поиск конкретного числа 24,593 в файле HIVE
function findHiveNumber() {
    console.log('🎯 Поиск числа 24,593 в файле HIVE...\n');
    
    const debugDir = path.join(__dirname, 'debug');
    const hiveFile = fs.readdirSync(debugDir).find(f => f.includes('HIVE'));
    
    if (!hiveFile) {
        console.log('❌ Файл HIVE не найден');
        return;
    }
    
    console.log(`📁 Анализируем файл: ${hiveFile}\n`);
    
    const htmlContent = fs.readFileSync(path.join(debugDir, hiveFile), 'utf8');
    const lines = htmlContent.split('\n');
    
    // Ищем число 24,593
    const targetNumber = '24,593';
    let found = false;
    
    lines.forEach((line, lineIndex) => {
        if (line.includes(targetNumber)) {
            found = true;
            console.log(`✅ Найдено на строке ${lineIndex + 1}:\n`);
            
            // Показываем контекст вокруг числа
            const position = line.indexOf(targetNumber);
            const beforeText = line.substring(0, position);
            const afterText = line.substring(position + targetNumber.length);
            
            // Обрезаем для читаемости
            const contextBefore = beforeText.length > 150 ? '...' + beforeText.slice(-150) : beforeText;
            const contextAfter = afterText.length > 150 ? afterText.slice(0, 150) + '...' : afterText;
            
            console.log(`🎯 КОНТЕКСТ:`);
            console.log(`${contextBefore}[${targetNumber}]${contextAfter}\n`);
            
            // Попробуем извлечь CSS селекторы
            console.log(`🏷️ CSS КЛАССЫ И СЕЛЕКТОРЫ:`);
            const classMatches = line.match(/class=["']([^"']*)["']/g);
            if (classMatches) {
                console.log(`   Классы: ${classMatches.join(', ')}\n`);
            } else {
                console.log(`   Классы: не найдены\n`);
            }
            
            // Ищем идентификаторы
            const idMatches = line.match(/id=["']([^"']*)["']/g);
            if (idMatches) {
                console.log(`   ID: ${idMatches.join(', ')}\n`);
            }
            
            // Ищем data-атрибуты
            const dataMatches = line.match(/data-[^=]*=["']([^"']*)["']/g);
            if (dataMatches) {
                console.log(`   Data атрибуты: ${dataMatches.slice(0, 5).join(', ')}\n`);
            }
            
            // Попробуем определить HTML структуру вокруг числа
            console.log(`📋 АНАЛИЗ HTML СТРУКТУРЫ:`);
            
            // Ищем открывающие теги перед числом
            const beforeTags = beforeText.match(/<(\w+)[^>]*>/g);
            if (beforeTags) {
                console.log(`   Теги перед числом: ${beforeTags.slice(-3).join(' ')}`);
            }
            
            // Ищем закрывающие теги после числа  
            const afterTags = afterText.match(/<\/(\w+)>/g);
            if (afterTags) {
                console.log(`   Теги после числа: ${afterTags.slice(0, 3).join(' ')}`);
            }
            
            // Проверяем есть ли рядом ключевые слова
            console.log(`\n🔑 КЛЮЧЕВЫЕ СЛОВА РЯДОМ С ЧИСЛОМ:`);
            const context = (beforeText + afterText).toLowerCase();
            const keywords = ['watch', 'watcher', 'watching', 'follow', 'follower', 'following', 'member', 'subscriber'];
            const foundKeywords = keywords.filter(keyword => context.includes(keyword));
            
            if (foundKeywords.length > 0) {
                console.log(`   Найдены: ${foundKeywords.join(', ')}`);
            } else {
                console.log(`   Ключевые слова не найдены`);
            }
            
            console.log(`\n${'='.repeat(80)}\n`);
        }
    });
    
    if (!found) {
        console.log(`❌ Число ${targetNumber} не найдено в файле ${hiveFile}`);
        
        // Попробуем найти варианты написания
        console.log(`\n🔍 Поиск альтернативных форматов...`);
        const alternatives = ['24593', '24.593', '24 593'];
        
        alternatives.forEach(alt => {
            if (htmlContent.includes(alt)) {
                console.log(`✅ Найден альтернативный формат: ${alt}`);
            }
        });
    }
}

// Запуск поиска
findHiveNumber();