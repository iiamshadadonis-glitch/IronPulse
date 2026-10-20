# V16.41 — X OAuth apiJson Hotfix + Pinterest Engagement Cleanup

## Scope
This release is intentionally narrow and additive. It does not change the website color theme, payment/subscription logic, social publishing rules, or existing Pinterest/Threads/Facebook/Instagram behavior.

## X / Twitter fix
- Added a shared `window.apiJson` compatibility helper before the V16.39/V16.40 social integration add-ons load.
- The V16.40 X Connect/Test/Disconnect code was calling `window.apiJson(...)`, but no global function with that name existed. This caused the browser-side error: `window.apiJson is not a function` before the OAuth request could reach `/api/admin/x-auth`.
- The helper delegates to the existing `window.api` transport whenever available, so authentication/session/error handling remains unchanged.
- X OAuth still uses the existing OAuth 2.0 Client ID, Client Secret, PKCE flow, callback route, user-token scopes and refresh-token logic introduced in V16.40.
- The Connected X User ID remains read-only and is filled automatically only after X redirects back successfully from OAuth. It is not an input the admin must type manually.

## Pinterest comments cleanup
- Removed the technical sentence about Pinterest API comment moderation from every Pinterest engagement row.
- The Pinterest grid now stays focused on the Pin, total comments, total reactions/likes, status and Resolve/Reopen action.
- Direct Pin links and all existing Pinterest synchronization/publishing logic are unchanged.
