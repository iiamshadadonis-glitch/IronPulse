# IronPulse Gym — V1.00

Complete gym/fitness fork of DropBeat V1.59 for Cloudflare Pages, Pages Functions/Workers and a separate D1 database.

**Start with [START-HERE.md](START-HERE.md).** Windows setup and deploy helpers are included.

- IronPulse branding, members, memberships, fitness specialties and Fitness Tips.
- Existing colour themes, components and business workflows retained.
- `/member-dashboard`, with redirects from the old student dashboard URLs.
- Database tables, columns, account roles, API endpoints and JSON keys remain compatible.
- Dynamic menu/button labels come from shared configuration; unloaded labels show skeletons, and failed requests offer Retry.
- New gym imagery, logo, PWA icons, maskable icons and Apple Touch Icon.

Verification: `npm ci`, `npm test`, `npm run build`. Browser checks: `npx playwright install chromium`, then `npm run test:gym:browser`. Real local Cloudflare checks: `npm run test:gym:runtime`. Node 24 was used for verification.

See [RELEASE-VERIFICATION-GYM.md](RELEASE-VERIFICATION-GYM.md) for coverage and small routing/authentication changes. Historical DropBeat/UC notes and version guards remain as upstream history; `npm test` is the current release suite.

This ZIP contains source and setup helpers. No original dance deployment credentials or resource IDs are configured. Create and connect the gym's live Pages project, D1 database, gateways and Google accounts using the setup guide.
