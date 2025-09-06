const puppeteer = require('puppeteer');

async function testHIVEScraping() {
    console.log('Testing HIVE scraping...');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('Navigating to HIVE page...');
        await page.goto('https://stocktwits.com/symbol/hive', { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(3000);

        console.log('Looking for watchers count...');
        
        // Search for all elements containing numbers like "24,589"
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
                if (text.match(/\b2[0-9],\d{3}\b/)) { // Looking for numbers like 24,589
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
            
            // Last resort: find any number with comma pattern
            const walker2 = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            let node2;
            while (node2 = walker2.nextNode()) {
                const text = node2.textContent.trim();
                if (text.match(/\b\d{2,3},\d{3}\b/)) {
                    const match = text.match(/\b\d{1,3}(,\d{3})*\b/);
                    if (match) {
                        console.log('Found with last resort:', match[0]);
                        return match[0];
                    }
                }
            }
            
            return null;
        });

        console.log('Watchers count:', watchersCount);

        // Try to get price
        const price = await page.evaluate(() => {
            // Look for price selectors
            const priceSelectors = [
                '.SymbolPricing_updatedAmountFont__3N7up',
                '[class*="SymbolPricing_amount"]',
                '[class*="price"]',
                '[class*="Price"]'
            ];
            
            for (const selector of priceSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent.trim();
                    // Look for price pattern like $3.45
                    if (text.match(/\$\d+\.\d{2}/)) {
                        return text;
                    }
                }
            }
            
            // Search for any price pattern in text
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let node;
            while (node = walker.nextNode()) {
                const text = node.textContent.trim();
                // Look for price like $3.45 but not percentages
                if (text.match(/^\$\d+\.\d{2}$/) && !text.includes('%')) {
                    const parent = node.parentElement;
                    // Make sure it's not a change amount or percentage
                    if (parent && !parent.className.includes('Change_amount')) {
                        return text;
                    }
                }
            }
            
            return null;
        });

        console.log('Price:', price);

        // Wait 5 seconds for manual inspection
        console.log('Waiting 5 seconds for inspection...');
        await page.waitForTimeout(5000);

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

testHIVEScraping().then(result => {
    console.log('Test completed:', result);
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});