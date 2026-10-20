# V16.43 — X transient publishing diagnostics + LinkedIn OAuth

## Scope of this release

This is an additive maintenance release on top of V16.42. Existing website colors, theme CSS, payment logic, plans/offers, Blogger/Audition logic, Google integrations, Facebook, Instagram, Threads and Pinterest workflows are retained.

### X / Twitter

- Test Connection now checks the connected X user, OAuth scopes and refresh authorization only. It does not perform a create-Post request.
- Test Posting remains the explicit real create/delete test and can require X Developer API credits.
- A historical X HTTP 402/credits failure is no longer replayed simply because Social Media API was opened or refreshed.
- X publishing failures are surfaced to the admin only after an actual Audition publish attempt in the current page session while both **Enable X / Twitter** and **Automatically publish new Auditions** are enabled.
- Disabling X or its automatic-publishing switch clears stale X publishing diagnostics while preserving the OAuth connection.
- The X information helper explains that Event Subscriptions/Webhooks are inbound activity delivery and do not bypass create-Post billing/credits.

### LinkedIn

V16.43 replaces the manual-token-oriented LinkedIn setup with an OAuth 2.0 authorization-code flow.

Callback URL:

`https://urgent-casting.com/api/admin/linkedin-oauth/callback`

The LinkedIn card now supports:

- Client ID and Client Secret
- automatic OAuth token acquisition
- Member Profile or Organization/Page publishing identity
- Organization ID only when Organization/Page is selected
- Community Management preparation for comments/reactions when LinkedIn grants the required product/scopes
- Lead Sync preparation and the existing lead webhook URL when LinkedIn grants Lead Sync
- Advertising API preparation when LinkedIn grants the relevant Marketing API permissions
- API version managed by the application as `202608` (August 2026)
- capability checks that show only permissions actually available on the connected authorization

Normal LinkedIn Inbox/Direct Message automation is not represented as generally available because standard LinkedIn OAuth products do not grant unrestricted Inbox automation.

## LinkedIn setup after deployment

1. In LinkedIn Developers → Urgent Casting → **Auth**, add the exact callback URL above under **Authorized redirect URLs**.
2. In **Products**, request only the products you need. For basic member posting, ensure the app has the product/permission that grants `w_member_social` and LinkedIn sign-in/profile authorization. Organization posting and Community Management require additional LinkedIn approval.
3. In Urgent Casting → Settings → Social Media API → LinkedIn, enter the Client ID and Client Secret.
4. Choose **Member Profile** for personal posting, or **Organization / Company Page** and enter the numeric Organization ID for Page posting.
5. Turn on Community Management, Lead Sync, or Advertising preparation only after LinkedIn has approved those products for the app.
6. Save Settings → Connect LinkedIn → approve access → return to Urgent Casting → Test Connection.
7. Enable automatic Audition publishing only after the capability check shows the required publishing permission is ready.

## X setup note

An X Event Subscription or webhook is not required to create a Post and does not provide a free alternative to the create-Post endpoint. If X returns HTTP 402 because API credits are unavailable, either add credits in the X Developer Console or disable X/automatic X publishing until you are ready to fund API usage.

## Verification boundary

The release verification checks JavaScript syntax, relative imports, local HTML/static references, targeted X/LinkedIn code paths, CSS/theme integrity, ZIP integrity and clean extraction. Live X/LinkedIn OAuth/provider calls cannot be executed in the offline build environment because production secrets and authenticated provider sessions are intentionally not bundled in the ZIP; the deployed Connect/Test buttons perform those live provider checks.
