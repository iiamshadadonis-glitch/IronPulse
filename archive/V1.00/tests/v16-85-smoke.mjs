import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
assert.equal(read('VERSION.txt').trim(),'V16.85');

const ui=read('public/admin/final-v16-84-inbox-telegram-sales.js');
const css=read('public/admin/final-v16-84-inbox-telegram-sales.css');
const index=read('public/admin/index.html');
const dms=read('functions/_lib/social-dms.js');
const dmApi=read('functions/api/admin/social-dms.js');
const flow=read('public/admin/final-v16-68-automation-flow-workspace.js');
const integrations=read('functions/api/admin/social-integrations.js');
const telegram=read('functions/_lib/telegram.js');
const webhook=read('functions/api/webhooks/telegram.js');
const navigation=read('public/admin/final-v16-62-inbox-nav-automations.js');

assert.doesNotMatch(ui,/observe\(root,\{childList:true,subtree:true\}\);\}\}\s*if\(document/);
assert.doesNotMatch(ui,/const root=\$\('#adminApp'\)/);
assert.doesNotMatch(ui,/ensureTelegram\(\);\}\)\.observe/);
assert.match(ui,/function installInboxObserver\(\)/);
assert.match(ui,/const root=\$\('#uc56DmWorkspace'\)/);
assert.match(ui,/requestAnimationFrame\(\(\)=>\{pending=false;patchInbox\(\);\}\)/);
assert.match(ui,/m\.dataset\.uc84Status!==statusKey/);
assert.match(ui,/selectSales\(salesActive,false\)/);
assert.match(ui,/group\.remove\(\)/);
assert.match(ui,/slice\(1\)\.forEach\(x=>x\.remove\(\)\)/);
assert.doesNotMatch(navigation,/\['Sales',\[\['customSubscription'/);
assert.match(navigation,/sales=ensureNavButton\(map,'salesHub','Sales'\)/);
assert.match(navigation,/nav\.append\(dash,search,sales,\.\.\.groups\)/);
assert.match(css,/\.nav-group\[hidden\]/);
assert.match(index,/final-v16-84-inbox-telegram-sales\.css\?v=16\.85/);
assert.match(index,/final-v16-84-inbox-telegram-sales\.js\?v=16\.85/);
assert.match(dms,/setDmBlocked/);
assert.match(dms,/folder==='blocked'/);
assert.match(dmApi,/action==='block'/);
assert.match(flow,/\['document','PDF \/ Document Link'\]/);
assert.match(flow,/automationAttachment\(n,'image'\)/);
assert.match(flow,/automationAttachment\(n,'document'\)/);
assert.match(dms,/key:'telegram'/);
assert.match(integrations,/platform==='telegram'/);
assert.match(telegram,/setWebhook/);
assert.match(telegram,/sendDocument/);
assert.match(webhook,/X-Telegram-Bot-Api-Secret-Token/);
assert.match(ui,/data-social-card="telegram"/);
assert.match(ui,/data-uc84-block/);

const budget=read('functions/_lib/d1-read-budget.js');
assert.equal(crypto.createHash('sha256').update(budget).digest('hex'),'5a3efb45f8d2b6b27dacce279146f831f603407082a79e4258d1a826523d2f43');
const migrations=fs.readdirSync(path.join(root,'migrations')).filter(x=>x.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0037_v16_78_comment_dm_lead_timeline.sql');
assert.doesNotThrow(()=>new Function(ui), 'V16.85 admin stability script syntax');

const calls=[];
globalThis.fetch=async(url,options={})=>{
  const method=String(url).split('/').at(-1),body=JSON.parse(options.body||'{}');
  calls.push({method,body});
  const result=method==='getMe'?{id:101,username:'test_bot',first_name:'Test'}:method==='getWebhookInfo'?{url:'https://example.com/api/webhooks/telegram'}:true;
  return new Response(JSON.stringify({ok:true,result}),{status:200,headers:{'content-type':'application/json'}});
};
const tg=await import('../functions/_lib/telegram.js');
const connected=await tg.connectTelegram({botToken:'123:test',webhookSecret:'secret-token'},'https://example.com/api/webhooks/telegram');
assert.equal(connected.me.username,'test_bot');
assert.deepEqual(calls.map(x=>x.method),['getMe','setWebhook','getMe','getWebhookInfo']);
assert.equal(calls[1].body.secret_token,'secret-token');

console.log('V16.85 admin responsiveness smoke tests: PASS');
