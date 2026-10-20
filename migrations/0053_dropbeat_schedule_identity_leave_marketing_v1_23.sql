-- IronPulse Gym V1.23
-- Additive per-coach leave-rule overrides. Existing remuneration, attendance,
-- payment, class, branding and theme records remain authoritative.

CREATE TABLE IF NOT EXISTS coach_leave_rule_overrides (
  coach_id INTEGER PRIMARY KEY,
  rule_mode TEXT NOT NULL DEFAULT 'inherit'
    CHECK(rule_mode IN ('inherit','custom','disabled')),
  paid_leaves_per_month INTEGER NOT NULL DEFAULT 0,
  deduction_method TEXT NOT NULL DEFAULT 'per_session'
    CHECK(deduction_method IN ('per_session','per_day','percentage')),
  deduction_percent REAL NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(coach_id) REFERENCES dance_coaches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_coach_leave_rule_mode
  ON coach_leave_rule_overrides(rule_mode,coach_id);

PRAGMA optimize;
