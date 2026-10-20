# Urgent Casting V16.50 — Release Verification

## Baseline
- Source package: exact uploaded V16.49 ZIP.
- V16.49 ZIP integrity: PASS before modification.
- V16.50 is limited to UI/help/state-loading corrections and two SEO-related wording updates in existing backend responses.

## Verification performed
- JavaScript syntax: 254 files — PASS (`node --check`).
- Cloudflare Function module imports: 154 modules — PASS.
- JSON parse: 1 file — PASS.
- JSONC parse: 1 file — PASS.
- HTML parser: 25 files — PASS.
- CSS structural checks: 68 files — PASS.
- Local static HTML asset references: 594 checked, 0 missing — PASS.
- V16.50 feature assertions: 17/17 — PASS.
- Change-scope check: only the intended V16.50 files plus two SEO copy files changed — PASS.

## SEO backend behavior test
A mocked D1 settings record representing an already connected SEO/Blogger account was passed through the real `/api/admin/api-settings` GET handler.

Result:
- HTTP 200 — PASS.
- Existing `bloggerConnected` state returned as true — PASS.
- Existing `bloggerAuthorized` state returned as true — PASS.
- Existing Blog/SEO ID preserved — PASS.
- Authorized Redirect URI returned as `https://urgent-casting.com/api/admin/blogger-oauth/callback` — PASS.
- Client Secret returned masked, not exposed — PASS.
- Database writes during GET/status load: 0 — PASS.

## Preservation checks
- V16.50 SEO refresh uses GET/status loading only.
- V16.50 does not invoke `delete_seo_connection`.
- No integration disconnect/delete logic was added to the new V16.50 browser patch.
- No theme root variables or existing palette definitions were changed.
- No migration was added.

## Snapchat readiness rule
Business OAuth connected and Public Profile API publishing-ready remain separate states. Story publishing is not marked ready until the existing Public Profile capability test succeeds. This matches Snap's current allowlist-only Public Profile API access model.
