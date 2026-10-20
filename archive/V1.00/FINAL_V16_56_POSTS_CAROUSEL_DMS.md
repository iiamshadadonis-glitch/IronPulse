# Urgent Casting V16.56 — Posts, Carousel & Unified DMs

V16.56 is an additive release on top of V16.55. Existing payment, Article, Comments, Integrations, Brand Settings and visual-theme behavior is retained.

## Posts UI

- Text, Image, Video, and Story / Status use a single **Publish** button.
- Scheduling is optional through a **Schedule Later** toggle. It is OFF by default; turning it ON reveals **Schedule Date & Time**.
- The existing V16.48 scheduler/publishing fields remain the source of truth underneath the compact control, preserving immediate and scheduled publishing behavior.
- Platform checkboxes are visually replaced by compact selectable platform pills. Multiple platforms and Select All remain supported. Selected pills use the current admin brand primary color.

## Carousel

A new **Carousel** tab sits between Image and Video and contains three independent dropdown composers:

1. Image Carousel
2. Video Carousel
3. Image + Video Carousel

Each composer has three upload positions by default, requires at least two uploaded items, supports Add More, has its own Help/Instructions view, capability-aware platform selection, Schedule Later toggle and Publish button.

Carousel media uploads go only to the connected **Google Drive → Carousel** folder. Instagram and Threads are exposed only when their connected publishing capability supports the selected carousel format.

## Unified DMs

The Social Media navigation order is:

**Article → Posts → DMs → Comments**

The DMs workspace combines supported connected inboxes into one interface with platform badges, participant identity/avatar, relative times, unread counts, folders such as requests/hidden when supplied by the platform, conversation view, View Profile where a safe profile URL is available, emoji replies and image attachments.

DM images are uploaded to **Google Drive → DM Attachments**. Facebook Messenger, Instagram professional-account messaging and X DMs are capability-aware. X OAuth now requests `dm.read` and `dm.write`. Native voice/video-call controls are intentionally hidden because the connected public APIs in this release do not expose starting those native calls from the admin panel.

## Database

`migrations/0031_v16_56_carousel_dms.sql` adds carousel media metadata to `social_posts` and creates the two DM tables plus their indexes. The API middleware continues to call `ensureSchema()` for API requests, and the schema helper also contains forward-compatible creation logic.
