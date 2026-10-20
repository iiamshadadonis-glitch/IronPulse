# FINAL V16.23 — Instagram clean brand layout, Private Replies fallback and apply comment

This build is based directly on V16.22 and keeps the existing working publishing, comments, webhook, payment and theme logic intact. Changes are limited to Instagram visual composition, optional Private Replies fallback diagnostics, and best-effort application comments after social publishing.

## Instagram branded image
- Keeps the existing 1080 × 1350 output and the current cover-image fit behaviour.
- Removes text width/c_fit transformations that could create large opaque/white blocks around Cloudinary text overlays.
- Centres the audition title in the lower panel with adaptive font size and line wrapping.
- Adds a small dynamic follow message below the title using the Instagram username discovered by Test Connection.
- Adds VERIFIED CASTING CALLS in the brand primary colour with accent details.
- Bottom-left brand block uses Brand Settings dynamically: logo, brand name and tagline.
- Bottom-right block shows APPLY NOW and "Apply link in caption & first comment".
- Primary and accent colours come from Brand Settings. The image remains dynamic if brand settings are changed.
- No AI-disclosure parameter is sent by the website when publishing.

## Apply comment after publishing
- Facebook: after a successful post, the website attempts to create the first public comment with the article URL.
- Instagram: after media_publish succeeds, the website attempts to create the first public comment with the article URL. It first tries the existing Facebook Login/Page-token route, then the optional Instagram Login token route when configured.
- Failure to create this convenience comment does not mark the main social post as failed.
- Comment pinning is not claimed or simulated; that remains controlled by Instagram/Meta where the public API permits it.

## Instagram Private Replies / initial DM
- Existing Facebook Login/Page-token route remains unchanged as a supported path.
- Adds an optional Instagram Login Token fallback field on Settings → Social Media API → Instagram.
- When configured, comment-triggered Instagram DM first tries Meta's graph.instagram.com Private Replies route with recipient.comment_id + message.text, matching the previous n8n workflow pattern.
- If that route is unavailable, the dashboard can still try the existing Facebook Login route.
- Test Connection now reports Private Replies separately from ordinary DM-conversation messaging and reports whether the optional Instagram Login fallback token is valid for the configured professional account.
- Token value is masked in the admin response and never returned in full after saving.
