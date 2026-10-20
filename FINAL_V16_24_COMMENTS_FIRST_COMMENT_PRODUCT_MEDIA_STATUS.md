# FINAL V16.24 — Comments workflow, optional social first comment, Instagram header layout, and URL-based product media/status posting

This build is based directly on V16.23. Existing payment, customer, order, plan/offer, subscription, brand/theme and unrelated website logic is retained. Changes are additive and limited to the requested comment workflow, Audition social options, Instagram composition, social diagnostics timing, perceived loading latency, and Product Images workflow.

## Comments workflow
- A successful public reply, nested reply, initial/one-time DM, or supported like/reaction now moves a New/In Progress social comment to Responded.
- Hidden, Spam, Resolved and Deleted continue to use their own respective buckets.
- Existing older rows that already contain an admin reply, sent-DM marker or liked marker are repaired from New/In Progress to Responded when social comments are loaded.
- Comment platform/status switching uses cached rows immediately when available and does not force a remote sync on every click. Refresh/Search still perform an explicit refresh/sync.
- Comment notification control is shortened to “Enable comment notifications” with its status/helper text below it.

## Audition first social comment
- Adds a default-OFF “Post application link as first comment” switch at the top of Post New Audition Update.
- Featured Audition, Automatic Ads and the new first-comment option are arranged together in a responsive three-column control area.
- Turning on the first-comment option reveals a full-width optional First Comment box.
- Blank custom comment: publishes `Apply now using this link below` followed by a blank line and the Audition URL.
- Custom comment entered: publishes exactly the admin-entered comment; the article URL is not added automatically.
- The setting is written into the Blogger UC_META metadata, so it survives Draft/Scheduled publishing and is available to the later social-publishing sweep.
- Post Audition Update and Post With Advertisements continue to use the same publish function, so the social/first-comment behavior is consistent for both.
- First comments are best-effort and never turn a successful main social post into a failed post.

## Instagram image layout
- Keeps 1080 × 1350 output, current cover-image fit behavior, border and dynamic Brand Settings colors.
- Branding/title content is now in the upper panel and the Audition cover image is placed underneath it.
- Top-left: dynamic logo, brand name and tagline.
- Top-right: APPLY NOW plus dynamic helper text.
- Center: adaptive Audition title, one-line follow message using the connected Instagram username, then VERIFIED CASTING CALLS.
- The helper says “Apply link in caption & first comment” only when the first-comment option is enabled; otherwise it says “Apply link in caption”.

## Social publishing first comment
- Facebook: attempts a first Page-post comment.
- Instagram: attempts the first comment after media_publish, with Facebook Login first and Instagram Login fallback where configured.
- Threads: attempts a reply to the newly published Thread.
- LinkedIn: attempts an Organization comment on the newly published post where the connected permissions accept it.
- X: attempts a reply to the newly published Tweet where the configured credentials accept it.
- Pinterest is skipped for first-comment behavior because this dashboard does not have a supported Pin-comment publishing route.

## Social Media API action messages
- Success/error action-result boxes are temporary and automatically disappear after 45 seconds.
- Old saved diagnostics are not replayed merely because the admin returns to Social Media API.

## Product Images
- Replaces file upload with Product Image URL.
- Accepts public HTTPS/CDN image URLs and common public Google Drive share-link shapes.
- The server downloads and validates the source, uploads it through the existing Cloudinary image service and stores only the resulting public URL in the website database.
- Product display image is normalized to 900 × 1100 with automatic crop/fit.
- Maximum remains 3 images per plan.
- Duplicate URLs are rejected; older duplicate rows are cleaned when the image list is opened.
- Exactly one image can be the cover. Selecting another cover clears the previous cover automatically.
- Adds a themed information view explaining Product Image URL, Alt Text, cover image and social status behavior.

## Product image social status
- Adds “Post as social status”. Default is OFF.
- When enabled, choose:
  - Post once — immediately
  - Repeat daily during offer period
- Repeat mode reveals From Date and To Date.
- Facebook/Instagram receive Story-sized 1080 × 1920 variants where their connected APIs permit it.
- Threads, LinkedIn and Pinterest use platform-appropriate resized image posts/Pins where configured.
- The current X connection remains safely skipped for product-image status posting because this installation's X integration is text-post oriented and does not contain a verified media-upload credential flow.
- Repeat campaigns are stored in D1 and checked by the same lightweight non-blocking Cloudflare traffic-sweep pattern already used for scheduled Audition social publishing. They stop automatically after the To Date.
