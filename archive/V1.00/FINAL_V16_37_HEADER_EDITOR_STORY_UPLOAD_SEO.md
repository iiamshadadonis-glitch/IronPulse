# V16.37 — Header Editor, Nested Menu Control, Story Upload and SEO Routing

This is an additive update on top of the supplied V16.36 replacement build. Existing colors, checkout/payment logic, product logic, dual product-image crops, social publishing rules and the rest of the website workflow remain unchanged unless required by the features below.

## 1. Website Header Order is now an editable grid

Admin → Website Content → Pages → New Page now shows the Website Header Order as a named grid with Order, Header / Menu Name, URL Slug, Type, Sub-options and Actions.

- Home is always position 1. It cannot be moved, renamed or assigned another slug.
- Other movable header items keep the existing up/down ordering workflow.
- Edit opens a small modal with the current Header Name and URL Slug already filled in.
- Changing only the visible label is supported.
- Changing only the slug is supported.
- Changing both at once is supported.

## 2. Nested/submenu editing

A header item that owns sub-options is visibly expandable. Offers currently exposes Memberships, Festival Offers and Yearly Plans, plus any custom page that is assigned beneath Offers.

When expanded, each sub-option has its own order number, up/down controls and Edit action. Its visible submenu name and URL slug can be changed independently.

The Admin Header Preview uses the same navigation model. Expanding a parent in the Website Header Order also opens that parent in Header Preview, and sorting/renaming is reflected there immediately. The public website continues to use hover/focus behavior for dropdowns.

## 3. Safe URL behavior

Core pages keep their underlying page implementation intact. If a core header or built-in submenu slug is changed, the public menu uses a safe `/nav/...` alias that serves the existing page content rather than moving/deleting the original page files.

Custom pages continue to use `/page/<slug>`. When a custom-page slug is renamed, its prior slug is retained as a permanent redirect to the new slug. A deleted custom-page slug is returned as HTTP 410 instead of silently looking like a valid page.

## 4. Sitemap/schema/search refresh

`/sitemap.xml` is now generated from the current navigation/custom-page data, so active renamed navigation aliases and current custom-page slugs are reflected automatically. Deleted custom pages are no longer included.

Navigation and page create/edit/delete operations schedule a main-sitemap refresh to the connected Google Search Console integration and submit changed URLs through the existing IndexNow integration when enabled. The public header also writes a current `SiteNavigationElement` JSON-LD graph, while custom pages write current `WebPage` metadata/canonical information.

## 5. Story / Status image upload fix

In Plans & Offers → Images, turning on Post as social status still reveals the separate Story / Status image controls.

When Google Drive upload is available:

1. Choose an image in Upload Story / Status Image.
2. The browser immediately uploads it to the configured Google Drive root → `Story or Status Images`.
3. The returned public Google Drive URL is automatically inserted into Story / Status Image URL.
4. The URL field is therefore optional when an uploaded file is used.
5. Save Image then continues through the existing social-status publishing workflow.

The native browser error “Please fill out this field” no longer occurs merely because the URL field was left blank after a successful upload. The existing safeguard still requires at least one Story/Status source whenever social-status posting is enabled.

The immediate-upload state is remembered so Save Image does not upload the same selected Story/Status file twice.

## 6. Compatibility notes

- Existing Product Image upload and Product Image URL behavior is preserved.
- Existing 900 × 1100 Product Card and 1280 × 720 Offer Details dual-crop behavior is preserved.
- Existing Google Drive root folder and Plans and Offers folder are preserved.
- Existing social platform publishing logic is preserved; the new Story/Status upload only supplies the public social-image URL to that workflow.
- Existing theme colors are unchanged.
