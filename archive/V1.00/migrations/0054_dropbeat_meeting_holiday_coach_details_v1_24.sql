-- DropBeat Dance Studio V1.24
-- Additive holiday-audience delivery records and the coach's last-payment date.
-- Existing meetings, classes, accounts, remuneration terms and theme settings
-- remain authoritative and are not replaced.

CREATE TABLE IF NOT EXISTS studio_holiday_audience_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  holiday_id INTEGER NOT NULL,
  recipient_key TEXT NOT NULL,
  recipient_name TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'lead',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','sent','failed','cancelled')),
  error_text TEXT NOT NULL DEFAULT '',
  sent_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(holiday_id,recipient_key),
  FOREIGN KEY(holiday_id) REFERENCES studio_holidays(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_holiday_audience_due
  ON studio_holiday_audience_deliveries(status,holiday_id,recipient_key);

ALTER TABLE coach_remuneration_terms
  ADD COLUMN last_payment_date TEXT NOT NULL DEFAULT '';

PRAGMA optimize;
