# Urgent Casting V16.7 — Payment Sharing + Social Media API

This build is an additive update on top of V16.6. Existing checkout, payment gateways, tax/trial behavior, CRM, invoices, statements, subscriptions, Blogger/SEO publishing, theme colors, and public styling are preserved.

## Generate Payment

The Client Details → Generate Payment dialog now includes **Send via WhatsApp** and **Send via Gmail** alongside Back and the existing Generate button for QR, one-time payment links, standard subscriptions, and customized subscriptions.

- Send actions create the payment request once when required and then reuse that same generated order/payment request for delivery.
- Subscription requests share the Urgent Casting `/payment?order=...&subscription=...` URL so the customer lands on the existing final secure payment screen.
- One-time payment links share the payment-gateway URL already created by the existing gateway/fallback logic.
- QR requests use the native public gateway QR image when the selected gateway returns one (for the existing Razorpay QR flow). Gmail displays that QR inside the branded payment-request email and WhatsApp sends it as an image. If a fallback gateway returns only a secure payment URL, the message safely sends that payment URL instead of attempting to send a broken image.
- Solution-based errors point the admin to Settings → Social Media API when Gmail or WhatsApp is not connected.

## Branded email links

Every email that uses the shared branded email template now keeps the copyright line non-clickable, makes the header logo link to the public brand website, and makes only **Instautomate** in the designer credit a blue link to `https://instautomate.com`.

## Settings → Social Media API

The admin menu and page title now use **Social Media API**. Existing Facebook, Instagram, WhatsApp, LinkedIn, X/Twitter and Gmail behavior remains unchanged. Three new collapsible integration cards are added:

### Google Search Console

- OAuth 2.0 Web Application connection.
- Copyable OAuth redirect URL.
- Property URL and sitemap URL fields. The default is the new dynamic `/auditions-sitemap.xml`, which lists individual published Audition article URLs from the existing cache. It is also declared in `robots.txt` alongside the existing core sitemap.
- Save, Connect, Test, Submit Sitemap and Disconnect controls.
- Enable toggle.
- When enabled, publishing an Audition triggers background sitemap re-submission. This does not block the Audition if Google is temporarily unavailable.
- The help card explains that Google’s general Search Console API does not offer an ordinary-page “Request Indexing” endpoint; Google’s separate Indexing API is restricted to eligible JobPosting/livestream BroadcastEvent content.

### Threads

- Meta Threads App ID/Secret + OAuth connection.
- Copyable OAuth redirect URL.
- Enable toggle and separate automatic-Audition-publishing toggle.
- Save, Connect, Test and Disconnect controls.
- On a new published Audition, the website creates a Threads media container and publishes it in the background. A public cover image is used when available; otherwise a text post is used.
- A D1 delivery log prevents the same article/platform combination from being published twice after a successful delivery.

### Pinterest

- Pinterest App ID/Secret + OAuth connection using `boards:read`, `boards:write`, `pins:read`, `pins:write` and `user_accounts:read` permissions.
- Copyable OAuth redirect URL.
- Board ID and connected-board confirmation.
- Enable toggle and automatic-Audition-publishing toggle.
- Save, Connect, Test and Disconnect controls.
- On a new published Audition with a public Cover Image URL, the website creates a Pin with the title, article link and cover image in the configured board.
- Missing cover images or API failures are recorded as integration errors and never block the website article itself.

## Database

`social_publish_log` is created by the existing automatic runtime schema initializer. `migrations/0025_v16_7_social_publish_log.sql` is included only as a matching optional migration for repository completeness; no manual D1 SQL is required for the normal deployment flow.
