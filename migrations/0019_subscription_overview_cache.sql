-- V15.5 dashboard-only cache for faster Subscription Overview rendering.
-- It does not alter checkout, billing, orders, refunds, Blogger/SEO posts or comments.
CREATE TABLE IF NOT EXISTS subscription_overview_cache (
  gateway TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '',
  created_at_epoch INTEGER NOT NULL DEFAULT 0,
  ended_at_epoch INTEGER NOT NULL DEFAULT 0,
  charge_at_epoch INTEGER NOT NULL DEFAULT 0,
  row_json TEXT NOT NULL DEFAULT '{}',
  refresh_token TEXT NOT NULL DEFAULT '',
  last_refreshed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(gateway, subscription_id)
);
CREATE INDEX IF NOT EXISTS idx_subscription_overview_cache_status ON subscription_overview_cache(gateway,status,created_at_epoch);
CREATE INDEX IF NOT EXISTS idx_subscription_overview_cache_charge ON subscription_overview_cache(gateway,charge_at_epoch);

CREATE TABLE IF NOT EXISTS subscription_overview_activity_cache (
  activity_key TEXT PRIMARY KEY,
  gateway TEXT NOT NULL,
  subscription_id TEXT NOT NULL DEFAULT '',
  activity_type TEXT NOT NULL,
  event_date TEXT NOT NULL,
  event_epoch INTEGER NOT NULL DEFAULT 0,
  row_json TEXT NOT NULL DEFAULT '{}',
  last_refreshed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_subscription_overview_activity_range ON subscription_overview_activity_cache(gateway,activity_type,event_date);
