# V1.23 verification

Run:

```bash
npm run test:dance-v1.23
```

The suite applies every D1 migration to a clean SQLite database and verifies holiday propagation, blocked holiday joins, identity reconciliation, automatically derived coach availability, global/custom/disabled leave rules, persistent schedule grids, and the corrected marketing OAuth grouping.
