-- Additive social-media webhook audit table. Existing CRM tables remain unchanged.
CREATE TABLE IF NOT EXISTS social_webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  external_lead_id TEXT,
  lead_id INTEGER,
  event_type TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'received',
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, external_event_id),
  FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_social_webhook_events_status ON social_webhook_events(platform,status,created_at);
CREATE INDEX IF NOT EXISTS idx_social_webhook_events_lead ON social_webhook_events(lead_id,created_at);
