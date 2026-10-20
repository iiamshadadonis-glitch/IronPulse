# V1.39 verification
## Regression checks
`npm run test:dance-v1.39` runs the new release checks, conversion/deployment checks and the inherited V17.09 through V16.88 regression chain. Syntax and protected-file hash checks cover the new controller, middleware and unchanged business code.

## Browser checks
Headless Chromium runs the actual dashboard HTML and assets at 390 × 844, with every API request intercepted using synthetic data:
- Ten-second dashboard settling, pagination ownership, two-card sizing and containment.
- Subscription Customer/Class/Payment/Review isolation, validation, original submit payload, mode changes and local close/reopen.
- Plan full-screen bounds, step isolation, inline prices and help sheets.
- Orders fitted navigation, compact search icon, removed duplicate header badges and selected sheet ticks.
- Header alignment, Dashboard Refresh exception, Contacts containment and long-email wrapping.
- Growth metric carousel; real touch swipes forward and back on line/vertical/horizontal charts; smaller circular donut.
- Heat filters and engagement sheet.
- Four coach steps, absence of availability/remuneration in Coach Details, adding a slot without duplicated wizard, remuneration toggle.
- Refund side-by-side actions and local form close.
- Attendance two-column filters, compact counts, roster name/email spacing and shared value-column start.
- Admin desktop at 1366 × 900: no mobile controller styling, added wizard or floating Add button.
- Student/Coach settings, mobile full-screen profile launch/close.

No live Cloudflare deployment, real gateway transaction or exhaustive production-data combination was exercised. Internal screenshots are excluded from the replacement ZIP.

## Reproduce
Run the regression command above. With Playwright and Chromium available, run `npm run test:dance-v1.39:browser`. Optional environment variables: `DROPBEAT_PLAYWRIGHT_MODULE`, `DROPBEAT_CHROMIUM_PATH`, `DROPBEAT_TEST_OUTPUT`.

The archive is integrity-tested and the full regression command is rerun from a fresh extraction.
