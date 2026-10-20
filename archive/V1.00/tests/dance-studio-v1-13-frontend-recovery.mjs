import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {onRequestGet as getBootstrap} from '../functions/api/public/bootstrap.js';
import {onRequestGet as getPage} from '../functions/api/public/pages.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));

assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.equal(pkg.scripts['test:dance-v1.13'],'node tests/dance-studio-v1-13-frontend-recovery.mjs && npm run test:dance-v1.12');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);

const app=read('public/assets/app.js');
const boot=read('public/assets/page-boot.js');
const enhancement=read('public/assets/dropbeat-dance-v1-13.js');
const enhancementCss=read('public/assets/dropbeat-dance-v1-13.css');
assert.doesNotThrow(()=>new Function(app),'the public application must parse');
assert.doesNotThrow(()=>new Function(boot),'the public page bootstrap must parse');
assert.doesNotThrow(()=>new Function(enhancement),'the V1.13 enhancement must parse');
assert.doesNotMatch(app,/includes\(old\)/,'the undefined V1.12 brand variable must never return');
assert.match(app,/const containsLegacyBrand=/);
assert.match(app,/try\{applyBrandIdentity\(state\.settings\);\}catch\(error\)/,'branding must be isolated from page data rendering');
assert.match(app,/wa\.innerHTML=socialIcon\('whatsapp'\)/,'the floating WhatsApp control must receive its visible icon');
assert.match(app,/window\.__ucProductRenders/);
assert.match(app,/new CustomEvent\('uc-page-rendered'/);
assert.match(boot,/const start=\(\)=>\{loadDropBeatV113\(\);run\(\);\}/,'optional enhancements must not block core page data');
assert.match(enhancement,/uc-products-rendered/);
assert.match(enhancement,/uc-page-rendered/);
assert.match(enhancementCss,/body\[data-uc-load="page:about"\] #pageContent/);

for(const relative of fs.readdirSync(path.join(root,'public')).filter(name=>name.endsWith('.html'))){
  const html=read(`public/${relative}`);
  if(html.includes('/assets/app.js'))assert.match(html,/app\.js\?[^"']*dropbeat=1\.29/,`${relative} must load the corrected app with the V1.26 cache URL`);
  if(html.includes('/assets/page-boot.js'))assert.match(html,/page-boot\.js\?v=1\.13/,`${relative} must load the non-blocking V1.13 bootstrap`);
}
for(const relative of ['functions/blog/[[slug]].js','functions/page/[slug].js']){
  const source=read(relative);
  assert.match(source,/dropbeat=1\.29/);
  assert.match(source,/page-boot\.js\?v=1\.13/);
}
assert.match(read('functions/api/public/bootstrap.js'),/bootstrap-dropbeat-v113/);
assert.match(read('functions/api/public/site.js'),/site-dropbeat-v113/);
assert.match(read('functions/api/public/products.js'),/products-dropbeat-v113/);
assert.match(read('functions/_lib/edge-response-cache.js'),/bootstrap-dropbeat-v113:home/);

// Execute the exact branding routine that previously threw "old is not defined".
const start=app.indexOf('function applyBrandIdentity(settings)');
const end=app.indexOf('\nwindow.UCApplyBrandIdentity=applyBrandIdentity;',start);
assert.ok(start>=0&&end>start,'branding routine must be extractable for its runtime regression test');
const textNode={nodeType:3,nodeValue:'Latest official DropBeat Studio notice',parentElement:{tagName:'P'}};
let visited=false;
const emptyList=()=>[];
const body={nodeType:1,matches:()=>false,querySelectorAll:emptyList};
const documentMock={
  body,
  querySelectorAll:emptyList,
  querySelector:()=>null,
  createTreeWalker(){return {currentNode:null,nextNode(){if(visited)return false;visited=true;this.currentNode=textNode;return true;}};}
};
const browserContext={
  window:{},document:documentMock,NodeFilter:{SHOW_TEXT:4},
  MutationObserver:class{observe(){}},console
};
vm.createContext(browserContext);
vm.runInContext(`${app.slice(start,end)}\napplyBrandIdentity({siteName:'Rhythm House',tagline:'Learn dance',logoUrl:'/rhythm.svg'});`,browserContext);
assert.equal(textNode.nodeValue,'Latest official Rhythm House notice');
assert.equal(browserContext.window.__ucBrandIdentity.brand,'Rhythm House');

// Verify that the live backend records used in the screenshots reach every public endpoint together.
const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync(path.join(root,'migrations')).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(read(`migrations/${file}`));
class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const db={prepare:sql=>new Statement(sql),async batch(statements){return Promise.all(statements.map(statement=>statement.run()));}};
const env={DB:db};
sqlite.prepare("INSERT INTO settings(key,value) VALUES('site_settings',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify({siteName:'DropBeat Dance Studio',tagline:'Backend controlled content',whatsappNumber:'919999999999',socials:[{key:'whatsapp',label:'WhatsApp',url:'https://wa.me/919999999999',enabled:true}]}));
const product=sqlite.prepare(`INSERT INTO products(sku,name,slug,type,short_description,description,regular_price_paise,offer_price_paise,currency,status,badge,features_json,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run('DB113-PLAN','Frontend Recovery Plan','frontend-recovery-plan','subscription','A plan loaded from D1.','Backend plan details.',49900,29900,'INR','active','Popular','["Live class"]',1);
const productId=Number(product.lastInsertRowid);
sqlite.prepare("INSERT INTO product_images(product_id,object_key,public_url,alt_text,sort_order,is_cover) VALUES(?,?,?,?,?,?)").run(productId,'plan/recovery.webp','https://cdn.example.test/recovery.webp','Recovery plan',1,1);
for(const page of ['home','offers'])sqlite.prepare("INSERT INTO page_placements(product_id,page_key,section_key,sort_order,visible) VALUES(?,?,?,?,1)").run(productId,page,'featured',1);
sqlite.prepare("INSERT INTO banners(title,subtitle,desktop_image_url,mobile_image_url,link_type,link_value,badge,visible,sort_order) VALUES(?,?,?,?,?,?,?,?,?)").run('Live Hero','Loaded from Brand Settings','https://cdn.example.test/hero.webp','https://cdn.example.test/hero-mobile.webp','url','/offers','Dance Classes',1,1);
sqlite.prepare("INSERT INTO success_stories(title,url,platform,thumbnail_url,status,sort_order) VALUES(?,?,?,?,?,?)").run('Student Journey','https://www.youtube.com/watch?v=abc123XYZ','youtube','https://cdn.example.test/story.webp','active',1);
sqlite.prepare("INSERT INTO content_pages(page_key,title,body_text,body_html) VALUES('about','About Our Studio','Three current paragraphs.','<p>Current paragraph one.</p><p>Current paragraph two.</p><p>Current paragraph three.</p>') ON CONFLICT(page_key) DO UPDATE SET title=excluded.title,body_text=excluded.body_text,body_html=excluded.body_html").run();
sqlite.prepare("INSERT INTO content_pages(page_key,title,body_text,body_html) VALUES('faq','Frequently Asked Questions','Current FAQ introduction.','<p>Current FAQ introduction from Admin.</p>') ON CONFLICT(page_key) DO UPDATE SET title=excluded.title,body_text=excluded.body_text,body_html=excluded.body_html").run();
sqlite.prepare("INSERT INTO faq_items(question,answer_text,answer_html,status,sort_order) VALUES(?,?,?,?,?)").run('Can beginners join?','Yes.','<p>Yes, beginners can join.</p>','active',1);

const homeResponse=await getBootstrap({request:new Request('https://example.test/api/public/bootstrap?page=home&dropbeat=1.13'),env});
assert.equal(homeResponse.status,200);
const home=await homeResponse.json();
assert.equal(home.banners.find(row=>row.title==='Live Hero')?.desktop_image_url,'https://cdn.example.test/hero.webp');
assert.equal(home.products.find(row=>row.slug==='frontend-recovery-plan')?.name,'Frontend Recovery Plan');
assert.equal(home.stories.find(row=>row.title==='Student Journey')?.thumbnail_url,'https://cdn.example.test/story.webp');
assert.equal(home.settings.whatsappNumber,'919999999999');

const offersResponse=await getBootstrap({request:new Request('https://example.test/api/public/bootstrap?page=offers&dropbeat=1.13'),env});
const offers=await offersResponse.json();
assert.equal(offers.products.find(row=>row.slug==='frontend-recovery-plan')?.name,'Frontend Recovery Plan');

const aboutResponse=await getPage({request:new Request('https://example.test/api/public/pages?key=about'),env});
const about=await aboutResponse.json();
assert.match(about.page.body_html,/Current paragraph three/);
const faqResponse=await getPage({request:new Request('https://example.test/api/public/pages?key=faq'),env});
const faq=await faqResponse.json();
assert.match(faq.page.body_html,/Current FAQ introduction from Admin/);
assert.equal(faq.faqs.length,1);
assert.equal(faq.faqs[0].question,'Can beginners join?');

console.log('DropBeat V1.13 frontend recovery verified: brand runtime, cache isolation, hero banners, plans, stories, About, FAQ and WhatsApp delivery.');
