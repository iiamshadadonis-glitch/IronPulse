import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLiveOffer, offerMessage } from '../functions/_lib/live-offers.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const flowUi=read('public/admin/final-v16-68-automation-flow-workspace.js');
const flowCss=read('public/admin/final-v16-68-automation-flow-workspace.css');
const leadUi=read('public/admin/final-v16-76-d1-polls-automation-workspace.js');
const leadCss=read('public/admin/final-v16-76-d1-polls-automation-workspace.css');
const automation=read('functions/_lib/social-automations.js');
const comments=read('functions/_lib/social-comments.js');
const nurture=read('functions/_lib/lead-nurturing.js');

for(const token of ['Comment Reply','PDF / Document','Plan / Offer','delaySeconds','Add More Variation'])assert.ok(flowUi.includes(token),`Comment-to-DM editor is missing ${token}`);
assert.ok(flowUi.includes("channel!=='comment_dm'||x.connected!==false"),'Comment-to-DM must list only enabled, connected and eligible platforms');
assert.ok(flowUi.includes('[5,10,15,20,25,30]'),'Delay presets must be exactly 5–30 seconds');
assert.ok(automation.includes('.slice(0,10)'),'Comment reply variations must be capped at ten');
assert.ok(automation.includes('social_automation_round_robin.cursor+1'),'Round-robin cursor must advance atomically');
assert.ok(comments.includes("step.type==='comment_reply'"),'Comment replies must execute separately from the private DM');
assert.ok(comments.includes("step.type==='delay'"),'Comment-to-DM delays must execute');
assert.ok(flowUi.includes('uc78-wire-disconnect')&&flowCss.includes('.uc78-wire-disconnect'),'Freeform wires must render a midpoint disconnect control');
assert.ok(leadUi.includes('data-disconnect-after')&&leadCss.includes('.uc78-lead-wire button'),'Lead timeline wires must be disconnectable');
assert.ok(!leadUi.includes('D1-safe follow-up scheduler'),'Technical D1 scheduler disclaimer must not appear in admin UI');
for(const token of ['Threads','Pinterest','YouTube','X / Twitter','Snapchat','LinkedIn'])assert.ok(read('functions/api/admin/lead-nurture-automations.js').includes(token),`Lead sources must include ${token} when connected`);
for(const token of ['imageUrl','documentUrl','linkUrl','productId','interactive_buttons','image_buttons'])assert.ok(nurture.includes(token),`Lead nurture rich steps are missing ${token}`);
assert.ok(leadCss.includes('border-radius:999px'),'Lead controls must use capsule styling');
assert.ok(leadCss.includes('.uc78-save-lead')&&leadCss.includes('visibility:visible!important'),'Save Flow must remain visible');
assert.ok(read('migrations/0037_v16_78_comment_dm_lead_timeline.sql').includes('social_automation_round_robin'),'V16.78 migration is missing');

const product={id:7,name:'Casting Pro',slug:'casting-pro',short_description:'Priority access',regular_price_paise:99900,offer_price_paise:49900,offer_price_enabled:1,currency:'INR',status:'active',spot_limit:10,filling_fast_limit:7,low_spot_limit:4,sold_count:7};
const env={SITE_URL:'https://example.test',DB:{prepare(){return {bind(){return {first:async()=>product};}};}}};
const live=await resolveLiveOffer(env,7);
assert.equal(live.availability,'Only 3 spots left');
assert.equal(live.price,'₹499');
assert.equal(live.url,'https://example.test/offer-details?plan=casting-pro');
assert.match(offerMessage(live,'Hello'),/Only 3 spots left/);

console.log('V16.78 smoke tests: PASS');
