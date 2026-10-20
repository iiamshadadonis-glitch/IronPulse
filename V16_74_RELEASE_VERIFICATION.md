# V16.74 Release Verification

## Scope

V16.74 is an additive Bing / IndexNow correction on top of the user's uploaded V16.73 complete replacement build. It preserves the V16.73 SEO Connection placement/OAuth recovery and does not alter the site's CSS/theme files.

## Code verification completed

- **286 JavaScript files** passed `node --check` syntax validation.
- **326 relative JavaScript imports** were checked and resolved to existing files.
- **149 local Admin script/style/icon references** in `public/admin/index.html` were checked and resolved.
- **85 CSS files** were SHA-256 compared with the uploaded V16.73 base and are byte-for-byte unchanged.
- Existing `final-v16-73-seo-connection-reliability.js` remains present so SEO Connection stays under Settings → Integrations → SEO.
- IndexNow structural assertions confirmed: key validation, same-host validation, 10-minute duplicate suppression, bulk navigation submission, `Retry-After` handling, one-hour default 429 cooldown, dedicated key generation UI, and historical-vs-current error wording.

## Functional IndexNow mock verification

A mocked Cloudflare/D1 + fetch test exercised the new IndexNow backend behavior:

1. **Test Connection** opened the public key-verification URL but made **zero IndexNow submission calls**.
2. A first valid `urgent-casting.com` URL produced one IndexNow API call and accepted HTTP 200.
3. Repeating the same URL within 10 minutes was skipped without another network call.
4. Two changed URLs were sent together in one bulk IndexNow request.
5. A URL on `auditions.urgent-casting.com` was rejected locally with the same-host diagnostic before any IndexNow API call.
6. A simulated HTTP 429 stored a cooldown timestamp.
7. A second submission attempted during the cooldown was blocked locally and did not create another IndexNow network request.

## Files intentionally changed from V16.73

- `VERSION.txt`
- `README.md`
- `functions/_lib/social-publishing.js`
- `functions/_lib/navigation-seo.js`
- `functions/_lib/integration-diagnostics.js`
- `functions/_lib/utils.js`
- `functions/api/admin/social-integrations.js`
- `functions/api/admin/social-platform-action.js`
- `functions/indexnow-key.txt.js`
- `public/admin/final-v16-8-social-publishing-search.js`
- `FINAL_V16_74_INDEXNOW_SETUP_RATE_LIMIT_FIX.md`
- `V16_74_RELEASE_VERIFICATION.md`

## Deployment note

No live production deployment was performed from the verification environment. After deployment, the admin should generate a **new dedicated IndexNow key**, save it, run **Test Connection**, and submit one current `https://urgent-casting.com/blog/...` URL once. If a Bing Webmaster Tools API Access key was previously stored in the old IndexNow field, that Bing API credential should be rotated/revoked because the previous build may have served it through the public IndexNow verification endpoint.
