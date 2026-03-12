const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('veterinary.db');

db.all("SELECT DISTINCT category FROM products", [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Categories found:", rows);
    }
    db.close();
});
