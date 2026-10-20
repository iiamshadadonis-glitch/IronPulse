-- IronPulse Gym V1.26
-- Additive plan-frequency and first-payment/renewal accounting fields.
-- NULL billing_interval preserves every plan created before this release.

ALTER TABLE products
  ADD COLUMN billing_interval INTEGER;

ALTER TABLE order_items
  ADD COLUMN first_payment_amount_paise INTEGER NOT NULL DEFAULT 0;

ALTER TABLE order_items
  ADD COLUMN recurring_unit_amount_paise INTEGER NOT NULL DEFAULT 0;

ALTER TABLE order_items
  ADD COLUMN coupon_recurring_scope TEXT NOT NULL DEFAULT '';

PRAGMA optimize;
