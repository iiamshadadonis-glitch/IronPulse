# DropBeat Dance Studio V1.12 Verification

## Result

`npm run test:dance-v1.12` completed successfully on 26 September 2026.

The command runs the V1.12 regression checks followed by the complete inherited
DropBeat and platform verification chain through V17.09.

## V1.12 checks

- All 47 SQL migrations apply to a clean SQLite database.
- Settings → Pages receives Manisha and Sathvik from the complete coach list.
- The Online Classes filter returns only the online coach.
- The Offline Classes filter returns only the studio coach.
- A class-specific response cannot replace the canonical all-coach directory.
- Sales is initialized immediately; the old 5.2-second and 7.6-second startup
  delays are absent.
- Active V1.12 admin and public assets and cache namespaces are present.
- Manisha's supported Bharatanatyam and Kuchipudi styles are accepted.
- Hip Hop is rejected for Manisha by server validation.
- Assigning an offline-only coach to an online class is rejected.
- Plan Feature fields expose an 80-character limit and live character counter.
- Offer Details uses the reduced main-heading hierarchy.
- Public and admin brand hooks update saved name, logo, and tagline values.
- Dynamic public plan guidance uses the current saved brand name.

## Inherited regression checks

- Cloudflare Pages deployment configuration and D1 binding
- Admin authentication, dashboard, navigation, Sales, and Brand Settings
- Plans, offers, subscriptions, one-time links, checkout, payments, and refunds
- Coach schedules, start-date validation, replacements, sessions, and members
- CRM, contacts, analytics, inbox, posts, notifications, and automations
- Student Stories, banners, public coach cards, SEO, sitemap, and static routes
- One-time access expiry, Track Order, student removal, and Past Members

The final ZIP is also extracted into a clean temporary directory, its complete
test chain is rerun from that extracted copy, and `unzip -t` verifies archive
integrity before delivery.

