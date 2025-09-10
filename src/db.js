const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');


const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'dmq.db');
let db;


function initDb(){
const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');


db.exec(`
CREATE TABLE IF NOT EXISTS topics (
name TEXT PRIMARY KEY,
partitions INTEGER NOT NULL
);


CREATE TABLE IF NOT EXISTS messages (
topic TEXT NOT NULL,
partition INTEGER NOT NULL,
offset INTEGER NOT NULL,
key TEXT,
value TEXT NOT NULL,
ts TEXT NOT NULL,
PRIMARY KEY (topic, partition, offset)
);


CREATE TABLE IF NOT EXISTS offsets (
topic TEXT NOT NULL,
partition INTEGER NOT NULL,
consumer_group TEXT NOT NULL,
committed_offset INTEGER NOT NULL,
PRIMARY KEY (topic, partition, consumer_group)
);
`);
}


function getDb(){
if (!db) throw new Error('DB not initialized');
return db;
}


module.exports = { initDb, getDb };