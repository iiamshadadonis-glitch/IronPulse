import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const publicDir = path.join(root, 'public');
const origin = 'https://dance-class-at2.pages.dev';
const logo = `${origin}/assets/icon-512.png`;

const pages = {
  'index.html': ['WebPage', '/', 'Home'],
  'about.html': ['AboutPage', '/about', 'About DropBeat Dance Studio'],
  'blog-post.html': ['Article', '/blog-post', 'Dance Tip'],
  'blog.html': ['Blog', '/blog', 'Dance Tips'],
  'contact.html': ['ContactPage', '/contact', 'Contact DropBeat Dance Studio'],
  'faq.html': ['FAQPage', '/faq', 'Frequently Asked Questions'],
  'festival-offers.html': ['CollectionPage', '/festival-offers', 'Festival Dance Class Offers'],
  'offer-details.html': ['WebPage', '/offer-details', 'Dance Membership Plan Details'],
  'offers.html': ['CollectionPage', '/offers', 'Dance Class Memberships and Offers'],
  'privacy-policy.html': ['WebPage', '/privacy-policy', 'Privacy Policy'],
  'refund-and-cancellation.html': ['WebPage', '/refund-and-cancellation', 'Refund and Cancellation Policy'],
  'requests.html': ['WebPage', '/requests', 'Customer Requests'],
  'submit-profile.html': ['WebPage', '/submit-profile', 'Book a Free Dance Trial'],
  'success-stories.html': ['CollectionPage', '/success-stories', 'Student Dance Stories'],
  'terms-and-conditions.html': ['WebPage', '/terms-and-conditions', 'Terms and Conditions'],
  'yearly-plans.html': ['CollectionPage', '/yearly-plans', 'Yearly Dance Membership Plans']
};

// These generic client shells are duplicates of server-rendered canonical
// routes (/blog/:slug and /offer-details?plan=:slug), so crawlers should only
// index the server-rendered versions with record-specific metadata.
const noindexPages = new Set(['checkout.html', 'my-orders.html', 'blog-post.html', 'offer-details.html']);

function attr(html, selector, name) {
  const match = html.match(selector);
  if (!match) return '';
  const tag = match[0];
  const value = tag.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'));
  return value?.[1] || '';
}

function text(html, expression) {
  return (html.match(expression)?.[1] || '').replace(/&amp;/g, '&').trim();
}

function metaTag(name, content, property = false) {
  const key = property ? 'property' : 'name';
  return `<meta ${key}="${name}" content="${content.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`;
}

for (const [file, [type, urlPath, fallbackName]] of Object.entries(pages)) {
  const filePath = path.join(publicDir, file);
  let html = fs.readFileSync(filePath, 'utf8');

  const title = text(html, /<title>([^<]+)<\/title>/i) || `${fallbackName} | DropBeat Dance Studio`;
  const description = attr(html, /<meta\s+name=["']description["'][^>]*>/i, 'content') || `Explore ${fallbackName} at DropBeat Dance Studio.`;
  const url = `${origin}${urlPath}`;
  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` }
  ];
  if (urlPath !== '/') breadcrumbItems.push({ '@type': 'ListItem', position: 2, name: fallbackName, item: url });
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DanceSchool',
        '@id': `${origin}/#dance-studio`,
        name: 'DropBeat Dance Studio',
        url: `${origin}/`,
        logo: { '@type': 'ImageObject', url: logo },
        image: logo
      },
      {
        '@type': type,
        '@id': `${url}#webpage`,
        url,
        name: title,
        description,
        isPartOf: { '@id': `${origin}/#website` },
        about: { '@id': `${origin}/#dance-studio` },
        breadcrumb: { '@id': `${url}#breadcrumb` }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: breadcrumbItems
      }
    ]
  };

  const additions = [];
  if (!/property=["']og:title["']/i.test(html)) {
    additions.push(
      metaTag('og:type', 'website', true),
      metaTag('og:site_name', 'DropBeat Dance Studio', true),
      metaTag('og:title', title, true),
      metaTag('og:description', description, true),
      metaTag('og:url', url, true),
      metaTag('og:image', logo, true),
      metaTag('og:image:width', '512', true),
      metaTag('og:image:height', '512', true),
      metaTag('og:image:alt', 'DropBeat Dance Studio logo', true)
    );
  }
  if (!/name=["']twitter:title["']/i.test(html)) {
    if(!/name=["']twitter:card["']/i.test(html))additions.push(metaTag('twitter:card', 'summary_large_image'));
    additions.push(metaTag('twitter:title', title));
    if(!/name=["']twitter:description["']/i.test(html))additions.push(metaTag('twitter:description', description));
    if(!/name=["']twitter:image["']/i.test(html))additions.push(metaTag('twitter:image', logo));
  }
  const schemaTag = `<script id="db107-static-schema" type="application/ld+json">${JSON.stringify(schema)}</script>`;
  const existingSchema=/<script[^>]+id=["']db107-static-schema["'][^>]*>[\s\S]*?<\/script>/i;
  if(existingSchema.test(html)) html=html.replace(existingSchema,schemaTag); else additions.push(schemaTag);
  html = html.replace(/<\/head>/i, `${additions.join('')}</head>`);
  fs.writeFileSync(filePath, html);
}

for (const file of noindexPages) {
  const filePath = path.join(publicDir, file);
  let html = fs.readFileSync(filePath, 'utf8');
  if (!/name=["']robots["']/i.test(html)) {
    html = html.replace(/<\/head>/i, '<meta name="robots" content="noindex,nofollow,noarchive"></head>');
    fs.writeFileSync(filePath, html);
  }
}

console.log(`Static SEO metadata updated for ${Object.keys(pages).length} public pages.`);
