# V16.47 Release Verification

V16.47 was built from the user-provided V16.46 complete replacement package.

Verified changes:
- Social Media API primary order: Facebook, Instagram, Threads, Pinterest, YouTube, X / Twitter, Snapchat, LinkedIn.
- Snapchat now separates Snapchat Business OAuth / Public Profile API credentials from the optional Snap Kit Client ID.
- Snapchat Business OAuth callback, token refresh, Public Profile discovery/test, allowlist diagnostics and server-side Story media publishing workflow added.
- YouTube and Snapchat use the existing compact Social Media API status badge classes.
- YouTube Comments synchronizes new comments across the entire connected channel, including existing videos, without bulk-importing historical comments.
- No CSS/theme file changed from V16.46.

Verification completed before packaging:
- 247 JavaScript files passed `node --check`.
- 277 relative JavaScript imports resolved with 0 missing imports.
- 65 CSS files compared against V16.46: 0 changed.
- 438 static HTML/CSS asset references checked: 0 missing.
- 65 Admin script references checked: 0 missing.
- 15/15 targeted V16.47 static integration checks passed.
- 4/4 runtime integration simulations passed (YouTube channel-wide new-comment sync, historical-comment exclusion, Snapchat Public Profile capability test, Snapchat encrypted media/story upload workflow).
