-- V16.92: additive marketing orchestration, aggregate heat maps, and webinar scheduling.
-- Existing business, analytics, notification, and integration records are unchanged.
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'google_ads',
  campaign_type TEXT NOT NULL DEFAULT 'search',
  objective TEXT NOT NULL DEFAULT 'conversions',
  status TEXT NOT NULL DEFAULT 'draft',
  daily_budget_paise INTEGER NOT NULL DEFAULT 0,
  landing_url TEXT NOT NULL DEFAULT '',
  headline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  platform_campaign_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS marketing_funnels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  frequency_cap INTEGER NOT NULL DEFAULT 3,
  window_days INTEGER NOT NULL DEFAULT 7,
  exclude_purchasers INTEGER NOT NULL DEFAULT 1,
  stages_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS marketing_visitor_stage (
  visitor_id TEXT PRIMARY KEY,
  funnel_id INTEGER,
  stage_no INTEGER NOT NULL DEFAULT 1,
  last_event TEXT NOT NULL DEFAULT 'page_view',
  source TEXT NOT NULL DEFAULT 'Direct / unknown',
  purchased INTEGER NOT NULL DEFAULT 0,
  last_advanced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS marketing_daily_metrics (
  day TEXT NOT NULL,
  channel TEXT NOT NULL,
  campaign_id INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  spend_paise INTEGER NOT NULL DEFAULT 0,
  revenue_paise INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,channel,campaign_id)
);
CREATE TABLE IF NOT EXISTS heatmap_daily_cells (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  device TEXT NOT NULL,
  map_type TEXT NOT NULL,
  x_bucket INTEGER NOT NULL DEFAULT 0,
  y_bucket INTEGER NOT NULL DEFAULT 0,
  element_key TEXT NOT NULL DEFAULT '',
  event_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,path,device,map_type,x_bucket,y_bucket,element_key)
);
CREATE TABLE IF NOT EXISTS webinar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'demo',
  delivery_mode TEXT NOT NULL DEFAULT 'online',
  provider TEXT NOT NULL DEFAULT 'google_meet',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  meeting_url TEXT NOT NULL DEFAULT '',
  external_event_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled',
  reminder_plan_json TEXT NOT NULL DEFAULT '[]',
  contact_phone TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS webinar_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webinar_id INTEGER NOT NULL,
  channel TEXT NOT NULL,
  send_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TEXT,
  error_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(webinar_id,channel,send_at),
  FOREIGN KEY(webinar_id) REFERENCES webinar_events(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_marketing_metrics_day ON marketing_daily_metrics(day,channel);
CREATE INDEX IF NOT EXISTS idx_heatmap_day_path_device ON heatmap_daily_cells(day,path,device,map_type);
CREATE INDEX IF NOT EXISTS idx_webinar_starts_status ON webinar_events(starts_at,status);
CREATE INDEX IF NOT EXISTS idx_webinar_reminders_due ON webinar_reminders(status,send_at);
PRAGMA optimize;
