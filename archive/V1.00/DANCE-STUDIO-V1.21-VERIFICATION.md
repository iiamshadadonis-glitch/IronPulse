# DropBeat Dance Studio V1.21 Verification

## Automated coverage completed

- all 51 existing migrations apply cleanly to a fresh SQLite/D1-compatible database
- holiday tables omit the subject while preserving clickable event names
- holiday end date is hidden by default and single-day holidays store the start date as the effective end date
- holiday messages retain multi-paragraph source text and render with preserved whitespace
- Google Drive file/share/download URLs convert to inline image URLs, including resource keys
- existing coach records retain a legacy-to-session fallback and new Teaching Availability sessions persist correctly
- Admin Add/Edit Coach contains all requested fields and deliberately excludes password entry
- active request domains replace stale Pages hosts; Search Console uses the active property and `/sitemap.xml`
- static and dynamic robots output use the standard sitemap path
- Gmail identity and `gmail.send` verification are required before mail/OTP paths report ready
- Gmail OAuth/test paths use Google user information rather than the scope-incompatible Gmail profile endpoint
- protected colour-theme stylesheet hashes remain unchanged
- complete inherited DropBeat V1.01–V1.20 and V16.88–V17.09 regression chain
- deployment structure and D1 binding checks
- JavaScript syntax parsing for 471 production and test files

## Verification command

```sh
npm run test:dance-v1.21
```

The complete command finished successfully before the replacement ZIP was created.

## Additional release audit

- no production reference remains to the incorrect `dance-class.pages.dev` host except the intentional middleware compatibility replacement that upgrades old stored links to the current origin
- no production reference remains to the incorrect `dance-classes-sitemap.xml` integration URL
- no production value hard-codes `dropbeatdance33@gmail.com`
- ZIP integrity is tested after packaging

## Theme preservation

V1.21 adds one scoped stylesheet for holiday/coach layout and reuses the existing theme variables. Existing colour-theme files were not edited.
