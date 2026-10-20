-- V7 additive About Us cover image support.
ALTER TABLE content_pages ADD COLUMN cover_image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE content_pages ADD COLUMN cover_image_alt TEXT NOT NULL DEFAULT '';
