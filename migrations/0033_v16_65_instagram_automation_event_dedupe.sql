-- V16.65: exactly-once automation event claims.
-- Runtime also creates this table automatically for installations where
-- migrations are not applied manually.
CREATE TABLE IF NOT EXISTS social_automation_events (
  channel TEXT NOT NULL,
  platform TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  participant_id TEXT NOT NULL DEFAULT '',
  event_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'claimed',
  flow_id INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(channel, platform, external_event_id)
);
CREATE INDEX IF NOT EXISTS idx_social_automation_events_updated
  ON social_automation_events(updated_at DESC, platform, channel);
