# V16.47 — Snapchat Public Profile API, YouTube channel comments, Social API order

- Reorders Social Media API cards: Facebook, Instagram, Threads, Pinterest, YouTube, X / Twitter, Snapchat, LinkedIn.
- Replaces the V16.46 Snap-Kit-only placeholder with separate Snapchat Business OAuth + Public Profile API fields and an optional Snap Kit Client ID.
- Adds Snapchat Business OAuth callback, token refresh, Public Profile discovery/test, and allowlist-aware capability diagnostics.
- Adds server-side Snapchat Public Profile Story publishing using encrypted media creation, multipart upload/finalize and Story publish when Snapchat has allowlisted the OAuth Client ID.
- Keeps Snap Kit separate for Login Kit / user-confirmed Creative Kit sharing.
- Uses the existing compact status badge styling for YouTube and Snapchat.
- YouTube Comments now monitors new comments across the entire connected channel, including existing videos. Historical comments are not bulk-imported.
- Existing color/theme files are unchanged.
