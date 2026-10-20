# Urgent Casting – Final V5 Additive Touch-ups

This build is based on the supplied V4 project. Existing business logic remains in place; V5 adds UI guidance and the requested supporting fields/endpoints.

## Included
- Site Settings visual color/theme builder with HEX entry, color picker/eyedropper, HSL controls, palette types, eight presets, live preview, and one-click reset to the original red/gold designer theme.
- Front-end brand colors now read the saved Primary/Accent colors and apply them through the existing CSS-variable theme.
- Circular theme-aware dropdown/expand icons across admin and public pages.
- Information flip cards for New Subscription, One-Time Payment, Product Display, Auditions, article advertisements, refunds, subscriber import, inactive users, one-time users, Checkout Behaviour, and Coupon Codes.
- Existing Audition Cover Image URL now renders as the main image directly below the article title; no duplicate image field was added.
- Per-article Automatic Ads toggle. Enabled ad integrations are allowed on that article only when the toggle is enabled; manual article advertisements continue to work separately.
- Custom Advertisement option with image URL + website redirect URL.
- New Customers → One-Time Users page. Paid one-time website orders appear automatically; optional manual one-time records can also be added.
- Additive D1 changes: `blog_posts.auto_ads_enabled` and `one_time_users` table. Schema version bumped so existing databases receive the additions automatically.

## Original theme reset
- Primary: `#8A0505`
- Accent: `#FFD45A`
- Palette classification: `Custom`

