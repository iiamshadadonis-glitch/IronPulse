# Urgent Casting V16.32 — Google Drive, image fit, checkout badge and saving-state fix

This release is additive to V16.31 and preserves the existing theme, checkout behavior, plan logic, product crop logic, social status logic and recommended-plan logic.

## Changes

1. Product Images no longer remains visually stuck on **Saving…** after the source image has already been saved. The button is restored before the separate website crop step and is also normalized whenever the Product Images modal is opened again.
2. Added a **Google Drive API** integration card in **Settings → Social Media API**, grouped with the other Google integrations. It includes an Enable toggle, API key field, optional public test-file URL, themed information/help flip card, Save Settings, Connect Google Drive, Test Connection and Disconnect actions.
3. Google Drive diagnostics verify a public Drive file against the configured Google Drive API key. The API key does not grant private Drive access; private files still require OAuth and are intentionally outside this additive change.
4. Offer Details keeps using the original product source image, but its 16:9 hero frame now uses cover fitting so smaller, larger, portrait and landscape sources fill the frame without blank bands. Product-card cropping is unchanged.
5. If the external Offer Details source image later fails, the page falls back to the saved website image instead of showing a broken image icon.
6. The public **Checkout** capsule keeps all existing cart/checkout logic, but selected-service quantity is now shown as a bright-red, white-number notification badge above the button. The badge is hidden when the count is zero and shows `99+` above 99.

## Scope protection

- No payment flow was redesigned.
- No plan pricing or availability logic was changed.
- No product-card crop behavior was changed.
- No existing color theme was modified; the only new fixed bright red is the explicitly requested notification badge.
- Existing social connections remain unchanged.
