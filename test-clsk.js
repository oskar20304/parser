const puppeteer = require('puppeteer');

async function testCLSKScraping() {
    console.log('Testing CLSK scraping...');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('Navigating to CLSK page...');
        await page.goto('https://stocktwits.com/symbol/CLSK', { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(3000);

        console.log('Looking for watchers count...');
        
        // Search for all elements containing numbers like "51,527"
        const watchersCount = await page.evaluate(() => {
            // First try specific selectors
            const specificSelectors = [
                '.SymbolWatchers_watchers__sp1FU',
                '[class*="SymbolWatchers_watchers"]',
                '[class*="watchers"]',
                '[class*="Watchers"]'
            ];
            
            for (const selector of specificSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent.trim();
                    const match = text.match(/\b\d{1,3}(,\d{3})*\b/);
                    if (match) {
                        console.log(`Found with selector ${selector}: ${match[0]}`);
                        return match[0];
                    }
                }
            }
            
            // If not found, search all text nodes for the pattern
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let node;
            const results = [];
            
            while (node = walker.nextNode()) {
                const text = node.textContent.trim();
                if (text.match(/\b5[0-9],\d{3}\b/)) { // Looking for numbers like 51,527
                    const parent = node.parentElement;
                    results.push({
                        text: text,
                        className: parent ? parent.className : '',
                        tagName: parent ? parent.tagName : ''
                    });
                }
            }
            
            if (results.length > 0) {
                console.log('Found potential matches:', results);
                const match = results[0].text.match(/\b\d{1,3}(,\d{3})*\b/);
                return match ? match[0] : results[0].text;
            }
            
            return null;
        });

        console.log('Watchers count:', watchersCount);

        // Try to get price
        const priceSelector = '[class*="SymbolPricing_amount"], [class*="price"]';
        const price = await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            return element ? element.textContent.trim() : null;
        }, priceSelector);

        console.log('Price:', price);

        const result = {
            watchers: watchersCount,
            price: price,
            success: true
        };

        console.log('Final result:', result);
        return result;

    } catch (error) {
        console.error('Error:', error);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

testCLSKScraping().then(result => {
    console.log('Test completed:', result);
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});