-- Lead CRM and refund touch-ups are also applied idempotently by
-- functions/_lib/schema.js. payment_mode is required by migration 0022 when a
-- completely empty D1 database is initialized only through Wrangler migrations.
ALTER TABLE orders ADD COLUMN payment_mode TEXT;
