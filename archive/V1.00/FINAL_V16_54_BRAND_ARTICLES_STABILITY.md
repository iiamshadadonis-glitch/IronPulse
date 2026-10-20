# V16.54 — Brand Tabs, Articles, Drive Images & Social Publishing

This release is based on the user-provided V16.53 complete replacement package and keeps existing database identifiers and core workflows intact while correcting the requested admin presentation and publishing behavior.

## Brand Settings stability

- Website Colors now remains the visibly selected Brand Settings tab when its panel is open.
- Legal Info now remains the visibly selected Brand Settings tab when its panel is open.
- All nine Brand Settings tabs remain present on every Brand Settings sub-panel: Profile, Banners, Website Colors, Social Media, Legal Info, Checkout, Maps & Reviews, Storage and Login.
- Storage no longer causes Banners or Social Media tabs to disappear.
- The V16.54 Brand Settings router owns tab selection and suppresses older compatibility rerenders that were competing with the selected state.

## Integrations flicker correction

- V16.54 prewarms the existing Integrations workspace and changes panels after the integration shell is ready.
- Older V16.50/V16.51 mutation observers skip their legacy repeated integration rerender when the V16.54 stable integration owner is present.
- The existing integration credentials, connection APIs and card forms remain unchanged.

## Articles terminology

- Social Media sidebar item is shown as Article.
- The workspace heading is Articles.
- Visible article-management wording uses Article/Articles, including Load Article Updates, Post New Article, Article Title, Article Details, Featured Article, Existing Articles and Article publishing.
- Existing internal legacy function/database identifiers containing “audition” are intentionally retained for backward compatibility; they are not shown as the Article workspace terminology.

## Article image upload

- The legacy Cover Image URL control is retained internally only as the existing `cover_image_url` storage field and is hidden from the admin form.
- The visible form now provides Article Image + Upload Image.
- Uploads use the already-connected Google Drive integration.
- Google Drive creates/reuses an `Article Images` subfolder under the configured Drive destination.
- The uploaded file is made publicly readable and its Google Drive public URL is written into the existing `cover_image_url` field, so existing website/social publishing continues to use the same data model.
- No Cloudflare file-storage schema is introduced.

## Hashtags

- The Article form shows Hashtags instead of Tags.
- Admin may enter values with or without `#`, up to 12 comma-separated topics.
- The existing article labels/tags storage model remains unchanged.
- Social publishing normalizes the saved labels into hashtags for supported publishing flows, including Facebook, Instagram, Threads, Pinterest, LinkedIn, X and YouTube video descriptions.

## Threads article publishing

- Article distribution to Threads uses a TEXT post with the article URL supplied as `link_attachment`.
- The article URL is therefore the link target rather than publishing the Article image as the primary standalone Threads media object.
- The post text also receives normalized Article hashtags.

No new D1 migration is required.
