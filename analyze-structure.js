const puppeteer = require('puppeteer');

async function analyzeHTMLStructure() {
    console.log('Analyzing HTML structure patterns across StockTwits pages...');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const symbols = ['CLSK', 'HIVE', 'NVDA', 'TSLA', 'AAPL'];
    const results = [];
    
    for (const symbol of symbols) {
        console.log(`\n=== Analyzing ${symbol} ===`);
        
        const page = await browser.newPage();
        
        try {
            await page.goto(`https://stocktwits.com/symbol/${symbol}`, { 
                waitUntil: 'networkidle2', 
                timeout: 30000 
            });
            await page.waitForTimeout(3000);
            
            const analysis = await page.evaluate(() => {
                // Find all elements containing numbers that could be watchers
                const numberPattern = /\b\d{1,3}(,\d{3})*\b/g;
                const potentialWatchers = [];
                
                // Search through all text nodes
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                
                let node;
                while (node = walker.nextNode()) {
                    const text = node.textContent.trim();
                    const matches = text.match(numberPattern);
                    
                    if (matches) {
                        matches.forEach(match => {
                            const number = parseInt(match.replace(/,/g, ''));
                            // Look for numbers that could be watchers (broader range)
                            if (number >= 100 && number <= 500000) {
                                const element = node.parentElement;
                                
                                potentialWatchers.push({
                                    number: match,
                                    text: text,
                                    tagName: element?.tagName || 'unknown',
                                    className: element?.className || '',
                                    id: element?.id || '',
                                    parentTagName: element?.parentElement?.tagName || 'unknown',
                                    parentClassName: element?.parentElement?.className || '',
                                    parentId: element?.parentElement?.id || '',
                                    // Get the path to this element
                                    cssPath: (() => {
                                        let path = [];
                                        let current = element;
                                        while (current && current !== document.body) {
                                            let selector = current.tagName.toLowerCase();
                                            if (current.id) {
                                                selector += `#${current.id}`;
                                            } else if (current.className) {
                                                const classes = current.className.split(' ').filter(c => c.length > 0);
                                                if (classes.length > 0) {
                                                    selector += `.${classes.join('.')}`;
                                                }
                                            }
                                            path.unshift(selector);
                                            current = current.parentElement;
                                        }
                                        return path.join(' > ');
                                    })(),
                                    // Check if this might be watchers by looking for keywords
                                    contextWords: (() => {
                                        const fullText = (element?.parentElement?.textContent || '').toLowerCase();
                                        const watcherKeywords = ['watcher', 'watching', 'follow', 'subscriber', 'member'];
                                        return watcherKeywords.filter(keyword => fullText.includes(keyword));
                                    })()
                                });
                            }
                        });
                    }
                }
                
                return {
                    potentialWatchers: potentialWatchers,
                    totalFound: potentialWatchers.length
                };
            });
            
            results.push({
                symbol: symbol,
                analysis: analysis
            });
            
            console.log(`Found ${analysis.totalFound} potential watcher numbers`);
            analysis.potentialWatchers.forEach((item, index) => {
                console.log(`${index + 1}. ${item.number} - ${item.cssPath}`);
                if (item.contextWords.length > 0) {
                    console.log(`   Context keywords: ${item.contextWords.join(', ')}`);
                }
            });
            
        } catch (error) {
            console.error(`Error analyzing ${symbol}:`, error.message);
        } finally {
            await page.close();
        }
    }
    
    await browser.close();
    
    // Analyze patterns across all symbols
    console.log('\n=== PATTERN ANALYSIS ===');
    
    // Find common CSS paths
    const allPaths = [];
    results.forEach(result => {
        result.analysis.potentialWatchers.forEach(watcher => {
            allPaths.push(watcher.cssPath);
        });
    });
    
    // Count path frequency
    const pathFrequency = {};
    allPaths.forEach(path => {
        pathFrequency[path] = (pathFrequency[path] || 0) + 1;
    });
    
    console.log('\nMost common CSS paths:');
    Object.entries(pathFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([path, count]) => {
            console.log(`${count}x: ${path}`);
        });
    
    // Find common class patterns
    const allClasses = [];
    results.forEach(result => {
        result.analysis.potentialWatchers.forEach(watcher => {
            if (watcher.className) {
                watcher.className.split(' ').forEach(cls => {
                    if (cls.length > 0) allClasses.push(cls);
                });
            }
        });
    });
    
    const classFrequency = {};
    allClasses.forEach(cls => {
        classFrequency[cls] = (classFrequency[cls] || 0) + 1;
    });
    
    console.log('\nMost common classes:');
    Object.entries(classFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([cls, count]) => {
            console.log(`${count}x: .${cls}`);
        });
    
    return results;
}

analyzeHTMLStructure().then(results => {
    console.log('\nAnalysis complete!');
    process.exit(0);
}).catch(error => {
    console.error('Analysis failed:', error);
    process.exit(1);
});