-- Unified Client CRM additions are applied idempotently by functions/_lib/schema.js.
-- This migration is intentionally a no-op marker so a later manual Wrangler
-- migration cannot fail with duplicate-column errors after the automatic schema
-- upgrader has already run on the deployed site.
SELECT 1;
