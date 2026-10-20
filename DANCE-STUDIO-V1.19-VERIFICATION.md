# DropBeat Dance Studio V1.19 Verification

## Automated coverage

- all 51 migrations apply to a clean SQLite/D1-compatible database
- Thursday 8 October 2026 purchase with Monday/Tuesday/Wednesday teaching starts on Monday 12 October 2026
- no sessions appear before an effective first-enrolment start
- explicit 28 September 2026 batch produces only 28, 29 and 30 September occurrences in that month
- student attendance totals are calculated from the student's membership start
- approved coach leave blocks the affected session and creates a leave marker
- studio holiday blocks the affected session and creates a holiday marker
- Schedule includes coaches and exposes current/past student and review metrics
- attendance and Schedule interfaces contain fixed-width tables, independent cards and clickable profile controls
- full inherited DropBeat V1.01–V1.18 and V16.88–V17.09 regression chain
- JavaScript syntax checks for every changed production script

## Verification command

```sh
npm run test:dance-v1.19
```

The complete suite passed before the replacement ZIP was created.

## Theme preservation

No existing brand/theme stylesheet was edited. V1.19 adds scoped attendance/Schedule rules that reuse the existing primary and accent variables.
