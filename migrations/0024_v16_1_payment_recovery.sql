-- V16.1 — repair the V16.0 schema marker regression and keep tax receipt fields additive.
-- The runtime ensureSchema() also applies these changes automatically.
-- Migration 0023 already applies these exact columns in a clean sequential
-- migration run. Keep this release marker without attempting duplicate ALTERs.
SELECT 1;
