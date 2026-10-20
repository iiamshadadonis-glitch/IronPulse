-- DropBeat Dance Studio V1.22
-- Additive account recovery, class-change acknowledgement, per-occurrence
-- meeting ownership and coach remuneration records. Existing class, payment,
-- attendance, branding and theme records remain authoritative.

CREATE TABLE IF NOT EXISTS portal_login_otp_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_kind TEXT NOT NULL DEFAULT 'portal'
    CHECK(account_kind IN ('portal','admin')),
  account_id INTEGER NOT NULL DEFAULT 0,
  purpose TEXT NOT NULL
    CHECK(purpose IN ('login','password_reset','email_change','phone_change')),
  channel TEXT NOT NULL DEFAULT 'email'
    CHECK(channel IN ('email','whatsapp')),
  destination TEXT NOT NULL DEFAULT '',
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  consumed_at TEXT NOT NULL DEFAULT '',
  verified_token_hash TEXT NOT NULL DEFAULT '',
  verified_token_expires_at TEXT NOT NULL DEFAULT '',
  pending_value TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS studio_class_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL CHECK(source_type IN ('product','assignment')),
  source_id INTEGER NOT NULL,
  change_type TEXT NOT NULL
    CHECK(change_type IN ('coach','schedule','coach_and_schedule','cancel')),
  old_coach_id INTEGER NOT NULL DEFAULT 0,
  new_coach_id INTEGER NOT NULL DEFAULT 0,
  old_class_time TEXT NOT NULL DEFAULT '',
  new_class_time TEXT NOT NULL DEFAULT '',
  old_duration_minutes INTEGER NOT NULL DEFAULT 0,
  new_duration_minutes INTEGER NOT NULL DEFAULT 0,
  old_class_days_json TEXT NOT NULL DEFAULT '[]',
  new_class_days_json TEXT NOT NULL DEFAULT '[]',
  effective_start_date TEXT NOT NULL,
  effective_end_date TEXT NOT NULL DEFAULT '',
  migrate_students INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK(status IN ('scheduled','active','completed','cancelled')),
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS studio_class_change_acceptances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  change_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL DEFAULT 0,
  accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(change_id,account_id),
  FOREIGN KEY(change_id) REFERENCES studio_class_changes(id) ON DELETE CASCADE,
  FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS class_session_meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL CHECK(source_type IN ('product','assignment')),
  source_id INTEGER NOT NULL,
  session_date TEXT NOT NULL,
  coach_id INTEGER NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google_meet',
  starts_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  provider_event_id TEXT NOT NULL DEFAULT '',
  meeting_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK(status IN ('scheduled','started','ended','revoked','cancelled')),
  started_at TEXT NOT NULL DEFAULT '',
  ended_at TEXT NOT NULL DEFAULT '',
  revoked_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_type,source_id,session_date)
);

CREATE TABLE IF NOT EXISTS coach_remuneration_terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coach_id INTEGER NOT NULL UNIQUE,
  remuneration_type TEXT NOT NULL DEFAULT 'per_session'
    CHECK(remuneration_type IN ('per_session','per_day','per_week','per_month')),
  rate_paise INTEGER NOT NULL DEFAULT 0,
  expected_sessions_month INTEGER NOT NULL DEFAULT 0,
  expected_days_week INTEGER NOT NULL DEFAULT 0,
  monthly_base_paise INTEGER NOT NULL DEFAULT 0,
  effective_from TEXT NOT NULL DEFAULT '',
  effective_to TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','inactive')),
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(coach_id) REFERENCES dance_coaches(id) ON DELETE CASCADE
);

ALTER TABLE product_class_mappings ADD COLUMN meeting_provider TEXT NOT NULL DEFAULT 'google_meet';
ALTER TABLE order_class_assignments ADD COLUMN meeting_provider TEXT NOT NULL DEFAULT 'google_meet';
ALTER TABLE portal_coach_profiles ADD COLUMN remuneration_expectation_type TEXT NOT NULL DEFAULT '';
ALTER TABLE portal_coach_profiles ADD COLUMN remuneration_expectation_min_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE portal_coach_profiles ADD COLUMN remuneration_expectation_max_paise INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_portal_otp_destination
  ON portal_login_otp_challenges(destination,purpose,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_otp_expiry
  ON portal_login_otp_challenges(expires_at,consumed_at);
CREATE INDEX IF NOT EXISTS idx_class_changes_source_dates
  ON studio_class_changes(source_type,source_id,effective_start_date,effective_end_date,status);
CREATE INDEX IF NOT EXISTS idx_class_change_acceptance_account
  ON studio_class_change_acceptances(account_id,accepted_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_meeting_coach_date
  ON class_session_meetings(coach_id,session_date,status);
CREATE INDEX IF NOT EXISTS idx_remuneration_status
  ON coach_remuneration_terms(status,coach_id);

PRAGMA optimize;
