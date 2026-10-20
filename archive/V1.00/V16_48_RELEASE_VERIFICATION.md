# V16.48 Release Verification

Release: **Urgent Casting V16.48 Complete Replacement**

## Verified checks

- V16.47 source baseline was re-extracted from the user-provided V16.47 ZIP and compared against the working baseline: exact match.
- No V16.47 files were removed in V16.48. Existing project files are retained; V16.48 is additive/minimally modified.
- All JavaScript files pass `node --check` syntax validation.
- All Cloudflare Functions JavaScript modules import successfully, confirming local module paths/imports/exports resolve.
- All JSON files parse successfully.
- `wrangler.jsonc` parses successfully after standard JSONC comment/trailing-comma normalization.
- All HTML files parse successfully with Python HTMLParser.
- All local HTML CSS/JS/image asset references checked by the verifier resolve to files in `public/`.
- All CSS files pass structural brace-balance verification.
- V16.48 `0030_v16_48_social_posts_scheduler.sql` executes successfully on SQLite.
- V16.48 social-post tables, indexes and `UNIQUE(post_id, platform)` target protection were verified.
- V16.48 admin exported action references were checked for unresolved `ucV1648*` handlers.
- Posts UI markers verified: Text Post, Image, Video, Story / Status, Scheduling, Select All, short/full video modes, Google Drive Posts upload, per-platform cancellation/rescheduling.
- Social Media API layout markers verified: top page heading/description, SEO Connection relocation, Social-Media-only browser-autofill protection.
- YouTube comment UI now permits the existing YouTube admin-reply edit action and comment-action success messages resolve from the actual platform rather than using a Facebook-only label.
- Snapchat OAuth/capability handling remains separate from Snap Kit and Public Profile Story publishing remains capability-gated.

## V16.48 main additions

- Website Content → **Posts**, positioned between Auditions and Comments.
- Capability-aware Text/Image/Video/Story composers.
- Google Drive → **Posts** media folder/upload path.
- Short-form and full-length video modes can both be enabled; each mode creates its own platform-target job.
- Post-now and schedule-later workflow.
- Calendar/List scheduler with thumbnails/statuses.
- Per-platform remove/retry controls, post rescheduling, remaining-target publishing and schedule cancellation.
- Protected `/api/automation/social-posts` due-post processing endpoint plus traffic/admin background sweeps.
- Social Media API heading/layout cleanup and SEO Connection relocation.
- Social Media API credential-field autofill suppression without changing other admin forms.
- X OAuth adds media-write permission handling for media Posts.
