import { preferredPublicOrigin } from '../_lib/utils.js';

export async function onRequestGet({request,env}){
  const origin=String(preferredPublicOrigin(request,env)||'https://ironpulse-gym.pages.dev').replace(/\/$/,'');
  const body=`User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /checkout
Disallow: /my-orders
Disallow: /payment
Disallow: /payment-success
Disallow: /payment-failed

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(body,{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'public, max-age=3600'}});
}
