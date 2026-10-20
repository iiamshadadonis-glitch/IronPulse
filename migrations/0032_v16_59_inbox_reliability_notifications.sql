-- V16.59: lightweight incremental Social Inbox sync cursor.
-- Existing DM rows and unique constraints are intentionally preserved.
CREATE TABLE IF NOT EXISTS social_dm_sync_state (
  platform TEXT PRIMARY KEY,
  started_at TEXT NOT NULL DEFAULT '',
  last_synced_at TEXT NOT NULL DEFAULT '',
  last_success_at TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
