import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { findLeadByIdentity, getLeadCandidates, saveLeadSocialFields } from '../functions/_lib/lead-profile.js';

class D1Statement {
  constructor(db,sql){this.db=db;this.sql=sql;this.values=[];}
  bind(...values){this.values=values;return this;}
  async run(){const r=this.db.prepare(this.sql).run(...this.values);return {meta:{changes:Number(r.changes||0),last_row_id:Number(r.lastInsertRowid||0)}};}
  async first(){return this.db.prepare(this.sql).get(...this.values)||null;}
  async all(){return {results:this.db.prepare(this.sql).all(...this.values)};}
}
const d1=db=>({prepare:sql=>new D1Statement(db,sql)});
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const sha=p=>crypto.createHash('sha256').update(read(p)).digest('hex');

{
  const db=new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE contact_leads(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT DEFAULT '',created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE lead_field_candidates(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      value TEXT NOT NULL,
      normalized_value TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      is_pending INTEGER NOT NULL DEFAULT 0,
      source TEXT DEFAULT '',
      last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(lead_id,field_name,normalized_value)
    );
    CREATE INDEX idx_candidate_identity ON lead_field_candidates(field_name,normalized_value);
    CREATE TABLE lead_identity_links(platform TEXT,external_id TEXT,lead_id INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(platform,external_id));
    CREATE INDEX idx_lead_identity_links_lead ON lead_identity_links(lead_id);
    CREATE TABLE social_dm_conversations(id INTEGER PRIMARY KEY AUTOINCREMENT,platform TEXT,participant_id TEXT,participant_username TEXT,participant_profile_url TEXT,last_message_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX idx_social_dm_conversations_participant ON social_dm_conversations(platform,participant_id,last_message_at DESC,id DESC);
    INSERT INTO contact_leads(name) VALUES('Social Profile Test');
  `);
  const env={DB:d1(db)};
  await saveLeadSocialFields(env,1,{facebook_id:'https://facebook.com/Shad.Adonis/',threads_id:'@TheRealMinnha',twitter_id:'https://x.com/urgent_casting'},'admin');
  assert.equal((await findLeadByIdentity(env,{facebook_id:'@shad.adonis'})).lead?.id,1,'Facebook handle did not resolve the saved lead');
  await saveLeadSocialFields(env,1,{facebook_id:'https://facebook.com/profile.php?id=123456789'},'admin');
  assert.equal((await findLeadByIdentity(env,{facebook_id:'123456789'})).lead?.id,1,'Facebook numeric profile URL did not normalize to its ID');
  assert.equal((await findLeadByIdentity(env,{threads_id:'https://threads.net/@therealminnha'})).lead?.id,1,'Threads handle did not resolve the saved lead');
  assert.equal((await findLeadByIdentity(env,{twitter_id:'urgent_casting'})).lead?.id,1,'X handle did not resolve the saved lead');
  const bundle=await getLeadCandidates(env,1);
  assert.equal(bundle.map.facebook_id[0].is_primary,1,'Facebook ID is not active');
  db.exec("INSERT INTO lead_identity_links(platform,external_id,lead_id) VALUES('instagram','ig-user-42',1); INSERT INTO social_dm_conversations(platform,participant_id,participant_username,participant_profile_url) VALUES('instagram','ig-user-42','shad.adonis','https://www.instagram.com/shad.adonis/')");
  const apiSource=read('functions/api/admin/client-crm.js'),identitySql=apiSource.match(/env\.DB\.prepare\(`(SELECT li\.platform[\s\S]*?LIMIT 30)`\)/)?.[1];
  assert(identitySql,'Client Details social identity query is missing');
  assert.equal(db.prepare(identitySql).all(1)[0].participant_username,'shad.adonis','linked Inbox identity was not recovered');
}

{
  const crm=read('public/admin/final-unified-client-crm.js');
  const invoice=read('public/admin/final-v10-documents-brand-polish.js');
  const refunds=read('public/admin/final-v14-refunds-lead-lifecycle-polish.js');
  const css=read('public/admin/final-v16-77-client-identities-sticky-modals.css');
  const html=read('public/admin/index.html');
  const api=read('functions/api/admin/client-crm.js');
  const profile=read('functions/_lib/lead-profile.js');
  const nurture=read('functions/_lib/lead-nurturing.js');
  const social=read('functions/_lib/social-leads.js');

  for(const field of ['facebook_id','instagram_id','threads_id','snapchat_id','linkedin_id','twitter_id','pinterest_id','youtube_id','tiktok_id','telegram_id']){
    assert(profile.includes(field),`${field} matching support is missing`);
    assert(api.includes(field),`${field} Client Details support is missing`);
    assert(social.includes(field),`${field} lead-form capture support is missing`);
  }
  assert(crm.includes('socialProfileCards(b)'), 'conditional social-profile cards are not rendered');
  assert(crm.indexOf('class="uc-client-fixed"')<crm.indexOf('class="uc-client-panel-scroll"'),'fixed Client Details header is not before the scroll region');
  assert(crm.indexOf('class="uc-client-panel-scroll"')<crm.indexOf('uc-client-actionbar uc-client-sticky-actions'),'Client Details footer is not after the scroll region');
  assert(invoice.includes("panelHost=$('.uc-client-panel-scroll',body)||body"),'Invoice panel is not inserted inside the tab scroller');
  assert(refunds.includes("panelHost=$('.uc-client-panel-scroll',body)||body"),'Refund panel is not inserted inside the tab scroller');
  assert(css.includes('#listModal>.modal-card'),'dashboard list modal containment is missing');
  assert(css.includes('#dashboardListBox>.uc-card-pager:first-child'),'dashboard lead pager sticky header is missing');
  assert(css.includes('.uc-v15-visitor-table thead th'),'visitor column sticky header is missing');
  assert(css.includes('#ucMultiSubscriptionModal .uc-multi-sub-card'),'subscription modal containment is missing');
  assert(css.includes('.uc-multi-sub-head{position:sticky!important'),'subscription column sticky header is missing');
  assert(nurture.includes('move the platform identity link to it'),'late phone/email social-lead reconciliation is missing');
  assert(html.includes('final-v16-77-client-identities-sticky-modals.css?v=16.80'),'V16.77 sticky-modal CSS is not loaded');
  assert(html.indexOf('final-v16-76-d1-polls-automation-workspace.css')<html.indexOf('final-v16-77-client-identities-sticky-modals.css'),'V16.77 CSS must load after V16.76');

  // The user's instruction for this release is to observe V16.76 before changing
  // its D1 guard. These hashes prove that guard, middleware and migration stayed byte-identical.
  assert.equal(sha('functions/_lib/d1-read-budget.js'),'5a3efb45f8d2b6b27dacce279146f831f603407082a79e4258d1a826523d2f43');
  assert.equal(sha('functions/_middleware.js'),'d62861781ad8188e591c025ca428749049dce6a76e517b8a08da8ac46f428126');
  assert.equal(sha('migrations/0036_v16_76_d1_read_guard.sql'),'f53e85c2364758e5b6906aed8b620d3b46260fb70a95c28fad0a0c6d152e8bc8');

  const refs=[...html.matchAll(/(?:src|href)="(\/[^"?]+)(?:\?[^" ]*)?"/g)].map(x=>x[1]).filter(x=>/\.(?:js|css)$/.test(x));
  const missing=[...new Set(refs)].filter(x=>!fs.existsSync(new URL(`../public${x}`,import.meta.url)));
  assert.deepEqual(missing,[],'Admin HTML references missing local assets');
}

console.log('V16.77 smoke tests: PASS');
