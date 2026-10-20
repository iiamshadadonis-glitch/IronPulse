CREATE TABLE IF NOT EXISTS payment_recovery_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL DEFAULT '',
  failure_reason TEXT NOT NULL DEFAULT '',
  failure_reference TEXT NOT NULL DEFAULT '',
  attempt_amount_paise INTEGER NOT NULL DEFAULT 0,
  last_failure_fingerprint TEXT NOT NULL DEFAULT '',
  last_failure_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  immediate_sent_at TEXT NOT NULL DEFAULT '',
  reminder2_due_at TEXT NOT NULL DEFAULT '',
  reminder2_sent_at TEXT NOT NULL DEFAULT '',
  reminder3_due_at TEXT NOT NULL DEFAULT '',
  reminder3_sent_at TEXT NOT NULL DEFAULT '',
  reminder_level INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_recovery_due ON payment_recovery_emails(status,reminder2_due_at,reminder3_due_at);
