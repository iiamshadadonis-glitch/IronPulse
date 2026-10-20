import { withD1Retry } from './utils.js';

// Student Stories existed in several earlier database shapes. Keep this repair
// focused on one table so an unrelated legacy migration can never block saving
// a story from the admin panel.
const schemaPromises = new WeakMap();

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS success_stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'youtube',
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

const REQUIRED_COLUMNS = [
  ['title', 'TEXT'],
  ['url', "TEXT NOT NULL DEFAULT ''"],
  ['platform', "TEXT NOT NULL DEFAULT 'youtube'"],
  ['thumbnail_url', 'TEXT'],
  ['status', "TEXT NOT NULL DEFAULT 'active'"],
  ['sort_order', 'INTEGER NOT NULL DEFAULT 0'],
  ['created_at', 'TEXT'],
  ['updated_at', 'TEXT']
];

async function repair(env) {
  if (!env?.DB) throw new Error('Member Stories database is not configured.');
  await withD1Retry(() => env.DB.prepare(CREATE_TABLE).run());
  const info = await withD1Retry(() => env.DB.prepare('PRAGMA table_info(success_stories)').all());
  const columns = new Set((info?.results || []).map(column => String(column.name || '').toLowerCase()));
  if (!columns.has('id')) throw new Error('The existing Member Stories table has no id column.');
  for (const [name, definition] of REQUIRED_COLUMNS) {
    if (columns.has(name)) continue;
    await withD1Retry(() => env.DB.prepare(`ALTER TABLE success_stories ADD COLUMN ${name} ${definition}`).run());
  }
  await withD1Retry(() => env.DB.prepare(
    'CREATE INDEX IF NOT EXISTS idx_success_stories_status_sort ON success_stories(status,sort_order,id)'
  ).run());
}

export async function ensureSuccessStoriesSchema(env) {
  const db = env?.DB;
  if (!db || (typeof db !== 'object' && typeof db !== 'function')) {
    throw new Error('Member Stories database is not configured.');
  }
  let pending = schemaPromises.get(db);
  if (!pending) {
    pending = repair(env).catch(error => {
      schemaPromises.delete(db);
      throw error;
    });
    schemaPromises.set(db, pending);
  }
  return pending;
}
