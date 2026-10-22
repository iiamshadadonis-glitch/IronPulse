import {appSession,SESSION_HEADERS} from './_lib/app-session-v1-58.js';
import {wakeNotifications,processNotificationQueue} from './_lib/notifications-v1-58.js';
import { ensureSchema } from './_lib/schema.js';
import { ensureAuthSchema } from './_lib/auth-schema.js';
import { json, isTransientDatabaseError, preferredPublicOrigin } from './_lib/utils.js';
import { runTrafficMaintenance } from './_lib/traffic-maintenance.js';
import { purgePublicEdgeCaches, DROPBEAT_PUBLIC_CACHE_ENTRIES, dropbeatPublicCacheEntries } from './_lib/edge-response-cache.js';
import { syncDanceMembershipsFromRecentOrders } from './_lib/fitness-platform.js';
import {finalizeGymHtml,applyGymAssetHeaders} from './_lib/gym-asset-delivery.js';

const CSP = [
  "default-src 'self' https: data: blob:",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self' https:",
  "img-src 'self' https: data: blob:",
  "media-src 'self' https: data: blob:",
  "font-src 'self' https: data:",
  "style-src 'self' 'unsafe-inline' https:",
  // Existing admin, analytics and ad integrations use inline snippets. Keep the
  // policy compatible while still restricting resources to HTTPS/self.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
  "connect-src 'self' https:",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests"
].join('; ');

export async function onRequest(context) {
  const url = new URL(context.request.url);
  // Presentation route alias only: stored account roles and API keys stay unchanged.
  if (['/student-dashboard','/student-dashboard/','/student-dashboard.html'].includes(url.pathname)) {
    url.pathname='/member-dashboard';
    return Response.redirect(url.toString(),301);
  }
  const privateDocument = ['/checkout','/my-orders','/payment','/payment-success','/payment-failed','/login','/member-dashboard','/coach-dashboard'].some(path => url.pathname === path || url.pathname === `${path}.html` || url.pathname.startsWith(`${path}/`));
  const dashboardDocument = ['/member-dashboard','/coach-dashboard'].some(path => url.pathname === path || url.pathname === `${path}.html` || url.pathname.startsWith(`${path}/`));

  // Force HTTPS when the original request reaches Pages over HTTP.
  const forwardedProto = context.request.headers.get('x-forwarded-proto');
  if (url.protocol === 'http:' || forwardedProto === 'http') {
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  // Once the custom domain is attached, make the configured SITE_URL hostname
  // the single canonical production host configured in SITE_URL.
  try {
    const canonical = new URL(context.env.SITE_URL || '');
    const currentHost = url.hostname.toLowerCase();
    const canonicalHost = canonical.hostname.toLowerCase();
    const bareCanonical = canonicalHost.replace(/^www\./, '');
    const wwwCanonical = `www.${bareCanonical}`;
    // Redirect only the production apex/www pair. Keep *.pages.dev available
    // for staging/preview deployments and Cloudflare Pages testing.
    if (canonicalHost && (currentHost === bareCanonical || currentHost === wwwCanonical) && currentHost !== canonicalHost) {
      url.hostname = canonicalHost;
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
  } catch (_) {}

  // Authenticated launch never depends on a publicly cached homepage.
  if(context.request.method==='GET'&&['/','/index.html'].includes(url.pathname)&&url.searchParams.get('website')!=='1'){
    try{const match=(context.request.headers.get('cookie')||'').match(/(?:^|;\s*)db_app_role=(admin|student|coach)(?:;|$)/);const session=await appSession(context.request,context.env,{preferredRole:match?.[1]||'',renew:true});if(session)return new Response(null,{status:302,headers:{...SESSION_HEADERS,location:session.home+'?app_resume=1',...(session.cookie?{'set-cookie':session.cookie}:{})}});}catch{/* Keep the public site available during an auth service outage. */}
  }

  // Check the existing public data cache before touching D1 or its schema.
  const edgePublicRead=context.request.method==='GET'&&['/api/public/pages','/api/public/site','/api/public/bootstrap','/api/public/products','/api/public/studio-gallery','/api/public/blogs','/api/public/button-dictionary','/api/public/layout'].includes(url.pathname);
  if(edgePublicRead){
    context.data??={};
    context.data.db150PreparePublicRead=async()=>{try{await ensureSchema(context.env);}catch(error){console.error('Schema maintenance warning:',error);}};
  }
  if (url.pathname.startsWith('/api/')&&!edgePublicRead) {
    const isAdminAuth = url.pathname.startsWith('/api/admin/auth/');
    const isPortalAuth = url.pathname.startsWith('/api/portal/auth/');
    const isDedicatedAuth = isAdminAuth || isPortalAuth;
    try {
      // Unified Login, OTP and account-session routes prepare only their small
      // authentication schema. Their handlers prepare portal tables only when a
      // Member or Coach action actually needs them.
      if (isDedicatedAuth) await ensureAuthSchema(context.env);
      else await ensureSchema(context.env);
    } catch (error) {
      // V16.70: never let an unrelated full-schema repair make Admin login
      // unreachable. Authentication has its own minimal self-healing schema.
      if (isDedicatedAuth) {
        try { await ensureAuthSchema(context.env); }
        catch (authError) {
          const message = isTransientDatabaseError(authError)
            ? 'The account database is temporarily busy. Please wait a moment and try Login again.'
            : `Account authentication database could not be prepared: ${String(authError?.message || authError || 'Unknown database error')}`;
          return json({ ok:false, error:message }, isTransientDatabaseError(authError) ? 503 : 500);
        }
      } else {
        // Existing production databases already have their application tables.
        // Continue to the requested endpoint if a non-auth schema maintenance
        // statement fails; the endpoint can return a precise error if its own
        // table is genuinely unavailable. This avoids a site-wide API outage.
        console.error('Schema maintenance warning:', error);
      }
    }
  }

  const response = await context.next();
  if(response.ok&&wakeNotifications(context.env,{periodic:url.pathname==='/api/portal/notifications/preferences'||url.pathname.startsWith('/api/automation/')}))try{context.waitUntil?.(processNotificationQueue(context.env,{origin:url.origin}).catch(()=>{}));}catch{}

  // V1.08: every verified payment lifecycle endpoint feeds the same additive
  // class-membership synchronizer. Gateway handlers remain unchanged; their
  // final order/payment status is the single source of truth used here.
  const classSyncRoute = ['/api/webhooks/razorpay','/api/webhooks/phonepe','/api/webhooks/stripe'].includes(url.pathname)
    || url.pathname === '/api/payments/razorpay-verify'
    || url.pathname === '/api/payment-result';
  if (response.ok && classSyncRoute) {
    try { context.waitUntil?.(syncDanceMembershipsFromRecentOrders(context.env,{lookbackDays:7})); } catch (_) {}
  }

  // Button Dictionary saves purge their own key in the handler, retaining warm catalog caches.
  // DropBeat V1.05: every successful admin mutation invalidates the small set
  // of shared public-data snapshots. Static assets also use versioned URLs, so
  // refreshing either the admin or public site shows the saved result without
  // waiting for an earlier browser/edge cache lifetime.
  if (((url.pathname.startsWith('/api/admin/') && !url.pathname.startsWith('/api/admin/auth/')) || url.pathname === '/api/portal/profile') && context.request.method !== 'GET' && response.ok && !['/api/admin/button-dictionary','/api/admin/layout','/api/admin/notification-routing'].includes(url.pathname)) {
    // A Student Story only changes the home bootstrap snapshot. Purging that
    // exact entry avoids making the Save button wait on unrelated product-page
    // cache keys while still guaranteeing that the next home refresh is fresh.
    const purgeTask=(async()=>{
      const cacheEntries = url.pathname === '/api/admin/success-stories'
        ? DROPBEAT_PUBLIC_CACHE_ENTRIES.filter(entry => entry.key === 'bootstrap-dropbeat-v113:home')
        : await dropbeatPublicCacheEntries(context.env).catch(() => DROPBEAT_PUBLIC_CACHE_ENTRIES);
      await purgePublicEdgeCaches(context.request, cacheEntries);
    })().catch(error=>console.error('Public cache purge warning:',error));
    // Finish deletion before announcing a successful Save to public browser tabs.
    // This changes only cache ordering; the original write response is retained.
    await purgeTask;
  }

  // V16.12: Blogger publishes scheduled Auditions independently of the website.
  // A lightweight, throttled sweep on real page traffic detects newly-live posts
  // and runs the same social distribution pipeline. It never delays the response.
  if (!privateDocument && !url.pathname.startsWith('/assets/') && !url.pathname.startsWith('/admin/') && !url.pathname.startsWith('/api/') && !/\.[a-z0-9]{2,6}$/i.test(url.pathname)) {
    // V16.89: one shared edge-cache lease covers all three fallback sweeps. This
    // keeps publishing behavior while preventing each public page view from
    // performing the same D1 reads. Exact automation endpoints are unchanged.
    try { context.waitUntil?.(runTrafficMaintenance(context.env,{origin:url.origin})); } catch (_) {}
    // V16.76: lead nurturing is deliberately not scanned from public page views.
    // New captured leads still start immediately at their exact event handler,
    // while due batches run through the protected automation endpoint. This
    // prevents every visitor request from repeatedly reading the lead table.
  }

  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('Content-Security-Policy', CSP);
  headers.set('X-DropBeat-Release', '1.59.0');
  headers.set('X-IronPulse-Release', '1.8.0');
  applyGymAssetHeaders(headers,url);

  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/') || privateDocument) {
    headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  // V1.08: revalidate document shells so newly versioned frontend and admin
  // assets are discovered on an ordinary refresh. API-specific cache headers
  // returned by each endpoint remain unchanged.
  const acceptsHtml = (context.request.headers.get('accept') || '').includes('text/html');
  if (!url.pathname.startsWith('/api/') && (url.pathname.startsWith('/admin') || privateDocument || acceptsHtml)) {
    // V1.33: document shells must never hide a newly deployed asset manifest.
    // Versioned CSS/JS still remain independently cacheable; only the HTML
    // shell is revalidated on every visit.
    headers.set('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate');
    headers.set('CDN-Cache-Control', 'no-store');
    headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
    headers.set('Expires', '0');
  }

  let responseBody=response.body;
  const responseType=headers.get('content-type')||'';
  // Static HTML contains a safe build-time origin as a fallback. At the edge,
  // replace only that known origin with the hostname the visitor actually used
  // (or PUBLIC_SITE_URL when explicitly configured). This keeps canonicals,
  // social URLs and JSON-LD correct on suffixed pages.dev projects and custom
  // domains without buffering assets or API responses.
  if (!url.pathname.startsWith('/api/') && responseType.includes('text/html')) {
    const publicOrigin=preferredPublicOrigin(context.request,context.env);
    let html=await response.text();
    if(!url.pathname.startsWith('/admin')&&publicOrigin){
      html=html.replaceAll('https://ironpulse-gym.pages.dev',publicOrigin).replaceAll('https://ironpulse-gym.pages.dev',publicOrigin);
    }
    if(url.searchParams.get('db_heat_preview')==='1'&&!url.pathname.startsWith('/admin')){
      html=html.replace(/<img\b(?![^>]*\bloading=)/gi,'<img loading="lazy" decoding="async" fetchpriority="low"').replace(/<video\b/gi,'<video preload="none"');
    }
    if(!html.includes('/assets/gym-media-v1-21.js'))html=html.replace(/<\/body>/i,'<script src="/assets/gym-media-v1-21.js?v=1.21"></script></body>');
    if(url.pathname.startsWith('/admin')){
      html=html.replace(/(<script\b[^>]*\bsrc="\/admin\/(?:gym-admin-language|gym-admin-v1-05|gym-admin-v1-19|gym-admin-v1-22|gym-admin-v1-29|gym-admin-v1-31|final-v9-invoice-statements-gmail|final-v16-52-brand-settings-hub|final-v16-54-brand-articles-stability|final-master-client-polish|final-v16-37-header-editor-story-upload|final-v16-48-posts-scheduler|final-v16-68-automation-flow-workspace|final-v16-76-d1-polls-automation-workspace|final-v16-94-integrations-heatmaps-code-reminders|final-v17-05-email-automations)\.js)(?:\?([^"]*))?"/gi,(match,path,query)=>{const params=new URLSearchParams(query||'');params.set('build','dropbeat-1.49-20261018');return path+'?'+params+'"';});
      if(!html.includes('/assets/gym-plan-import-v1-40.js'))html=html.replace(/<\/body>/i,'<script src="/assets/gym-plan-import-v1-40.js?build=dropbeat-1.49-20261018"></script></body>');
      html=html.replace(/<script\s+src="\/assets\/dropbeat-dashboard-mobile-v1-(?:36|37|38|39|40|41|42|43|44|45|46|47|48)\.js[^\"]*"><\/script>/gi,'');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-36.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-36.css?build=dropbeat-1.36-20261013"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-37.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-37.css?build=dropbeat-1.37-20261013"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-38.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-38.css?build=dropbeat-1.40-20261014"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-39.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-39.css?build=dropbeat-1.39-20261013"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-40.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-40.css?build=dropbeat-1.40-20261014"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-41.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-41.css?build=dropbeat-1.41-20261014"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-42.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-42.css?build=dropbeat-1.42-20261015"></head>');
      html=html.replace(/<script\s+src="\/assets\/gym-ui-components-v1-42\.js[^"]*"><\/script>/gi,'');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-43.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-43.css?build=dropbeat-1.43-20261015"></head>');
      html=html.replace(/<script\s+src="\/assets\/dropbeat-ui-components-v1-(?:43|44|45|46|47|48)\.js[^"]*"><\/script>/gi,'');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-44.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-44.css?build=dropbeat-1.49-20261018"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-45.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-45.css?build=dropbeat-1.49-20261018"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-46.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-46.css?build=dropbeat-1.49-20261018"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-47.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-47.css?build=dropbeat-1.49-20261018"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-48.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-48.css?build=dropbeat-1.49-20261018"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-49.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-49.css?build=dropbeat-1.49-20261018"></head>');
      if(!html.includes('/assets/gym-ui-components-v1-49.js'))html=html.replace(/<\/body>/i,'<script src="/assets/gym-ui-components-v1-49.js?build=dropbeat-1.49-20261018"></script></body>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-49.js'))html=html.replace(/<\/body>/i,'<script src="/assets/gym-dashboard-mobile-v1-49.js?build=dropbeat-1.49-20261018"></script></body>');
    }else{
      if(!html.includes('/assets/gym-theme-v1-29.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-theme-v1-29.css?v=1.29"></head>');
      if(!html.includes('/assets/gym-theme-v1-29.js'))html=html.replace(/<\/body>/i,'<script src="/assets/gym-theme-v1-29.js?v=1.29"></script></body>');
      if(!html.includes('/assets/gym-dark-mode-v1-30.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dark-mode-v1-30.css?v=1.30"></head>');
      if(!html.includes('/assets/gym-dark-mode-v1-30.js'))html=html.replace(/<\/body>/i,'<script src="/assets/gym-dark-mode-v1-30.js?v=1.30"></script></body>');
      if(!html.includes('/assets/gym-dark-mode-v1-31.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dark-mode-v1-31.css?v=1.31"></head>');
      if(!html.includes('/assets/gym-mobile-v1-32.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-mobile-v1-32.css?v=1.32"></head>');
      if(!html.includes('/assets/gym-mobile-v1-33.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-mobile-v1-33.css?build=dropbeat-1.33-20261012"></head>');
      if(!html.includes('/assets/gym-mobile-v1-34.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-mobile-v1-34.css?build=dropbeat-1.34-20261012"></head>');
      if(!html.includes('/assets/gym-mobile-v1-34.js'))html=html.replace(/<\/body>/i,'<script src="/assets/gym-mobile-v1-34.js?build=dropbeat-1.34-20261012"></script></body>');
      if(!html.includes('/assets/gym-ui-v1-35.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-ui-v1-35.css?build=dropbeat-1.35-20261012"></head>');
      if(!html.includes('/assets/gym-ui-v1-35.js'))html=html.replace(/<\/body>/i,'<script src="/assets/gym-ui-v1-35.js?build=dropbeat-1.35-20261012"></script></body>');
      if(dashboardDocument&&!html.includes('/assets/gym-dashboard-mobile-v1-36.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-36.css?build=dropbeat-1.36-20261013"></head>');
      if(dashboardDocument&&!html.includes('/assets/gym-dashboard-mobile-v1-37.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-37.css?build=dropbeat-1.37-20261013"></head>');
      if(dashboardDocument){
        html=html.replace(/<script\s+src="\/assets\/dropbeat-dashboard-mobile-v1-(?:36|37|38|39|40|41|42|43|44|45|46|47|48)\.js[^\"]*"><\/script>/gi,'');
        if(!html.includes('/assets/gym-dashboard-mobile-v1-38.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-38.css?build=dropbeat-1.40-20261014"></head>');
        if(!html.includes('/assets/gym-dashboard-mobile-v1-39.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-39.css?build=dropbeat-1.39-20261013"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-40.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-40.css?build=dropbeat-1.40-20261014"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-41.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-41.css?build=dropbeat-1.41-20261014"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-42.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-42.css?build=dropbeat-1.42-20261015"></head>');
      html=html.replace(/<script\s+src="\/assets\/gym-ui-components-v1-42\.js[^"]*"><\/script>/gi,'');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-43.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-43.css?build=dropbeat-1.43-20261015"></head>');
      html=html.replace(/<script\s+src="\/assets\/dropbeat-ui-components-v1-(?:43|44|45|46|47|48)\.js[^"]*"><\/script>/gi,'');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-44.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-44.css?build=dropbeat-1.49-20261018"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-45.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-45.css?build=dropbeat-1.49-20261018"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-46.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-46.css?build=dropbeat-1.49-20261018"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-47.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-47.css?build=dropbeat-1.49-20261018"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-48.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-48.css?build=dropbeat-1.49-20261018"></head>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-49.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-dashboard-mobile-v1-49.css?build=dropbeat-1.49-20261018"></head>');
      if(!html.includes('/assets/gym-ui-components-v1-49.js'))html=html.replace(/<\/body>/i,'<script src="/assets/gym-ui-components-v1-49.js?build=dropbeat-1.49-20261018"></script></body>');
      if(!html.includes('/assets/gym-dashboard-mobile-v1-49.js'))html=html.replace(/<\/body>/i,'<script src="/assets/gym-dashboard-mobile-v1-49.js?build=dropbeat-1.49-20261018"></script></body>');
      }
    }
    // V1.50 delivery is additive, including dynamically generated public pages.
    if(/<script[^>]+src=["']\/(?:assets\/app\.js|admin\/admin\.js)/i.test(html)&&!html.includes('/assets/gym-data-cache-v1-50.js'))html=html.replace(/(<script[^>]+src=["']\/(?:assets\/app\.js|admin\/admin\.js))/i,'<script src="/assets/gym-data-cache-v1-50.js?build=dropbeat-1.50-20261018"></script>$1');
    if(!html.includes('/assets/gym-mobile-v1-50.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-mobile-v1-50.css?build=dropbeat-1.50-20261018"></head>');
    if(!url.pathname.startsWith('/admin')&&html.includes('/assets/app.js')&&!html.includes('/assets/gym-public-mobile-v1-50.js'))html=html.replace(/<\/body>/i,'<script src="/assets/gym-public-mobile-v1-50.js?build=dropbeat-1.50-20261018"></script></body>');
    html=html.replace(/(src=["'])(\/(?:assets\/(?:app|app-extra|final-public-seo-ssl-speed)|admin\/admin)\.js)([^"']*)(["'])/gi,(_m,a,path,query,z)=>{const clean=query.replace(/([?&])build=[^&]*/g,'$1').replace(/[?&]$/,'');return a+path+clean+(clean.includes('?')?'&':'?')+'build=dropbeat-1.50-20261018'+z;});
    // V1.51 also covers custom public documents generated by the router.
    if(!html.includes('/assets/gym-mobile-v1-51.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-mobile-v1-51.css?build=dropbeat-1.51-20261018"></head>');
    if(!html.includes('/assets/gym-ui-components-v1-49.js'))html=html.replace(/<\/body>/i,'<script data-db151-navigation-only src="/assets/gym-ui-components-v1-49.js?build=dropbeat-1.51-20261018"></script></body>');
    if(!html.includes('/assets/gym-mobile-navigation-v1-51.js'))html=html.replace(/<\/body>/i,'<script src="/assets/gym-mobile-navigation-v1-51.js?build=dropbeat-1.51-20261018"></script></body>');
    html=html.replace(/(src=["'])(\/assets\/(?:gym-fitness-language|app|gym-ui-components-v1-49|gym-data-cache-v1-50|final-v16-37-navigation|final-v16-34-custom-pages|final-master-client-polish|final-v14-4-plan-billing|final-public-seo-ssl-speed|gym-dashboard-mobile-v1-49)\.js)([^"']*)(["'])/gi,(_m,a,path,query,z)=>{const clean=query.replace(/([?&])build=[^&]*/g,'$1').replace(/[?&]$/,'');return a+path+clean+(clean.includes('?')?'&':'?')+'build=dropbeat-'+(path.includes('gym-fitness-language')?'1.57-20261019':(path.includes('gym-dashboard-mobile-v1-49')?'1.52':'1.51')+'-20261018')+z;});
    // Dynamic button bindings also cover custom page shells generated at the edge.
    if(!html.includes('/assets/gym-dynamic-labels-v1-59.js'))html=html.replace(/<head\b[^>]*>/i,head=>head+'<link rel="stylesheet" href="/assets/gym-dynamic-labels-v1-59.css?build=1.59"><script src="/assets/gym-dynamic-labels-v1-59.js?build=1.59"></script>');
    if(!url.pathname.startsWith('/admin')&&!html.includes('/assets/gym-button-dictionary-v1-56.js')){
      if(!html.includes('/assets/gym-data-cache-v1-50.js'))html=html.replace(/<\/body>/i,'<script src="/assets/gym-data-cache-v1-50.js?build=dropbeat-1.51-20261018"></script></body>');
      html=html.replace(/<\/body>/i,'<script type="module" src="/assets/gym-button-dictionary-v1-56.js?build=1.59"></script></body>');
    }
    if(!html.includes('/assets/gym-layout-v1-57.js')&&!url.pathname.startsWith('/admin'))html=html.replace(/<\/body>/i,'<script type="module" src="/assets/gym-layout-v1-57.js?build=1.59"></script></body>');
    if(!html.includes('/assets/app-session-v1-58.js'))html=html.replace(/<\/body>/i,'<script src="/assets/app-session-v1-58.js?build=1.58"></script></body>');
    responseBody=finalizeGymHtml(html,context.request.url);
    headers.set('Cache-Control','no-store, no-cache, max-age=0, must-revalidate');
    headers.set('CDN-Cache-Control','no-store');
    headers.set('Cloudflare-CDN-Cache-Control','no-store');
    headers.delete('content-length');
  }

  return new Response(responseBody, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
