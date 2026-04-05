const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
const localDbPath = process.env.LOCAL_DB_PATH || path.join(dataDir, 'survey.db');
const isTurso = Boolean(process.env.TURSO_DATABASE_URL);

let db;
let initPromise;

if (isTurso) {
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

function getDbRuntimeInfo() {
  return {
    provider: isTurso ? 'turso' : 'sqlite',
    remote: isTurso,
    driver: '@libsql/client',
  };
}

async function checkDbConnection() {
  const startedAt = Date.now();
  const result = await db.execute('SELECT 1 AS ok');

  return {
    ...getDbRuntimeInfo(),
    healthy: Number(result.rows[0]?.ok) === 1,
    latencyMs: Date.now() - startedAt,
    checkedAt: new Date().toISOString(),
  };
}

module.exports = { db, initDb, getDbRuntimeInfo, checkDbConnection };
