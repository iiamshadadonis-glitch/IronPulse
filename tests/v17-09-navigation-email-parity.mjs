import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');
const [version,index,nav,workspaces,guard,css]=await Promise.all([
  read('VERSION.txt'),
  read('public/admin/index.html'),
  read('public/admin/final-v16-62-inbox-nav-automations.js'),
  read('public/admin/final-v16-92-marketing-webinars.js'),
  read('public/admin/final-v17-09-navigation-email-parity.js'),
  read('public/admin/final-v17-09-navigation-email-parity.css')
]);

assert.equal(version.split('\n')[0],'IronPulse Gym V1.06');
assert.match(index,/final-v17-09-navigation-email-parity\.css\?v=17\.09/);
assert.match(index,/final-v17-09-navigation-email-parity\.js\?v=17\.09/);
assert.doesNotMatch(nav,/\['Marketing & SEO'/,'The retired main navigation group must not be constructed.');
for(const id of ['marketingHome','googleAdsMarketing','socialMarketing','emailMarketing','marketingFunnels']){
  assert.doesNotMatch(workspaces,new RegExp(`${id}:`),`${id} must not be created as an admin panel.`);
  assert.match(guard,new RegExp(id),`${id} needs a safe legacy-route guard.`);
}
assert.doesNotMatch(workspaces,/function init\(\)\{[^}]*loadWorkspace\(\)/,'The removed workspace must not be fetched during admin startup.');
assert.match(workspaces,/id==='socialMediaIntegrations'/,'The integrations route must remain intact.');
assert.match(css,/padding:0!important/,'All Email & OTP cards must reset the generic card padding.');
assert.match(css,/min-height:58px!important/,'All desktop Email & OTP summaries must match Gmail height.');
assert.match(css,/font-size:18px!important/,'All desktop provider titles must match Gmail typography.');
assert.match(css,/margin:0 16px 0 auto!important/,'Connection status alignment must be shared.');
assert.match(css,/details\[open\]>summary::after/,'The shared single chevron must keep its open state.');
assert.match(index,/final-v16-93-marketing-integrations\.js/,'Marketing integrations must remain loaded.');

console.log('V17.09 navigation removal and Email & OTP card parity checks passed.');
