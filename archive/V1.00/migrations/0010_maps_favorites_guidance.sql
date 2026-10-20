-- Additive V6 fields for Favorites and Google review caching.
ALTER TABLE contact_leads ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_contact_leads_favorite ON contact_leads(is_favorite);
CREATE TABLE IF NOT EXISTS google_review_cache (
  cache_key TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'places',
  reviews_json TEXT NOT NULL DEFAULT '[]',
  business_name TEXT,
  average_rating REAL,
  total_review_count INTEGER NOT NULL DEFAULT 0,
  maps_url TEXT,
  fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
