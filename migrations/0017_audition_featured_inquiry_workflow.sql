-- V15.3 additive fields/workflow. Existing records and theme data are preserved.
ALTER TABLE blog_posts ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0;

-- New contact-form enquiries start in New. Existing In Progress / Resolved rows are preserved.
UPDATE lead_submissions
SET status='new', updated_at=COALESCE(updated_at,created_at,CURRENT_TIMESTAMP)
WHERE submission_type='contact' AND lower(COALESCE(status,'recorded'))='recorded';

CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(is_featured,status,published_at);

-- Posts imported from the publishing service are not advertisements by default.
UPDATE blog_posts SET auto_ads_enabled=0, ads_json=COALESCE(ads_json,'[]') WHERE blogger_post_id IS NOT NULL AND (ads_json IS NULL OR trim(ads_json)='');
