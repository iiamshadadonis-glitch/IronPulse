# V16.21 — Instagram Webhook, DM, Comment Actions & Branded Publishing

This is an additive/minimal-change update over V16.20. The website theme and unrelated business logic are unchanged.

## What was fixed

- Instagram Test Connection no longer treats an unconfirmed programmatic webhook-subscription lookup as a broken Instagram connection. Comment/API access and webhook push delivery are shown as separate states. A real Instagram webhook event marks delivery as Ready.
- Configure Webhook Events now uses the Facebook Login API host used by this project and falls back to an "awaiting live event" state instead of falsely disconnecting a working Instagram integration.
- Instagram initial private-reply wording in the admin UI is renamed to **Instagram DM** / **initial DM**.
- Meta code 3 / capability errors from the initial comment-triggered DM now return a solution-oriented explanation rather than a generic OAuth error.
- Instagram comment actions now show the Instagram heart control. It is intentionally disabled with an explanatory tooltip because Meta's current Comment Moderation API does not provide a native endpoint for liking/hearting an Instagram comment.
- Instagram admin responses now have an Edit button. Because Meta does not provide a direct comment-edit endpoint, the dashboard performs the edit as a safe delete-and-repost of only the admin response.
- Automatic Instagram publishing now creates a branded 1080×1350 JPEG from the Audition cover, adds the Audition title below the image with safe spacing, adds the Urgent Casting logo/branding, waits for the Meta media container to report `FINISHED`, and then calls `media_publish`.
- Missing publishing helper functions that previously stopped the Instagram publishing sequence have been restored, and automatic publishing failures are saved so the Social Media API card can show the actual last error.

## After deployment

1. Open **Settings → Social Media API → Instagram** and click **Test Connection**.
2. Click **Configure Webhook Events**. If it says **Awaiting live event**, keep the same callback URL and verify token in Meta App Dashboard → Instagram → Webhooks, with `comments` and `live_comments` subscribed. The first real Instagram webhook event will mark delivery Ready.
3. Publish a **new** Audition to test automatic Instagram publishing. The Instagram capability card will show the last publish result and, when generated, a link to the branded 1080×1350 JPEG.
4. Test **Send Instagram DM** on a fresh comment. If Meta still returns code 3, confirm `instagram_basic`, `instagram_manage_comments`, and `pages_read_engagement`, the app mode/access level appropriate to the Instagram professional account, and Meta's eligibility for that specific comment. The website request format is already the documented comment-ID private-reply format.

## Validation performed before packaging

- JavaScript syntax check across every JS file in `functions/` and `public/`.
- Relative import-resolution check.
- Admin HTML local script-reference check.
- Instagram comment capability smoke test.
- Package JSON parse check.
- ZIP integrity test after packaging.
