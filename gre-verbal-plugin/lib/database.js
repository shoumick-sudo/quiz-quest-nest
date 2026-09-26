import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || "";
export const databaseEnabled = Boolean(connectionString);

let pool = null;
let schemaReady = false;

function getPool() {
  if (!databaseEnabled) return null;
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined
    });
  }
  return pool;
}

export async function ensureSchema() {
  if (!databaseEnabled || schemaReady) return;
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS gre_sessions (
      session_id TEXT PRIMARY KEY,
      section_json JSONB NOT NULL,
      responses_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      marked_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      submitted BOOLEAN NOT NULL DEFAULT FALSE,
      result_json JSONB,
      evaluation_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS gre_sessions_updated_idx ON gre_sessions(updated_at);
  `);
  schemaReady = true;
}

export async function dbQuery(text, params = []) {
  await ensureSchema();
  return getPool().query(text, params);
}

export async function databaseHealth() {
  if (!databaseEnabled) return { enabled: false, ok: false };
  try {
    await ensureSchema();
    const r = await getPool().query("SELECT 1 AS ok");
    return { enabled: true, ok: r.rows?.[0]?.ok === 1 };
  } catch (error) {
    return { enabled: true, ok: false, error: error.message };
  }
}
