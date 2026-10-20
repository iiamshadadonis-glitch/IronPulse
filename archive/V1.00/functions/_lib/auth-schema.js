import { withD1Retry } from './utils.js';

let authReadyInThisIsolate = false;
const AUTH_SCHEMA_KEY = 'auth_schema_ready';
const AUTH_SCHEMA_VERSION = 'v16.71';

// V16.70: admin authentication must not depend on the full application schema
// repair pass. Login/me/logout/password/security only need these small tables.
// Keeping this bootstrap separate prevents an unrelated optional table/index
// migration from making the Admin login screen unusable.
export async function ensureAuthSchema(env) {
  if (!env?.DB) throw new Error('Admin database binding (DB) is not available.');
  if (authReadyInThisIsolate) return;

  // The tables already exist on established deployments. A one-row persistent
  // marker prevents CREATE/INDEX maintenance from running again in every new
  // Worker isolate.
  try {
    const marker = await withD1Retry(() => env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(AUTH_SCHEMA_KEY).first(), 1);
    if (String(marker?.value || '') === AUTH_SCHEMA_VERSION) {
      authReadyInThisIsolate = true;
      return;
    }
  } catch (_) {}

  const statements = [
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS admin_email_change_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_user_id INTEGER NOT NULL,
      new_email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_expiry ON admin_sessions(token_hash,expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_admin_email_change_user ON admin_email_change_requests(admin_user_id,consumed,expires_at)`
  ];

  for (const sql of statements) {
    await withD1Retry(() => env.DB.prepare(sql).run());
  }
  await withD1Retry(() => env.DB.prepare(`INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).bind(AUTH_SCHEMA_KEY, AUTH_SCHEMA_VERSION).run(), 1);
  authReadyInThisIsolate = true;
}
