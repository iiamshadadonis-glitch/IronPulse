# DropBeat Dance Studio V1.05

V1.05 is a complete replacement package based on V1.04. Existing commerce, payment, CRM, automation, analytics, publishing and brand-theme logic is retained.

## Fixes in this release

- Student Stories now use a directly bound form handler, visible error reporting, a focused legacy-table repair and a fresh verification read before success is shown.
- Active Student Stories remain available through the no-store public endpoint, and a successful story change invalidates the exact cached home snapshot before the admin request completes.
- Brand Settings tabs switch the visible panel and selected state immediately. Each existing panel loader runs once in the background, so slow API responses no longer leave the previous tab highlighted for 10–30 seconds.
- Existing DropBeat Studio Images now use the same fixed five-column action layout as Home Banners, with inline circular Sort, Edit and Delete controls.
- The Offers menu retains its hover submenu but no longer renders the separate circular dropdown chevron.
- DropBeat frontend and admin asset URLs advance to V1.05 cache keys.

## Verification

```bash
npm run test:dance-v1.05
```

This command runs the focused V1.05 verification first, followed by the complete earlier DropBeat and inherited V17.09 regression chain.
