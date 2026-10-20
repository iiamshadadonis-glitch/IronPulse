# V16.42 — X Automatic Publishing + Exact Write Diagnostics

Targeted additive release based on V16.41.

- Preserves the existing OAuth 2.0 + PKCE X connection flow and all existing platform logic.
- X **Test Connection** now verifies profile authentication and reaches the real `POST /2/tweets` route using an intentionally invalid empty request, so it does not create a public post. This is treated as a route/authentication check, not proof that a real Post was created.
- Adds an explicit **Test Posting** button for X. It creates one hidden/nullcast test containing the Urgent Casting URL and deletes it immediately. This is the exact real create/delete verification and may use normal X pay-per-use API credits.
- X API error parsing now understands modern `detail`, `title`, `type`, `reason`, and `errors[]` responses.
- X diagnostics distinguish authentication, missing `tweet.write`, client/project enrollment, pay-per-use credits/billing, usage cap, rate limit, and invalid-request problems.
- Automatic X publishing uses the authenticated user-context token, calls the current `POST /2/tweets` create endpoint, requires a returned Post ID, and stores the exact resulting X Post URL.
- Automatic X publishing preserves the Urgent Casting article URL at the end of the Post instead of allowing a long summary to truncate it.
- Transient 5xx/network failures receive one safe retry. Provider permission/billing errors are not blindly retried.
- The X capability check now displays the last automatic-publish result and exact provider diagnostic so background publication failures no longer disappear silently.
- No CSS/theme file was modified.
