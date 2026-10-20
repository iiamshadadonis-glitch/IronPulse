-- V15.9 — exact money-received ledger for trials, subscriptions and one-time payments.
CREATE TABLE IF NOT EXISTS payment_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gateway TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  order_id TEXT NOT NULL DEFAULT '',
  subscription_id TEXT NOT NULL DEFAULT '',
  amount_paise INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'paid',
  payment_kind TEXT NOT NULL DEFAULT 'payment',
  payment_method TEXT NOT NULL DEFAULT '',
  upi_id TEXT NOT NULL DEFAULT '',
  paid_at_epoch INTEGER NOT NULL DEFAULT 0,
  paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(gateway, transaction_id)
);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_order ON payment_receipts(order_id,paid_at_epoch);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_subscription ON payment_receipts(subscription_id,paid_at_epoch);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_paid_at ON payment_receipts(paid_at);

UPDATE orders
SET payment_status='authenticated', updated_at=CURRENT_TIMESTAMP
WHERE lower(COALESCE(status,''))='authenticated'
  AND lower(COALESCE(payment_mode,'subscription'))<>'one_time'
  AND EXISTS (
    SELECT 1 FROM order_items oi
    WHERE oi.order_id=orders.id AND COALESCE(oi.setup_amount_paise,0)>0
  );
