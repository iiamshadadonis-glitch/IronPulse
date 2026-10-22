import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');
const [version,index,base,integrations,upgrade,css,core]=await Promise.all([
  read('VERSION.txt'),
  read('public/admin/index.html'),
  read('public/admin/final-v16-92-marketing-webinars.js'),
  read('public/admin/final-v16-93-marketing-integrations.js'),
  read('public/admin/final-v16-94-integrations-heatmaps-code-reminders.js'),
  read('public/admin/final-v16-94-integrations-heatmaps-code-reminders.css'),
  read('functions/_lib/marketing-suite.js')
]);

assert.equal(version.split('\n')[0],'IronPulse Gym V1.07');
for(const asset of [
  'final-v16-93-marketing-integrations.js?v=1.23',
  'final-v16-94-integrations-heatmaps-code-reminders.css?v=16.95',
  'final-v16-94-integrations-heatmaps-code-reminders.js?v=16.95'
])assert.ok(index.includes(asset),`${asset} must be cache-busted`);
assert.match(index,/final-v16-92-marketing-webinars\.js\?v=(?:16\.95|1[7-9]\.\d+|[2-9]\d\.\d+)/,'marketing/webinar asset must retain a cache-busted successor version');

// Only the shared themed summary pseudo-element remains as the integration chevron.
assert.doesNotMatch(integrations,/class="uc94-summary-arrow"/);
assert.match(css,/\.uc94-summary-arrow\{display:none!important\}/);

// The legacy loader must not race the upgraded renderer or assign src to a missing frame.
assert.match(base,/if\(!p\|\|p\.dataset\.uc94Heat\)return/);
assert.match(base,/const frame=\$\('\[data-uc92-heat-frame\]'/);
assert.match(base,/if\(!frame\)return;frame\.src=/);
assert.match(upgrade,/data-uc92-heat-frame/);

// True device widths are retained internally and fitted to the preview without horizontal scrolling.
for(const width of ['390','768','1440'])assert.ok(upgrade.includes(width));
assert.match(upgrade,/Math\.min\(1,available\/width\)/);
assert.match(upgrade,/ResizeObserver/);
assert.match(upgrade,/scrollHeight/);
assert.match(css,/overflow-x:hidden!important/);
assert.match(css,/overflow-y:auto!important/);
assert.match(css,/\.uc95-fit-shell/);

// Help content is detailed, actionable, linked and contains an explicit educational warning.
for(const token of [
  'Heat Map — where visitors click',
  'Scroll Map — how far visitors reach',
  'Attention Map — where visible time accumulates',
  'When to change the website or a campaign',
  'ROAS — Return on Ad Spend',
  'Safe optimization routine',
  'Educational warning',
  'support.google.com/google-ads',
  'learn.microsoft.com/en-us/clarity'
])assert.match(upgrade,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));

// Reminder channels toggle in place; no duplicated selected-tag row is rendered.
assert.doesNotMatch(upgrade,/data-selected-channels|renderChannelTags|data-remove-channel/);
assert.match(upgrade,/aria-pressed="false"/);
assert.match(upgrade,/Add at least one reminder or switch reminders off/);
assert.match(upgrade,/Choose at least one reminder platform for every reminder row/);
assert.match(css,/\.uc95-reminder-builder/);
assert.match(css,/grid-template-columns:minmax\(145px/);

// Existing branded email/calendar/reminder delivery remains intact.
assert.match(core,/brandedEmailHtml/);
assert.match(core,/conferenceDataVersion=1&sendUpdates=all/);
assert.match(core,/\['email','whatsapp','sms','call'\]/);

console.log('V16.95 smoke checks passed.');
