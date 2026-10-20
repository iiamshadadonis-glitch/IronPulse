# FINAL V16.27 – Instagram footer placement, offer Story redesign, and website-only product crop

This release is an additive update on V16.26.

## Instagram audition image
- Keeps the existing 1080 × 1350 output.
- Moves the Audition cover image slightly lower.
- Moves the title toward the visual centre of the lower white panel.
- Anchors `VERIFIED CASTING CALLS` and the connected Instagram follow line close to the bottom edge with a consistent safe margin.
- Keeps the brand header and Apply Now block unchanged.

## Product offer Story/status artwork
- Keeps the existing social-status campaign workflow and connected-platform logic.
- Uses a larger Story safe area at the top so the platform's Story controls do not cover the brand identity or CTA.
- Moves the source image lower and keeps it fitted without destructive cropping.
- Makes the offer graphic more promotional with a dynamic offer badge, display-style plan title, themed validity badge, prominent trial/offer price, CTA badge, and plan feature highlights.
- Uses Brand Settings primary/accent colors and the current plan/offer data dynamically.
- Removes the visible URL from inside the Story artwork.
- Trial graphics clearly show the trial amount and the actual post-trial recurring amount. A real recurring charge is not falsely struck out.
- One-time Story campaigns show `LIMITED-TIME OFFER • VALID FOR 24 HOURS`; repeat campaigns use the selected To Date.

## Story link capability
- The Facebook Page Story and Instagram organic Story endpoints currently used by the website do not expose a clickable web-link button/link-sticker or clickable Story-caption field.
- The code therefore does not print a fake URL into the Story artwork.
- Threads, LinkedIn and Pinterest continue to receive the offer URL in their API-supported text/destination fields.

## Product image website crop
- Saving a Product Image URL first preserves an untouched master image for social status publishing.
- After Save Image, the existing themed crop editor opens automatically for the website image.
- Admin can drag, zoom in/out, Fit Full Image, and Save Cropped Image at 900 × 1100.
- Saving the crop updates only the website plan image and does not publish/re-publish social status content.
- Social status campaigns retain the untouched master source so later recurring Story/status publishing is not affected by website cropping.
- Cloudflare D1 stores URLs/metadata only for this new product-image flow; cropped image bytes are not stored in D1.
