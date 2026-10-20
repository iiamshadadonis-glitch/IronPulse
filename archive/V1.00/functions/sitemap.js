export async function onRequest({ request }) {
  const target = new URL('/sitemap.xml', request.url);
  return Response.redirect(target.toString(), 301);
}
