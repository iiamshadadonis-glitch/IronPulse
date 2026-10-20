-- V15.7: complete Audition rescan generation, scheduled posts, D1-only Deleted archive,
-- and user-facing Article Comment terminology.
ALTER TABLE audition_post_cache ADD COLUMN sync_generation INTEGER NOT NULL DEFAULT 0;
ALTER TABLE audition_sync_state ADD COLUMN scheduled_complete INTEGER NOT NULL DEFAULT 0;
ALTER TABLE audition_sync_state ADD COLUMN scheduled_page_token TEXT NOT NULL DEFAULT '';
ALTER TABLE audition_sync_state ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE audition_sync_state ADD COLUMN sync_generation INTEGER NOT NULL DEFAULT 0;

UPDATE contact_leads SET source='article_comment' WHERE lower(COALESCE(source,''))='blog_comment';
UPDATE contact_leads SET message=replace(message,'Blog comment on ','Comment on fitness tip ') WHERE message LIKE 'Blog comment on %';
UPDATE lead_submissions SET source_detail='article_comment' WHERE lower(COALESCE(source_detail,''))='blog_comment';
UPDATE lead_submissions SET message=replace(message,'Blog comment on ','Comment on fitness tip ') WHERE message LIKE 'Blog comment on %';
UPDATE lead_submissions SET status='new',updated_at=COALESCE(updated_at,created_at,CURRENT_TIMESTAMP)
WHERE submission_type='comment' AND lower(COALESCE(status,'recorded'))='recorded';
