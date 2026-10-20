-- IronPulse Gym V1.07
-- Additive class-plan mapping, coaches, recurring session overrides and
-- membership lifecycle notifications. Existing product/payment/webinar logic
-- remains authoritative and is only linked through foreign keys/identifiers.

CREATE TABLE IF NOT EXISTS dance_coaches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  designation TEXT NOT NULL DEFAULT 'Dance Coach',
  badge TEXT NOT NULL DEFAULT 'Coach',
  bio TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL DEFAULT '',
  photo_object_key TEXT NOT NULL DEFAULT '',
  dance_styles_json TEXT NOT NULL DEFAULT '[]',
  availability_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_class_mappings (
  product_id INTEGER PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
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
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY(coach_id) REFERENCES dance_coaches(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS class_session_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mapping_id INTEGER NOT NULL,
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
  UNIQUE(mapping_id, session_date),
  FOREIGN KEY(mapping_id) REFERENCES product_class_mappings(product_id) ON DELETE CASCADE,
  FOREIGN KEY(coach_id) REFERENCES dance_coaches(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS class_member_status_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_key TEXT NOT NULL UNIQUE,
  member_id INTEGER NOT NULL,
  event_type TEXT NOT NULL DEFAULT '',
  old_status TEXT NOT NULL DEFAULT '',
  new_status TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  order_reference TEXT NOT NULL DEFAULT '',
  read_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL DEFAULT 'session_override',
  source_id TEXT NOT NULL DEFAULT '',
  member_id INTEGER NOT NULL DEFAULT 0,
  channel TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  error_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- These two operational tables were historically self-created by the webinar
-- module. Defining their pre-V1.07 shape here makes a clean migration-only
-- installation deterministic before the additive columns below are applied.
CREATE TABLE IF NOT EXISTS webinar_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL DEFAULT 'demo',
  lead_id INTEGER NOT NULL DEFAULT 0,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  class_time TEXT NOT NULL DEFAULT '',
  fees_paid_paise INTEGER NOT NULL DEFAULT 0,
  last_attendance_at TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'current',
  source_event_id INTEGER NOT NULL DEFAULT 0,
  last_payment_at TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  days_per_week INTEGER NOT NULL DEFAULT 1,
  class_days_json TEXT NOT NULL DEFAULT '[]',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  reminder_plan_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  trial_end_at TEXT NOT NULL DEFAULT '',
  plan_name TEXT NOT NULL DEFAULT '',
  membership_reason TEXT NOT NULL DEFAULT '',
  moved_to_past_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webinar_member_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  channel TEXT NOT NULL,
  send_at TEXT NOT NULL,
  minutes_before INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TEXT,
  error_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id,channel,send_at),
  FOREIGN KEY(member_id) REFERENCES webinar_members(id) ON DELETE CASCADE
);

ALTER TABLE webinar_events ADD COLUMN product_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE webinar_events ADD COLUMN coach_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE webinar_events ADD COLUMN status_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE webinar_events ADD COLUMN original_starts_at TEXT NOT NULL DEFAULT '';

ALTER TABLE webinar_members ADD COLUMN product_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE webinar_members ADD COLUMN coach_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE webinar_members ADD COLUMN order_reference TEXT NOT NULL DEFAULT '';
ALTER TABLE webinar_members ADD COLUMN dance_styles_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE webinar_members ADD COLUMN payment_status TEXT NOT NULL DEFAULT '';
ALTER TABLE webinar_members ADD COLUMN enrollment_source TEXT NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_dance_coaches_status_sort ON dance_coaches(status,sort_order,id);
CREATE INDEX IF NOT EXISTS idx_product_class_type ON product_class_mappings(enabled,event_type,status);
CREATE INDEX IF NOT EXISTS idx_session_override_date ON class_session_overrides(session_date,status,mapping_id);
CREATE INDEX IF NOT EXISTS idx_class_status_unread ON class_member_status_events(event_type,new_status,read_at,created_at);
CREATE INDEX IF NOT EXISTS idx_webinar_member_order_product ON webinar_members(order_reference,product_id,status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_webinar_member_unique_order_product
  ON webinar_members(order_reference,product_id)
  WHERE trim(order_reference)<>'' AND product_id>0;

PRAGMA optimize;
