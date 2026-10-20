# Urgent Casting V6 — Client, Guidance, Maps & Favorites

This V6 is an additive follow-up to the supplied V5 project. Existing payment, CRM, subscription, storage, social-media, checkout, audition and site-theme logic remains in place.

## V6 changes

- Replaced browser datalist candidate popups in Edit Client with a clean scrollable editable picker that opens without deleting the current value.
- Added dynamic months/days/hours/minutes/seconds formatting to Client Details time spent.
- Added Favorites toggle, FAV badges, Favorites customer list and Excel export.
- Made WhatsApp, email and Instagram values clickable in Client Details while keeping the visible text unchanged.
- Reworked information/help cards so the original forms are not re-parented or distorted; long help scrolls and the back button restores the form.
- Added solution-oriented help for subscription, one-time payment, Product Display, auditions/ads, refunds, customers, checkout and coupons.
- Fixed Safe Cleanup information cards so back navigation and internal scrolling work.
- Hid the unwanted API Settings setup-note chevron; the setup-note capsule remains clickable.
- Added Settings → Maps & Reviews with independent Contact Map and Google Reviews configuration.
- Added optional public Contact map section and Home page Google Review cards that remain completely hidden until configured and enabled.
- Added Google review caching so the public page keeps the last good review set if a refresh temporarily fails.
- Added additive schema/migration support for Favorites and review cache.

## Maps & Reviews notes

Contact maps support either a pasted Google Maps Embed iframe/URL or Maps Embed API configuration. Reviews support Places API (simpler) or Google Business Profile review access (recommended when newest-review ordering is important). A normal Google Maps share link is used for directions / View All Reviews; it does not by itself provide live review text.
