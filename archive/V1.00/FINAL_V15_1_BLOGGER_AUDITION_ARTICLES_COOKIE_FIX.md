# Urgent Casting V15.1 — Blogger Recovery + Audition Articles + Cookie/Footer Fix

This build is an additive update to V15.0. Existing admin/public theme files are intentionally unchanged.

## 1. Cookie preference / footer collision

`public/assets/consent.js` now calculates the visible footer position while the page scrolls. The cookie preference panel rises above the footer instead of covering the footer credit. If the WhatsApp button and consent panel would overlap, the WhatsApp button is moved above the consent panel.

## 2. Blogger OAuth recovery

The OAuth callback now preserves the Google refresh token even when Blogger API blog discovery fails. It stores the exact Blogger API error and exposes it in Admin → Settings → API Settings.

The connection checker retries the official `users/self/blogs` endpoint with ADMIN/AUTHOR/default views for legacy Blogger-account compatibility.

Admin recovery controls:

- Retry Blogger Check
- Manual Blogger Blog ID
- Use Blog ID
- Exact last Google/Blogger API error

Published Blogger posts can be synchronized into the local Audition Updates database using **Sync Published Posts**.

## 3. Auditions admin lifecycle

The Existing Auditions table includes:

- Edit
- Draft (moves a published post back to Draft and hides it from `/blog`)
- Delete (removes the synchronized Blogger post first, then the local copy)
- Publishing/sync status

A post created in the Urgent Casting admin is stored locally and synchronized to the selected Blogger blog. A post created directly in Blogger can be pulled into Urgent Casting with **Sync Published Posts**.

## 4. `/blog` editorial design

Only the Audition Updates page/article presentation was redesigned. Existing site theme variables, navigation and footer are reused.

The list page contains a maximum of 10 posts per page and provides:

- Latest audition articles
- Featured article
- Recent posts
- Most popular posts (based on local article page visits)
- Random picks
- Social links from Admin → Social Links
- Tags
- Pagination

Article pages contain:

- Post date
- Tags
- Consistent cover image
- Full article body
- More Audition Updates
- Featured/Recent/Popular/Random sidebar
- Social links and tags
- Name-based article comments

The public frontend never displays the word Blogger.

## 5. Comments

A new `blog_comments` D1 table is created automatically by `ensureSchema()` on the first API request. Comments support name + text and include a simple server-side anti-spam rate limit.

The old Facebook Comments social plugin is not used because Meta discontinued that plugin in February 2026. Facebook-authenticated commenting would require a separate Meta Login application and is intentionally not faked in this build.

## 6. Existing Blogger custom domain

An existing Blogger custom domain does not change the Blogger API Blog ID. Urgent Casting displays synchronized posts at `/blog/...` regardless of the Blogger-facing post URL. If `/blog` is the SEO-primary location, consider preventing the legacy Blogger site from being separately indexed to avoid duplicate versions of the same article.

## Validation performed

- All JavaScript files pass `node --check`.
- V15.1 migration syntax was validated against SQLite.
- CSS brace validation passed.
- Original V15.0 theme file hashes were compared and remain identical for the core public/admin theme files.
