-- DropBeat Dance Studio V1.04
-- Additive image management for the home-page DropBeat Studio welcome panel.
CREATE TABLE IF NOT EXISTS studio_gallery_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url TEXT NOT NULL,
  object_key TEXT,
  alt_text TEXT NOT NULL DEFAULT 'DropBeat Studio dance class',
  visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_studio_gallery_visible_sort
  ON studio_gallery_images(visible, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_success_stories_status_sort
  ON success_stories(status, sort_order, id);
