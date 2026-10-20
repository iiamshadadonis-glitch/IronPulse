-- V16.0 — global payment charge settings and durable tax snapshots.
ALTER TABLE orders ADD COLUMN tax_snapshot_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE order_items ADD COLUMN tax_snapshot_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE payment_receipts ADD COLUMN base_amount_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_receipts ADD COLUMN gst_amount_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_receipts ADD COLUMN service_charge_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_receipts ADD COLUMN other_tax_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_receipts ADD COLUMN tax_snapshot_json TEXT NOT NULL DEFAULT '{}';
