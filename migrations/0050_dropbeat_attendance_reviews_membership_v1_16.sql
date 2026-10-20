-- DropBeat Dance Studio V1.16
-- Additive attendance and private session-review records. Existing class,
-- payment, portal and meeting tables remain authoritative.

CREATE TABLE IF NOT EXISTS portal_session_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT NOT NULL,
  session_date TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('product','assignment')),
  source_id INTEGER NOT NULL,
  participant_role TEXT NOT NULL CHECK(participant_role IN ('student','coach')),
  participant_key TEXT NOT NULL,
  account_id INTEGER NOT NULL DEFAULT 0,
  member_id INTEGER NOT NULL DEFAULT 0,
  coach_id INTEGER NOT NULL DEFAULT 0,
  class_name TEXT NOT NULL DEFAULT '',
  coach_name TEXT NOT NULL DEFAULT '',
  class_type TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'present' CHECK(status IN ('present','absent','late','excused')),
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  marked_by TEXT NOT NULL DEFAULT 'session_access',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_key,participant_role,participant_key)
);

CREATE TABLE IF NOT EXISTS portal_session_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT NOT NULL,
  session_date TEXT NOT NULL,
  student_account_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL DEFAULT 0,
  coach_id INTEGER NOT NULL DEFAULT 0,
  rating INTEGER NOT NULL DEFAULT 0 CHECK(rating BETWEEN 0 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_key,student_account_id),
  FOREIGN KEY(student_account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_attendance_date
  ON portal_session_attendance(session_date,participant_role,coach_id,source_type,source_id);
CREATE INDEX IF NOT EXISTS idx_portal_attendance_account
  ON portal_session_attendance(account_id,session_date DESC);
CREATE INDEX IF NOT EXISTS idx_portal_reviews_coach
  ON portal_session_reviews(coach_id,session_date DESC);
CREATE INDEX IF NOT EXISTS idx_portal_reviews_session
  ON portal_session_reviews(session_key,student_account_id);

PRAGMA optimize;
