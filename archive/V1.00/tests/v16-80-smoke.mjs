import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLeadNurtureActivation } from '../functions/_lib/lead-nurturing.js';
import { validateSocialAutomationActivation } from '../functions/_lib/social-automations.js';
import { resolveLiveOffer } from '../functions/_lib/live-offers.js';
import { buildAutomationCheckoutUrl, verifyAutomationCheckoutToken } from '../functions/_lib/automation-checkout.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

assert.ok(['V16.80','V16.81','V16.82','V16.83'].includes(read('VERSION.txt').trim()),'V16.80 feature regression test must run on V16.80 or an additive successor');
const client=read('public/admin/final-v16-34-admin-workflow-pages-social.js');
const clientCss=read('public/admin/final-v16-34-admin-workflow-pages-social.css');
const modalCss=read('public/admin/final-v16-77-client-identities-sticky-modals.css');
assert.match(client,/title\.type='button'/);
assert.match(client,/title\.setAttribute\('aria-expanded','false'\)/);
assert.match(client,/chips\.hidden=true/);
assert.match(client,/title\.addEventListener\('click'/);
assert.doesNotMatch(client,/page-history-chevron/);
assert.match(clientCss,/\.uc-page-chips\[hidden\]\{display:none!important\}/);
assert.match(modalCss,/width:min\(1500px,97vw\)!important/);
assert.match(modalCss,/height:min\(95dvh,1120px\)!important/);

const leadUi=read('public/admin/final-v16-76-d1-polls-automation-workspace.js');
const leadCss=read('public/admin/final-v16-76-d1-polls-automation-workspace.css');
assert.match(leadUi,/Try for just/);
assert.match(leadUi,/uc80-price-old/);
assert.match(leadUi,/attachmentsOf/);
assert.match(leadUi,/automation-attachment/);
assert.match(leadUi,/data-uc80-remove-attachment/);
assert.match(leadUi,/multiple/);
assert.match(leadCss,/\.uc80-attachment/);
assert.match(leadCss,/\.uc80-trial-price/);

const drive=read('functions/_lib/google-drive-upload.js');
const uploadApi=read('functions/api/admin/google-drive-upload.js');
assert.match(drive,/Automation Attachments/);
assert.match(drive,/uploadAutomationAttachmentToGoogleDrive/);
assert.match(drive,/25\*1024\*1024/);
assert.match(uploadApi,/purpose==='automation-attachment'/);

const nurture=read('functions/_lib/lead-nurturing.js');
assert.match(nurture,/stepAttachments/);
assert.match(nurture,/buildAutomationCheckoutUrl/);
assert.match(nurture,/text-decoration:line-through/);
assert.match(nurture,/customer’s known details pre-filled/);
const withImage={name:'Image follow-up',sources:['all'],steps:[{name:'Image',enabled:true,channel:'whatsapp',delayAmount:0,delayUnit:'minutes',message:'Hello',contentType:'image',attachments:[{kind:'image',url:'https://drive.google.com/image',name:'hello.png'}],buttons:[]}]};
assert.deepEqual(validateLeadNurtureActivation(withImage),[]);
const missingImage=structuredClone(withImage);missingImage.steps[0].attachments=[];
assert.ok(validateLeadNurtureActivation(missingImage).some(x=>x.field==='attachments'));

const flowUi=read('public/admin/final-v16-68-automation-flow-workspace.js');
const flowCss=read('public/admin/final-v16-68-automation-flow-workspace.css');
assert.match(flowUi,/Upload to Google Drive/);
assert.match(flowUi,/data-uc80-flow-remove/);
assert.match(flowUi,/Facebook and Instagram permit one initial private reply/);
assert.match(flowCss,/\.uc80-flow-upload/);
const commentDm={name:'Comment to DM',channel:'comment_dm',platform:'instagram',triggerMode:'keyword',triggerValue:'LINK',definition:{startNodeId:'one',nodes:[{id:'one',name:'First DM',type:'text',text:'Hello',next:'two'},{id:'two',name:'Extra PDF',type:'document',text:'More',documentUrl:'https://drive.google.com/file'}]}};
const dmErrors=validateSocialAutomationActivation(commentDm);
assert.ok(dmErrors.some(x=>x.nodeId==='two'&&/one initial private reply/i.test(x.message)));

const env={PUBLIC_SITE_URL:'https://urgent-casting.com',AUTOMATION_CHECKOUT_SECRET:'test-secret'};
const checkout=await buildAutomationCheckoutUrl(env,{leadId:12,productId:34,days:3,fallbackUrl:'https://urgent-casting.com/offer-details?plan=celebrity'});
const u=new URL(checkout);
assert.equal(u.pathname,'/checkout');
assert.equal(u.searchParams.get('automation_lead'),'12');
assert.ok(await verifyAutomationCheckoutToken(env,{leadId:12,productId:34,expires:u.searchParams.get('automation_expires'),token:u.searchParams.get('automation_token')}));

const product={id:34,name:'Celebrity',slug:'celebrity',short_description:'Plan',regular_price_paise:199900,offer_price_paise:149900,offer_price_enabled:1,currency:'INR',status:'active',spot_limit:10,filling_fast_limit:4,low_spot_limit:2,payment_type:'subscription',trial_enabled:1,trial_amount_paise:100,trial_value:7,trial_unit:'days',billing_period:'monthly',sold_count:3};
const offerEnv={PUBLIC_SITE_URL:'https://urgent-casting.com',DB:{prepare(){return {bind(){return {first:async()=>product};}};}}};
const offer=await resolveLiveOffer(offerEnv,34);
assert.equal(offer.regularPrice,'₹1,999');
assert.equal(offer.offerPrice,'₹1,499');
assert.equal(offer.trialPrice,'₹1');
assert.equal(offer.pricePaise,100);

const pageBoot=read('public/assets/page-boot.js');
const checkoutScript=read('public/assets/final-v16-80-automation-checkout-prefill.js');
assert.match(pageBoot,/automation_token/);
assert.match(checkoutScript,/uc_checkout_prefill/);
assert.match(checkoutScript,/location\.replace\('\/checkout'\)/);
assert.ok(fs.existsSync(path.join(root,'functions/api/public/automation-checkout.js')));

for(const p of ['public/admin/final-v16-76-d1-polls-automation-workspace.js','public/admin/final-v16-68-automation-flow-workspace.js','public/admin/final-v16-34-admin-workflow-pages-social.js','public/assets/final-v16-80-automation-checkout-prefill.js','public/assets/page-boot.js'])assert.doesNotThrow(()=>new Function(read(p)),p);

console.log('V16.80 smoke tests: PASS');
