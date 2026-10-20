# DropBeat Dance Studio V1.20 Verification

## Automated coverage

- all 51 existing migrations apply cleanly to a fresh SQLite/D1-compatible database
- Schedule belongs to the persistent Webinars navigation definition
- coach, student-roster, session-review and holiday dialogs use the required open/close lifecycle
- Leave and Holiday sections use direct tabs rather than dropdown accordions
- zero-count badges are hidden completely
- session reviews expose student, class, rating and written comment details to admin
- Request Info stores the administrator question, notifies the coach and keeps the leave pending
- V1.19 effective-start and non-backfilled attendance behavior remains covered
- full inherited DropBeat V1.01–V1.19 and V16.88–V17.09 regression chain
- JavaScript syntax checks for every changed production script
- protected theme stylesheet hashes remain unchanged

## Verification command

```sh
npm run test:dance-v1.20
```

The complete suite passed before the replacement ZIP was created.

## Theme preservation

V1.20 adds one scoped interaction stylesheet that reuses the existing primary, accent, line and text variables. Existing brand/theme stylesheets are not modified.
