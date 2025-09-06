const puppeteer = require('puppeteer');

async function debugStockTwits() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('Navigating to CLSK page...');
        await page.goto('https://stocktwits.com/symbol/CLSK', { waitUntil: 'networkidle2', timeout: 30000 });
        
        console.log('Page loaded, waiting for content...');
        await page.waitForTimeout(3000);
        
        // Ищем различные варианты селекторов для числовых данных
        const selectors = [
            '[class*="watchers"]',
            '[class*="Watchers"]',
            '[class*="followers"]',
            '[class*="Followers"]',
            '[class*="count"]',
            '[class*="Count"]',
            '[class*="number"]',
            '[class*="Number"]',
            '[class*="metric"]',
            '[class*="Metric"]',
            '[class*="stat"]',
            '[class*="Stat"]'
        ];
        
        console.log('Looking for elements with number-like content...');
        
        for (const selector of selectors) {
            try {
                const elements = await page.$$(selector);
                for (let i = 0; i < elements.length; i++) {
                    const text = await elements[i].textContent();
                    const className = await elements[i].getAttribute('class');
                    
                    if (text && (text.includes('51') || text.includes('52') || text.includes('50') || /\d{2,}/.test(text.replace(/,/g, '')))) {
                        console.log(`Found potential match:`);
                        console.log(`  Selector: ${selector}`);
                        console.log(`  Class: ${className}`);
                        console.log(`  Text: "${text}"`);
                        console.log(`  ---`);
                    }
                }
            } catch (e) {
                // Селектор не найден, продолжаем
            }
        }
        
        // Ищем все элементы с числами
        const allElements = await page.evaluate(() => {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            const results = [];
            let node;
            
            while (node = walker.nextNode()) {
                const text = node.textContent.trim();
                if (text.match(/\b\d{2,3}(,\d{3})*\b/)) { // Ищем числа вида 51,528
                    const parent = node.parentElement;
                    if (parent) {
                        results.push({
                            text: text,
                            parentTag: parent.tagName,
                            parentClass: parent.className,
                            parentId: parent.id
                        });
                    }
                }
            }
            return results;
        });
        
        console.log('\nFound numbers in text content:');
        allElements.forEach((item, index) => {
            console.log(`${index + 1}. "${item.text}"`);
            console.log(`   Parent: <${item.parentTag}> class="${item.parentClass}" id="${item.parentId}"`);
            console.log('   ---');
        });
        
        // Ждем 5 секунд чтобы можно было посмотреть на страницу
        console.log('\nWaiting 10 seconds for manual inspection...');
        await page.waitForTimeout(10000);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

debugStockTwits().catch(console.error);