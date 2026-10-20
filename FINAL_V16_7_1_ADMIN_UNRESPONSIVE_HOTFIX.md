# V16.7.1 — Admin Unresponsive Hotfix

## Problem fixed
V16.7 introduced a global `MutationObserver` in `public/admin/final-v16-7-social-api.js` that watched the entire admin document. The observer called the Social Media API renaming function. That function wrote `textContent`, which generated another mutation, which called the observer again. This could create a continuous browser main-thread loop.

Symptoms matched the reported behavior:
- Admin controls stop responding to clicks.
- Dashboard values remain at their initial zero/loading state.
- Subscription Overview appears stuck on loading/fetching.
- Chrome displays **Page Unresponsive**.
- Refresh/login can appear to fail because the page JavaScript is blocked before normal admin initialization completes.
- Front-end pages remain normal because this script is loaded only by the admin page.

## Fix
- Removed the document-wide MutationObserver from the V16.7 Social Media API add-on.
- Kept Social Media API naming during normal initialization and Social Media API loading.
- Added value checks before changing title/description text, preventing unnecessary DOM writes.
- No payment, subscription, CRM, tax, email, order, authentication, color-theme, or existing Social Media API logic was changed.

## Deployment
Replace the complete project with this V16.7.1 package and deploy normally. No D1 reset, database deletion, secret change, payment-gateway reconnection, or domain change is required for this hotfix.
