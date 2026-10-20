# FINAL V16.31 – Plan save diagnostics, recommended plans, availability presentation, external product source

This version is an additive update on V16.30.

## Plan / Offer save repair
- Bumps the automatic D1 schema version so existing sites receive `spot_limit`, `filling_fast_limit`, and `low_spot_limit` columns on the first request after deployment.
- Adds exact backend error responses for Plan / Offer saves instead of an unhandled generic failure.
- Adds an inline admin diagnostic message that explains invalid threshold combinations or database/schema problems.
- Keeps the existing Spot Limit / Filling Fast / Only X Spots Left business rules.

## Offer Details
- Main availability is shown as colored text, not a button-like box.
- Adds a horizontally scrollable **Recommended Plans** section.
- Recommendation order prioritizes genuine sales popularity, then low remaining spots, Filling Fast, and Available plans.
- Recommended cards use the cropped website product image, plan name, correct pricing hierarchy, availability, Book Now and Details.
- Details-page hero image continues to prefer the uncropped/original `source_url` and fits it into a 1280 × 720 / 16:9 frame.
- Trial Details pricing keeps both previous prices struck out and emphasizes only the current trial charge.

## Product Image URL
- Removes the application-level 15 MB limit from Product Image URL sources.
- The original Product Image URL is stored as the source reference rather than first being downloaded into Worker memory.
- The crop editor reads the public source through an authenticated streaming proxy, so the Worker does not buffer the entire source image.
- The manually saved 900 × 1100 website crop remains website-only.
- The separate Story / Status Image URL workflow is preserved.

## Existing logic retained
- Payment/subscription behavior unchanged.
- Social status scheduling unchanged.
- Product-display logic unchanged.
- Existing CSS/theme files unchanged; new feature CSS is additive.
