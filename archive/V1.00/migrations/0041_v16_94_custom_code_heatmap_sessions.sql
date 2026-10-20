-- V16.94 reference migration. The application also creates these tables and indexes
-- automatically on first use, so non-technical replacement deployments do not need
-- a separate `npm run d1:migrate:remote` step.
CREATE TABLE IF NOT EXISTS heatmap_daily_sessions (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  device TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  max_scroll INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(day,path,device,session_id)
);
CREATE INDEX IF NOT EXISTS idx_heatmap_sessions_filter ON heatmap_daily_sessions(day,path,device);

CREATE TABLE IF NOT EXISTS custom_code_snippets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'head',
  scope TEXT NOT NULL DEFAULT 'all',
  pages_json TEXT NOT NULL DEFAULT '[]',
  consent_category TEXT NOT NULL DEFAULT 'analytics',
  enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_custom_code_enabled ON custom_code_snippets(enabled,placement);
