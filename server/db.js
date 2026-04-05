const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
const localDbPath = process.env.LOCAL_DB_PATH || path.join(dataDir, 'survey.db');

let db;
let initPromise;

if (process.env.TURSO_DATABASE_URL) {
  // Production: Turso cloud database
  db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
} else {
  // Local development: SQLite file
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  db = createClient({
    url: `file:${localDbPath}`,
  });
}

async function initDb() {
  if (!initPromise) {
    initPromise = (async () => {
      const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
      await db.execute(schema);
    })();
  }

  return initPromise;
}

module.exports = { db, initDb };
