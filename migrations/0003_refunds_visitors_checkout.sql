CREATE TABLE IF NOT EXISTS refund_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT,
  provider TEXT,
  payment_id TEXT,
  refund_id TEXT,
  amount_paise INTEGER NOT NULL DEFAULT 0,
  customer_name TEXT,
  customer_phone TEXT,
  reason TEXT,
  mode TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  gateway_response_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- duration_ms is added safely by the runtime schema checker to avoid duplicate ALTER errors.
