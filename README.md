# StockTwits Scraper

A complete web application for scraping StockTwits data with scheduling, web interface, and SQLite database storage.

## Features

- **Web Interface**: Modern, responsive interface for managing scraping tasks
- **Stock Symbol Management**: Add, configure, and delete stock symbols to scrape
- **Flexible Scheduling**: Use cron expressions to schedule scraping tasks
- **Custom Selectors**: Configure CSS selectors for different StockTwits layouts
- **Real-time Control**: Start/stop scraping with live status updates
- **Data Viewing**: Browse and filter scraped data with pagination
- **Logging System**: Monitor scraping activities and errors
- **Manual Scraping**: Trigger immediate scraping for any configured symbol

## Installation
test1change
1. **Clone or download the project files**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

4. **Access the web interface:**
   Open your browser and go to `http://localhost:3000`

## Usage

### Adding Stock Symbols

1. Go to the "Symbols Management" tab
2. Fill in the form:
   - **Stock Symbol**: e.g., AAPL, TSLA, GOOGL
   - **CSS Selector**: CSS selector to target StockTwits posts (e.g., `.st-message`)
   - **Cron Schedule**: Schedule in cron format (e.g., `*/15 * * * *` for every 15 minutes)
3. Click "Add Symbol"

### Cron Schedule Examples

- `*/15 * * * *` - Every 15 minutes
- `0 9-17 * * 1-5` - Every hour from 9 AM to 5 PM, Monday to Friday
- `0 */2 * * *` - Every 2 hours
- `30 9 * * *` - Daily at 9:30 AM

### CSS Selector Examples

Common StockTwits selectors:
- `.st-message` - Main message container
- `.message-list .message` - Message in list view
- `.st_3eP0irD` - Dynamic class (may change)

### Starting/Stopping Scraping

Use the "Start Scraping" and "Stop Scraping" buttons in the header to control all scheduled scraping tasks.

### Viewing Data

1. Go to the "Scraped Data" tab
2. Filter by symbol if needed
3. Use pagination to browse through results
4. Data includes content, author, timestamp, likes, and scrape time

### Monitoring Logs

Check the "Logs" tab to monitor scraping activities, successes, and errors.

## Project Structure

```
stocktwits-scraper/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── data/                  # SQLite database storage
│   └── stocktwits.db     # Database file (created automatically)
├── views/                # EJS templates
│   └── index.ejs         # Main interface
├── public/               # Static files
│   ├── css/
│   │   └── style.css     # Styles
│   └── js/
│       └── app.js        # Frontend JavaScript
└── README.md             # Documentation
```

## Database Schema

### symbols
- `id` - Primary key
- `symbol` - Stock symbol (e.g., AAPL)
- `selector` - CSS selector for scraping
- `schedule` - Cron schedule
- `active` - Whether the symbol is active
- `created_at` - Creation timestamp

### scraped_data
- `id` - Primary key
- `symbol` - Associated stock symbol
- `content` - Post content
- `author` - Post author
- `timestamp` - Original post timestamp
- `likes` - Number of likes
- `scraped_at` - When data was scraped

### scraping_logs
- `id` - Primary key
- `symbol` - Associated stock symbol
- `status` - success/error
- `message` - Log message
- `created_at` - Log timestamp

## API Endpoints

### Symbols Management
- `GET /api/symbols` - List all symbols
- `POST /api/symbols` - Add new symbol
- `DELETE /api/symbols/:id` - Delete symbol

### Scraping Control
- `GET /api/scraping/status` - Get scraping status
- `POST /api/scraping/start` - Start all scraping
- `POST /api/scraping/stop` - Stop all scraping
- `POST /api/scrape/manual/:symbol` - Manual scrape

### Data Retrieval
- `GET /api/data/:symbol?` - Get scraped data (optional symbol filter)
- `GET /api/logs` - Get scraping logs

## Environment Variables

- `PORT` - Server port (default: 3000)

## Dependencies

### Production
- `express` - Web server framework
- `puppeteer` - Web scraping and browser automation
- `node-cron` - Task scheduling
- `sqlite3` - Database
- `body-parser` - Request parsing
- `cors` - CORS handling
- `ejs` - Template engine

### Development
- `nodemon` - Development auto-reload

## Notes

- The application automatically creates the SQLite database and tables on first run
- Browser instance is shared across all scraping tasks for efficiency
- Graceful shutdown closes browser and database connections
- All scraped data is stored locally in SQLite
- The interface is responsive and works on mobile devices

## Troubleshooting

### Common Issues

1. **Browser fails to start**: Make sure you have sufficient system resources and Chrome/Chromium dependencies
2. **Selectors not working**: StockTwits may change their CSS classes; update selectors as needed
3. **Database locked**: Ensure only one instance of the app is running
4. **Network errors**: Check internet connection and StockTwits availability

### Updating Selectors

StockTwits may update their website structure. To update selectors:
1. Inspect StockTwits pages in your browser
2. Find the correct CSS selector for message containers
3. Update the selector in the symbol configuration
4. Test with manual scraping

## License

MIT License - See package.json for details.