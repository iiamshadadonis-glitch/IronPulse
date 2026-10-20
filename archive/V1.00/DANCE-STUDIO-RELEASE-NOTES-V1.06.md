# DropBeat Dance Studio V1.06

V1.06 is a complete replacement package based on the supplied V1.05 package. Existing commerce, payment, CRM, automation, analytics, publishing and DropBeat theme logic is retained.

## Fixes in this release

- Fixed the root cause of silent Student Story saves: a legacy collapse-card helper copied the visible fields but discarded the actual `<form>` element. The helper now moves and preserves the real form node.
- Added a final, document-level Student Story save controller that continues to work if another admin add-on rebuilds the panel.
- Added a 25-second request timeout, persistent success/error reporting, unique diagnostic references and server-side write verification. A failure can no longer return silently.
- Verified both Active and Draft Student Stories. Both appear in the admin grid; only Active stories appear on the public website.
- Made plan badges opaque and high-contrast on Home and Offers product cards using the existing DropBeat primary purple and white palette. No theme colors were replaced.
- Advanced frontend and admin cache keys to V1.06 and added HTML shell revalidation so ordinary refreshes discover the new assets.

## Verification

```bash
npm run test:dance-v1.06
```

This runs the focused V1.06 verification followed by all earlier DropBeat and inherited V17.09 regression tests.
