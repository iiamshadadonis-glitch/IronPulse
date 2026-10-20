# V1.25 verification

Run:

```bash
npm run test:dance-v1.25
```

The suite applies every D1 migration to a clean SQLite database, runs the new V1.25 checks, and then runs the complete inherited DropBeat and V17.09 regression chain. It verifies:

- isolated Schedule Meeting delegation occurs before the legacy modal path;
- the form is inserted before optional network requests and has timeout, Close, backdrop and Escape recovery;
- Online Class, Offline Class and Demo event types persist and return under Scheduled Events;
- all complete HTML pages load the system-aware mode controller and dark-mode stylesheet exactly once;
- sun/moon state, device preference and saved user override wiring;
- Add/Edit Coach remuneration fields are hidden and disabled behind an accessible switch;
- JavaScript syntax, package version, migration ordering and cache-busted V1.25 assets;
- every inherited backend, migration, dashboard, payment, schedule, attendance and integration regression.
