-- V16.76: conservative background-read circuit breaker and indexed lead lookups.
-- The counter protects app-controlled background work. Normal foreground requests
-- retain at least 750k rows of headroom below the 2m daily design ceiling.
CREATE TABLE IF NOT EXISTS d1_background_read_budget (
  day_key TEXT PRIMARY KEY,
  estimated_rows INTEGER NOT NULL DEFAULT 0,
  soft_limit INTEGER NOT NULL DEFAULT 750000,
  hard_limit INTEGER NOT NULL DEFAULT 1250000,
  hard_paused INTEGER NOT NULL DEFAULT 0,
  last_operation TEXT NOT NULL DEFAULT '',
  last_reserved_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_leads_status_id
  ON contact_leads(status, id DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email_nocase
  ON orders(customer_email COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone
  ON orders(customer_phone);
