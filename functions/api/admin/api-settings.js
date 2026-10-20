import { json, readJson, requireAdmin, getApiSettings, setSetting, makeApiToken, maskSecret, preferredPublicOrigin } from '../../_lib/utils.js';

function urls(request,env) {
  const origin = preferredPublicOrigin(request,env);
  return {
    apiBaseUrl: `${origin}/api`,
    automationBaseUrl: `${origin}/api/automation`,
    bloggerRedirectUri: `${origin}/api/admin/blogger-oauth/callback`,
    endpoints: [
      { method:'GET', url:`${origin}/api/automation/site`, purpose:'Read website settings and tracking IDs' },
      { method:'POST', url:`${origin}/api/automation/site`, purpose:'Update site settings, tracking IDs and SEO values' },
      { method:'GET', url:`${origin}/api/automation/blogs`, purpose:'List Fitness Tips' },
      { method:'POST', url:`${origin}/api/automation/blogs`, purpose:'Create or update Fitness Tips' },
      { method:'POST', url:`${origin}/api/automation/social-posts`, purpose:'Run due scheduled social posts (optional exact cron endpoint)' },
      { method:'POST', url:`${origin}/api/automation/lead-nurture`, purpose:'Run due WhatsApp, SMS and Lead Email Follow-up steps' },
      { method:'POST', url:`${origin}/api/automation/email-event`, purpose:'Send a protected lead event into Lead Email Follow-up automations' },
      { method:'POST', url:`${origin}/api/automation/products`, purpose:'Create/update plans, offers and services' },
      { method:'GET', url:`${origin}/api/automation/leads-summary`, purpose:'Get leads and order summary' },
      { method:'GET', url:`${origin}/api/automation/phonepe-redemptions?dry_run=1`, purpose:'Preview PhonePe AutoPay renewals that are due' },
      { method:'POST', url:`${origin}/api/automation/phonepe-redemptions`, purpose:'Notify due PhonePe AutoPay renewals (schedule this daily)' }
    ],
    webhookEndpoints: {
      razorpay: `${origin}/api/webhooks/razorpay`,
      phonepe: `${origin}/api/webhooks/phonepe`,
      stripe: `${origin}/api/webhooks/stripe`,
      whatsapp: `${origin}/api/webhooks/whatsapp`
    }
  };
}
export async function onRequestGet({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  const settings = await getApiSettings(env);
  return json({
    ...urls(request,env),
    vendorUserId: settings.vendorUserId || 'ironpulse-gym',
    enabled: settings.enabled !== false,
    apiToken: settings.apiToken || '',
    bloggerBlogId: settings.bloggerBlogId || '',
    bloggerBlogName: settings.bloggerBlogName || '',
    bloggerBlogUrl: settings.bloggerBlogUrl || '',
    bloggerApiKey: settings.bloggerApiKey || '',
    bloggerClientId: settings.bloggerClientId || '',
    bloggerClientSecretMasked: maskSecret(settings.bloggerClientSecret || ''),
    bloggerAuthorized: !!settings.bloggerRefreshToken,
    bloggerConnected: !!settings.bloggerRefreshToken && !!settings.bloggerBlogId && String(settings.bloggerConnectionState || 'connected') === 'connected',
    bloggerConnectionState: settings.bloggerConnectionState || (settings.bloggerRefreshToken ? (settings.bloggerBlogId ? 'connected' : 'authorized') : 'disconnected'),
    bloggerLastError: settings.bloggerLastError || '',
    bloggerLastCheckedAt: settings.bloggerLastCheckedAt || '',
    bloggerConnectedUser: settings.bloggerConnectedUser || '',
    bloggerDeletedAt: settings.bloggerDeletedAt || '',
    bloggerAvailableBlogs: Array.isArray(settings.bloggerAvailableBlogs) ? settings.bloggerAvailableBlogs : [],
    apiTokenMasked: maskSecret(settings.apiToken || ''),
    authHeaderExample: settings.apiToken ? `Authorization: Bearer ${settings.apiToken}` : 'Generate an API token first',
    docs: {
      requiredHeader: 'Authorization: Bearer YOUR_API_TOKEN',
      contentType: 'application/json',
      productPayloadExample: { sku:'UC-FESTIVAL', name:'Festival Offer', slug:'festival-offer', regular_price:799, offer_price:399, badge:'Festival Offer', status:'active', page_keys:'home,offers', features:'Fitness Tips | Priority onboarding' },
      blogPayloadExample: { title:'Fitness Tips', slug:'fitness-updates', excerpt:'Short summary', body_html:'<p>Fitness class details here</p>', status:'published' },
      sitePayloadExample: { googleAnalyticsMeasurementId:'G-XXXXXXXXXX', googleTagManagerId:'GTM-XXXXXXX', metaPixelId:'1234567890', searchConsoleVerification:'google-site-verification=...' }
    }
  });
}
export async function onRequestPost({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  const body = await readJson(request);
  const current = await getApiSettings(env);
  let next = { ...current };
  if(body.action==='delete_seo_connection'){
    const now=new Date().toISOString();
    next={...current,bloggerBlogId:'',bloggerBlogName:'',bloggerBlogUrl:'',bloggerApiKey:'',bloggerClientId:'',bloggerClientSecret:'',bloggerRefreshToken:'',bloggerConnectedUser:'',bloggerAvailableBlogs:[],bloggerOAuthState:'',bloggerOAuthStateExpiresAt:'',bloggerConnectionState:'disconnected',bloggerLastError:'',bloggerLastCheckedAt:'',bloggerDeletedAt:now,updatedAt:now};
    await setSetting(env,'api_settings',next);
    return json({ok:true,message:'SEO connection deleted. Saved Blogger OAuth credentials and selected SEO site were cleared.',settings:{...next,bloggerClientSecret:'',bloggerRefreshToken:'',bloggerOAuthState:''},...urls(request,env)});
  }
  if (body.action === 'generate') next.apiToken = makeApiToken();
  if (body.action === 'revoke') next.apiToken = '';
  if (body.vendorUserId !== undefined) next.vendorUserId = String(body.vendorUserId || 'ironpulse-gym').trim() || 'ironpulse-gym';
  if (body.enabled !== undefined) next.enabled = !!body.enabled;
  if (body.bloggerBlogId !== undefined) {
    next.bloggerBlogId = String(body.bloggerBlogId || '').trim();
    const match=(Array.isArray(next.bloggerAvailableBlogs)?next.bloggerAvailableBlogs:[]).find(x=>String(x.id)===next.bloggerBlogId);
    if(match){ next.bloggerBlogName=String(match.name||''); next.bloggerBlogUrl=String(match.url||''); }
  }
  if (body.bloggerApiKey !== undefined) next.bloggerApiKey = String(body.bloggerApiKey || '').trim();
  if (body.bloggerClientId !== undefined) next.bloggerClientId = String(body.bloggerClientId || '').trim();
  if (body.bloggerClientSecret !== undefined && String(body.bloggerClientSecret || '').trim()) next.bloggerClientSecret = String(body.bloggerClientSecret || '').trim();
  if (body.bloggerBlogId !== undefined || body.bloggerApiKey !== undefined || body.bloggerClientId !== undefined || body.bloggerClientSecret !== undefined) delete next.bloggerDeletedAt;
  next.updatedAt = new Date().toISOString();
  await setSetting(env, 'api_settings', next);
  return json({ ok: true, settings: { ...next, bloggerClientSecret:'', bloggerRefreshToken:'', bloggerOAuthState:'' }, ...urls(request,env) });
}
