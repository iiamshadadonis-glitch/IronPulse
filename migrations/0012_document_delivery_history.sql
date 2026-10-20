-- V10: additive invoice / statement delivery history.
CREATE TABLE IF NOT EXISTS client_document_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER,
  document_type TEXT NOT NULL DEFAULT 'invoice',
  document_number TEXT,
  document_date TEXT,
  period_from TEXT,
  period_to TEXT,
  delivery_channel TEXT NOT NULL DEFAULT 'download',
  recipient TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'sent',
  provider TEXT,
  provider_reference TEXT,
  amount_paise INTEGER NOT NULL DEFAULT 0,
  transaction_reference TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_client_document_history_lead_type ON client_document_history(lead_id, document_type, created_at DESC);
