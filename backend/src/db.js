const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");

const file = process.env.DB_FILE || path.join(__dirname, "..", "data", "kompudoc.db");
if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });

const db = new DatabaseSync(file);
db.exec(`
  CREATE TABLE IF NOT EXISTS konsultasi (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    device     TEXT NOT NULL,
    answers    TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE TABLE IF NOT EXISTS troubleshooting_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    device     TEXT,
    query      TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_konsultasi_user ON konsultasi(user_email, created_at);
  CREATE INDEX IF NOT EXISTS idx_ts_user ON troubleshooting_log(user_email, created_at);
`);

module.exports = db;
