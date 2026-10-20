-- Final polish add-on: editable pages, FAQs, visitor-linked leads, and email notice flag.
CREATE TABLE IF NOT EXISTS content_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS faq_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer_text TEXT,
  answer_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE contact_leads ADD COLUMN visitor_id TEXT;
ALTER TABLE contact_leads ADD COLUMN source_detail TEXT;
ALTER TABLE orders ADD COLUMN email_notice_sent INTEGER NOT NULL DEFAULT 0;
