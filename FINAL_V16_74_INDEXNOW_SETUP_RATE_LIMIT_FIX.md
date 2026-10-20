# V16.74 — Bing / IndexNow Setup, Verification and Rate-Limit Safety

## What was wrong

The IndexNow integration itself uses the correct `api.indexnow.org/indexnow` protocol endpoint, but the Admin wording made it too easy to confuse the **Bing Webmaster Tools API Access key** with the separate **IndexNow verification key**. IndexNow verification keys are intentionally served from a public key-location URL so search engines can validate ownership; Bing Webmaster API Access credentials should not be reused for that purpose.

A second usability problem was that a previous URL-submission error was stored in `lastError`. After an HTTP 429, refreshing the Admin page could redisplay the old error beside a later successful configuration test and make it look as if the refresh/test generated another IndexNow request.

## V16.74 changes

1. The field is now **IndexNow Verification Key** and explicitly says not to use Bing Webmaster Tools → API Access.
2. **Generate New IndexNow Key** creates a protocol-safe 32-character key in the browser.
3. **Test Connection** validates the key format and checks the public `/indexnow-key.txt` verification response. It does not call the IndexNow submission API.
4. URL submission validates that the submitted URL hostname matches the hostname that serves the verification key.
5. The same URL is not resubmitted within 10 minutes.
6. Navigation SEO refreshes submit multiple changed URLs in one IndexNow request instead of one request per URL.
7. HTTP 429 activates a one-hour default safety cooldown (or honors `Retry-After` when supplied). No further IndexNow network request is made during that cooldown.
8. Submission history (`lastSubmitError`, status, URL, cooldown) is separated from connection-test errors, so an old 429 is labeled as stored history rather than a new failure on refresh.
9. The key-file response sends `X-Robots-Tag: noindex, nofollow`.

## Bing Webmaster Tools site verification

Bing Webmaster Tools ownership verification is separate from IndexNow. The user does not paste the Urgent Casting **Key Verification URL** into Bing Webmaster Tools. For a non-coder, the easiest verification path is to import a verified property from Google Search Console. Bing also supports XML, HTML meta-tag and DNS/CNAME ownership methods.

The existing Urgent Casting **Settings → Tracking → Bing Webmaster Verification** field remains unchanged for the `msvalidate.01` value. No theme or existing tracking logic was changed.

## Security note

If a Bing Webmaster Tools API Access key was previously pasted into the old IndexNow field, rotate/revoke that Bing API credential because the old build may have exposed the saved value at the public IndexNow key-verification endpoint. Then generate a new dedicated IndexNow key in V16.74.
