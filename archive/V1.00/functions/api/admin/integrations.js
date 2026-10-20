import { json, readJson, requireAdmin, getPaymentSettings, setSetting, maskSecret, createRazorpayPlan, preferredPublicOrigin } from '../../_lib/utils.js';

function urls(request,env) {
  const origin = preferredPublicOrigin(request,env);
  return {
    razorpayWebhookUrl: `${origin}/api/webhooks/razorpay`,
    phonepeWebhookUrl: `${origin}/api/webhooks/phonepe`,
    stripeWebhookUrl: `${origin}/api/webhooks/stripe`,
    whatsappWebhookUrl: `${origin}/api/webhooks/whatsapp`
  };
}

function publicView(settings, request, env) {
  return {
    primaryGateway: settings.primaryGateway || '',
    razorpayEnabled: !!settings.razorpayEnabled,
    razorpayKeyId: settings.razorpayKeyId || '',
    razorpayKeySecretMasked: maskSecret(settings.razorpayKeySecret),
    razorpayWebhookSecretMasked: maskSecret(settings.razorpayWebhookSecret),

    phonepeEnabled: !!settings.phonepeEnabled,
    phonepeFallbackEnabled: !!settings.phonepeFallbackEnabled,
    phonepeEnvironment: settings.phonepeEnvironment || 'production',
    phonepeClientId: settings.phonepeClientId || '',
    phonepeClientVersion: settings.phonepeClientVersion || '1',
    phonepeMerchantId: settings.phonepeMerchantId || '',
    phonepeClientSecretMasked: maskSecret(settings.phonepeClientSecret),
    phonepeWebhookUsername: settings.phonepeWebhookUsername || '',
    phonepeWebhookPasswordMasked: maskSecret(settings.phonepeWebhookPassword),
    phonepeWebhookSecretMasked: maskSecret(settings.phonepeWebhookSecret),
    phonepeWebhookKeyId: settings.phonepeWebhookKeyId || '',
    phonepeWebhookAuthMode: ['hmac','sha'].includes(String(settings.phonepeWebhookAuthMode||'').toLowerCase()) ? String(settings.phonepeWebhookAuthMode).toLowerCase() : 'hmac',

    stripeEnabled: !!settings.stripeEnabled,
    stripePublishableKey: settings.stripePublishableKey || '',
    stripeSecretKeyMasked: maskSecret(settings.stripeSecretKey),
    stripeWebhookSecretMasked: maskSecret(settings.stripeWebhookSecret),
    stripeFallbackEnabled: !!settings.stripeFallbackEnabled,
    deletedAt: settings.integrationDeletedAt || {},

    whatsappWebhookVerifyTokenMasked: maskSecret(settings.whatsappWebhookVerifyToken),
    otpProvider: settings.otpProvider || 'whatsapp_cloud',
    whatsappPhoneNumberId: settings.whatsappPhoneNumberId || '',
    whatsappCloudTokenMasked: maskSecret(settings.whatsappCloudToken),
    greenApiInstanceId: settings.greenApiInstanceId || '',
    greenApiTokenMasked: maskSecret(settings.greenApiToken),
    ...urls(request,env)
  };
}

function requestedPrimary(body,current){
  const explicit=String(body.primaryGateway??'').trim().toLowerCase();
  if(['razorpay','phonepe','stripe'].includes(explicit))return explicit;
  // Backward-compatible support for the old three enable switches. If exactly one
  // was posted as true, it becomes primary; otherwise preserve the current primary.
  const selected=['razorpay','phonepe','stripe'].filter(g=>body[`${g}Enabled`]===true || body[`${g}Enabled`]==='true' || body[`${g}Enabled`]==='on');
  if(selected.length===1)return selected[0];
  if(body.razorpayEnabled===false&&body.phonepeEnabled===false&&body.stripeEnabled===false)return '';
  return ['razorpay','phonepe','stripe'].includes(String(current.primaryGateway||'').toLowerCase())?String(current.primaryGateway).toLowerCase():'';
}

export async function onRequestGet({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  const settings = await getPaymentSettings(env);
  return json({ settings: publicView(settings, request, env) });
}

export async function onRequestPost({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  const b = await readJson(request);
  const current = await getPaymentSettings(env);
  if(String(b.action||'').toLowerCase()==='delete_gateway'){
    const gateway=String(b.gateway||'').trim().toLowerCase();
    if(!['razorpay','phonepe','stripe'].includes(gateway))return json({error:'Choose Razorpay, PhonePe or Stripe.'},400);
    const now=new Date().toISOString(),next={...current,integrationDeletedAt:{...(current.integrationDeletedAt||{}),[gateway]:now},updatedAt:now};
    if(gateway==='razorpay'){
      Object.assign(next,{razorpayEnabled:false,razorpayKeyId:'',razorpayKeySecret:'',razorpayWebhookSecret:''});
      if(next.primaryGateway==='razorpay')next.primaryGateway='';
      next.phonepeFallbackEnabled=false;next.stripeFallbackEnabled=false;
    }else if(gateway==='phonepe'){
      Object.assign(next,{phonepeEnabled:false,phonepeFallbackEnabled:false,phonepeClientId:'',phonepeClientSecret:'',phonepeMerchantId:'',phonepeWebhookUsername:'',phonepeWebhookPassword:'',phonepeWebhookSecret:'',phonepeWebhookKeyId:'',phonepeClientVersion:'1'});
      if(next.primaryGateway==='phonepe')next.primaryGateway='';
    }else{
      Object.assign(next,{stripeEnabled:false,stripeFallbackEnabled:false,stripePublishableKey:'',stripeSecretKey:'',stripeWebhookSecret:''});
      if(next.primaryGateway==='stripe')next.primaryGateway='';
    }
    await setSetting(env,'payment_settings',next);
    return json({ok:true,message:`${gateway==='phonepe'?'PhonePe':gateway==='stripe'?'Stripe':'Razorpay'} integration deleted. Saved gateway credentials were cleared.`,settings:publicView(next,request,env)});
  }
  const primary=requestedPrimary(b,current);
  const next = { ...current,
    primaryGateway: primary,
    razorpayEnabled: primary==='razorpay',
    phonepeEnabled: primary==='phonepe',
    stripeEnabled: primary==='stripe',
    // Fallback order is deliberately deterministic: Razorpay → PhonePe → Stripe.
    // Fallback switches are therefore active only when Razorpay is the primary.
    phonepeFallbackEnabled: primary==='razorpay' && !!b.phonepeFallbackEnabled,
    stripeFallbackEnabled: primary==='razorpay' && !!b.stripeFallbackEnabled,

    razorpayKeyId: b.razorpayKeyId ?? current.razorpayKeyId,
    phonepeEnvironment: ['sandbox','production'].includes(String(b.phonepeEnvironment||'')) ? b.phonepeEnvironment : (current.phonepeEnvironment||'production'),
    phonepeClientId: b.phonepeClientId ?? current.phonepeClientId,
    phonepeClientVersion: b.phonepeClientVersion ?? current.phonepeClientVersion ?? '1',
    phonepeMerchantId: b.phonepeMerchantId ?? current.phonepeMerchantId,
    phonepeWebhookUsername: b.phonepeWebhookUsername ?? current.phonepeWebhookUsername,
    phonepeWebhookKeyId: b.phonepeWebhookKeyId ?? current.phonepeWebhookKeyId,
    phonepeWebhookAuthMode: ['hmac','sha'].includes(String(b.phonepeWebhookAuthMode||'').toLowerCase()) ? String(b.phonepeWebhookAuthMode).toLowerCase() : (current.phonepeWebhookAuthMode||'hmac'),
    stripePublishableKey: b.stripePublishableKey ?? current.stripePublishableKey,
    otpProvider: b.otpProvider || current.otpProvider || 'whatsapp_cloud',
    whatsappPhoneNumberId: b.whatsappPhoneNumberId ?? current.whatsappPhoneNumberId,
    greenApiInstanceId: b.greenApiInstanceId ?? current.greenApiInstanceId,
    updatedAt: new Date().toISOString()
  };
  next.integrationDeletedAt={...(current.integrationDeletedAt||{})};
  if(Object.prototype.hasOwnProperty.call(b,'razorpayKeyId'))delete next.integrationDeletedAt.razorpay;
  if(Object.prototype.hasOwnProperty.call(b,'phonepeClientId'))delete next.integrationDeletedAt.phonepe;
  if(Object.prototype.hasOwnProperty.call(b,'stripePublishableKey'))delete next.integrationDeletedAt.stripe;
  if (b.razorpayKeySecret) next.razorpayKeySecret = b.razorpayKeySecret;
  if (b.razorpayWebhookSecret) next.razorpayWebhookSecret = b.razorpayWebhookSecret;
  if (b.phonepeClientSecret) next.phonepeClientSecret = b.phonepeClientSecret;
  if (b.phonepeWebhookPassword) next.phonepeWebhookPassword = b.phonepeWebhookPassword;
  if (b.phonepeWebhookSecret) next.phonepeWebhookSecret = b.phonepeWebhookSecret;
  if (b.stripeSecretKey) next.stripeSecretKey = b.stripeSecretKey;
  if (b.stripeWebhookSecret) next.stripeWebhookSecret = b.stripeWebhookSecret;
  if (b.whatsappWebhookVerifyToken) next.whatsappWebhookVerifyToken = b.whatsappWebhookVerifyToken;
  if (b.whatsappCloudToken) next.whatsappCloudToken = b.whatsappCloudToken;
  if (b.greenApiToken) next.greenApiToken = b.greenApiToken;

  await setSetting(env, 'payment_settings', next);

  // Keep the existing Razorpay plan-sync behavior intact when Razorpay is the
  // selected primary gateway. Other gateways build their checkout objects only
  // when needed, so they do not need this sync pass.
  let syncedPlans = 0;
  if (next.razorpayEnabled && next.razorpayKeyId && next.razorpayKeySecret) {
    const { results } = await env.DB.prepare(`SELECT v.*, p.name product_name, p.sku product_sku, p.short_description, p.description FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.status='active' AND (v.razorpay_plan_id IS NULL OR v.razorpay_plan_id='') LIMIT 60`).all();
    for (const v of results || []) {
      try {
        const plan = await createRazorpayPlan(env, v, { name: v.product_name, sku: v.product_sku, short_description: v.short_description, description: v.description });
        await env.DB.prepare('UPDATE product_variants SET razorpay_plan_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(plan.id, v.id).run();
        syncedPlans++;
      } catch (_) {}
    }
  }
  return json({ ok: true, syncedPlans, settings: publicView(next, request, env) });
}
