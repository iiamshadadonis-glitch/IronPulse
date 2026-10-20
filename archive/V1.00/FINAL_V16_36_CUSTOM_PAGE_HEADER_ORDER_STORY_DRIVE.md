# V16.36 — Custom page routes, header order and Story/Status Drive upload

This is an additive update on top of V16.35. Existing payment, order, audition, social publishing, product display, dual-crop and theme behavior is retained unless explicitly listed below.

## Custom page route repair

- Admin-created pages now open at the page slug route, for example `/page/participate`.
- Public custom-page loading resolves the page directly by its saved `slug` instead of relying on the old generic `/custom-page` fallback.
- Existing stale `/custom-page?slug=...` links are redirected to the correct slug route.
- The public navigation uses `/page/<slug>` for every admin-created page.
- Public custom-page and main navigation assets are cache-busted to V16.36; the two mutable navigation scripts also use a shorter revalidation cache rule to reduce stale-header behavior after future deploys.

## Website header order

- Pages → New Page now includes a `Website Header Order` manager underneath the header preview.
- Home, Offers, About, Audition Updates, Track Order, Contact, admin-created top-level pages and Admin Login can be moved with Up / Down arrow buttons.
- Every move is saved immediately and is reflected by the public header order.
- Logo, Checkout and Submit Profile remain fixed.
- Pages placed under a submenu remain under that submenu and are not treated as top-level sortable items.

## Product Images improvements

- Opening Images pre-fills an empty Alt Text field as `Grab this [Plan / Offer Name] now`.
- The value remains editable before Save Image.
- The existing independent Product Card and Offer Details dual-crop flow is unchanged.

## Story / Status image upload to Google Drive

- Google Drive upload setup now manages two sibling subfolders inside the configured destination root:
  - `Plans and Offers` — existing Product Image sources.
  - `Story or Status Images` — separate social Story / Status sources.
- Google Drive Test Connection creates or reuses both subfolders.
- When Post as social status is enabled and Google Drive is Upload ready, Product Images shows `Upload Story / Status Image`.
- Recommended Story/Status size is 1080 × 1920 px (9:16).
- The uploaded Story/Status file is made publicly readable and its Drive URL is passed into the existing social publishing workflow.
- The existing Story / Status Image URL field remains available as a fallback.
- Product Image, Product Card crop, Offer Details crop and Story / Status image remain separate.
- Saving website crops does not repost social media.

## Help and layout

- Product Images help includes the automatic Alt Text behavior and Drive Story/Status upload workflow.
- Google Drive help explains both destination subfolders.
- New additive spacing styles keep the header-order and Story/Status upload controls separated from surrounding fields.

## Compatibility

No D1 migration is required. Header ordering is stored in the existing `settings` table under `navigation_order`. Google Drive Story/Status folder metadata is stored inside the existing `social_integration_settings` JSON structure.
