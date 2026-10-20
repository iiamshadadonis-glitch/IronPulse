# V1.24 verification

Run:

```bash
npm run test:dance-v1.24
```

The suite applies every D1 migration to a clean SQLite database, runs the new V1.24 regression checks, and then runs every inherited DropBeat and V17.09 test. It verifies:

- immediate, non-blocking Schedule Meeting dialog activation;
- offline meeting persistence and Scheduled Events retrieval;
- modal close/error recovery safeguards;
- holiday delivery for pending portal users and deduplicated lead/member/customer email addresses;
- pending-user dashboard holiday access;
- coach last-payment persistence and remuneration/leave details;
- compact Schedule typography and the non-scrolling Coach Settings layout;
- migration ordering, package version and cache-busted frontend assets.
