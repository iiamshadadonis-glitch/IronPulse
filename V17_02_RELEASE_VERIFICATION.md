# V17.02 verification

The test `npm run test:v17.02` covers a returning visitor, a one-time visitor, linked customer identity, latest nonempty IP/location, repeat-only filtering, the Excel response, old databases missing optional visitor columns, explicit database read failures, and a paid order represented by a synthetic negative subscriber ID. It also runs the V17.01 through V16.88 regression checks.

All JavaScript files are checked with `node --check`. The ZIP is extracted into a fresh directory and the suite is run again from the extracted code. These checks use local representative records; production Cloudflare D1 row counts and live account data are not part of the local test environment.
