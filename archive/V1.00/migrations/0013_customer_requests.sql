-- V11: customer self-service requests (cancel/pause/restart/invoice/statement/support).
CREATE TABLE IF NOT EXISTS service_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  lead_id INTEGER,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  request_type TEXT NOT NULL,
  request_label TEXT NOT NULL,
  pause_months INTEGER,
  pause_until TEXT,
  statement_period TEXT,
  statement_from TEXT,
  statement_to TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'website',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_service_requests_status_created ON service_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_lead_created ON service_requests(lead_id, created_at DESC);
