# V1.38 verification

## Passed checks
- Complete current release chain: `npm run test:dance-v1.38` (conversion/deployment and inherited V17.09 through V16.88 tests).
- Syntax checks for the new controller and middleware.
- SHA-256 invariance checks for schema, portal login, order creation, payment gateway library, public app, admin core, coach/class handlers and portal core.
- Real headless Chromium at 390 × 844: original V1.37 reproduces duplicate dots and changed card widths after delayed installers. V1.38 stays stable through a ten-second settling period and carousel swiping does not overflow the document.
- Full-screen Create Subscription viewport bounds; separate Customer/Class/Payment/Review steps; invalid amount blocks Continue; original subscription submit receives customer name, class name and ₹349.
- Subscription/one-time mode isolation; X stays in Sales; reopening works.
- Plan dialog viewport bounds and separate first/second steps, inline plan price row, floating Add button, help bottom sheet preserves current form.
- Orders four primary tabs, three status segments, single search toggle, three bucket header icons; customer search toggle and dark-mode visibility.
- Admin desktop at 1366 × 900: mobile controller inactive; no added form wizard or floating Add button.
- Student and Coach mobile navigation/settings, profile form launch and full-screen local close.

Browser fixtures intercept all API requests and use synthetic data. They exercise the actual HTML, CSS, JavaScript and existing submit handler, without real payment charges or live customer accounts. Live Cloudflare deployment, real gateway transactions and every possible production dataset were not exercised.

## Reproduce
Run the standard regression suite as above. For the Chromium behavior suite, install Playwright in your test environment and run `npm run test:dance-v1.38:browser`. Optional environment variables `DROPBEAT_PLAYWRIGHT_MODULE`, `DROPBEAT_CHROMIUM_PATH`, `DROPBEAT_TEST_OUTPUT` select an existing browser/module and output directory. Test screenshots stay local and are not part of this replacement archive.

## Scope
This is a presentation/controller correction to the supplied V1.37 package. No schema or migration was added. Desktop business handlers and saved brand colors were preserved. The final ZIP is integrity-tested and its freshly extracted copy runs the same regression suite.

