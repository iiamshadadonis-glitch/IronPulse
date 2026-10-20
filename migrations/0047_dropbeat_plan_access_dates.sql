-- IronPulse Gym V1.11
-- Additive one-time access windows for catalog plans. Existing recurring-plan,
-- payment, order and class-assignment data is preserved.

ALTER TABLE product_class_mappings ADD COLUMN access_start_date TEXT NOT NULL DEFAULT '';
ALTER TABLE product_class_mappings ADD COLUMN access_end_date TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_product_class_access_window
  ON product_class_mappings(enabled,access_end_date,status);

PRAGMA optimize;
