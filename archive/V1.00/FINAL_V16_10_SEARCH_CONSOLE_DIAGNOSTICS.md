# V16.10 — Google Search Console sitemap diagnostics fix

This is an additive fix on top of V16.9. No existing theme/colors or unrelated business logic were changed.

## What changed

- Preserves the existing requirement that Google Search Console must be enabled and saved before sitemap submission.
- Makes that disabled-state error explicit instead of a generic “Request failed”.
- Keeps Test Connection usable while disabled, but now explains that Test is only a read check.
- Confirms/stores the OAuth scopes Google actually granted.
- Requires the Search Console read/write scope (`https://www.googleapis.com/auth/webmasters`) for sitemap submission and explains when a readonly token is the problem.
- Shows Search Console property permission level and OAuth access status in the admin card.
- Preserves Google HTTP status/reason/message in sitemap errors and classifies common 400/401/403/404/429/5xx failures.
- Stores the last detailed Search Console error so it remains visible after the card refreshes.
- Uses a dedicated frontend parser for Search Console actions so HTML/non-JSON failures also show an HTTP-level message rather than only “Request failed”.

## After deployment

1. Open Settings → Social Media API → Google Search Console.
2. Click Test Connection.
3. Turn on Enable Google Search Console.
4. Click Save Settings.
5. Click Submit Sitemap.
6. If the card reports a missing read/write scope, Disconnect and Connect Google Search Console again, approve access, then repeat Test → Enable → Save → Submit.
