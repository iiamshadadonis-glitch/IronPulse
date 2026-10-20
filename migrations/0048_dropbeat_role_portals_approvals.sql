-- IronPulse Gym V1.14
-- Additive student/coach accounts, approvals, personal dashboard settings,
-- notifications and OAuth state. Existing admin, payment and class tables
-- remain authoritative and are linked by email / coach identifiers.

CREATE TABLE IF NOT EXISTS portal_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK(role IN ('student','coach')),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  username TEXT COLLATE NOCASE UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  real_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL DEFAULT '',
  password_salt TEXT NOT NULL DEFAULT '',
  password_iterations INTEGER NOT NULL DEFAULT 100000,
  requires_password_setup INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','past','rejected')),
  approval_source TEXT NOT NULL DEFAULT 'admin_review',
  profile_photo_url TEXT NOT NULL DEFAULT '',
  profile_photo_object_key TEXT NOT NULL DEFAULT '',
  theme_primary TEXT NOT NULL DEFAULT '',
  theme_accent TEXT NOT NULL DEFAULT '',
  google_sub TEXT NOT NULL DEFAULT '',
  google_email TEXT NOT NULL DEFAULT '',
  google_picture TEXT NOT NULL DEFAULT '',
  google_connected_at TEXT NOT NULL DEFAULT '',
  meet_notice_seen INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT NOT NULL DEFAULT '',
  approved_at TEXT NOT NULL DEFAULT '',
  approved_by TEXT NOT NULL DEFAULT '',
  removed_at TEXT NOT NULL DEFAULT '',
  removed_reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_coach_profiles (
  account_id INTEGER PRIMARY KEY,
  dance_coach_id INTEGER,
  designation TEXT NOT NULL DEFAULT 'Dance Coach',
  badge TEXT NOT NULL DEFAULT 'Coach',
  bio TEXT NOT NULL DEFAULT '',
  experience TEXT NOT NULL DEFAULT '',
  specialties_json TEXT NOT NULL DEFAULT '[]',
  availability_days_json TEXT NOT NULL DEFAULT '[]',
  availability_slots_json TEXT NOT NULL DEFAULT '[]',
  class_types_json TEXT NOT NULL DEFAULT '[]',
  instagram_url TEXT NOT NULL DEFAULT '',
  facebook_url TEXT NOT NULL DEFAULT '',
  application_status TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY(dance_coach_id) REFERENCES dance_coaches(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS portal_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'information',
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  effective_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  session_event_id INTEGER NOT NULL DEFAULT 0,
  read_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_oauth_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state_hash TEXT NOT NULL UNIQUE,
  intent TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  account_id INTEGER NOT NULL DEFAULT 0,
  admin_email TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  redirect_path TEXT NOT NULL DEFAULT '/login',
  expires_at TEXT NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_account_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_detail TEXT NOT NULL DEFAULT '',
  actor_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_coach_schedule_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  dance_coach_id INTEGER NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL DEFAULT 'product' CHECK(source_type IN ('product','assignment')),
  source_id INTEGER NOT NULL DEFAULT 0,
  request_type TEXT NOT NULL DEFAULT 'add' CHECK(request_type IN ('add','change','remove')),
  session_date TEXT NOT NULL,
  start_time TEXT NOT NULL DEFAULT '',
  end_time TEXT NOT NULL DEFAULT '',
  class_type TEXT NOT NULL DEFAULT 'online_class',
  class_name TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','denied','cancelled')),
  reviewed_by TEXT NOT NULL DEFAULT '',
  reviewed_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE
);

ALTER TABLE dance_coaches ADD COLUMN portal_account_id INTEGER;
ALTER TABLE dance_coaches ADD COLUMN contact_email TEXT NOT NULL DEFAULT '';
ALTER TABLE dance_coaches ADD COLUMN contact_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE dance_coaches ADD COLUMN instagram_url TEXT NOT NULL DEFAULT '';
ALTER TABLE dance_coaches ADD COLUMN facebook_url TEXT NOT NULL DEFAULT '';
ALTER TABLE dance_coaches ADD COLUMN experience TEXT NOT NULL DEFAULT '';
ALTER TABLE dance_coaches ADD COLUMN availability_slots_json TEXT NOT NULL DEFAULT '[]';

CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_accounts_google_sub
  ON portal_accounts(google_sub) WHERE trim(google_sub)<>'';
CREATE INDEX IF NOT EXISTS idx_portal_accounts_role_status
  ON portal_accounts(role,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_token_expiry
  ON portal_sessions(token_hash,expires_at);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_account
  ON portal_notifications(account_id,read_at,effective_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_oauth_state_expiry
  ON portal_oauth_states(state_hash,consumed,expires_at);
CREATE INDEX IF NOT EXISTS idx_portal_coach_lifecycle
  ON portal_coach_profiles(application_status,dance_coach_id,account_id);
CREATE INDEX IF NOT EXISTS idx_portal_coach_schedule_requests
  ON portal_coach_schedule_requests(status,session_date,account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dance_coaches_portal_account
  ON dance_coaches(portal_account_id) WHERE portal_account_id IS NOT NULL;

PRAGMA optimize;
