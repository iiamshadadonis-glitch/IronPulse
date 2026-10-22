# V1.07 — Layout, theme sync and fixed footer

This is the complete V1.06 project with a focused V1.07 update. The colours, four existing theme palettes, database schema, API paths, stored roles, membership, payment and scheduling behavior are retained. No migration is required. `DB` still selects D1 `893e7d29-fa72-413d-9415-5d93b1c3bc6e`.

## Layout stability

The application uses plain JavaScript modules and MutationObservers, rather than React effects or Vue watchers. The supplied Pages controller unconditionally called the Pages router during workspace activation. If a router callback re-entered that workspace, the same call repeated until the stack overflowed. A regression test uses the exact supplied controller source to reproduce this RangeError under that callback, then checks the patched controller with the same callback. The screenshot alone does not identify the complete production stack trace.

V1.07 has one Pages workspace owner across module URLs, sets a re-entry guard before routing, and does not route back into an already active Pages panel. The older navigation decorator now preserves additional tab buttons and skips unchanged text writes. Its original navigation destinations and handlers are retained.

The Worker delivers a canonical fingerprinted URL for each module even when compatibility script tags/imports contain different `build` or `v` values. Semantic query parameters on other requests are retained. This avoids independent editor/workspace instances being initialized from equivalent module URLs.

The layout contract is a flat, registered block list. Incoming editor/cache data is copied with a bounded iterative JSON-tree copier: cycles, excessive nesting (over 16), more than 10,000 object nodes, non-plain objects and unsafe prototype properties are rejected with a validation result. Shared acyclic references are copied into independent tree nodes. The renderer resolves blocks from the trusted theme registry, rather than following arbitrary payload child references. A forced reload ignores earlier in-flight editor responses.

## Themes, previews and assets

The existing theme IDs and recommended colours are unchanged:

| Theme | Existing ID | Home Banners | Gym Images gallery |
| --- | --- | --- | --- |
| IronPulse Original | dropbeat | Available | Available |
| Casting Editorial | casting | Available | Hidden |
| Gym Spotlight | spotlight | Available | Available |
| Modern Minimal | minimal | Available | Hidden |

Selecting a theme immediately updates the Layout preview and Banners gallery capability. Unsupported gallery controls disappear. Each theme keeps its own normalized saved layout. An unpublished theme preview is read-only in Layout until it is published through Brand Settings; this prevents saving a preview over the live theme. The preview selection and colour fields survive navigation back to Brand Settings. No current theme requires a video upload, so no unused video uploader was added.

## Viewports and confirmation

Choose Desktop Layout or Mobile Layout before editing. The trash icon now toggles visibility only for the selected viewport, with an explicit Show/Hide accessible label. It does not mark the block as globally removed. Existing legacy globally removed blocks can still be restored.

Saving a Layout or publishing a changed Frontend Theme requires typing exactly `confirm`. The warning uses the existing component styles: a centered desktop dialog and mobile bottom sheet. Cancel/Escape leaves the live configuration untouched; the final button stays disabled until the input matches. Failed saves keep the warning and error visible for retry. Theme publication checks the expected active theme; existing Layout revision/context checks and atomic D1 writes are retained. Confirmation fields are transient and are not stored in Brand Settings.

Brand Settings commits the returned state after a successful server response. Existing configuration/Edge cache invalidation and public stale-while-revalidate synchronization continue to update the open public website. The editor reloads the published model after Brand Settings succeeds. Tests cover cross-tab public updates without a navigation or hard refresh.

## Footer

The global footer already sits after `main`; it stays there. The theme registry and renderer no longer expose a footer block. Stored legacy footer layout options are ignored, so switching themes cannot hide or rearrange it.

The earlier name mapper compared only URL paths. Since `https://instautomate.com/` has the same `/` path as Home, it replaced the agency label with Home. Name mapping now requires the current site origin and excludes the attribution. The fixed credit is `Website designed by Instautomate`; its anchor uses `https://instautomate.com`, `target="_blank"` and `rel="noopener noreferrer"`. Existing markup, font weight and footer styling are preserved. The footer links, social icons and structure stay the same across themes on desktop and mobile.

## Install and verify

1. Extract `V1.07.zip` and copy all its contents to the gym repository root, including `archive/`. Keep your repository's `.git` folder.
2. Commit and push to the production branch connected to the existing Pages project serving `https://gym-fitness-3w8.pages.dev`.
3. In Pages, use `npm run build` as the build command and `public` as the output folder. Keep the existing DB binding and secrets. If the configuration still has a template project name/origin, follow START-HERE.md to match the existing Pages project and its actual SITE_URL before pushing.
4. Deploy the new commit. Open `/release.json` and check `V1.07`. Open Settings → Pages → Layout, try both viewport tabs, then review Theme and Banners.

Build hashes are regenerated by `npm run build`; there is no need to edit asset filenames manually. Do not run migrations for this frontend/layout update. Cloudflare deployment itself and external payment/OAuth credentials are separate from local verification; no live account or production database was altered while testing.

See `RELEASE-VERIFICATION-GYM.md`, `verification/ironpulse-v1.07/layout-theme-fixes.json` and `GITHUB-SUMMARY.txt` for the verification and copyable change record.
