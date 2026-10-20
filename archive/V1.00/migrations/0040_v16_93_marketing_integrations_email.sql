-- V16.93: real email-marketing campaign records.
-- Existing marketing, webinar and D1 safeguard tables remain unchanged.
CREATE TABLE IF NOT EXISTS marketing_email_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT NOT NULL DEFAULT '',
  audience_id TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT '',
  reply_to TEXT NOT NULL DEFAULT '',
  html_content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'workspace_draft',
  provider_campaign_id TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_marketing_email_status_updated
  ON marketing_email_campaigns(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_heatmap_path
  ON heatmap_daily_cells(path);
