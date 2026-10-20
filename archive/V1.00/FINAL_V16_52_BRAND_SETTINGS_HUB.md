# V16.52 — Brand Settings Hub

This release is a presentation/navigation reorganization built on V16.51. Existing APIs, saved settings, payment logic, map/review logic, storage cleanup logic, admin authentication logic, integrations, D1 migrations and color/theme values are not changed.

## Brand Settings tabs

Brand Settings now exposes these sub-tabs in one consistent horizontal workspace: **Profile**, **Website Colors**, **Legal Info**, **Checkout**, **Maps & Reviews**, **Storage**, and **Login**.

- **Profile** keeps Brand Name, Tagline, Logo, Favicon, Floating WhatsApp Number, Admin Information Help and Marquee Tab Title Effect.
- **Website Colors** keeps the existing website color/theme editor.
- **Legal Info** keeps Legal Entity and Taxes.
- **Checkout** opens the existing checkout behavior and coupon controls.
- **Maps & Reviews** opens the existing map and review controls.
- **Storage** opens the existing storage capacity and Safe Cleanup controls.
- **Login** opens the existing Admin Security functionality, including admin display name, password, email and Google login.

The separate Settings-menu entries for Checkout, Maps & Reviews, Storage and Admin Security are removed from the sidebar because those functions are now reached through Brand Settings. The underlying panels, IDs, loaders, API routes and save functions remain in place so existing behavior is preserved.
