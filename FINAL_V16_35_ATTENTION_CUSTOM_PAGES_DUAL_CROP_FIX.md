# Urgent Casting V16.35 — Attention, Custom Pages & Dual Crop Fix

This build is based on the supplied V16.34 complete replacement and keeps the existing visual theme and production workflows intact.

## Changes
- Enquiries and Requests show attention badges only for **New** and **In Progress**. Resolved and All remain silent.
- Create New Page keeps paired fields aligned, adds matching helper text, and adds the themed information helper with a back face/self-learning guide.
- Custom pages now keep **Page Name** (short admin/navigation label) separate from **Page Title** (public page heading).
- Top-level header placement is validated before the page is inserted. Invalid placement returns a diagnostic and no page is silently created.
- Public custom pages use `/page/<slug>` through a direct Pages Function route; Product Display and navigation use that route.
- Existing custom pages always expose Cover Image URL, Upload Cover Image, Alt Text, Product Display and navigation controls, even when no image was added at creation.
- Product Card and Offer Details crops are saved as separate hosted images with unique filenames and verified pixel dimensions.
- Product Card uses only the 900 × 1100 crop. Offer Details uses only the 1280 × 720 crop.
- Offer Details no longer falls back to the Product Card crop and no longer applies a second crop to an already-manually-cropped 1280 × 720 image.
- Saving website crops does not repeat social story/status publishing.

## Release verification
- JavaScript syntax check across all project `.js` files.
- Relative JavaScript import resolution check.
- Static HTML local asset reference check.
- Feature assertions for notification visibility, custom page validation/routing and independent dual crops.
- Existing CSS comparison against V16.34; only the Offer Details image-fit stylesheet was changed, plus the new V16.35 additive admin stylesheet.
- ZIP CRC/integrity check after packaging.
