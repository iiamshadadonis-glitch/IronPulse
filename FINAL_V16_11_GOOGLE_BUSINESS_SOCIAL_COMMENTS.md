# V16.11 — Google Business Profile + Unified Social Comments

This build is additive to V16.10. Existing theme, checkout/payment logic, Audition publishing, CRM, Search Console diagnostics, social publishing and website comments remain in place.

## Google Search Console
- The existing background sitemap re-submission after a published Audition remains enabled by default when Search Console is enabled.
- A visible **Automatically submit Auditions sitemap after publication** toggle was added so the administrator can explicitly control the behavior.
- This submits the Auditions sitemap to Search Console; it does not guarantee crawl, index or ranking.

## Google Indexing API
- Existing automatic URL notification logic is preserved.
- It runs only when **Enable Google Indexing API**, the eligibility confirmation, and **Automatically submit eligible new Auditions** are all enabled.
- Google permits this API only for pages that actually satisfy its JobPosting/BroadcastEvent eligibility rules. A casting call being job-related does not by itself make the page eligible; the page must carry compliant JobPosting structured data/content.

## Google Business Profile
A new card is inserted below Google Indexing API.

Features:
- OAuth 2.0 using `https://www.googleapis.com/auth/business.manage`.
- Account and business-location discovery.
- Test connection.
- Optional automatic publication of a newly published Audition as a Google Business Profile local post with summary, cover image when accepted by Google, and a Learn More link.
- Google Maps/Business Profile review loading and owner reply support in the Comments workspace.
- No separate Google Maps API key is required for Business Profile local posts or owner review replies. Existing Maps & Reviews settings are untouched.

Before connecting, the Google Cloud project must have approved/usable Google Business Profile API access and the OAuth redirect URL displayed on the card must be added to the OAuth Web Application client.

## Unified Comments
The existing Comments menu stays in the same place. **Audition Articles** is always visible. Additional platform tabs appear only when the corresponding integration is enabled.

Supported tabs/capabilities in this build:
- Audition Articles: existing reply/resolve/delete workflow preserved.
- Facebook: fetch comments; reply, like, hide/mark-spam, delete when the connected Page token/permissions allow it.
- Instagram: fetch comments; reply, hide/mark-spam, delete; one initial private text reply while the Instagram private-reply API window is open.
- Threads: fetch replies; reply and hide/mark-spam.
- LinkedIn Organization: fetch comments; reply and Like reaction when the required organization social-feed permissions are present.
- X / Twitter: fetch recent conversation replies; reply and Like when the connected user-context token has the required scopes.
- Google Maps Reviews: fetch reviews and create/update the business owner's reply. Google does not provide an API to delete a customer's review from this resource.
- Pinterest: the tab is capability-gated and reports unavailable instead of presenting fake comment-moderation actions.

Each platform has New / In Progress / Responded / Resolved / All. An unanswered New item becomes In Progress after 48 hours. Resolved is an internal admin workflow state; remote moderation actions are sent to the external platform only when that platform exposes the relevant API action.

### Instagram private reply timing
The initial private reply is not a generic 24-hour-from-comment window. Instagram permits one initial private reply to a qualifying comment within 7 days. Follow-up messaging becomes subject to the normal messaging window after the recipient responds. The UI therefore shows a live remaining-time tooltip based on the 7-day initial private-reply window and removes the action after it expires or after it has been used.

Image/PDF URL fields are shown but disabled for the initial Instagram private-reply action because the documented initial private-reply request is text-based. The build intentionally does not pretend an unsupported attachment was sent.

## Database
- Adds `social_comments` for remote platform comment/review cache and admin workflow state.
- Adds migration `0027_v16_11_google_business_social_comments.sql`.
- Runtime schema bootstrap also creates the table automatically.

## Files intentionally changed/added
- `functions/_lib/utils.js`
- `functions/_lib/schema.js`
- `functions/_lib/social-publishing.js`
- `functions/_lib/google-business.js` (new)
- `functions/_lib/social-comments.js` (new)
- `functions/api/admin/social-integrations.js`
- `functions/api/admin/blog-comments.js`
- `functions/api/admin/google-business-auth.js` (new)
- `functions/api/admin/google-business-oauth/callback.js` (new)
- `functions/api/admin/social-comments.js` (new)
- `functions/api/webhooks/meta-leads.js`
- `functions/api/webhooks/x-activity.js`
- `migrations/0027_v16_11_google_business_social_comments.sql` (new)
- `public/admin/final-v16-11-google-business-social-comments.css` (new)
- `public/admin/final-v16-11-google-business-social-comments.js` (new)
- `public/admin/index.html` (only loads the new additive CSS/JS)

No existing color/theme file was edited.
