# V16.73 — SEO Connection & Google OAuth Recovery

## Purpose

V16.73 is a focused SEO reliability update built on V16.72. It does not redesign the website, change the existing color theme, or alter the V16.72 D1 subscription/inbox optimization strategy.

## Root cause found

The SEO Connection card was originally created by the older Blogger/SEO module. A later integrations renderer was intended to move it into the SEO tab, but the relocation code searched only social-integration cards. Because of the newer integrations stability guard, the older fallback relocation was skipped. The result was exactly the UI seen in the screenshots: SEO Connection silently remained under API Settings while the SEO tab began with Bing / IndexNow.

## Changes in V16.73

### 1. SEO Connection restored to the SEO tab

The SEO tab order is now enforced as:

1. SEO Connection
2. Bing / IndexNow
3. Google Indexing API
4. Google Search Console
5. Google Business Profile

SEO Connection is no longer intentionally presented inside API Settings. A final reliability layer also re-homes the card if an older renderer attempts to move it later.

### 2. Clear Google OAuth recovery diagnostics

When Google reports that the stored refresh token is expired or revoked, the admin no longer receives only `Request failed` or a generic action error.

The application now returns and understands the typed diagnostic:

`SEO_RECONNECT_REQUIRED`

The admin is told to:

1. Open **Settings → Integrations → SEO**.
2. Open **SEO Connection**.
3. Click **Connect SEO**.
4. Complete Google authentication again.
5. Choose the saved SEO Name / Blogger publication.
6. Click **Save SEO Connection**.

**Retry SEO Check** remains a connection health check. **Connect SEO ID** remains a fallback for selecting the numeric publication ID; neither is presented as the cure for an expired Google refresh token.

### 3. Solution-oriented SEO Connection help

The SEO Connection information panel now explains the full setup and recovery path, including the required OAuth redirect URL and the correct order of the Connect / Select SEO Name / Save actions.

### 4. Reconnect state is idempotent

The backend records `reconnect_required` only when the saved state actually changes. Repeated failed health checks do not repeatedly write the identical reconnect diagnostic back to D1.

### 5. Public Audition Updates outage fallback

The public `/blog` endpoint still prefers the live connected SEO/Blogger source. If Google OAuth is temporarily unavailable, it now attempts to return the last synchronized, already-published audition entries from `audition_post_cache` instead of immediately blanking the public Audition Updates page.

This fallback is deliberately read-only. It does not fabricate new audition posts and it does not replace the normal SEO/Blogger connection. If no synchronized cache exists, the original error behavior remains.

### 6. Location wording corrected

Older help text that told the admin to open **Settings → API Settings** for SEO has been updated to **Settings → Integrations → SEO**.

## Google OAuth operational note

A saved OAuth connection can still require reauthentication if Google invalidates or revokes its refresh token. A common development-time cause is an OAuth consent configuration left in Testing mode, where refresh-token lifetime can be limited. For a production website, review **Google Auth Platform → Audience / publishing status** and complete Google's production/verification requirements that apply to the scopes in use.

V16.73 cannot prevent Google from revoking a token, but it now identifies this condition correctly, guides the admin to the right action, and keeps the public audition page usable from synchronized cache when available.

## D1 baseline recorded for later comparison

User-provided Cloudflare D1 screenshot on **2026-09-03 around 12:40 IST**, after V16.72 deployment:

- Rows read: **690.28K**
- Rows written: **25.81K**
- Queries: **42.71K**
- Total storage: **12.46 MB**
- Metered storage: **120.83 kB-mo**

V16.73 makes no broad polling or subscription-refresh redesign. This baseline should therefore remain useful when comparing V16.72/V16.73 D1 behavior later in the day.

## Theme and existing behavior preservation

- No CSS files were changed from the supplied V16.72 package.
- Existing colors/theme were not changed.
- Existing Facebook, Instagram, WhatsApp, automation and payment logic was not redesigned.
- V16.72 subscription revision polling and D1 optimizations remain intact.
