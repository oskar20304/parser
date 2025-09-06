const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'stocktwits.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to database for migration');
});

// Add metadata column if it doesn't exist
db.run(`ALTER TABLE scraped_data ADD COLUMN metadata TEXT`, function(err) {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('Column metadata already exists');
        } else {
            console.log('Error (might be expected if column exists):', err.message);
        }
    } else {
        console.log('Added metadata column successfully');
    }
    
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database migration completed');
        process.exit(0);
    });
});