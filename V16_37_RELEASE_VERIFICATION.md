# V16.37 Release Verification

Verification was run against the complete replacement tree before packaging.

## Automated checks

- JavaScript syntax: 231 files checked, 0 failures.
- Relative JavaScript imports: 252 checked, 0 missing.
- Local HTML asset references: 758 checked, 0 missing.
- V16.37 feature assertions: 30/30 passed.
- Static public pages using `app.js`: 20/20 include the V16.37 public navigation renderer.

## Functional mock/smoke checks

- Navigation model: Home fixed first; top-level ordering, child ordering, label editing and slug editing passed.
- Custom-page rename: old slug → HTTP 301; current slug loads; deleted slug → HTTP 410.
- Dynamic main sitemap: renamed navigation URL and current custom-page URL appear; admin-only routes remain excluded.
- Core/submenu navigation alias: current alias serves canonical page content; historical alias redirects to the new alias.
- Cloudflare Pages static alias path: `env.ASSETS.fetch()` branch passed.
- Google Drive Story/Status upload: Story or Status Images folder creation, file upload, public permission and returned URL persistence passed with mocked Drive API calls.

## Packaging checks

The final ZIP is also extracted into a clean verification directory after creation. JavaScript syntax/import checks and ZIP integrity are repeated on the packaged tree before delivery.
