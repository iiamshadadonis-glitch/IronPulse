# Final display and dashboard fix

This patch is intentionally limited to the three issues reported after the last-mile UI build:

1. Client Success Stories thumbnails use a full-bleed 16:9 `object-fit: cover` presentation again, removing the empty side gutters introduced by `contain`.
2. The dynamic `/blog` Cloudflare Function now loads the same last-mile stylesheet as the static pages and starts the no-auditions state with the centered `audition-grid-empty` class, matching Festival Offers.
3. Clickable dashboard metric cards are excluded from the generic asynchronous button text replacement. Their nested statistic elements/IDs are preserved, preventing the jumbled card layout and the subsequent `Cannot set properties of null (setting textContent)` error. Generic action buttons still retain the loading/success/error feedback behavior.
