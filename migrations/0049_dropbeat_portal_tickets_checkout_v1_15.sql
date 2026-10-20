-- IronPulse Gym V1.15
-- Runtime-compatible portal credentials, mandatory first-payment password setup,
-- and authenticated student/coach support tickets. The additive
-- requires_password_setup field is present in the complete 0048 schema and is
-- also self-healed by the application for databases where 0048 was applied by
-- an earlier release. Keeping 0049 free of an unconditional ALTER makes this
-- migration safe even when that runtime repair happened before deployment.

CREATE TABLE IF NOT EXISTS portal_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL UNIQUE,
  account_id INTEGER NOT NULL,
  account_role TEXT NOT NULL CHECK(account_role IN ('student','coach')),
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
  admin_reply TEXT NOT NULL DEFAULT '',
  assigned_to TEXT NOT NULL DEFAULT '',
  resolved_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_tickets_account
  ON portal_tickets(account_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_tickets_status
  ON portal_tickets(status,priority,updated_at DESC);

PRAGMA optimize;
