const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.all("PRAGMA table_info(Leads)", (err, rows) => {
  if (err) console.error(err);
  else console.log("Leads columns:", rows.map(r => r.name).join(', '));
  
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    console.log("Tables:", tables.map(t => t.name).join(', '));
    db.close();
  });
});
