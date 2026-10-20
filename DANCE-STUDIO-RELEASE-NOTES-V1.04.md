# DropBeat Dance Studio V1.04

V1.04 is a complete replacement package based on V1.03. Existing commerce, payment, CRM, automation, analytics and publishing logic remains in place.

## DropBeat Studio welcome images

- Added **Admin → Settings → Brand Settings → Banners → Add DropBeat Studio Images** beneath the existing home-banner grid.
- The add form stays inside a collapsible dropdown and accepts one image or several images in one selection.
- Recommended image size is 1200 × 1200 px; WebP, JPG, PNG and SVG are accepted up to 900 KB each.
- Existing images have visible/hidden status, edit/replace, delete, preview and up/down sorting controls.
- Up to 12 images can be retained. Visible images rotate in their saved order inside the purple DropBeat Studio panel.
- The original Dropbeat purple theme image remains as the fallback when no managed image is visible.

## Student Stories reliability

- Repaired saving for YouTube and Instagram Student Stories.
- Links pasted without `https://` are normalized automatically.
- YouTube thumbnails continue to be generated automatically when the optional thumbnail field is blank.
- The backend now confirms and returns the saved database row, retries transient D1 operations and provides a clear JSON error on failure.
- Older `success_stories` table variants are repaired through the self-healing schema path.
- Story responses and the public story endpoint use no-store caching, and successful admin writes invalidate the home-page data cache before returning.

## Frontend wording and presentation

- **Subscribe securely** now explains the customer-facing payment and onboarding step without exposing gateway fallback logic.
- Step 3 is now **Join your class**, with online/studio joining guidance and studio-notice wording.
- The footer now places the copyright at bottom-left and **Website designed by Instautomate** at bottom-right on desktop.
- Cookie Preferences no longer uses the inherited Urgent Castings red; it uses Dropbeat indigo, neutral text and white surfaces.
- The Offers menu remains arrow-free with the V1.03 spacing and hover behavior.

## Cache freshness

- Public Dropbeat CSS, language, structure and application URLs advance to V1.04 cache keys.
- Admin Dropbeat assets advance to V1.04 cache keys; admin assets remain `no-store`.
- Browser-facing public-data responses revalidate, while the short shared edge cache remains available for performance.
- Every successful non-auth admin mutation synchronously invalidates public site, Home, Offers, Festival, Yearly Plans and administrator-created custom-page snapshots.

## Verification

Run the full focused and inherited suite with:

```bash
npm run test:dance-v1.04
```

For deployment, follow `DANCE-STUDIO-SETUP.md` and deploy the complete replacement directory.
