# DropBeat Dance Studio V1.03 – verification record

## Completed checks

- Focused V1.03 regression: passed across all 23 customer-facing HTML pages.
- Complete inherited `test:dance-v1.02` / `test:dance` chain: passed through application V17.09 and data tests V16.88.
- Simplified Book a Trial submission against a fresh in-memory schema: passed.
- Cloudflare Pages deployment configuration and static asset-reference validation: passed.
- JavaScript syntax validation: passed for 394 JavaScript/module files.
- Cloudflare Functions module import graph: passed for 204 modules.
- Fresh database initialization: passed for all 42 migrations.
- HTML parser validation: passed for 25 HTML documents.
- CSS structural validation: passed for `dropbeat-theme.css` and `dropbeat-admin-theme.css`.
- Key changed-surface contrast checks: passed; minimum checked ratio was 6.28:1.
- Local HTTP smoke checks: passed for home, offers, Dance Tips list/detail, Book a Trial, Admin, both final themes, public terminology and V1.03 admin behavior.

## V1.03 regressions covered

- Brand Settings no longer inherits red/pink capsule tabs.
- Legacy grid wrappers, headers and cells inherit Dropbeat neutral surfaces and indigo/mauve tokens.
- Analytics Calendar and Posts Scheduling calendars no longer use the old cream/maroon presentation.
- Polls is cleared when another post type is selected, including after dynamic workspace rebuilds.
- Admin article presentation uses Dance Tips wording.
- All static and dynamic website menu/footer links use Dance Tips for `/blog`.
- Offers uses equal top-level spacing, no dropdown arrow and readable submenu text on the home hero.
- V1.03 query cache busting is present on every public page and the final admin assets.
- Critical public Dropbeat assets require cache revalidation through `_headers`.

## Primary verification command

```bash
npm run test:dance-v1.03
```

## Release boundaries

No D1 schema, payment, subscription, authentication, publishing API, CRM, integration credential, automation or checkout business logic was changed in V1.03.
