-- IronPulse Gym V1.19
-- Additive studio schedule controls for coach leave and studio holidays.
-- Existing class mappings, memberships, attendance and brand settings remain
-- authoritative; these records only block or annotate affected occurrences.

CREATE TABLE IF NOT EXISTS coach_leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  coach_id INTEGER NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'planned'
    CHECK(leave_type IN ('planned','unplanned')),
  purpose TEXT NOT NULL DEFAULT '',
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','approved','denied','cancelled')),
  admin_reason TEXT NOT NULL DEFAULT '',
  suggested_date TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT NOT NULL DEFAULT '',
  reviewed_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY(coach_id) REFERENCES dance_coaches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS studio_holidays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  image_file_id TEXT NOT NULL DEFAULT '',
  notice_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','cancelled')),
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS studio_holiday_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  holiday_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email'
    CHECK(channel IN ('email','portal')),
  destination TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','sent','failed','cancelled')),
  error_text TEXT NOT NULL DEFAULT '',
  sent_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(holiday_id, account_id, channel),
  FOREIGN KEY(holiday_id) REFERENCES studio_holidays(id) ON DELETE CASCADE,
  FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_coach_leave_status_dates
  ON coach_leave_requests(status,from_date,to_date,coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_leave_account
  ON coach_leave_requests(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_holidays_dates
  ON studio_holidays(status,start_date,end_date,notice_date);
CREATE INDEX IF NOT EXISTS idx_holiday_delivery_due
  ON studio_holiday_deliveries(status,channel,holiday_id,account_id);

PRAGMA optimize;
