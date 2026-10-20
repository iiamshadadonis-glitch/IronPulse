# Urgent Casting V16.8 — Social Publishing + Search Submission

This build continues V16.7.1 and keeps the V16.7.1 admin-unresponsive hotfix intact.

## Changes

- Corrected the email designer credit everywhere to **Instautomate** with the existing clickable `https://instautomate.com` link.
- Facebook, Instagram, LinkedIn and X / Twitter now have:
  - Automatically publish new Auditions toggle
  - Save Settings
  - Connect platform
  - Test Connection
  - Disconnect
  - Connected / Disconnected summary badge while the platform is enabled
  - expanded solution-oriented themed information help
- Social Media API card order is now:
  1. Facebook
  2. Instagram
  3. Threads
  4. X / Twitter
  5. LinkedIn
  6. Pinterest
  7. Google Search Console
  8. Google Indexing API (eligible pages only)
  9. Bing / IndexNow
  10. Gmail / Email
  11. WhatsApp Webhook & Order OTP
- New Google Indexing API card:
  - service account email/private key
  - eligibility confirmation
  - automatic eligible URL submission
  - test/manual submission action
  - deliberately blocked from enabling unless eligibility is confirmed
- New Bing / IndexNow card:
  - API key
  - automatic publication notification
  - root key-verification URL at `/indexnow-key.txt`
  - test/manual URL submission
- Threads and Pinterest connection URL is described as a connection callback URL because their outbound API authentication uses OAuth redirects, not incoming webhooks.
- Existing website article publication remains non-blocking: if any external social/search API fails, the Urgent Casting Audition article stays published and the external failure is recorded separately.

## Important Google restriction

Google's Indexing API is not for ordinary blog pages. It may only be used for pages that meet Google's supported JobPosting or livestream BroadcastEvent requirements. Normal Audition/blog discovery continues through Search Console sitemap submission. The V16.8 UI makes this limitation explicit and requires an eligibility confirmation before the Indexing API can be enabled.

## Yahoo

Yahoo's official site-submission guidance directs website owners to Bing Webmaster Tools. Therefore V16.8 does not create a fake or unsupported Yahoo API connection. Bing / IndexNow is the correct search-submission integration added to this build.
