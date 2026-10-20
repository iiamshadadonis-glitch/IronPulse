# Urgent Casting V16.50 — Meta Help, SEO Recovery, Snapchat Access Guidance

## Scope
V16.50 is an additive patch on the exact V16.49 replacement package. It does not change payment, publishing, comments, credential-storage, database, theme, or unrelated integration logic.

### Facebook information card
- Replaces only the Facebook flip-card help body with a solution-oriented setup guide.
- Includes direct official Meta links, app creation/configuration steps, Facebook Login for Business guidance, required form-field mapping, Page token/webhook guidance, connect/test workflow, capability-check interpretation, and examples.

### Instagram information card
- Replaces only the Instagram flip-card help body with a solution-oriented setup guide.
- Includes direct official Meta/Instagram links, Professional account prerequisites, linked Page/account ID mapping, shared Meta App guidance, Page token/webhook guidance, connect/test workflow, capability-check interpretation, and examples.

### SEO Connection
- Removes the duplicate/colliding left-side status text from the SEO Connection summary and leaves one clean status badge on the right.
- Loads the saved API/SEO state whenever the SEO tab/card is opened so a preserved OAuth connection is not visually treated as disconnected merely because the old API Settings panel was moved.
- Restores the Authorized Redirect URI even before a status request completes:
  `https://urgent-casting.com/api/admin/blogger-oauth/callback`
- Keeps the OAuth Client Secret write-only/masked and never clears it on a status refresh.
- Mirrors the former API Settings spacing rules under the new Integrations location so labels, fields, helper text, buttons, and two-column rows remain separated.
- After a Google OAuth callback, the final admin destination is Integrations → SEO.
- OAuth callback/help copy now points to Integrations → SEO instead of the removed standalone API Settings menu.

### Snapchat
- Does not fake Public Profile API readiness when Business OAuth alone succeeds.
- When OAuth is connected but Public Profile API returns HTTP 403, the admin now explains that Snap's Public Profile API is allowlist-only.
- Shows the saved Business OAuth Client ID as the ID to submit for allowlisting.
- Links directly to Snap's official Public Profile API Get Started page.
- Explicitly warns not to send the Client Secret and explains that a Snap Kit Client ID is a separate product and does not unlock Public Profile API access.
- Keeps automatic Story publishing disabled until the existing capability check actually returns `publishingReady`.

## Credential preservation
V16.50 performs no integration delete/disconnect action during load, refresh, tab switching, help-card rendering, or SEO state recovery. Existing saved credentials remain in the same V16.49 settings records.

## Database
No new database migration is required for V16.50.
