-- IronPulse Gym V1.08
-- Additive support for manual-payment class assignments, fixed/temporary
-- public batch dates, one-time access windows and safe coach replacement.

CREATE TABLE IF NOT EXISTS order_class_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL UNIQUE,
  order_reference TEXT NOT NULL UNIQUE,
  payment_mode TEXT NOT NULL DEFAULT 'subscription',
  enabled INTEGER NOT NULL DEFAULT 1,
  class_type TEXT NOT NULL DEFAULT 'online_class',
  event_type TEXT NOT NULL DEFAULT 'online_class',
  class_name TEXT NOT NULL DEFAULT '',
  coach_id INTEGER,
  dance_styles_json TEXT NOT NULL DEFAULT '[]',
  schedule_start_date TEXT NOT NULL DEFAULT '',
  start_mode TEXT NOT NULL DEFAULT 'purchase_date',
  class_time TEXT NOT NULL DEFAULT '10:00',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  days_per_week INTEGER NOT NULL DEFAULT 1,
  class_days_json TEXT NOT NULL DEFAULT '[]',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  delivery_mode TEXT NOT NULL DEFAULT 'online',
  location_or_link TEXT NOT NULL DEFAULT '',
  reminders_enabled INTEGER NOT NULL DEFAULT 0,
  reminder_plan_json TEXT NOT NULL DEFAULT '[]',
  access_start_date TEXT NOT NULL DEFAULT '',
  access_end_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(coach_id) REFERENCES dance_coaches(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS class_assignment_session_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL,
  session_date TEXT NOT NULL,
  starts_at TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  coach_id INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  reason TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  notify_channels_json TEXT NOT NULL DEFAULT '[]',
  notification_result_json TEXT NOT NULL DEFAULT '{}',
  notifications_sent_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(assignment_id, session_date),
  FOREIGN KEY(assignment_id) REFERENCES order_class_assignments(id) ON DELETE CASCADE,
  FOREIGN KEY(coach_id) REFERENCES dance_coaches(id) ON DELETE SET NULL
);

ALTER TABLE webinar_members ADD COLUMN class_assignment_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE webinar_members ADD COLUMN access_end_date TEXT NOT NULL DEFAULT '';
ALTER TABLE webinar_members ADD COLUMN payment_mode TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_order_class_assignment_workspace
  ON order_class_assignments(enabled,event_type,status,coach_id);
CREATE INDEX IF NOT EXISTS idx_assignment_override_date
  ON class_assignment_session_overrides(assignment_id,session_date,status);
CREATE INDEX IF NOT EXISTS idx_webinar_member_assignment
  ON webinar_members(class_assignment_id,status,coach_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_webinar_member_unique_order_assignment
  ON webinar_members(order_reference,class_assignment_id)
  WHERE trim(order_reference)<>'' AND class_assignment_id>0;

PRAGMA optimize;
