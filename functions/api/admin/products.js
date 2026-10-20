import { json, readJson, requireAdmin, safeJsonParse, slugify, calcTotalCount, createRazorpayPlan, rupeesToPaise } from '../../_lib/utils.js';
import { ensureDanceStudioSchema, getProductClassMappings, saveProductClassMapping, validateProductClassDetails } from '../../_lib/dance-studio.js';
function bool01(v,def=0){if(v===undefined||v===null||v==='')return def;return ['1','true','yes','on'].includes(String(v).toLowerCase())?1:0;}
function unit(v){const x=String(v||'days').toLowerCase();return ['days','weeks','months','years'].includes(x)?x:'days';}
function paymentType(v){return String(v||'subscription').toLowerCase()==='one_time'?'one_time':'subscription';}
function billingPeriod(v){return String(v||'monthly').toLowerCase()==='yearly'?'yearly':'monthly';}
function billingInterval(v){const n=Math.floor(Number(v||1));return Number.isFinite(n)&&n>0?Math.min(n,120):1;}
function planFeatures(value){return (Array.isArray(value)?value:[]).map(item=>String(item||'').trim().slice(0,80)).filter(Boolean).slice(0,24);}
function availabilityThresholds(b={},spotLimit=0){
  const filling=Math.max(0,Math.floor(Number(b.filling_fast_limit||0))),low=Math.max(0,Math.floor(Number(b.low_spot_limit||0)));
  if(spotLimit>0&&filling>spotLimit)throw new Error('Filling Fast threshold cannot be higher than Spot Limit.');
  if(spotLimit>0&&low>spotLimit)throw new Error('Only X Spots Left threshold cannot be higher than Spot Limit.');
  if(filling>0&&low>filling)throw new Error('Only X Spots Left threshold must be less than or equal to the Filling Fast threshold.');
  return {fillingFastLimit:filling,lowSpotLimit:low};
}

function cleanDiagnosticMessage(err){return String(err?.message||err||'Unknown error').replace(/\s+/g,' ').trim().slice(0,700);}
function productSaveError(err,action='save'){
  const detail=cleanDiagnosticMessage(err),lower=detail.toLowerCase();
  if(lower.includes('no such column')&&(lower.includes('filling_fast_limit')||lower.includes('low_spot_limit')||lower.includes('spot_limit'))){
    return json({error:'Plan / offer could not be saved because the availability fields were not initialized in the database. This build automatically repairs those fields on the first request after deployment. Refresh the admin page once and try Save Plan / Offer again.',diagnostic_code:'PLAN_AVAILABILITY_SCHEMA_NOT_READY',technical_detail:detail},500);
  }
  if(lower.includes('constraint')||lower.includes('unique'))return json({error:`Plan / offer could not be ${action}d because one of the saved values conflicts with an existing record. ${detail}`,diagnostic_code:'PLAN_CONSTRAINT_ERROR'},400);
  return json({error:`Plan / offer could not be ${action}d. ${detail}`,diagnostic_code:'PLAN_SAVE_ERROR'},400);
}
function autoSku(slug){const base=String(slug||'plan').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toUpperCase().slice(0,28)||'PLAN';return `UC-${base}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;}
async function uniqueSlug(env,name,preferred='',excludeId=0){
  const base=slugify(preferred||name)||'plan';let candidate=base,n=2;
  while(true){
    const row=excludeId
      ? await env.DB.prepare('SELECT id FROM products WHERE slug=? AND id<>? LIMIT 1').bind(candidate,excludeId).first()
      : await env.DB.prepare('SELECT id FROM products WHERE slug=? LIMIT 1').bind(candidate).first();
    if(!row)return candidate;
    candidate=`${base}-${n++}`;
  }
}
export async function onRequestGet({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  await ensureDanceStudioSchema(env);
  const { results } = await env.DB.prepare('SELECT * FROM products ORDER BY sort_order, id DESC').all();
  const rows=results||[],ids=rows.map(row=>Number(row.id)).filter(Boolean);if(!ids.length)return json({products:[]});
  const placeholders=ids.map(()=>'?').join(',');
  const [imagesResult,variantsResult,classMappings]=await Promise.all([
    env.DB.prepare(`SELECT * FROM product_images WHERE product_id IN (${placeholders}) ORDER BY product_id,sort_order,id`).bind(...ids).all(),
    env.DB.prepare(`SELECT * FROM product_variants WHERE product_id IN (${placeholders}) ORDER BY product_id,billing_months`).bind(...ids).all(),
    getProductClassMappings(env,ids)
  ]);
  const imagesByProduct=new Map(),variantsByProduct=new Map();
  for(const image of imagesResult.results||[]){const list=imagesByProduct.get(Number(image.product_id))||[];if(list.length<3)list.push(image);imagesByProduct.set(Number(image.product_id),list);}
  for(const variant of variantsResult.results||[]){const list=variantsByProduct.get(Number(variant.product_id))||[];list.push(variant);variantsByProduct.set(Number(variant.product_id),list);}
  const products=rows.map(product=>({...product,features:safeJsonParse(product.features_json,[]),images:imagesByProduct.get(Number(product.id))||[],variants:variantsByProduct.get(Number(product.id))||[],class_mapping:classMappings.get(Number(product.id))||null}));
  return json({ products });
}
export async function onRequestPost({ request, env, skipGatewayProvisioning = false }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  try{
    const b = await readJson(request), features=planFeatures(b.features),description=String(b.description||'').trim();
    if(!description)return json({error:'Plan Description is required when creating a new plan / offer. It is shown on the public Details page.'},400);
    const regularPaise=b.regular_price_paise!==undefined?Number(b.regular_price_paise||0):rupeesToPaise(b.regular_price_rupees||b.regular_price||0);
    const offerPaise=b.offer_price_paise!==undefined?Number(b.offer_price_paise||0):rupeesToPaise(b.offer_price_rupees||b.offer_price||0);
    const slug=await uniqueSlug(env,b.name,b.slug),sku=String(b.sku||'').trim()||autoSku(slug),pt=paymentType(b.payment_type), offerEnabled=bool01(b.offer_price_enabled,1), trialEnabled=pt==='subscription'?bool01(b.trial_enabled,0):0, spotLimit=Math.max(0,Math.floor(Number(b.spot_limit||0)));
    if(pt==='one_time'&&!bool01(b.class_mapping_enabled,0))throw new Error('Class or Event Details are required for a one-time payment plan. Enable them and choose the mandatory class start and end dates.');
    await validateProductClassDetails(env,b,{requireAccessDates:pt==='one_time'});
    const {fillingFastLimit,lowSpotLimit}=availabilityThresholds(b,spotLimit);
    const trialAmount=b.trial_amount_paise!==undefined?Number(b.trial_amount_paise||0):rupeesToPaise(b.trial_amount_rupees||1);
    const res=await env.DB.prepare(`INSERT INTO products(sku,name,slug,type,short_description,description,regular_price_paise,offer_price_paise,currency,status,badge,features_json,eligibility,spot_limit,filling_fast_limit,low_spot_limit,sort_order,seo_title,seo_description,payment_type,offer_price_enabled,trial_enabled,trial_amount_paise,trial_value,trial_unit,billing_period,billing_interval)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(sku,b.name,slug,b.type||'subscription',b.short_description||'',description,regularPaise,offerPaise,b.currency||'INR',b.status||'active',b.badge||'',JSON.stringify(features),b.eligibility||'',spotLimit,fillingFastLimit,lowSpotLimit,Number(b.sort_order||0),b.seo_title||'',b.seo_description||'',pt,offerEnabled,trialEnabled,Math.max(100,trialAmount||100),Math.max(1,Number(b.trial_value||7)),unit(b.trial_unit),billingPeriod(b.billing_period),pt==='subscription'?billingInterval(b.billing_interval):null).run();
    const productId=res.meta.last_row_id;
    await createDefaultVariants(env,productId,{...b,sku,slug,regular_price_paise:regularPaise,offer_price_paise:offerPaise},!skipGatewayProvisioning);
    await saveProductClassMapping(env,productId,b);
    return json({ok:true,id:productId,message:'Plan / offer created successfully.'});
  }catch(e){return productSaveError(e,'create');}
}
export async function onRequestPut({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  try{
    const b=await readJson(request);if(!b.id)return json({error:'Product id is required'},400);
    const regularPaise=b.regular_price_paise!==undefined?Number(b.regular_price_paise||0):rupeesToPaise(b.regular_price_rupees||b.regular_price||0);
    const offerPaise=b.offer_price_paise!==undefined?Number(b.offer_price_paise||0):rupeesToPaise(b.offer_price_rupees||b.offer_price||0);
    const existing=await env.DB.prepare('SELECT sku,slug FROM products WHERE id=?').bind(b.id).first();
    if(!existing)return json({error:'Plan / offer not found'},404);
    const slug=existing.slug||await uniqueSlug(env,b.name,b.slug,b.id),sku=existing.sku||String(b.sku||'').trim()||autoSku(slug);
    const pt=paymentType(b.payment_type), offerEnabled=bool01(b.offer_price_enabled,1), trialEnabled=pt==='subscription'?bool01(b.trial_enabled,0):0, spotLimit=Math.max(0,Math.floor(Number(b.spot_limit||0)));
    if(pt==='one_time'&&!bool01(b.class_mapping_enabled,0))throw new Error('Class or Event Details are required for a one-time payment plan. Enable them and choose the mandatory class start and end dates.');
    await validateProductClassDetails(env,b,{requireAccessDates:pt==='one_time'});
    const {fillingFastLimit,lowSpotLimit}=availabilityThresholds(b,spotLimit);
    const trialAmount=b.trial_amount_paise!==undefined?Number(b.trial_amount_paise||0):rupeesToPaise(b.trial_amount_rupees||1);
    await env.DB.prepare(`UPDATE products SET sku=?,name=?,slug=?,short_description=?,description=?,regular_price_paise=?,offer_price_paise=?,status=?,badge=?,features_json=?,eligibility=?,spot_limit=?,filling_fast_limit=?,low_spot_limit=?,sort_order=?,payment_type=?,offer_price_enabled=?,trial_enabled=?,trial_amount_paise=?,trial_value=?,trial_unit=?,billing_period=?,billing_interval=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(sku,b.name,slug,b.short_description||'',b.description||'',regularPaise,offerPaise,b.status||'active',b.badge||'',JSON.stringify(planFeatures(b.features)),b.eligibility||'',spotLimit,fillingFastLimit,lowSpotLimit,Number(b.sort_order||0),pt,offerEnabled,trialEnabled,Math.max(100,trialAmount||100),Math.max(1,Number(b.trial_value||7)),unit(b.trial_unit),billingPeriod(b.billing_period),pt==='subscription'?billingInterval(b.billing_interval):null,b.id).run();
    await saveProductClassMapping(env,b.id,b);
    return json({ok:true,message:'Plan / offer updated successfully.'});
  }catch(e){return productSaveError(e,'update');}
}
export async function onRequestDelete({request,env}){
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  const id=Number(new URL(request.url).searchParams.get('id')||0);if(!id)return json({error:'Product id is required'},400);
  await env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run();
  return json({ok:true});
}
async function createDefaultVariants(env, productId, b, provisionGatewayPlans = true) {
  const product=await env.DB.prepare('SELECT * FROM products WHERE id=?').bind(productId).first();
  const list=[['MONTHLY','Monthly',1,1],['QUARTERLY','3 Months',3,3],['HALFYEAR','6 Months',6,6],['NINEMONTH','9 Months',9,9],['YEARLY','Yearly',12,12],['THREEYEAR','3 Years',36,36]];
  for(const [suffix,name,months,mult] of list){const total=calcTotalCount(months,21),variant={sku:`${b.sku}-${suffix}`,name,billing_months:months,horizon_years:21,total_count:total,regular_price_paise:Number(b.regular_price_paise||0)*mult,offer_price_paise:Number(b.offer_price_paise||0)*mult,setup_amount_paise:0,currency:b.currency||'INR'};let planId=null;if(provisionGatewayPlans)try{const plan=await createRazorpayPlan(env,variant,product);planId=plan.id;}catch(_){}await env.DB.prepare(`INSERT OR IGNORE INTO product_variants(product_id,sku,name,billing_months,horizon_years,total_count,regular_price_paise,offer_price_paise,setup_amount_paise,currency,razorpay_plan_id,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(productId,variant.sku,variant.name,variant.billing_months,variant.horizon_years,variant.total_count,variant.regular_price_paise,variant.offer_price_paise,0,variant.currency,planId,'active').run();}
}
