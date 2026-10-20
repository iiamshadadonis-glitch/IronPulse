# V16.88 release verification

## Scope verified

- Paid recurring order → active Subscriber read reconciliation
- Database-backed ₹101 subscription reconciliation without a Subscriber write
- New-only Inquiries and Requests parent badges
- Analytics navigation, chart modes, custom colors and help controls
- Calendar/list views, selected dates, category details and Client Details routing
- Hidden-tab polling guards, safer intervals and dashboard memoization
- D1 analytics/reconciliation index migration
- No new D1 database or Telegram polling process

## Commands

```sh
npm run test:v16.88
find public functions -name '*.js' -print0 | xargs -0 -n1 node --check
unzip -t urgent-casting-complete-replacement-v16.88.zip
```

The downloadable archive is also extracted into a fresh temporary directory and the V16.88 smoke suite is rerun from that extracted copy before delivery.
