import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

// Actual Admin scripts and markup with isolated synthetic API responses only.
export async function runFitnessTipsWorkflows({page,context,origin,output,errors,writes}){
 const results=[],samples=[],requests=[],title='Fitness Tips: Article review & strength basics',body='Keep Fitness Tips, articles and every original sentence exactly as entered.';
 const posts=[{id:'fixture-published',title,slug:'strength-basics',body_text:body,excerpt:'A fitness update',status:'published',published_at:new Date().toISOString(),tags:['Fitness Tips'],cover_image_url:'',ads_json:'[]',auto_ads_enabled:0},{id:'fixture-draft',title:'Draft Fitness Tips Article',slug:'draft-fitness-tips',body_text:body,excerpt:'Draft summary',status:'draft',tags:['strength'],cover_image_url:'',ads_json:'[]',auto_ads_enabled:0}];
 const authRoute=async route=>{const role=new URL(route.request().url()).searchParams.get('role');await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(role?{ok:true,authenticated:true,key:role+':1',role,status:'active',home:role==='admin'?'/admin/':role==='coach'?'/coach-dashboard':'/member-dashboard',expires:'2027-01-01T00:00:00Z'}:{ok:true,authenticated:false})});};
 const seoRoute=async route=>{const req=route.request(),url=new URL(req.url());let payload;
  if(req.method()==='POST'){payload=JSON.parse(req.postData()||'{}');requests.push(payload);const i=posts.findIndex(p=>p.id===payload.id),post={...(posts[i]||{}),...payload,id:payload.id||'fixture-saved',tags:String(payload.tags||'').split(',').map(x=>x.trim()).filter(Boolean)};if(i<0)posts.push(post);else posts[i]=post;}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,posts,post:posts.find(p=>p.id===url.searchParams.get('id')),message:payload?'Saved synthetic fitness tip.':undefined,sync:{mode:'incremental',initial_sync_complete:true}})});
 };
 await context.route('**/api/portal/auth/context*',authRoute);
 await context.route('**/api/admin/seo-posts*',seoRoute);
 const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.db159Layout==='ready'&&document.documentElement.dataset.db159Buttons==='ready'&&!document.querySelector('#adminApp').hidden);
 async function stable(label){
  const value=await page.evaluate(async()=>{
   const root=document.querySelector('#blogs'),selectors=['.top','.collapsed-summary-title','h2','h3','#ucV157AuditionHelp','#blogTable thead','#uc54ArticleImageState'];
   const read=()=>selectors.flatMap(s=>[...root.querySelectorAll(s)].map(n=>n.textContent));
   const before=read();let observed=0,ownedMutations=0;const targets={};const observer=new MutationObserver(records=>{observed+=records.length;for(const record of records){const n=record.target.nodeType===1?record.target:record.target.parentElement,key=record.type+':'+n.tagName+'#'+n.id+'.'+n.className;targets[key]=(targets[key]||0)+1;if(selectors.some(s=>n.matches(s)||n.closest(s)))ownedMutations++;}});observer.observe(root,{childList:true,subtree:true,characterData:true});
   for(let i=0;i<30;i++){const probe=document.createElement('span');root.append(probe);probe.remove();}
   await new Promise(resolve=>setTimeout(resolve,900));observer.disconnect();
   return {before,after:read(),observed,ownedMutations,targets,text:root.textContent,attributes:[...root.querySelectorAll('[title],[aria-label],[placeholder]')].flatMap(n=>['title','aria-label','placeholder'].map(key=>n.getAttribute(key)||''))};
  });
  assert.doesNotMatch(value.text+' '+value.attributes.join(' '),/\bFitness Tipss+\b|(?:Updatess?\s+){2}|\bFitness Tips Tips\b/i,label+': no recursive suffixes');
  assert.deepEqual(value.after,value.before,label+': labels/media settle after unrelated mutations');
  // The retained mobile wizard can refresh counters/select controls. Measure the
  // affected labels and media, rather than requiring the entire form to be idle.
  assert.equal(value.ownedMutations,0,label+': labels/media do not rebuild themselves');
  assert.ok(value.before.every(text=>text.length<2000),label+': labels stay bounded');
  samples.push({label,mutationsIncluding60TestChanges:value.observed,labelAndMediaMutations:value.ownedMutations,labels:value.after});
 }
 try{
  for(const width of process.argv.includes('--mobile-only')?[390]:[1440,390]){
   console.log('[Fitness Tips] real Admin page at '+width+'px');
   await page.setViewportSize({width,height:1000});await page.goto(origin+'/admin/',{waitUntil:'load'});await ready();
   if(width<=760)await page.getByRole('button',{name:'Open admin menu',exact:true}).click();
   const group=page.locator('.nav-group[data-group-title="Social Media"]');
   if(!await group.evaluate(n=>n.classList.contains('open')))await group.locator(':scope>.nav-group-toggle').click();
   await page.locator('.side .nav [data-tab="blogs"]').click();
   await page.locator('#blogs.active').waitFor();
   // Cover both compatibility initializers (3.65 s and 5.2 s), previously missed.
   await page.waitForTimeout(6200);
   await page.locator('#uc54ArticleImageState').waitFor({state:'attached'});
   await stable('Initial delayed render '+width);
   const all=page.locator('#blogs .uc-v154-audition-tabs button').filter({hasText:/^All\s/});
   if(await all.isVisible())await all.click();else{await page.locator('#blogs .uc-v154-audition-tabs .db137-more-nav').click();await page.locator('#db137ChoiceSheet').getByRole('button',{name:/^All\b/}).click();}
   assert.equal(await page.locator('#blogTable .uc-v156-title-holder').first().innerText(),title,'Saved post title is not rewritten');
   await stable('Loaded posts '+width);
   await page.screenshot({path:join(output,'fitness-tips-'+width+'.png'),fullPage:true});
   results.push('Social Media → Fitness Tips at '+width+'px: delayed initializers, stable labels/attributes/media, unchanged saved titles and All filter');
   if(width===1440){
    await page.locator('#blogs .uc-v154-audition-tabs button').filter({hasText:/^Drafts\s/}).click();
    await page.locator('#blogTable .uc-v156-title-holder button').first().click();
    await page.waitForFunction(()=>document.querySelector('#blogForm [name="id"]').value==='fixture-draft');
    assert.equal(await page.locator('#blogForm [name="title"]').inputValue(),'Draft Fitness Tips Article');
    assert.equal(await page.locator('#blogForm [name="body_text"]').inputValue(),body);
    await page.locator('#uc54ArticleImageFile').setInputFiles({name:'fitness.png',mimeType:'image/png',buffer:await readFile(new URL('../public/assets/favicon-32.png',import.meta.url))});
    await page.locator('#uc54ArticleImageButton').click();
    await page.waitForFunction(()=>document.querySelector('#blogForm [name="cover_image_url"]').value==='/assets/product-generic.svg');
    await page.locator('#blogForm [name="tags"]').fill('#strength, #cardio');
    await page.locator('#blogForm button').filter({hasText:/^Save Draft$/}).click();
    await page.waitForFunction(()=>document.querySelector('#ucV159AuditionOutcome')?.textContent.includes('Draft'));
    const draft=requests.find(p=>p.id==='fixture-draft'&&p.status==='draft');assert.ok(draft,'Existing draft save endpoint is used');assert.equal(draft.title,'Draft Fitness Tips Article');assert.equal(draft.body_text,body);assert.equal(draft.tags,'strength, cardio');assert.equal(draft.cover_image_url,'/assets/product-generic.svg');assert.equal(draft.is_featured,0);assert.equal(draft.auto_ads_enabled,0);assert.equal(draft.ads_json,'[]');
    assert.ok(writes.some(r=>r.path==='/api/admin/google-drive-upload'),'Existing Google Drive upload endpoint is used');
    await stable('After upload and draft save');results.push('Existing edit, Google Drive upload, tag normalization and draft payload preserve customer text, flags, image and advertisement fields');
   }
   await page.evaluate(()=>{const model=DropBeatLayout.snapshot();model.names.blog='Fitness Tips Updates';model.contextRevision+='-fitness-regression';DropBeatLayout.apply(model);});
   await page.waitForFunction(()=>document.querySelector('.side .nav [data-tab="blogs"]').textContent.trim()==='Fitness Tips Updates');
   await stable('Saved custom name '+width);
   assert.equal(await page.locator('#blogs>.top h1').innerText(),'Fitness Tips Updates');
   results.push('Custom name containing Fitness Tips remains stable at '+width+'px');
   await page.reload({waitUntil:'load'});await ready();
   await page.evaluate(()=>window.tab('blogs'));await page.waitForTimeout(5500);await stable('Reload '+width);
  }
  // Keep the unrelated Posts tab interaction fix that shared the old text script.
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>window.tab('socialPosts'));
  await page.locator('#socialPosts .uc48-tabs .pill').first().waitFor();
  const tabs=page.locator('#socialPosts .uc48-tabs .pill');if(await tabs.count()>1){await tabs.nth(1).click();await page.waitForTimeout(300);assert.equal(await page.locator('#socialPosts .uc48-tabs .pill.active').count(),1);}
  results.push('Posts tab selection still has one active tab');assert.deepEqual(errors,[]);
  await writeFile(join(output,'fitness-tips-results.json'),JSON.stringify({synthetic:true,results,samples,draftPayloads:requests,errors},null,2)+'\n');
  console.log('Fitness Tips regression passed: '+results.length+' workflow groups.');
 }finally{await context.unroute('**/api/portal/auth/context*',authRoute);await context.unroute('**/api/admin/seo-posts*',seoRoute);}
}
