-- V16.75: provider-hosted inbox documents, comment-triggered DMs,
-- lead nurturing schedules and optional native social polls.
ALTER TABLE social_posts ADD COLUMN poll_json TEXT NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS lead_identity_links (
  platform TEXT NOT NULL,
  external_id TEXT NOT NULL,
  lead_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(platform, external_id),
  FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_lead_identity_links_lead ON lead_identity_links(lead_id);

CREATE TABLE IF NOT EXISTS lead_nurture_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0,
  source_filter_json TEXT NOT NULL DEFAULT '[]',
  stop_on_purchase INTEGER NOT NULL DEFAULT 1,
  repeat_enabled INTEGER NOT NULL DEFAULT 1,
  repeat_interval_minutes INTEGER NOT NULL DEFAULT 1440,
  steps_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_nurture_enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flow_id INTEGER NOT NULL,
  lead_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  next_step_index INTEGER NOT NULL DEFAULT 0,
  cycle_no INTEGER NOT NULL DEFAULT 0,
  next_run_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(flow_id, lead_id),
  FOREIGN KEY(flow_id) REFERENCES lead_nurture_flows(id) ON DELETE CASCADE,
  FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_lead_nurture_due ON lead_nurture_enrollments(status,next_run_at,id);

CREATE TABLE IF NOT EXISTS lead_nurture_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER NOT NULL,
  flow_id INTEGER NOT NULL,
  lead_id INTEGER NOT NULL,
  step_index INTEGER NOT NULL DEFAULT 0,
  cycle_no INTEGER NOT NULL DEFAULT 0,
  channel TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  provider_id TEXT NOT NULL DEFAULT '',
  error_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(enrollment_id, step_index, cycle_no),
  FOREIGN KEY(enrollment_id) REFERENCES lead_nurture_enrollments(id) ON DELETE CASCADE
);
