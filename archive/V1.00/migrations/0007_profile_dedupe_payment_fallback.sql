-- Submit Profile, unified identity alternatives, and submission-history add-on.
-- The deployed Functions schema upgrader applies these changes idempotently.
-- This migration remains a no-op marker so Wrangler migrations are safe even
-- when the automatic schema upgrader has already created the columns/tables.
SELECT 1;
