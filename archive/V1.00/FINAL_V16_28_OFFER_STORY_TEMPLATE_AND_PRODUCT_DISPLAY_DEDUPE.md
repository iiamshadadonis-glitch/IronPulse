# FINAL V16.28 — Offer Story Template + Product Display De-duplication

This release is an additive update on V16.27.

## Offer / Plan social status design
- Replaces the plain text-stacked status layout with a pre-designed branded offer template.
- Uses a U-shaped/curved image-to-offer-panel transition.
- Uses the current Brand Settings primary/accent colors dynamically.
- Keeps the brand logo, brand name and tagline in the safe Story header area.
- Uses a pre-designed GRAB OFFER NOW badge, decorative gold separator, limited-time validity card, pricing card, CTA button and feature card.
- Only dynamic content changes: product image, plan/offer name, plan badge, validity, trial/offer pricing and up to three plan features.
- Each feature remains one bullet. Longer text reduces font size rather than creating extra bullet points.
- Trial pricing remains transparent: the trial amount is prominent and the recurring post-trial amount is still disclosed.

## Product Display duplicate fix
- A product can render only once on a public page even if legacy placement rows exist under different section keys.
- Existing visible duplicate placement rows are repaired during the V16.28 schema upgrade.
- Product Display save now collapses same-product/same-page duplicates instead of creating another row.
- First product image save adds the new plan to Home and Membership/Offers once, only when no placement exists for that product/page.
- Adding/cropping/replacing later images does not add the plan to Product Display again.
- Bulk import now uses the canonical Membership section for the Offers page.

## Unchanged
- Existing payment, checkout, subscription, comment, audition, crop, and color-theme logic remains unchanged.
- Website-only crop remains independent from social status publishing.
