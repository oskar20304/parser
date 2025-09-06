const puppeteer = require('puppeteer');

async function testGenericAlgorithm() {
    console.log('Testing generic watcher extraction algorithm...');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const symbols = ['CLSK', 'HIVE', 'NVDA'];
    
    for (const symbol of symbols) {
        console.log(`\n=== Testing ${symbol} ===`);
        
        const page = await browser.newPage();
        
        try {
            await page.goto(`https://stocktwits.com/symbol/${symbol}`, { 
                waitUntil: 'networkidle2', 
                timeout: 30000 
            });
            await page.waitForTimeout(3000);
            
            // Use the exact same algorithm as in server.js
            const watchersCount = await page.evaluate(() => {
                // Strategy 1: Look for SymbolWatchers component structure
                const watchersSelectors = [
                    '.SymbolWatchers_watchers__sp1FU',
                    '[class*="SymbolWatchers_watchers"]',
                    '[class*="watchers"]'
                ];
                
                for (const selector of watchersSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        const text = element.textContent.trim();
                        const match = text.match(/\b\d{1,3}(,\d{3})*\b/);
                        if (match) {
                            console.log(`Found watchers via selector ${selector}: ${match[0]}`);
                            return match[0];
                        }
                    }
                }
                
                // Strategy 2: Look for numbers in the symbol info section with watcher context
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                
                let node;
                const candidates = [];
                
                while (node = walker.nextNode()) {
                    const text = node.textContent.trim();
                    const numberMatch = text.match(/\b\d{1,3}(,\d{3})+\b/);
                    
                    if (numberMatch) {
                        const number = parseInt(numberMatch[0].replace(/,/g, ''));
                        
                        // Filter for reasonable watcher counts (1K-500K)
                        if (number >= 1000 && number <= 500000) {
                            const element = node.parentElement;
                            if (element) {
                                // Check for watcher-related context in element hierarchy
                                let current = element;
                                let hasWatcherContext = false;
                                let depth = 0;
                                
                                while (current && depth < 5) {
                                    const className = current.className || '';
                                    const textContent = (current.textContent || '').toLowerCase();
                                    
                                    if (className.includes('SymbolWatchers') || 
                                        className.includes('watchers') ||
                                        className.includes('Watchers') ||
                                        textContent.includes('watching') ||
                                        textContent.includes('watcher')) {
                                        hasWatcherContext = true;
                                        break;
                                    }
                                    
                                    current = current.parentElement;
                                    depth++;
                                }
                                
                                if (hasWatcherContext) {
                                    candidates.push({
                                        number: numberMatch[0],
                                        value: number,
                                        context: 'watcher-related',
                                        className: element.className
                                    });
                                }
                                
                                // Also check if it's in the symbol info area
                                let symbolInfoContext = false;
                                current = element;
                                depth = 0;
                                
                                while (current && depth < 8) {
                                    const className = current.className || '';
                                    if (className.includes('SymbolInfo') || 
                                        className.includes('SymbolPage') ||
                                        className.includes('SymbolLede')) {
                                        symbolInfoContext = true;
                                        break;
                                    }
                                    current = current.parentElement;
                                    depth++;
                                }
                                
                                if (symbolInfoContext && !hasWatcherContext) {
                                    candidates.push({
                                        number: numberMatch[0],
                                        value: number,
                                        context: 'symbol-info',
                                        className: element.className
                                    });
                                }
                            }
                        }
                    }
                }
                
                // Sort candidates by priority: watcher-related context first, then by number size
                candidates.sort((a, b) => {
                    if (a.context === 'watcher-related' && b.context !== 'watcher-related') return -1;
                    if (b.context === 'watcher-related' && a.context !== 'watcher-related') return 1;
                    return b.value - a.value; // Higher numbers first for same context
                });
                
                console.log('Debug candidates:', candidates.slice(0, 5));
                
                if (candidates.length > 0) {
                    console.log(`Found ${candidates.length} watcher candidates, selected: ${candidates[0].number}`);
                    return candidates[0].number;
                }
                
                return null;
            });
            
            console.log(`Result: ${watchersCount || 'N/A'}`);
            
        } catch (error) {
            console.error(`Error testing ${symbol}:`, error.message);
        } finally {
            await page.close();
        }
    }
    
    await browser.close();
    console.log('\nGeneric algorithm test completed!');
}

testGenericAlgorithm().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});