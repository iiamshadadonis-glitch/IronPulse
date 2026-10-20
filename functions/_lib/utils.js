import { sendConfiguredEmail } from './outbound-email.js';
import { brandedEmailHtml, emailMoney, brandHomeUrl } from './branded-email.js';
import { buildSimpleInvoicePdf } from './simple-invoice-pdf.js';
import { getAutomaticEmailTemplates, applyEmailTemplate, automaticEmailTextHtml, automaticEmailSummaryRows } from './automatic-email-templates.js';
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers }
  });
}
export async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}
export function normalizePhone(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}
export function slugify(input = '') {
  return String(input).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || crypto.randomUUID();
}
export function rupeesToPaise(v) {
  const n = Number(String(v || 0).replace(/[^0-9.]/g, ''));
  return Math.round(n * 100);
}
export function calcTotalCount(billingMonths, horizonYears = 21) {
  const months = Number(billingMonths || 1);
  const totalMonths = Number(horizonYears || 21) * 12;
  if (!months || totalMonths % months !== 0) return null;
  return totalMonths / months;
}
export function orderId() {
  const d = new Date();
  const date = d.toISOString().slice(0,10).replace(/-/g,'');
  const rand = Math.random().toString(36).slice(2,6).toUpperCase();
  return `UC-${date}-${rand}`;
}
export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,'0')).join('');
}
export async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2,'0')).join('');
}
export function safeJsonParse(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export const DEFAULT_SOCIALS = [
  { key:'instagram', label:'Instagram', url:'', enabled:false },
  { key:'facebook', label:'Facebook', url:'', enabled:false },
  { key:'threads', label:'Threads', url:'', enabled:false },
  { key:'youtube', label:'YouTube', url:'', enabled:false },
  { key:'telegram', label:'Telegram', url:'', enabled:false },
  { key:'snapchat', label:'Snapchat', url:'', enabled:false },
  { key:'x', label:'X', url:'', enabled:false },
  { key:'linkedin', label:'LinkedIn', url:'', enabled:false },
  { key:'whatsapp', label:'WhatsApp', url:'https://wa.me/919381521966', enabled:true }
];
export const DEFAULT_SITE_SETTINGS = {
  siteName:'IronPulse Gym',
  tagline:'Online and in-gym fitness classes for every level',
  frontendTheme:'dropbeat',
  primaryColor:'#4B55BE',
  accentColor:'#A469A8',
  colorPaletteType:'custom',
  adminHelpEnabled:true,
  marqueeTabTitleEnabled:false,
  adminDisplayName:'Admin',
  legalEntityEnabled:false,
  legalEntityName:'',
  legalEntityAddress:'',
  logoUrl:'/assets/ironpulse-logo.svg',
  faviconUrl:'/assets/favicon-32.png',
  whatsappNumber:'919381521966',
  footerText:'Website designed by Instautomate',
  googleAnalyticsMeasurementId:'',
  googleAnalyticsEnabled:false,
  googleTagManagerId:'',
  googleTagManagerEnabled:false,
  metaPixelId:'',
  metaPixelEnabled:false,
  searchConsoleVerification:'',
  bingWebmasterVerification:'',
  yahooSearchVerification:'',
  yandexVerification:'',
  snapchatPixelId:'',
  snapchatPixelEnabled:false,
  xPixelId:'',
  xPixelEnabled:false,
  linkedinPartnerId:'',
  linkedinPixelEnabled:false,
  pinterestTagId:'',
  pinterestPixelEnabled:false,
  redditPixelId:'',
  redditPixelEnabled:false,
  taxes: {
    enabled:false,
    gstEnabled:false,
    gstPercent:12,
    gstNumber:'',
    serviceChargeEnabled:false,
    serviceChargeFixedPaise:0,
    serviceChargePercent:0,
    otherTaxEnabled:false,
    otherTaxLabel:'Other Tax',
    otherTaxPercent:0
  },
  adIntegrations: {
    googleAdsense: { enabled:false, publisherId:'', headCode:'', bodyCode:'', notes:'' },
    adsterra: { enabled:false, headCode:'', bodyCode:'', notes:'' },
    mediaNet: { enabled:false, headCode:'', bodyCode:'', notes:'' },
    custom: { enabled:false, networkName:'Other Ad Network', headCode:'', bodyCode:'', notes:'' },
    customNetworks: []
  },
  socials: DEFAULT_SOCIALS
};
export const DEFAULT_API_SETTINGS = {
  enabled: true,
  vendorUserId: 'dropbeat-dance-studio',
  apiToken: '',
  bloggerBlogId: '',
  bloggerBlogName: '',
  bloggerBlogUrl: '',
  bloggerApiKey: '',
  bloggerClientId: '',
  bloggerClientSecret: '',
  bloggerRefreshToken: '',
  bloggerConnectedUser: '',
  bloggerAvailableBlogs: [],
  bloggerOAuthState: '',
  bloggerOAuthStateExpiresAt: '',
  bloggerConnectionState: '',
  bloggerLastError: '',
  bloggerLastCheckedAt: '',
  bloggerOAuthNote: 'Connect Blogger directly with Google OAuth in Admin → Settings → Integrations → SEO. n8n remains optional for automation workflows.',
  notes: 'Use Authorization: Bearer YOUR_API_TOKEN from automation software or any connected tool.'
};
export const DEFAULT_CHECKOUT_SETTINGS = { paymentMode:'subscription', subscriptionYears:21, yearlyEnabled:false, productCouponsEnabled:true, overallCouponsEnabled:false, couponsEnabled:true, yearlyOfferMonths:10, membershipDiscountEnabled:false, membershipDiscountPercent:0, membershipDiscountCode:'', membershipDiscountNote:'Use this member benefit when adding another session.' };

export const DEFAULT_PAYMENT_SETTINGS = {
  // Exactly one gateway is primary. Fallback gateways are optional and are tried
  // only when the primary gateway cannot create the requested checkout.
  primaryGateway: '',
  razorpayEnabled: false,
  razorpayKeyId: '',
  razorpayKeySecret: '',
  razorpayWebhookSecret: '',
  phonepeEnabled: false,
  phonepeFallbackEnabled: false,
  phonepeEnvironment: 'production',
  phonepeClientId: '',
  phonepeClientVersion: '1',
  phonepeClientSecret: '',
  phonepeMerchantId: '',
  phonepeWebhookUsername: '',
  phonepeWebhookPassword: '',
  phonepeWebhookSecret: '',
  phonepeWebhookKeyId: '',
  phonepeWebhookAuthMode: 'hmac',
  stripeEnabled: false,
  stripePublishableKey: '',
  stripeSecretKey: '',
  stripeWebhookSecret: '',
  stripeFallbackEnabled: false,
  whatsappWebhookVerifyToken: '',
  otpProvider: 'whatsapp_cloud',
  whatsappOtpEnabled: true,
  whatsappPhoneNumberId: '',
  whatsappCloudToken: '',
  greenApiInstanceId: '',
  greenApiToken: '',
  instautomateApiBaseUrl: 'https://client.instautomate.com/api',
  instautomateVendorUid: '',
  instautomateToken: '',
  instautomateFromPhoneNumberId: '',
  whatsappConnectedProvider: '',
  whatsappConnectedLabel: '',
  whatsappConnectedAt: ''
};

// Social lead/webhook connections are intentionally stored separately from the
// public Website Content > Social Links. These credentials are only for admin
// integrations that can feed enquiries into the existing client CRM.
export const DEFAULT_SOCIAL_INTEGRATION_SETTINGS = {
  facebook: {
    enabled: false,
    autoPublish: false,
    connectionState: '',
    connectedAt: '',
    lastError: '',
    lastTestedAt: '',
    lastTestMessage: '',
    lastPublishStatus: '',
    lastPublishAt: '',
    lastPublishError: '',
    lastWebhookConfiguredAt: '',
    lastWebhookMessage: '',
    lastWebhookFields: [],
    pageId: '',
    pageName: '',
    pageAccessToken: '',
    pageTasks: [],
    tokenType: '',
    tokenAppId: '',
    grantedScopes: [],
    publishingReady: null,
    webhookReady: null,
    messagingReady: null,
    leadReady: null,
    engagementReady: null,
    appId: '',
    appSecret: '',
    loginConfigId: '',
    oauthState: '',
    oauthStateExpiresAt: '',
    verifyToken: '',
    formIds: '',
    graphVersion: 'v26.0'
  },
  instagram: {
    enabled: false,
    autoPublish: false,
    connectionState: '',
    connectedAt: '',
    lastError: '',
    lastTestedAt: '',
    lastTestMessage: '',
    lastPublishStatus: '',
    lastPublishAt: '',
    lastPublishError: '',
    lastPublishedUrl: '',
    lastWebhookConfiguredAt: '',
    lastWebhookMessage: '',
    lastWebhookFields: [],
    instagramBusinessId: '',
    username: '',
    accountName: '',
    accountType: '',
    pageId: '',
    pageName: '',
    pageAccessToken: '',
    instagramLoginToken: '',
    instagramLoginReady: null,
    instagramLoginUsername: '',
    instagramLoginLastError: '',
    pageTasks: [],
    tokenType: '',
    tokenAppId: '',
    grantedScopes: [],
    identityReady: null,
    publishingReady: null,
    commentReady: null,
    privateReplyReady: null,
    messagingReady: null,
    leadReady: null,
    webhookReady: null,
    commentReadVerified: null,
    webhookSubscriptionMode: '',
    appId: '',
    appSecret: '',
    verifyToken: '',
    formIds: '',
    graphVersion: 'v26.0'
  },
  linkedin: {
    enabled: false,
    autoPublish: false,
    connectionState: '',
    connectedAt: '',
    lastError: '',
    lastTestedAt: '',
    lastTestMessage: '',
    lastPublishStatus: '',
    lastPublishAt: '',
    lastPublishError: '',
    lastPublishedUrl: '',
    clientId: '',
    clientSecret: '',
    accessToken: '',
    refreshToken: '',
    tokenExpiresAt: '',
    refreshTokenExpiresAt: '',
    grantedScopes: '',
    oauthState: '',
    oauthStateExpiresAt: '',
    memberId: '',
    memberName: '',
    memberEmail: '',
    publishingIdentity: 'member',
    organizationId: '',
    organizationName: '',
    communityEnabled: false,
    leadSyncEnabled: false,
    adsEnabled: false,
    leadOwnerType: 'sponsoredAccount',
    leadOwnerId: '',
    leadType: 'SPONSORED',
    // Backward compatibility with older Lead Sync / organization settings.
    ownerType: 'sponsoredAccount',
    ownerId: '',
    apiVersion: '202608',
    identityReady: null,
    publishingReady: null,
    commentReadReady: null,
    commentWriteReady: null,
    leadSyncReady: null,
    adsReady: null
  },
  telegram: {
    enabled: false,
    autoPublish: false,
    connectionState: '',
    connectedAt: '',
    botToken: '',
    botId: '',
    botUsername: '',
    botName: '',
    targetChatId: '',
    targetChatTitle: '',
    webhookSecret: '',
    webhookReady: false,
    lastTestedAt: '',
    lastTestMessage: '',
    lastError: '',
    lastPublishAt: '',
    lastPublishError: ''
  },
  x: {
    enabled: false,
    autoPublish: false,
    connectionState: '',
    connectedAt: '',
    lastError: '',
    // V16.40: X posting uses OAuth 2.0 Authorization Code + PKCE user context.
    // bearerToken/apiSecret remain only for backward compatibility with older saved settings.
    clientId: '',
    clientSecret: '',
    accessToken: '',
    refreshToken: '',
    tokenExpiresAt: '',
    grantedScopes: '',
    username: '',
    oauthState: '',
    oauthStateExpiresAt: '',
    pkceVerifier: '',
    bearerToken: '',
    apiSecret: '',
    userId: '',
    publishingReady: null,
    publishingProbeStatus: '',
    publishingProbeAt: '',
    publishingProbeMessage: '',
    lastTestedAt: '',
    lastTestMessage: '',
    lastPublishStatus: '',
    lastPublishAt: '',
    lastPublishError: '',
    lastPublishedUrl: ''
  },
  searchConsole: {
    enabled: false,
    autoSubmitAuditions: true,
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    connectedEmail: '',
    propertyUrl: 'https://ironpulse-gym.pages.dev/',
    sitemapUrl: 'https://ironpulse-gym.pages.dev/sitemap.xml',
    oauthState: '',
    oauthStateExpiresAt: '',
    grantedScopes: '',
    permissionLevel: '',
    scopeStatus: '',
    lastTestedAt: '',
    lastSubmittedAt: '',
    lastError: ''
  },
  threads: {
    enabled: false,
    appId: '',
    appSecret: '',
    accessToken: '',
    userId: '',
    username: '',
    tokenExpiresAt: '',
    oauthState: '',
    oauthStateExpiresAt: '',
    autoPublish: true,
    lastError: '',
    lastTestedAt: '',
    lastTestMessage: '',
    identityReady: null,
    publishingReady: null,
    replyReadReady: null,
    replyManagementReady: null,
    requestedPermissions: []
  },
  pinterest: {
    enabled: false,
    appId: '',
    appSecret: '',
    accessToken: '',
    refreshToken: '',
    tokenExpiresAt: '',
    refreshTokenExpiresAt: '',
    grantedScopes: [],
    username: '',
    boardId: '',
    boardName: '',
    autoPublish: true,
    oauthState: '',
    oauthStateExpiresAt: '',
    lastError: '',
    lastTestedAt: '',
    lastTestMessage: '',
    accountReadReady: null,
    boardsReadReady: null,
    pinsReadReady: null,
    pinPublishingReady: null,
    commentModerationReady: false,
    boardWarning: '',
    pinsWarning: ''
  },
  snapchat: {
    enabled: false,
    autoPublishStory: false,
    // Business OAuth credentials are created in Snapchat Business Details.
    // They are deliberately separate from the optional Snap Kit Client ID.
    oauthClientId: '',
    oauthClientSecret: '',
    accessToken: '',
    refreshToken: '',
    tokenExpiresAt: '',
    grantedScopes: '',
    oauthState: '',
    oauthStateExpiresAt: '',
    publicProfileQuery: '',
    publicProfileId: '',
    publicProfileName: '',
    publicProfileUsername: '',
    snapKitClientId: '',
    // Legacy V16.46 field retained only for backward compatibility.
    clientId: '',
    connectionState: '',
    connectedAt: '',
    lastTestedAt: '',
    lastTestMessage: '',
    lastError: '',
    publishingReady: false,
    commentsReady: false,
    lastPublishStatus: '',
    lastPublishAt: '',
    lastPublishError: '',
    lastPublishedUrl: ''
  },
  youtube: {
    enabled: false,
    autoPublish: false,
    clientId: '',
    clientSecret: '',
    accessToken: '',
    refreshToken: '',
    tokenExpiresAt: '',
    grantedScopes: '',
    oauthState: '',
    oauthStateExpiresAt: '',
    connectionState: '',
    channelId: '',
    channelName: '',
    privacyStatus: 'public',
    lastTestedAt: '',
    lastTestMessage: '',
    lastError: '',
    lastPublishStatus: '',
    lastPublishAt: '',
    lastPublishError: '',
    lastPublishedUrl: ''
  },
  googleIndexing: {
    enabled: false,
    autoPublish: false,
    eligibilityConfirmed: false,
    serviceAccountEmail: '',
    privateKey: '',
    testUrl: '',
    lastSubmittedAt: '',
    lastError: ''
  },
  googleBusiness: {
    enabled: false,
    autoPublish: false,
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    connectedEmail: '',
    accountId: '',
    accountName: '',
    locationId: '',
    locationName: '',
    oauthState: '',
    oauthStateExpiresAt: '',
    lastTestedAt: '',
    lastPublishedAt: '',
    lastReviewsSyncAt: '',
    lastDiscoveryAt: '',
    apiAccessStatus: '',
    accountManagementReady: null,
    businessInformationReady: null,
    postsReviewsReady: null,
    lastApiAccessMessage: '',
    lastError: ''
  },
  googleDrive: {
    enabled: false,
    apiKey: '',
    testFileUrl: '',
    oauthClientId: '',
    oauthClientSecret: '',
    refreshToken: '',
    connectedEmail: '',
    grantedScopes: '',
    oauthState: '',
    oauthStateExpiresAt: '',
    rootFolderUrl: '',
    rootFolderId: '',
    rootFolderName: '',
    plansFolderId: '',
    plansFolderName: '',
    storyFolderId: '',
    storyFolderName: '',
    postFolderId: '',
    postFolderName: '',
    uploadReady: false,
    connectionState: '',
    connectedAt: '',
    lastTestedAt: '',
    lastTestMessage: '',
    lastTestFileId: '',
    lastTestFileName: '',
    lastUploadTestedAt: '',
    lastUploadedAt: '',
    lastUploadedFileId: '',
    lastUploadedFileName: '',
    lastStoryUploadedAt: '',
    lastStoryUploadedFileId: '',
    lastStoryUploadedFileName: '',
    lastPostUploadedAt: '',
    lastPostUploadedFileId: '',
    lastPostUploadedFileName: '',
    lastError: ''
  },
  indexNow: {
    enabled: false,
    autoPublish: true,
    key: '',
    lastSubmittedAt: '',
    lastSubmittedUrl: '',
    lastSubmitStatus: 0,
    lastSubmitError: '',
    cooldownUntil: '',
    recentSubmissions: [],
    lastTestedAt: '',
    lastTestMessage: '',
    lastError: ''
  },
  gmail: {
    enabled: false,
    otpEnabled: false,
    senderName: 'IronPulse Gym',
    senderEmail: '',
    adminCopyEmail: '',
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    connectedEmail: '',
    oauthState: '',
    oauthStateExpiresAt: ''
  }
};

function mergeSocials(input) {
  const incoming = Array.isArray(input) ? input : [];
  return DEFAULT_SOCIALS.map(def => ({ ...def, ...(incoming.find(s => s && s.key === def.key) || {}) }));
}
export function mergeSiteSettings(input = {}) {
  const raw = input || {};
  const s = { ...DEFAULT_SITE_SETTINGS, ...raw };
  const allowedFrontendThemes = new Set(['dropbeat','casting','spotlight','minimal']);
  s.frontendTheme = allowedFrontendThemes.has(String(s.frontendTheme || '').trim())
    ? String(s.frontendTheme).trim()
    : DEFAULT_SITE_SETTINGS.frontendTheme;
  // Backward compatibility: before enable/disable toggles existed, a configured ID
  // was always active. Preserve that behavior for existing installations while
  // keeping empty, unconfigured integrations visibly disabled by default.
  const legacyTogglePairs = [
    ['googleAnalyticsEnabled','googleAnalyticsMeasurementId'],
    ['googleTagManagerEnabled','googleTagManagerId'],
    ['metaPixelEnabled','metaPixelId'],
    ['snapchatPixelEnabled','snapchatPixelId'],
    ['xPixelEnabled','xPixelId'],
    ['linkedinPixelEnabled','linkedinPartnerId'],
    ['pinterestPixelEnabled','pinterestTagId'],
    ['redditPixelEnabled','redditPixelId']
  ];
  for (const [toggleKey,idKey] of legacyTogglePairs) {
    if (!Object.prototype.hasOwnProperty.call(raw, toggleKey)) s[toggleKey] = Boolean(raw[idKey]);
  }
  s.taxes = { ...DEFAULT_SITE_SETTINGS.taxes, ...((raw.taxes && typeof raw.taxes === 'object') ? raw.taxes : {}) };
  s.socials = mergeSocials(s.socials);
  if (typeof s.footerText === 'string') s.footerText = s.footerText.replace(/Inst\s+Automate|InstaAutomate/gi, 'Instautomate');
  if (!s.whatsappNumber) s.whatsappNumber = '919381521966';
  const wa = s.socials.find(x => x.key === 'whatsapp');
  if (wa && !wa.url) wa.url = `https://wa.me/${normalizePhone(s.whatsappNumber)}`;
  return s;
}
export async function getSetting(env, key, fallback = {}) {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  return row ? safeJsonParse(row.value, fallback) : fallback;
}
export async function setSetting(env, key, value) {
  await env.DB.prepare('INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP').bind(key, JSON.stringify(value)).run();
}
export async function getSiteSettings(env) {
  return mergeSiteSettings(await getSetting(env, 'site_settings', DEFAULT_SITE_SETTINGS));
}
export async function getApiSettings(env) {
  return { ...DEFAULT_API_SETTINGS, ...(await getSetting(env, 'api_settings', DEFAULT_API_SETTINGS) || {}) };
}
export async function getSocialIntegrationSettings(env) {
  const raw = await getSetting(env, 'social_integration_settings', DEFAULT_SOCIAL_INTEGRATION_SETTINGS) || {};
  return {
    facebook: { ...DEFAULT_SOCIAL_INTEGRATION_SETTINGS.facebook, ...(raw.facebook || {}) },
    instagram: { ...DEFAULT_SOCIAL_INTEGRATION_SETTINGS.instagram, ...(raw.instagram || {}) },
    linkedin: { ...DEFAULT_SOCIAL_INTEGRATION_SETTINGS.linkedin, ...(raw.linkedin || {}) },
    telegram: { ...DEFAULT_SOCIAL_INTEGRATION_SETTINGS.telegram, ...(raw.telegram || {}) },
    x: { ...DEFAULT_SOCIAL_INTEGRATION_SETTINGS.x, ...(raw.x || {}) },
    searchConsole: { ...DEFAULT_SOCIAL_INTEGRATION_SETTINGS.searchConsole, ...(raw.searchConsole || {}) },
    threads: { ...DEFAULT_SOCIAL_INTEGRATION_SETTINGS.threads, ...(raw.threads || {}) },
    pinterest: { ...DEFAULT_SOCIAL_INTEGRATION_SETTINGS.pinterest, ...(raw.pinterest || {}) },
    snapchat: { ...DEFAULT_SOCIAL_INTEGRATION_SETTINGS.snapchat, ...(raw.snapchat || {}) },
    youtube: { ...DEFAULT_SOCIAL_INTEGRATION_SETTINGS.youtube, ...(raw.youtube || {}) },
    googleIndexing: { ...DEFAULT_SOCIAL_INTEGRATION_SETTINGS.googleIndexing, ...(raw.googleIndexing || {}) },
    googleBusiness: { ...DEFAULT_SOCIAL_INTEGRATION_SETTINGS.googleBusiness, ...(raw.googleBusiness || {}) },
    googleDrive: { ...DEFAULT_SOCIAL_INTEGRATION_SETTINGS.googleDrive, ...(raw.googleDrive || {}) },
    indexNow: { ...DEFAULT_SOCIAL_INTEGRATION_SETTINGS.indexNow, ...(raw.indexNow || {}) },
    gmail: { ...DEFAULT_SOCIAL_INTEGRATION_SETTINGS.gmail, ...(raw.gmail || {}) }
  };
}

export async function hmacBase64(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(secret || '')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(text ?? '')));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function getPaymentSettings(env) {
  const raw = await getSetting(env, 'payment_settings', DEFAULT_PAYMENT_SETTINGS) || {};
  const s = { ...DEFAULT_PAYMENT_SETTINGS, ...raw };
  // Backward compatibility for installations created before primaryGateway existed.
  if (!['razorpay','phonepe','stripe'].includes(String(s.primaryGateway || '').toLowerCase())) {
    if (raw.razorpayEnabled) s.primaryGateway = 'razorpay';
    else if (raw.phonepeEnabled) s.primaryGateway = 'phonepe';
    else if (raw.stripeEnabled) s.primaryGateway = 'stripe';
    else s.primaryGateway = '';
  }
  // Primary switches are mutually exclusive by design. These legacy booleans are
  // retained because older pages/functions still read them.
  s.razorpayEnabled = s.primaryGateway === 'razorpay';
  s.phonepeEnabled = s.primaryGateway === 'phonepe';
  s.stripeEnabled = s.primaryGateway === 'stripe';
  if (s.primaryGateway === 'phonepe') s.phonepeFallbackEnabled = false;
  if (s.primaryGateway === 'stripe') s.stripeFallbackEnabled = false;
  s.phonepeEnvironment = String(s.phonepeEnvironment || 'production').toLowerCase() === 'sandbox' ? 'sandbox' : 'production';
  s.phonepeClientVersion = String(s.phonepeClientVersion || '1');
  s.phonepeWebhookAuthMode = ['hmac','sha'].includes(String(s.phonepeWebhookAuthMode||'').toLowerCase()) ? String(s.phonepeWebhookAuthMode).toLowerCase() : 'hmac';
  return s;
}
export async function getCheckoutSettings(env) {
  const stored = await getSetting(env, 'checkout_settings', DEFAULT_CHECKOUT_SETTINGS) || {};
  const merged = { ...DEFAULT_CHECKOUT_SETTINGS, ...stored };
  if (stored.productCouponsEnabled === undefined && stored.couponsEnabled !== undefined) merged.productCouponsEnabled = !!stored.couponsEnabled;
  if (stored.overallCouponsEnabled === undefined) merged.overallCouponsEnabled = false;
  merged.couponsEnabled = !!(merged.productCouponsEnabled || merged.overallCouponsEnabled);
  merged.subscriptionYears = Math.max(1, Number(merged.subscriptionYears || 21));
  merged.yearlyOfferMonths = Math.max(1, Math.min(12, Number(merged.yearlyOfferMonths || 10)));
  merged.membershipDiscountEnabled = !!merged.membershipDiscountEnabled;
  merged.membershipDiscountPercent = Math.max(0, Math.min(100, Number(merged.membershipDiscountPercent || 0)));
  merged.membershipDiscountCode = String(merged.membershipDiscountCode || '').trim().toUpperCase().slice(0, 60);
  merged.membershipDiscountNote = String(merged.membershipDiscountNote || DEFAULT_CHECKOUT_SETTINGS.membershipDiscountNote).trim().slice(0, 300);
  return merged;
}
export function maskSecret(value = '') {
  const s = String(value || '');
  if (!s) return '';
  if (s.length <= 8) return '••••';
  return `${s.slice(0, 4)}••••${s.slice(-4)}`;
}
export function makeApiToken() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  const b64 = btoa(String.fromCharCode(...a)).replace(/[+/=]/g, '').slice(0, 40);
  return `uc_live_${b64}`;
}
export function parseCookies(request) {
  const cookie = request.headers.get('cookie') || '';
  return Object.fromEntries(cookie.split(';').map(x => x.trim()).filter(Boolean).map(x => {
    const i = x.indexOf('=');
    return [decodeURIComponent(i >= 0 ? x.slice(0, i) : x), decodeURIComponent(i >= 0 ? x.slice(i + 1) : '')];
  }));
}
export function cookieHeader(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push('Path=/');
  parts.push('HttpOnly');
  parts.push('SameSite=Lax');
  parts.push('Secure');
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  return parts.join('; ');
}
function isTransientD1Error(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  // A quota error cannot become successful by immediately repeating the same
  // D1 query. Retrying it multiplied row reads and made the free-tier lockout
  // noisier, so quota/limit errors are deliberately non-retryable.
  if (msg.includes('free tier daily row read limit') || msg.includes('daily row read limit') || msg.includes('daily row write limit') || msg.includes('exceeded d1') || msg.includes('/d1/platform/limits')) return false;
  return msg.includes('d1_error') || msg.includes('internal error') || msg.includes('database is locked') || msg.includes('database busy') || msg.includes('temporarily unavailable');
}
export async function withD1Retry(operation, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try { return await operation(); }
    catch (error) {
      lastError = error;
      if (!isTransientD1Error(error) || attempt === attempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 60 * (attempt + 1)));
    }
  }
  throw lastError;
}
export function isTransientDatabaseError(error) { return isTransientD1Error(error); }
async function checkAdminSession(request, env) {
  const token = parseCookies(request).uc_admin_session;
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await withD1Retry(() => env.DB.prepare(`SELECT u.email, u.role FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash=? AND julianday(s.expires_at) > julianday('now') AND u.status='active'`).bind(tokenHash).first());
  return row ? { email: row.email, role: row.role || 'admin' } : null;
}
export async function requireAutomation(request, env) {
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Missing Authorization: Bearer API token');
  if (env.AUTOMATION_API_KEY && token === env.AUTOMATION_API_KEY) return { vendorUserId:'env-token' };
  const settings = await getApiSettings(env);
  if (settings.enabled && settings.apiToken && token === settings.apiToken) return { vendorUserId: settings.vendorUserId || 'dropbeat-dance-studio' };
  throw new Error('Unauthorized automation API key');
}
export async function requireAdmin(request, env) {
  if (env.ADMIN_DEVELOPMENT_BYPASS === 'true') return { email: 'local-dev@ironpulse-gym.local', role:'admin' };

  // Normal browser Admin traffic already has the signed session cookie. Check
  // that indexed session row first instead of reading integration/settings data
  // on every single Admin API request.
  if (parseCookies(request).uc_admin_session) {
    const session = await checkAdminSession(request, env);
    if (session) return session;
  }

  const accessEmail = request.headers.get('Cf-Access-Authenticated-User-Email');
  if (accessEmail) {
    const allowed = String(env.ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    if (!allowed.length || allowed.includes(accessEmail.toLowerCase())) return { email: accessEmail, role:'admin' };
    const google = await getSetting(env, 'google_login_settings', { googleEmail:'' }).catch(() => ({ googleEmail:'' }));
    const googleEmail = String(google.googleEmail || '').trim().toLowerCase();
    if (googleEmail && googleEmail === accessEmail.toLowerCase()) return { email: accessEmail, role:'admin' };
  }

  if ((request.headers.get('authorization') || '').trim()) {
    try { return await requireAutomation(request, env); } catch (_) {}
  }
  throw new Error('Admin login required');
}
export function preferredPublicOrigin(request, env = {}) {
  // Never hard-code a Pages or production hostname in copied endpoints. Cloudflare
  // passes the hostname the visitor/admin actually used in request.url, so the same
  // deployment automatically shows pages.dev while testing and the connected custom
  // domain once the admin opens the site through that domain. An explicit
  // PUBLIC_SITE_URL remains available only as an opt-in override for unusual proxy
  // setups where request.url cannot expose the public hostname.
  const current = (()=>{ try { return new URL(request.url).origin; } catch { return ''; } })();
  if (current) return current;
  const configured = String(env.PUBLIC_SITE_URL || env.SITE_URL || '').trim();
  if (configured) {
    try { const u = new URL(configured); if (u.protocol === 'https:' || u.protocol === 'http:') return u.origin; } catch {}
  }
  return 'https://ironpulse-gym.pages.dev';
}

export function requestOrigin(request) {
  try { return new URL(request.url).origin; } catch { return ''; }
}

export function publicUrl(env, objectKey) {
  const base = env.MEDIA_PUBLIC_BASE_URL || '/api/media';
  return `${base}/${objectKey}`.replace(/\/+/g,'/').replace(':/','://');
}
export function contentTypeFromName(name='') {
  const lower = name.toLowerCase();
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'application/octet-stream';
}
export async function sendWhatsAppText(env, to, text) {
  const phone = normalizePhone(to);
  const settings = await getPaymentSettings(env).catch(()=>({}));
  // V16.66: honor the provider that is actually connected. Older installs can
  // have otpProvider populated before whatsappConnectedProvider was introduced.
  const provider = String(settings.otpProvider || settings.whatsappConnectedProvider || 'whatsapp_cloud').toLowerCase();
  const cloudToken = env.WHATSAPP_CLOUD_TOKEN || settings.whatsappCloudToken;
  const cloudPhoneId = env.WHATSAPP_PHONE_NUMBER_ID || settings.whatsappPhoneNumberId;
  const greenInstance = env.GREEN_API_INSTANCE_ID || settings.greenApiInstanceId;
  const greenToken = env.GREEN_API_TOKEN || settings.greenApiToken;
  const instaBase = String(env.INSTAUTOMATE_API_BASE_URL || settings.instautomateApiBaseUrl || 'https://client.instautomate.com/api').replace(/\/+$/,'');
  const instaVendor = env.INSTAUTOMATE_VENDOR_UID || settings.instautomateVendorUid;
  const instaToken = env.INSTAUTOMATE_API_TOKEN || settings.instautomateToken;
  const instaFrom = env.INSTAUTOMATE_FROM_PHONE_NUMBER_ID || settings.instautomateFromPhoneNumberId;
  const parseResponse=async res=>{const raw=await res.text().catch(()=>'');let data={};try{data=raw?JSON.parse(raw):{};}catch{data={raw};}return {raw,data};};
  const responseId=data=>String(data?.message_id||data?.whatsapp_message_id||data?.idMessage||data?.id||data?.data?.message_id||data?.data?.id||'').trim();

  // Provider routing is intentionally exclusive. Credentials saved for another
  // WhatsApp provider are never used as a silent fallback.
  if (provider === 'green_api') {
    if (!greenToken || !greenInstance) return { ok:false, provider, reason:'GreenAPI credentials are not configured.' };
    const res = await fetch(`https://api.green-api.com/waInstance${encodeURIComponent(greenInstance)}/sendMessage/${encodeURIComponent(greenToken)}`, {
      method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ chatId:`${phone}@c.us`, message:text })
    });
    const {raw,data}=await parseResponse(res);
    if (res.ok) return { ok:true, provider, messageId:responseId(data), response:data };
    return { ok:false, provider, reason:`GreenAPI send failed (HTTP ${res.status})${raw?`: ${raw.slice(0,300)}`:''}.` };
  }
  if (provider === 'instautomate') {
    if (!instaBase || !instaVendor || !instaToken) return { ok:false, provider, reason:'Instautomate API Base URL, Vendor UID or API Access Token is missing.' };
    const res = await fetch(`${instaBase}/${encodeURIComponent(instaVendor)}/contact/send-message`, {
      method:'POST',
      headers:{ authorization:`Bearer ${instaToken}`, 'content-type':'application/json', accept:'application/json' },
      body:JSON.stringify({
        ...(instaFrom ? { from_phone_number_id:String(instaFrom) } : {}),
        phone_number: phone,
        message_body: String(text || '')
      })
    });
    const {raw,data}=await parseResponse(res);
    if (res.ok) return { ok:true, provider, messageId:responseId(data), response:data };
    return { ok:false, provider, reason:`Instautomate send failed (HTTP ${res.status})${raw?`: ${raw.slice(0,300)}`:''}.` };
  }
  if (provider === 'whatsapp_cloud') {
    if (!cloudToken || !cloudPhoneId) return { ok:false, provider, reason:'WhatsApp Cloud API Phone Number ID or access token is missing.' };
    const res = await fetch(`https://graph.facebook.com/v25.0/${encodeURIComponent(cloudPhoneId)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cloudToken}`, 'content-type':'application/json' },
      body: JSON.stringify({ messaging_product:'whatsapp', recipient_type:'individual', to: phone, type:'text', text:{ body:String(text||'') } })
    });
    const {raw,data}=await parseResponse(res);
    if (res.ok) return { ok:true, provider, messageId:responseId(data)||String(data?.messages?.[0]?.id||''), response:data };
    return { ok:false, provider, reason:`WhatsApp Cloud API send failed (HTTP ${res.status})${raw?`: ${raw.slice(0,300)}`:''}.` };
  }
  return { ok:false, provider:'none', reason:'No supported WhatsApp provider is selected.' };
}
export async function sendWhatsAppDocument(env,to,{bytes,filename='document.pdf',caption=''}={}){
  const phone=normalizePhone(to),data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes||[]),settings=await getPaymentSettings(env).catch(()=>({})),provider=String(settings.otpProvider||settings.whatsappConnectedProvider||'whatsapp_cloud').toLowerCase();
  if(!phone||!data.length)return {ok:false,provider,reason:'WhatsApp document needs a valid number and file.'};
  if(provider==='whatsapp_cloud'){
    const token=env.WHATSAPP_CLOUD_TOKEN||settings.whatsappCloudToken,phoneId=env.WHATSAPP_PHONE_NUMBER_ID||settings.whatsappPhoneNumberId;if(!token||!phoneId)return {ok:false,provider,reason:'WhatsApp Cloud API is not connected.'};
    const form=new FormData();form.append('messaging_product','whatsapp');form.append('file',new Blob([data],{type:'application/pdf'}),filename);
    const upload=await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/media`,{method:'POST',headers:{authorization:`Bearer ${token}`},body:form}),uploaded=await upload.json().catch(()=>({}));if(!upload.ok||!uploaded.id)return {ok:false,provider,reason:uploaded?.error?.message||'WhatsApp PDF upload failed.'};
    const sent=await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:phone,type:'document',document:{id:uploaded.id,filename,caption:String(caption||'').slice(0,1024)}})}),result=await sent.json().catch(()=>({}));return sent.ok?{ok:true,provider,messageId:result?.messages?.[0]?.id||''}:{ok:false,provider,reason:result?.error?.message||'WhatsApp PDF send failed.'};
  }
  const fallback=await sendWhatsAppText(env,phone,`${caption}\n\nThe attendee list PDF can be downloaded from the administrator email notification.`.trim());return {...fallback,fallback:true};
}
export async function sendOtp(env, to, otp) {
  const text = `Your IronPulse Gym verification code is ${otp}. It is valid for 10 minutes. Do not share this code.`;
  return sendWhatsAppText(env, to, text);
}
export async function notifyAdmin(env, text, options={}) {
  try{const push=await import('./notification-events-v1-58.js');await push.adminBusinessNotification(env,text,options);}catch{}
  const saved=await getSetting(env,'admin_notification_settings',{}).catch(()=>({}));
  const email=String(saved.email||'').trim().toLowerCase(),phone=normalizePhone(saved.whatsapp||'');
  const emailEnabled=Boolean(saved.emailEnabled&&email),whatsappEnabled=Boolean(saved.whatsappEnabled&&phone);
  // Preserve an older environment-only destination until this new settings
  // card is saved once.  After that, an explicit disabled switch is honored.
  const legacyNumbers=!whatsappEnabled&&!Object.prototype.hasOwnProperty.call(saved,'whatsappEnabled')?[env.WHATSAPP_ADMIN_NUMBER,env.GREEN_API_ADMIN_NUMBER].filter(Boolean):[];
  const raw=String(text||'').trim(),subject=String(options.subject||raw.split('\n')[0]||'IronPulse Gym notification').slice(0,240);
  // A ten-minute bucket suppresses webhook retries without suppressing a future
  // renewal of the same order.
  const fingerprint=await sha256Hex(`${options.eventKey||raw}|${Math.floor(Date.now()/600000)}`),key=`admin:${fingerprint}`;
  try{const insert=await env.DB.prepare("INSERT OR IGNORE INTO admin_notification_log(notification_key,event_type) VALUES(?,?)").bind(key,String(options.eventType||'business_event').slice(0,80)).run();if(insert?.meta&&Number(insert.meta.changes||0)===0)return [{ok:true,skipped:true,reason:'duplicate'}];}catch{}
  const results=[];
  if(emailEnabled){try{const site=await getSiteSettings(env),html=brandedEmailHtml({site,env,title:subject,eyebrow:'Admin notification',introHtml:String(options.html||raw).split('\n').filter(Boolean).map(line=>`<p style="margin:0 0 10px">${String(line).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</p>`).join(''),noteHtml:'This operational notification was sent to the administrator address configured in Brand Settings → Checkout.'});results.push({channel:'email',...await sendConfiguredEmail(env,{to:email,subject,html,text:raw,fromName:site.siteName||'IronPulse Gym',attachments:options.attachments||[]},{purpose:'email'})});}catch(error){results.push({channel:'email',ok:false,error:error.message});}}
  for(const n of (whatsappEnabled?[phone]:legacyNumbers)){try{const attachment=options.attachments?.[0],sent=attachment?await sendWhatsAppDocument(env,n,{bytes:attachment.bytes,filename:attachment.filename,caption:raw}):await sendWhatsAppText(env,n,raw);results.push({channel:'whatsapp',...sent});}catch(error){results.push({channel:'whatsapp',ok:false,error:error.message});}}
  try{const e=results.find(x=>x.channel==='email'),w=results.find(x=>x.channel==='whatsapp'),error=results.filter(x=>x.ok===false).map(x=>x.error).join(' · ');await env.DB.prepare('UPDATE admin_notification_log SET email_status=?,whatsapp_status=?,error_text=? WHERE notification_key=?').bind(e?(e.ok?'sent':'failed'):'disabled',w?(w.ok?'sent':'failed'):'disabled',String(error).slice(0,1000),key).run();}catch{}
  return results;
}
export async function razorpayApi(env, path, { method='POST', payload=null } = {}) {
  const settings = await getPaymentSettings(env);
  const keyId = env.RAZORPAY_KEY_ID || settings.razorpayKeyId;
  const keySecret = env.RAZORPAY_KEY_SECRET || settings.razorpayKeySecret;
  if (!keyId || !keySecret) throw new Error('Razorpay credentials not configured');
  const auth = btoa(`${keyId}:${keySecret}`);
  const init = { method, headers:{ authorization:`Basic ${auth}`, 'content-type':'application/json' } };
  if (payload !== null && method !== 'GET') init.body = JSON.stringify(payload);
  const res = await fetch(`https://api.razorpay.com/v1${path}`, init);
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error?.description || data.error?.reason || data.error?.code || 'Razorpay API failed');
  return data;
}
export async function razorpayFetch(env, path, payload) { return razorpayApi(env, path, { method:'POST', payload }); }
export async function razorpayGet(env, path) { return razorpayApi(env, path, { method:'GET' }); }
export async function createRazorpayPlan(env, variant, product) {
  const period = variant.billing_months % 12 === 0 ? 'yearly' : 'monthly';
  const interval = period === 'yearly' ? Math.max(1, variant.billing_months / 12) : variant.billing_months;
  return razorpayFetch(env, '/plans', {
    period,
    interval,
    item: { name: `${product.name} - ${variant.name}`, amount: variant.offer_price_paise, currency: variant.currency || 'INR', description: product.short_description || product.description || product.name },
    notes: { sku: variant.sku, product_sku: product.sku }
  });
}
export async function createRazorpaySubscription(env, item, order) {
  if (!item.razorpay_plan_id) throw new Error('Razorpay plan ID missing for variant');
  const payload = {
    plan_id: item.razorpay_plan_id,
    total_count: item.total_count,
    quantity: item.quantity,
    customer_notify: 0,
    expire_by: Math.floor(Date.now()/1000) + 86400,
    notes: { order_id: order.order_id, customer_name: order.customer_name || '', customer_phone: order.customer_phone, customer_email: order.customer_email || '', product_name: item.product_name }
  };
  if (item.setup_amount_paise > 0) payload.addons = [{ item: { name: 'Setup / advance amount', amount: item.setup_amount_paise, currency: order.currency || 'INR' } }];
  return razorpayFetch(env, '/subscriptions', payload);
}


export function calculateCheckoutLine(product, rawItem = {}, checkout = {}) {
  const monthlyOffer = Number(product.offer_price_paise || rawItem.offer_price_paise || 0);
  const monthlyRegular = Number(product.regular_price_paise || monthlyOffer || 0);
  const hasConfiguredInterval=product.billing_interval!==null&&product.billing_interval!==undefined&&String(product.billing_interval).trim()!=='';
  const configuredInterval=Math.max(1,Math.floor(Number(product.billing_interval||1))||1);
  const configuredPeriod=String(product.billing_period||'monthly')==='yearly'?'yearly':'monthly';
  const billingMonths=hasConfiguredInterval?(configuredPeriod==='yearly'?configuredInterval*12:configuredInterval):Math.max(1,Number(rawItem.billing_months||1));
  const qty = Math.max(1, Number(rawItem.quantity || 1));
  const yearlyOfferMonths = Math.max(1, Number(checkout.yearlyOfferMonths || 10));
  const subscriptionYears = Math.max(1, Number(checkout.subscriptionYears || 21));
  const isYearly = billingMonths === 12;
  const unitAmount = hasConfiguredInterval?monthlyOffer:(isYearly ? monthlyOffer * yearlyOfferMonths : monthlyOffer);
  const originalUnitAmount = hasConfiguredInterval?monthlyRegular:(isYearly ? monthlyOffer * 12 : monthlyRegular);
  const totalCount = calcTotalCount(billingMonths, subscriptionYears) || Math.max(1,Math.ceil(subscriptionYears*12/billingMonths));
  return { qty, billingMonths, subscriptionYears, totalCount, unitAmount, originalUnitAmount, subtotal: unitAmount * qty, originalSubtotal: originalUnitAmount * qty, billingType: hasConfiguredInterval?configuredPeriod:(isYearly ? 'yearly' : 'monthly'), billingInterval:hasConfiguredInterval?configuredInterval:(isYearly?1:billingMonths), billingIntervalExplicit:hasConfiguredInterval };
}
export function applyCouponAmount(coupon, amountPaise, qty = 1) {
  if (!coupon) return 0;
  const type = coupon.discount_type || 'amount';
  const val = Number(coupon.discount_value || 0);
  if (type === 'percent') return Math.min(amountPaise, Math.round(amountPaise * val / 100));
  if (type === 'free_member') return Math.min(amountPaise, Math.round((amountPaise / Math.max(1, qty)) * val));
  return Math.min(amountPaise, val * 100);
}

export async function sendEmailNotice(env, to, subject, html, text='') {
  if (!to) return { ok:false, reason:'no email' };
  try {
    const site=await getSiteSettings(env).catch(()=>DEFAULT_SITE_SETTINGS);
    let finalHtml=String(html||'');
    if(!/data-uc-branded-email=/i.test(finalHtml))finalHtml=brandedEmailHtml({site,env,title:String(subject||site.siteName||'IronPulse Gym').replace(/\s+-\s+.*$/,''),customerName:'',introHtml:finalHtml});
    const cleanSubject=String(subject||site.siteName||'IronPulse Gym').replace(/[–—]/g,'-');
    try{return await sendConfiguredEmail(env,{to,bcc:'',subject:cleanSubject,html:finalHtml,text:text||cleanSubject,fromName:site.siteName||'IronPulse Gym'},{purpose:'email'});}catch(providerError){
    const url = env.EMAIL_RELAY_URL || env.APPS_SCRIPT_EMAIL_RELAY_URL;
    if (!url) return { ok:false, reason:providerError.message||'A primary email provider is not configured' };
    const res = await fetch(url, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ to, subject:cleanSubject, html:finalHtml, text }) });
    return { ok: res.ok, status: res.status, provider:'relay' };
    }
  } catch (e) { return { ok:false, reason:e.message }; }
}
export async function sendOrderPaidEmail(env, orderId) {
  const o = await env.DB.prepare('SELECT * FROM orders WHERE order_id=?').bind(orderId).first().catch(()=>null);
  if (!o || !o.customer_email) return { ok:false, reason:'order or customer email not found' };
  const receipt=await env.DB.prepare(`SELECT * FROM payment_receipts WHERE order_id=? AND amount_paise>0 AND lower(COALESCE(status,'')) IN ('paid','captured','successful','success') ORDER BY COALESCE(NULLIF(paid_at_epoch,0),strftime('%s',paid_at)) DESC,id DESC LIMIT 1`).bind(orderId).first().catch(()=>null);
  if(!receipt)return {ok:false,reason:'confirmed payment receipt not found'};
  if(Number(receipt.email_notice_sent||0)===1)return {ok:true,skipped:true,reason:'payment email already sent'};
  const itemRows=(await env.DB.prepare(`SELECT oi.*,p.name catalog_name,p.regular_price_paise catalog_regular_paise,p.offer_price_paise catalog_offer_paise,p.trial_enabled,p.trial_amount_paise,p.trial_value,p.trial_unit FROM order_items oi LEFT JOIN products p ON p.id=oi.product_id WHERE oi.order_id=? ORDER BY oi.id`).bind(o.id).all().catch(()=>({results:[]}))).results||[];
  const first=itemRows[0]||{},qty=x=>Math.max(1,Number(x.quantity||1)),sum=(key,fallback='')=>itemRows.reduce((n,x)=>n+Math.max(0,Number(x[key]||x[fallback]||0))*qty(x),0);
  const offerPaise=sum('unit_amount_paise','catalog_offer_paise')||Math.max(0,Number(o.amount_paise||0));
  const regularPaise=sum('original_unit_amount_paise','catalog_regular_paise')||offerPaise;
  const discountPaise=Math.max(0,regularPaise-offerPaise);
  let tax={};try{tax=JSON.parse(String(receipt.tax_snapshot_json||'{}'));}catch(_){tax={};}
  const received=Math.max(0,Number(receipt.amount_paise||0)),base=Math.max(0,Number(receipt.base_amount_paise||tax.basePaise||0))||received;
  const gst=Math.max(0,Number(receipt.gst_amount_paise||tax.gstPaise||0)),service=Math.max(0,Number(receipt.service_charge_paise||tax.serviceChargePaise||0)),other=Math.max(0,Number(receipt.other_tax_paise||tax.otherTaxPaise||0));
  const kind=String(receipt.payment_kind||'').toLowerCase(),isTrial=kind==='authentication'||kind==='trial',oneTime=String(o.payment_mode||'').toLowerCase()==='one_time';
  const trialPaise=Math.max(0,Number(first.setup_amount_paise||first.trial_amount_paise||0))||base;
  const planName=itemRows.map(x=>x.product_name||x.catalog_name||x.variant_name).filter(Boolean).join(', ')||'Membership';
  const [site,social,templates]=await Promise.all([getSiteSettings(env).catch(()=>DEFAULT_SITE_SETTINGS),getSocialIntegrationSettings(env).catch(()=>({gmail:{}})),getAutomaticEmailTemplates(env)]),gmail=social.gmail||{};
  const paidAt=receipt.paid_at||o.updated_at||o.created_at||new Date().toISOString(),date=new Date(paidAt),invoiceDate=Number.isNaN(date.getTime())?String(paidAt).slice(0,10):date.toISOString().slice(0,10);
  const invoiceNo=`INV-${invoiceDate.replace(/-/g,'')}-${String(receipt.transaction_id||orderId).replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase()}`;
  const gateway=({razorpay:'Razorpay',stripe:'Stripe',phonepe:'PhonePe',manual:'Manual'})[String(receipt.gateway||o.gateway||'').toLowerCase()]||String(receipt.gateway||o.gateway||'Payment Gateway');
  const taxLabel=gst>0?`GST ${Number(tax.gstPercent||0)}%${tax.gstNumber?` - GSTIN ${tax.gstNumber}`:''}`:(service>0||other>0?'Applicable Charges':'Not Applicable');
  const rendered=applyEmailTemplate(templates.payment_success,{BrandName:site.siteName||'IronPulse Gym',ClientName:o.customer_name||'Customer',OrderId:o.order_id,InvoiceNumber:invoiceNo});
  if(isTrial&&rendered.eyebrow==='Payment confirmed')rendered.eyebrow='Trial Payment Confirmed';
  if(isTrial&&rendered.intro===templates.payment_success.intro)rendered.intro='Your trial payment has been received successfully. We hope the trial helps you experience the service with confidence.';
  const summaryRows=automaticEmailSummaryRows(rendered,[o.order_id,site.siteName||'IronPulse Gym',planName,gateway,receipt.transaction_id||'-',emailMoney(received),invoiceDate]);
  let successCta=rendered.buttonUrl||'/my-orders';if(successCta.startsWith('/'))successCta=`${brandHomeUrl(env)}${successCta}`;
  const html=brandedEmailHtml({site,env,title:rendered.heading,eyebrow:rendered.eyebrow,greetingText:rendered.greeting,customerName:o.customer_name||'Customer',introHtml:automaticEmailTextHtml(rendered.intro),summaryTitle:rendered.summaryTitle,summaryRows,bodyHtml:automaticEmailTextHtml(rendered.body),noteHtml:automaticEmailTextHtml(rendered.note),ctaLabel:rendered.buttonLabel,ctaUrl:successCta});
  let logoJpegBytes=null;
  try{
    const logoCandidates=[(/^https?:\/\//i.test(String(site.logoUrl||''))?String(site.logoUrl):`${brandHomeUrl(env)}${String(site.logoUrl||'/assets/ironpulse-logo.svg').startsWith('/')?'':'/'}${String(site.logoUrl||'/assets/ironpulse-logo.svg')}`),`${brandHomeUrl(env)}/assets/ironpulse-invoice-logo.jpg`].filter(Boolean);
    for(const logoUrl of logoCandidates){const lr=await fetch(logoUrl,{headers:{accept:'image/jpeg'}}).catch(()=>null);if(lr?.ok&&String(lr.headers.get('content-type')||'').toLowerCase().includes('jpeg')){logoJpegBytes=new Uint8Array(await lr.arrayBuffer());break;}}
  }catch(_){logoJpegBytes=null;}
  const pdf=buildSimpleInvoicePdf({primaryColor:site.primaryColor,accentColor:site.accentColor,brandName:site.siteName||'IronPulse Gym',tagline:site.tagline||'',logoJpegBytes,customerName:o.customer_name||'Customer',customerPhone:o.customer_phone||'',customerEmail:o.customer_email||'',orderId:o.order_id,invoiceNo,invoiceDate,gateway,paymentId:receipt.transaction_id||'',taxLabel,gstNumber:tax.gstNumber||'',planName,planDescription:isTrial?'This invoice records the trial payment received for the selected plan.':'This invoice records the payment actually received for the selected plan.',regularPaise,offerPaise,discountPaise,isTrial,oneTime,trialPaise,baseReceivedPaise:base,receivedPaise:received,gstPaise:gst,gstPercent:Number(tax.gstPercent||0),servicePaise:service,otherTaxPaise:other,otherTaxLabel:tax.otherTaxLabel||'Other Tax',legalName:site.legalEntityEnabled?site.legalEntityName||'':'',legalAddress:site.legalEntityEnabled?site.legalEntityAddress||'':''});
  const subject=rendered.subject||`${site.siteName||'IronPulse Gym'} - Payment Successful - ${o.order_id}`;
  const text=`Payment successful for ${o.order_id}. Amount received: ${emailMoney(received)}. Invoice ${invoiceNo} is attached.`;
  const r=await sendConfiguredEmail(env,{to:o.customer_email,bcc:gmail.adminCopyEmail||'',subject,html,text,attachments:[{filename:`${String(site.siteName||'dropbeat-dance-studio').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-invoice-${invoiceNo}.pdf`,contentType:'application/pdf',bytes:pdf}],fromName:site.siteName||'IronPulse Gym'},{purpose:'email'});
  if(r?.ok){
    try{await env.DB.prepare('UPDATE payment_receipts SET email_notice_sent=1,email_notice_sent_at=CURRENT_TIMESTAMP WHERE id=?').bind(receipt.id).run();}catch(_){ }
    try{await env.DB.prepare('UPDATE orders SET email_notice_sent=1 WHERE order_id=?').bind(orderId).run();}catch(_){ }
    try{const lead=await env.DB.prepare("SELECT id FROM contact_leads WHERE lower(trim(COALESCE(email,'')))=? ORDER BY id DESC LIMIT 1").bind(String(o.customer_email||'').trim().toLowerCase()).first();if(lead?.id){await env.DB.prepare("UPDATE email_automation_enrollments SET status='completed_purchase',completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE lead_id=? AND status IN ('active','processing') AND flow_id IN (SELECT id FROM email_automation_flows WHERE trigger_type IN ('abandoned_cart','abandoned_checkout'))").bind(Number(lead.id)).run().catch(()=>{});const automation=await import('./email-automations.js');await automation.enrollEmailAutomationForEvent(env,{leadId:Number(lead.id),eventType:'purchase',context:{eventId:`order-${o.order_id}`,orderId:o.order_id,productName:planName}});await automation.enrollEmailAutomationForEvent(env,{leadId:Number(lead.id),eventType:'purchase_product',context:{eventId:`order-${o.order_id}`,orderId:o.order_id,productName:planName,productId:Number(first.product_id||0)}});await automation.processEmailAutomations(env,{leadId:Number(lead.id),limit:20});}}catch(_){ }
  }
  // Any confirmed payment permanently stops the failed-payment reminder cycle.
  try{await env.DB.prepare("UPDATE payment_recovery_emails SET status='resolved',resolved_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE order_id=? AND status='open'").bind(orderId).run();}catch(_){ }
  return r||{ok:false};
}
