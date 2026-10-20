// Compatibility route: the historical /api/admin/blogs URL uses the same direct
// Blogger/SEO publishing actions as /api/admin/seo-posts. V15.6 may keep a
// rebuildable admin index in D1, but D1 is never the publishing source of truth.
export { onRequestGet, onRequestPost, onRequestDelete } from './seo-posts.js';
