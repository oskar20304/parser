const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const puppeteer = require('puppeteer');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const { findWatchersNumber } = require('./universal-selector');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static('public'));
app.set('view engine', 'ejs');

const DB_PATH = path.join(__dirname, 'data', 'stocktwits.db');
let db;
let browser;
let isScrapingActive = false;
let scheduledJobs = new Map();

function initDatabase() {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(path.dirname(DB_PATH))) {
            fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        }

        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                reject(err);
                return;
            }
            console.log('Connected to SQLite database');

            db.serialize(() => {
                db.run(`CREATE TABLE IF NOT EXISTS symbols (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT UNIQUE NOT NULL,
                    selector TEXT NOT NULL,
                    schedule TEXT NOT NULL,
                    active INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS scraped_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT NOT NULL,
                    content TEXT NOT NULL,
                    author TEXT,
                    timestamp TEXT,
                    likes INTEGER DEFAULT 0,
                    metadata TEXT,
                    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (symbol) REFERENCES symbols(symbol)
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS scraping_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT NOT NULL,
                    status TEXT NOT NULL,
                    message TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);
            });
            resolve();
        });
    });
}

async function initBrowser() {
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=VizDisplayCompositor',
                '--disable-dev-shm-usage',
                '--disable-extensions',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
                '--no-first-run',
                '--no-default-browser-check',
                '--no-zygote',
                '--single-process',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-component-extensions-with-background-pages',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        });

        // Add stealth modifications to all pages
        browser.on('targetcreated', async target => {
            const page = await target.page();
            if (page) {
                await page.evaluateOnNewDocument(() => {
                    // Remove webdriver property
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined,
                    });

                    // Mock permissions
                    const originalQuery = window.navigator.permissions.query;
                    return window.navigator.permissions.query = (parameters) => (
                        parameters.name === 'notifications' ?
                            Promise.resolve({ state: Notification.permission }) :
                            originalQuery(parameters)
                    );
                });

                // Set realistic viewport
                await page.setViewport({
                    width: 1366,
                    height: 768,
                    deviceScaleFactor: 1
                });

                // Add realistic headers
                await page.setExtraHTTPHeaders({
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
                    'Cache-Control': 'max-age=0',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1'
                });
            }
        });

        console.log('Browser initialized with anti-detect features');
    } catch (error) {
        console.error('Failed to initialize browser:', error);
    }
}

async function scrapeStockTwits(symbol, selector) {
    if (!browser) {
        throw new Error('Browser not initialized');
    }

    const page = await browser.newPage();
    const url = `https://stocktwits.com/symbol/${symbol}`;
    
    try {
        // Add random delay before navigation (1-3 seconds)
        const preNavigationDelay = Math.floor(Math.random() * 2000) + 1000;
        await page.waitForTimeout(preNavigationDelay);
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Add random delay after page load (2-5 seconds)
        const postLoadDelay = Math.floor(Math.random() * 3000) + 2000;
        await page.waitForTimeout(postLoadDelay);
        
        // Simulate human-like behavior: random mouse movements
        for (let i = 0; i < 3; i++) {
            await page.mouse.move(
                Math.floor(Math.random() * 1200) + 100,
                Math.floor(Math.random() * 600) + 100
            );
            await page.waitForTimeout(Math.floor(Math.random() * 500) + 200);
        }
        
        // Random scroll to simulate reading
        await page.evaluate(() => {
            window.scrollTo({
                top: Math.floor(Math.random() * 500),
                behavior: 'smooth'
            });
        });
        
        // Wait a bit more after scrolling
        await page.waitForTimeout(Math.floor(Math.random() * 2000) + 1000);

        // Save HTML page for debugging
        try {
            const htmlContent = await page.content();
            const debugDir = path.join(__dirname, 'debug');
            if (!fs.existsSync(debugDir)) {
                fs.mkdirSync(debugDir, { recursive: true });
            }
            const filename = `debug_${symbol}_${Date.now()}.html`;
            const filepath = path.join(debugDir, filename);
            fs.writeFileSync(filepath, htmlContent);
            console.log(`📄 Saved page HTML to debug/${filename}`);
        } catch (e) {
            console.log('Failed to save HTML:', e.message);
        }

        let data = {};

        // Use universal selector for watcher count extraction
        try {
            console.log(`🔍 Using universal selector to find watchers for ${symbol}...`);
            const watchersNumber = await findWatchersNumber(page, symbol);
            
            if (watchersNumber) {
                data.watchers = watchersNumber;
                console.log(`✅ Successfully found watchers: ${watchersNumber} for ${symbol}`);
            } else {
                console.log(`❌ No watchers found for ${symbol}`);
            }
        } catch (e) {
            console.log('Could not find watchers count:', e.message);
        }

        // Try to get price data (with debug info)
        try {
            const priceResult = await page.evaluate(() => {
                const debugInfo = [];
                
                // Look for price selectors
                const priceSelectors = [
                    '.SymbolPricing_updatedAmountFont__3N7up',
                    '[class*="SymbolPricing_amount"]',
                    '[class*="price"]',
                    '[class*="Price"]'
                ];
                
                debugInfo.push('Trying price selectors...');
                for (const selector of priceSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        const text = element.textContent.trim();
                        debugInfo.push(`Found element with ${selector}: "${text}"`);
                        // Look for price pattern like $9.08
                        if (text.match(/\$\d+\.\d{2}/) && !text.includes('%')) {
                            return { price: text, debug: debugInfo };
                        }
                    } else {
                        debugInfo.push(`No element found for ${selector}`);
                    }
                }
                
                // Search for any price pattern in text
                debugInfo.push('Searching text nodes for prices...');
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                
                let node;
                const priceResults = [];
                while (node = walker.nextNode()) {
                    const text = node.textContent.trim();
                    // Look for price like $9.08 but not percentages
                    if (text.match(/^\$\d+\.\d{2}$/) && !text.includes('%')) {
                        const parent = node.parentElement;
                        priceResults.push({
                            text: text,
                            className: parent ? parent.className : '',
                            tagName: parent ? parent.tagName : ''
                        });
                        
                        // Make sure it's not a change amount or percentage
                        if (parent && !parent.className.includes('Change_amount') && !parent.className.includes('change')) {
                            return { price: text, debug: debugInfo };
                        }
                    }
                }
                
                debugInfo.push(`Found ${priceResults.length} potential price matches`);
                if (priceResults.length > 0) {
                    debugInfo.push('Price matches:', priceResults.slice(0, 3));
                    return { price: priceResults[0].text, debug: debugInfo };
                }
                
                return { price: null, debug: debugInfo };
            });

            console.log(`Debug info for ${symbol} price:`, priceResult.debug);
            
            if (priceResult.price) {
                data.price = priceResult.price;
                console.log(`✅ Successfully found price: ${priceResult.price} for ${symbol}`);
            } else {
                console.log(`❌ No price found for ${symbol}`);
            }
        } catch (e) {
            console.log('Could not find price:', e.message);
        }

        // If custom selector provided, also scrape posts/messages
        if (selector && selector !== 'watchers') {
            try {
                await page.waitForSelector(selector, { timeout: 10000 });

                const posts = await page.evaluate((sel) => {
                    const elements = document.querySelectorAll(sel);
                    return Array.from(elements).map(el => {
                        const content = el.querySelector('.RichTextMessage_body__4qUeP, .st-message-body')?.textContent?.trim() || el.textContent?.trim() || '';
                        const author = el.querySelector('.st-avatar-name, [class*="username"]')?.textContent?.trim() || '';
                        const timestamp = el.querySelector('.StreamMessage_timestamp__VVDmF, .st-timestamp')?.textContent?.trim() || '';
                        const likes = parseInt(el.querySelector('.st-like-count, [class*="like"]')?.textContent?.trim() || '0', 10);
                        
                        return { content, author, timestamp, likes };
                    }).filter(post => post.content && post.content.length > 10);
                }, selector);

                data.posts = posts;

                // Save posts to database
                for (const post of posts) {
                    await saveScrapedData(symbol, post);
                }
            } catch (e) {
                console.log('Could not scrape posts with custom selector');
            }
        }

        // Always save the main data (watchers, price)
        const mainData = {
            content: `Watchers: ${data.watchers || 'N/A'}, Price: ${data.price || 'N/A'}`,
            author: 'StockTwits',
            timestamp: new Date().toISOString(),
            likes: 0,
            metadata: JSON.stringify(data)
        };

        await saveScrapedData(symbol, mainData);
        await logScraping(symbol, 'success', `Scraped data - Watchers: ${data.watchers}, Price: ${data.price}, Posts: ${data.posts ? data.posts.length : 0}`);
        
        return data;

    } catch (error) {
        console.error(`Подробная ошибка при скрейпинге ${symbol}:`, error);
        console.error('Stack trace:', error.stack);
        await logScraping(symbol, 'error', `${error.message} | Stack: ${error.stack?.substring(0, 500)}`);
        throw error;
    } finally {
        await page.close();
    }
}

function saveScrapedData(symbol, data) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO scraped_data (symbol, content, author, timestamp, likes, metadata) VALUES (?, ?, ?, ?, ?, ?)`);
        stmt.run([symbol, data.content, data.author, data.timestamp, data.likes, data.metadata || null], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
        stmt.finalize();
    });
}

function logScraping(symbol, status, message) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO scraping_logs (symbol, status, message) VALUES (?, ?, ?)`);
        stmt.run([symbol, status, message], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
        stmt.finalize();
    });
}

function scheduleSymbolScraping(symbol, selector, schedule) {
    if (scheduledJobs.has(symbol)) {
        scheduledJobs.get(symbol).stop();
    }

    const job = cron.schedule(schedule, async () => {
        if (isScrapingActive) {
            console.log(`Scraping ${symbol}...`);
            try {
                await scrapeStockTwits(symbol, selector);
            } catch (error) {
                console.error(`Error scraping ${symbol}:`, error);
            }
        }
    }, { scheduled: false });

    scheduledJobs.set(symbol, job);
    
    if (isScrapingActive) {
        job.start();
    }
}

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/api/symbols', (req, res) => {
    db.all('SELECT * FROM symbols ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/symbols', (req, res) => {
    const { symbol, selector, schedule } = req.body;
    
    if (!symbol || !selector || !schedule) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    const stmt = db.prepare('INSERT INTO symbols (symbol, selector, schedule) VALUES (?, ?, ?)');
    stmt.run([symbol.toUpperCase(), selector, schedule], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        scheduleSymbolScraping(symbol.toUpperCase(), selector, schedule);
        res.json({ id: this.lastID, message: 'Symbol added successfully' });
    });
    stmt.finalize();
});

app.delete('/api/symbols/:id', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT symbol FROM symbols WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (row && scheduledJobs.has(row.symbol)) {
            scheduledJobs.get(row.symbol).stop();
            scheduledJobs.delete(row.symbol);
        }
        
        db.run('DELETE FROM symbols WHERE id = ?', [id], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Symbol deleted successfully' });
        });
    });
});

app.post('/api/scraping/start', async (req, res) => {
    isScrapingActive = true;
    
    for (const [symbol, job] of scheduledJobs) {
        job.start();
    }
    
    res.json({ message: 'Scraping started' });
});

app.post('/api/scraping/stop', async (req, res) => {
    isScrapingActive = false;
    
    for (const [symbol, job] of scheduledJobs) {
        job.stop();
    }
    
    res.json({ message: 'Scraping stopped' });
});

app.get('/api/scraping/status', (req, res) => {
    res.json({ 
        active: isScrapingActive,
        scheduledJobs: Array.from(scheduledJobs.keys())
    });
});

app.get('/api/data/:symbol?', (req, res) => {
    const { symbol } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM scraped_data';
    let params = [];
    
    if (symbol) {
        query += ' WHERE symbol = ?';
        params.push(symbol.toUpperCase());
    }
    
    query += ' ORDER BY scraped_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/logs', (req, res) => {
    const { limit = 50 } = req.query;
    
    db.all('SELECT * FROM scraping_logs ORDER BY created_at DESC LIMIT ?', [parseInt(limit)], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/scrape/manual/:symbol', async (req, res) => {
    const { symbol } = req.params;
    
    try {
        const symbolData = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM symbols WHERE symbol = ?', [symbol.toUpperCase()], (err, row) => {
                if (err) reject(err);
                else if (!row) reject(new Error('Symbol not found'));
                else resolve(row);
            });
        });
        
        const posts = await scrapeStockTwits(symbol.toUpperCase(), symbolData.selector);
        res.json({ message: `Scraped ${posts.length} posts for ${symbol}`, posts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function loadScheduledJobs() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM symbols WHERE active = 1', (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            for (const row of rows) {
                scheduleSymbolScraping(row.symbol, row.selector, row.schedule);
            }
            
            console.log(`Loaded ${rows.length} scheduled jobs`);
            resolve();
        });
    });
}

async function initialize() {
    try {
        await initDatabase();
        await initBrowser();
        await loadScheduledJobs();
        
        const server = app.listen(PORT, () => {
            console.log(`StockTwits Scraper running on port ${PORT}`);
            console.log(`Access the web interface at: http://localhost:${PORT}`);
        });
        
        // Обработчики для корректного завершения
        process.on('SIGINT', () => {
            console.log('Получен SIGINT. Завершаю сервер...');
            server.close(async () => {
                console.log('Сервер остановлен');
                if (browser) {
                    await browser.close();
                    console.log('Браузер закрыт');
                }
                if (db) {
                    db.close();
                    console.log('База данных закрыта');
                }
                process.exit(0);
            });
        });

        process.on('SIGTERM', () => {
            console.log('Получен SIGTERM. Завершаю сервер...');
            server.close(async () => {
                console.log('Сервер остановлен');
                if (browser) {
                    await browser.close();
                }
                if (db) {
                    db.close();
                }
                process.exit(0);
            });
        });

        process.on('uncaughtException', (err) => {
            console.error('Необработанная ошибка:', err);
            console.error('Stack trace:', err.stack);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Необработанный Promise rejection:', reason);
            console.error('В Promise:', promise);
            process.exit(1);
        });
    } catch (error) {
        console.error('Failed to initialize application:', error);
        process.exit(1);
    }
}

initialize();