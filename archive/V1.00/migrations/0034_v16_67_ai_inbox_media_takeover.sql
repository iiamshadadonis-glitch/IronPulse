CREATE TABLE IF NOT EXISTS ai_integrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_type TEXT NOT NULL DEFAULT 'custom',
  display_name TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0,
  api_key TEXT NOT NULL DEFAULT '',
  base_url TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL DEFAULT '',
  custom_headers_json TEXT NOT NULL DEFAULT '{}',
  custom_body_json TEXT NOT NULL DEFAULT '{}',
  response_path TEXT NOT NULL DEFAULT '',
  is_builtin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_integrations_enabled ON ai_integrations(enabled,provider_type,id);
CREATE TABLE IF NOT EXISTS social_automation_controls (
  platform TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'automation',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(platform,participant_id)
);
