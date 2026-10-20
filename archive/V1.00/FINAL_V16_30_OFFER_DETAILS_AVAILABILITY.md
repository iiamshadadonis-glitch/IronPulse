# FINAL V16.30 — Offer Details image source, trial pricing, availability thresholds

This release is based directly on V16.29 and keeps the existing payment, checkout, product image crop, social Story/Status image, page placement, and theme logic intact.

## Changes

### Offer Details image
- Product cards continue to use the manually cropped 900 × 1100 website image.
- Offer Details now uses the uncropped source/master image for the selected cover image.
- The source is fitted inside a 1280 × 720 (16:9) frame without cropping or stretching.
- Smaller/larger source images are fitted into the same Details frame.

### Offer Details pricing
- Removed Payment Type text from the public Details card.
- Removed Trial duration text from the public Details card.
- When Trial is enabled:
  - Regular price is struck out.
  - Discounted subscription/offer price is also struck out.
  - The immediate trial charge is the largest highlighted price.

### Real availability controls
Added three admin controls:
1. Spot Limit Optional — total real capacity; 0 means unlimited.
2. Show Filling Fast At — when remaining paid capacity reaches this number, show Filling Fast.
3. Show Only X Spots Left At — at/below this remaining count, show the exact number remaining.

Example: Spot Limit 10, Filling Fast At 9, Only X Spots Left At 6.
- 10 remaining: Available
- 9–7 remaining: Filling Fast
- 6–1 remaining: Only X spots left
- 0 remaining: Currently full

Popular now is calculated automatically from actual paid sales among the plans being displayed.

Availability is shown on public plan cards and the Offer Details page.

### Admin plan links
- The Plan / Offer cell in Plans & Offers is clickable.
- It opens that plan's public Offer Details page in a new browser tab.

### You Should Know
Converted the Offer Details note into a cleaner point-based list:
- Membership provides access to casting updates across India.
- Regional auditions and online submissions may be included based on the casting requirement.
- Membership does not guarantee auditions, callbacks, selection, employment, shoots or income.

## Existing logic preserved
- Product Image URL and Story / Status Image URL remain separate.
- Website crop remains 900 × 1100 and website-only.
- Website crop does not repost social Story/Status.
- Social Story/Status workflow is unchanged.
- Existing color/theme CSS files were not modified.
