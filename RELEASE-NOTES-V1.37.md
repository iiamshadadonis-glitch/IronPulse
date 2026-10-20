# Release Notes — V1.37

V1.37 is an additive mobile presentation release. The new runtime is finite and event-driven: it does not call APIs, poll, use a DOM observer, write browser storage, rename fields or replace business submit handlers.

The only earlier feature files changed are the legacy and currently loaded Growth Analytics canvas painters plus the Marketing Analytics canvas painter. They delegate phone rendering to the V1.37 presentation adapter when available; every original desktop painter remains the fallback and is unchanged in behavior.

Cache delivery uses:

- `/assets/dropbeat-dashboard-mobile-v1-37.css?build=dropbeat-1.37-20261013`
- `/assets/dropbeat-dashboard-mobile-v1-37.js?build=dropbeat-1.37-20261013`
- `X-DropBeat-Release: 1.37.0`
- no-store HTML/dashboard document headers
- immutable one-year caching for the uniquely named V1.37 assets

