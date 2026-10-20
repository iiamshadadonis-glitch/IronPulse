# V16.53 — Navigation, Search Title Stability & Notifications

This release is an additive UI/navigation update on V16.52.

- Keeps the public homepage title static for search crawlers and whenever the marquee setting is disabled.
- Adds crawler-safe marquee handling so search engines are not served rotating title fragments.
- Stabilizes the Integrations panel while legacy compatibility renderers settle, preventing visible multi-blink/flicker.
- Brand Settings tabs: Profile, Banners, Website Colors, Social Media, Legal Info, Checkout, Maps & Reviews, Storage, Login.
- Moves the existing Banners and Social Links panels into Brand Settings without changing their forms/APIs.
- Renames Social Links to Social Media in the Brand Settings workspace.
- Pages now includes New Page, Existing Pages and Success Stories; Success Stories keeps its original loader and save logic.
- Sidebar Website Content is renamed Social Media and retains Auditions, Posts and Comments.
- Pages is moved into Settings.
- Orders & Leads and Social Media receive notification-style aggregate badges; child counts are normalized to positive attention counts.
- No backend/migration/payment/integration credential logic is changed.
