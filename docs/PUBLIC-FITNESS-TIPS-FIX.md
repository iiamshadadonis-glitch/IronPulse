# V1.05 public Fitness Tips fixes

## Single-post featured image

The backend stores a cover at the start of generated post HTML and also returns cover_image_url. Its existing leading-cover cleanup can leave a copy when the HTML contains an escaped ampersand or a different image wrapper. The public renderer then adds its hero and the retained body cover, producing the two stacked images shown in the screenshot.

The final active public renderer, public/assets/final-v15-4-seo-comments-blog.js, now filters matching cover images from a detached copy of the sanitized body before rendering. It resolves relative URLs and HTML entities, ignores URL fragments, and recognizes supported Google Drive file URL variants. Other query-string variants remain distinct. Empty image wrappers are removed while captions and other content survive.

Filtering runs before the existing advert insertion. Separate illustrations, sponsored images, comments, share controls and the original post DTO are retained. Saved post content, Blogger publishing, API responses and backend code are unchanged. The display is assembled once; the fix does not rely on hiding an image after it has painted.

## Index cards

The new public/assets/gym-fitness-tips-v1-05.css is scoped to the public blog-list body. Desktop cards use image/text columns, a 24px gap and 24px padding. The image fills its own column and the text no longer has the old large internal gaps.

At widths up to 760px, the image covers the entire card. The title, excerpt and Read More link share the image layer with a dark gradient behind them. Long text can increase the card height without clipping. Links remain clickable and keyboard focus remains visible.

Read More uses the existing saved primary-colour token. The stylesheet does not redefine theme tokens. All 177 inherited stylesheets remain byte-identical to V1.04. The HTML files load the added stylesheet and a versioned renderer URL so the changed script is fetched after deployment.

## Compatibility and deployment

The existing /blog and /blog/[slug] routes, configured navigation slugs, filters, pagination, SEO metadata, ads, comments, Admin controls, authentication, payments and gym D1 binding remain compatible. No new route or database migration is needed for this update. The earlier V1.04 Admin fixes remain included.

Copy the complete project into the existing gym repository and deploy the new commit using the existing Pages project. After deployment, /release.json should show V1.05 / 1.5.0. Reload the public pages with Ctrl+Shift+R once and check the Fitness Tips menu and a post on desktop and mobile.

## Verification

The regression first reproduces one hero plus one body cover with the unmodified V1.04 source. The fixed test uses the real backend content serializer/decorator to produce its post fixture, then confirms one hero and no matching body cover. Additional cases cover nested picture/anchor wrappers, Drive variants, captions, adverts, distinct images, absent covers and existing sanitization.

Browser checks cover 320, 390, 760, 980 and 1440px widths in light and dark mode, custom primary colours, overlay clicks, comments, pagination and error states. Thirty pre-existing named renderer functions are checked byte-for-byte. RELEASE-VERIFICATION-GYM.md records the final results and verification/ironpulse-v1.05/ contains machine-readable evidence.
