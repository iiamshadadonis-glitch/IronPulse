# DropBeat Dance Studio V1.07 verification

Verification date: 25 September 2026 (UTC)

## Complete command

```bash
npm run test:dance-v1.07
```

Result: **passed**.

## Verified coverage

- All 44 production migrations apply successfully to a clean database.
- The admin first-paint shell is DropBeat-branded; the old login UI is hidden while authentication is pending.
- A valid session reveals the dashboard directly, while only a confirmed 401 reveals the login form.
- Admin and public requests use the V1.07 cache keys and document revalidation behavior.
- Active/draft Student Stories persist correctly, active stories reach the public endpoint, and failed saves return visible diagnostics.
- Plan badges use an opaque high-contrast DropBeat treatment.
- Plan mappings persist class type, batch name, coach, styles, start date, time, duration, weekdays and reminder rules.
- A paid mapped order becomes a current member and creates the next class reminder.
- Failed/cancelled payment lifecycle state becomes a past member, creates an admin notification, and can be acknowledged.
- A paid completed order remains a current member.
- Cancelled/holiday/leave occurrences are excluded from active calendars and are not recreated by later synchronization.
- Rescheduling replaces pending reminder times; recurring reminder generation skips blocked occurrences.
- Rescheduled one-off webinar reminders continue through the reminder processor.
- Public product responses include the class mapping and coach profile.
- Plan-specific server HTML contains title, canonical URL, social metadata and Course structured data; unknown plan URLs return 404/noindex.
- Static indexable pages contain title, description, canonical, Open Graph, Twitter and valid crawler-visible JSON-LD.
- Checkout, order lookup, payment outcomes and generic duplicate content shells are noindex.
- Custom pages have server-rendered metadata/structured data, saved aliases return 301, unknown slugs return 404, and the dynamic sitemap includes custom pages and plan details.
- Every earlier DropBeat regression and the inherited V17.09 through V16.88 regression chain passes.

No payment-gateway signature validation, checkout amount calculation, CRM contract, integration credential handling or DropBeat palette token was replaced.
