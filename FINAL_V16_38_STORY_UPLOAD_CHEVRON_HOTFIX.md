# V16.38 — Story/Status Upload + Header Chevron Hotfix

This is a narrow additive hotfix on top of the supplied V16.37 complete replacement. Existing payment, product, subscription, social-posting, Google Drive folder, crop, navigation-order, page, SEO and color-theme logic is preserved.

## Fixed

- Story / Status image uploads now send browser `FormData` without the incorrect `application/json` Content-Type header. This removes the Cloudflare `request.formData()` / MIME-type parsing error shown in the admin modal.
- Selecting a Story / Status image still uploads it immediately to Google Drive → `Story or Status Images`, and the returned public URL is filled into the existing Story / Status Image URL field automatically.
- The Story / Status file picker now uses the same modern pill-style Choose File control as Upload Product Image.
- The text `⌄ / ⌃` glyph beside expandable header items has been replaced with a theme-matching circular CSS chevron in the admin grid and header preview.
- Public website dropdown parents now show the same clean circular chevron, using the existing Urgent Casting theme variables and without changing the theme palette.
- Modified assets are cache-busted with `v=16.38` so the browser does not keep the older broken upload script after deployment.
