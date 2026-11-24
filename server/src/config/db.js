// Single SQLite file acting as the whole database - zero setup, no external DB server
// needed. Matches the relational shape already defined in the group's OpenAPI spec
// (users, laboratories, reports, status_updates).
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'database.sqlite');

const db = new Database(dbPath);

// Required for ON DELETE CASCADE / RESTRICT below to actually be enforced.
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- No ON DELETE CASCADE here on purpose: deleting a laboratory that still has
  -- reports referencing it must fail (409 Conflict), per the API design.
  CREATE TABLE IF NOT EXISTS laboratories (
    laboratory_code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    building TEXT NOT NULL,
    floor INTEGER
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    laboratory_code TEXT NOT NULL REFERENCES laboratories(laboratory_code),
    waste_type TEXT NOT NULL CHECK (
      waste_type IN ('pc_monitor', 'air_conditioner', 'lights_fans', 'other_electronics', 'other')
    ),
    description TEXT NOT NULL,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'resolved')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- Cascades on purpose: deleting a report must permanently delete its history too.
  CREATE TABLE IF NOT EXISTS status_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    admin_id INTEGER NOT NULL REFERENCES users(id),
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`);

module.exports = db;
