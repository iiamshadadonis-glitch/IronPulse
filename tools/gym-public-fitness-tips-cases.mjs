import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {buildSeoPostContent,decorateSeoPost} from '../functions/_lib/seo-posts.js';

export async function runPublicFitnessTipsWorkflows({page,context,origin,output,errors}){
 const results=[],metrics=[],requests=[],comments=[];
 const cover='/assets/gym-interior.jpg?fixture=1&size=cover';
 const title='Beginner Workout Routine: A Simple 7-Day Fitness Plan';
 const authored='<h2>Build a consistent routine</h2><p id="firstParagraph">Keep the original introduction and its useful training notes.</p><figure><img src="/assets/gym-training.jpg" alt="Separate training illustration"><figcaption>Keep this illustration and its caption.</figcaption></figure><p>Keep the rest of the original post.</p>';
 const primary=decorateSeoPost({id:'post-1',title,url:'https://example.test/2026/10/fitness-guide.html',published:'2026-10-21T09:00:00Z',labels:['Fitness Tips'],content:buildSeoPostContent({title,cover_image_url:cover,body_html:authored,meta:{slug:'beginner-workout-routine',excerpt:'Start your fitness journey with a practical weekly plan, simple training ideas and habits you can build on.',is_featured:true,ads_json:[{custom:true,type:'Custom Advertisement',placement:'After first paragraph',code:'/assets/gym-hero.jpg',redirect_url:'https://example.test/sponsor'}]}})});
 // The real server serializer escapes & in img/src; the old normalizer can leave
 // that leading cover in body_html. The public renderer must handle this DTO.
 const originalPost=JSON.stringify(primary);
 const secondary={...primary,id:'post-2',slug:'long-fitness-title',title:'A longer fitness headline that should wrap comfortably on every screen '+ 'Training'.repeat(8),cover_image_url:'/assets/gym-training.jpg',excerpt:'A longer excerpt remains legible over the image. '+ 'Build a consistent routine. '.repeat(5),ads_json:[]};
 const noImage={...primary,id:'post-3',slug:'no-cover',title:'A fitness update without a cover',cover_image_url:'',body_html:authored,ads_json:[]};
 const cases={
  [primary.slug]:primary,
  nested:{...primary,id:'nested',slug:'nested',ads_json:[],body_html:`<div class="separator"><a href="${cover.replaceAll('&','&amp;')}"><picture><source srcset="${cover.replaceAll('&','&amp;')}"><img src="${cover.replaceAll('&','&amp;')}#cover"></picture></a></div><h2>Keep heading</h2><p>Keep all text.</p><img src="/assets/gym-training.jpg" alt="Keep inline image">`},
  drive:{...primary,id:'drive',slug:'drive',ads_json:[],cover_image_url:'https://drive.google.com/file/d/fixture_drive_cover/view',body_html:'<div><img src="https://drive.google.com/thumbnail?id=fixture_drive_cover&amp;sz=w2000"></div><p>Drive post body stays intact.</p><img src="https://drive.google.com/thumbnail?id=fixture_other_image&amp;sz=w2000" alt="Other image">'},
  queries:{...primary,id:'queries',slug:'queries',ads_json:[],body_html:`<img src="${cover.replaceAll('&','&amp;')}"><p>Distinct image variants stay available.</p><img src="/assets/gym-interior.jpg?fixture=2&amp;size=cover" alt="Distinct image">`},
  'no-cover':noImage,
  sanitized:{...primary,id:'sanitized',slug:'sanitized',ads_json:[],body_html:`<script>throw Error('Unsafe script executed')</script><p>Safe text</p><img src="${cover.replaceAll('&','&amp;')}" onerror="throw Error('Unsafe attribute executed')"><img src="/assets/gym-training.jpg" alt="Safe illustration" onclick="bad()">`}
 };
 let mode='normal';
 const blogsRoute=async route=>{const url=new URL(route.request().url());requests.push(url.search);
  if(mode==='error'){await route.fulfill({status:503,contentType:'application/json',body:'{"error":"Synthetic Fitness Tips outage"}'});return;}
  const slug=url.searchParams.get('slug'),data=slug?{post:cases[slug]||null,related:[secondary],featured:secondary,recent:[],popular:[],random:[],tags:['Fitness Tips']}:{posts:mode==='empty'?[]:[primary,secondary,noImage],featured:primary,recent:[secondary],popular:[],random:[],tags:['Fitness Tips'],pagination:{page:Number(url.searchParams.get('page')||1),pages:2,total:6,hasPrev:url.searchParams.get('page')==='2',hasNext:url.searchParams.get('page')!=='2',tag:url.searchParams.get('tag')||''}};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,...data})});
 };
 const commentsRoute=async route=>{if(route.request().method()==='POST')comments.push(JSON.parse(route.request().postData()));await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,comments:[{id:11,name:'Fixture Member',comment_text:'Useful update',created_at:'2026-10-21T09:00:00Z'},{id:12,parent_comment_id:11,name:'Fixture Admin',is_admin:1,comment_text:'Thanks for reading',created_at:'2026-10-21T09:01:00Z'}]})});};
 const driveRoute=async route=>route.fulfill({status:200,contentType:'image/jpeg',body:await readFile(new URL('../public/assets/gym-interior.jpg',import.meta.url))});
 await context.route('**/api/public/blogs*',blogsRoute);await context.route('**/api/public/blog-comments*',commentsRoute);await context.route('https://drive.google.com/**',driveRoute);
 const loaded=async()=>{await page.locator('.uc-article').waitFor();await page.waitForFunction(()=>!!window.__ucV154CurrentPost);};
 async function layout(width,colorMode){
  return page.evaluate(({width,colorMode})=>{const q=s=>document.querySelector(s),card=q('.uc-blog-card'),media=q('.uc-blog-card-media'),img=media.querySelector('img'),copy=q('.uc-blog-card-body'),button=copy.querySelector('.btn'),heading=copy.querySelector('h3'),bounds=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};},style=getComputedStyle(card);return {width,colorMode,card:bounds(card),media:bounds(media),image:bounds(img),copy:bounds(copy),button:bounds(button),heading:bounds(heading),padding:parseFloat(style.paddingLeft),gap:parseFloat(style.columnGap),gradient:getComputedStyle(copy).backgroundImage,text:getComputedStyle(heading).color,buttonColor:getComputedStyle(button).backgroundColor,primary:getComputedStyle(document.documentElement).getPropertyValue('--dropbeat-primary').trim(),overflow:document.documentElement.scrollWidth>innerWidth+1};},{width,colorMode});
 }
 try{
  console.log('[Public Fitness Tips] single hero and preserved content/ads');
  await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/blog/'+primary.slug,{waitUntil:'load'});await loaded();
  const first=await page.locator('.uc-article').evaluate(n=>({hero:n.querySelectorAll(':scope>.uc-article-cover').length,bodyCover:[...n.querySelectorAll('.uc-article-body img')].filter(i=>i.getAttribute('src')?.includes('fixture=1')).length}));
  await writeFile(join(output,'public-fitness-baseline-metrics.json'),JSON.stringify(first,null,2)+'\n');
  assert.equal(first.hero,1);assert.equal(first.bodyCover,0,'The featured image appears once as the hero, without a body duplicate');
  assert.equal(await page.locator('.uc-article-body img[alt="Separate training illustration"]').count(),1);
  assert.equal(await page.locator('.uc-article-body .custom-sponsored-ad').count(),1);
  assert.equal(await page.locator('.custom-sponsored-ad a').getAttribute('href'),'https://example.test/sponsor');
  assert.equal(await page.evaluate(()=>JSON.stringify(__ucV154CurrentPost)),originalPost,'Display cleanup must not mutate the saved post DTO');
  assert.equal(await page.locator('.uc-comment-replies .uc-admin-comment').count(),1);
  await page.locator('.uc-comment-reply').first().click();await page.locator('#ucCommentForm [name="name"]').fill('Fixture Reader');await page.locator('#ucCommentForm [name="comment"]').fill('A useful fitness tip');await page.locator('#ucCommentForm button[type="submit"]').click();await page.waitForFunction(()=>document.querySelector('#ucCommentMessage').textContent==='Comment posted.');
  assert.equal(comments[0].post_id,primary.id);assert.equal(comments[0].slug,primary.slug);assert.equal(comments[0].parent_comment_id,'11');
  results.push('Actual serialized Blogger DTO: one hero, separate illustration/caption, original post data, custom ad placement and threaded comment payload retained');

  for(const slug of ['nested','drive','queries','no-cover','sanitized']){
   await page.goto(origin+'/blog-post?slug='+slug,{waitUntil:'load'});await loaded();
   const expected=slug==='no-cover'?0:1;assert.equal(await page.locator('.uc-article>.uc-article-cover').count(),expected);
   assert.equal(await page.locator('.uc-article-body img').count(),1,slug+': keep the distinct inline image');
   if(slug==='sanitized'){assert.equal(await page.locator('.uc-article-body script,.uc-article-body [onclick],.uc-article-body [onerror]').count(),0);assert.match(await page.locator('.uc-article-body').innerText(),/Safe text/);}
   if(slug==='nested')assert.match(await page.locator('.uc-article-body').innerText(),/Keep heading/);
  }
  results.push('Nested picture/anchor covers, Google Drive variants, HTML entities/fragments, distinct query images, absent covers and existing sanitization');

  for(const width of [320,390,760,980,1440]){
   await page.setViewportSize({width,height:1000});await page.goto(origin+'/blog',{waitUntil:'load'});await page.locator('.uc-blog-card').first().waitFor();
   for(const colorMode of ['light','dark']){
    await page.evaluate(mode=>{document.documentElement.dataset.colorMode=mode;window.applySettings({...window.__ucLatestSettings,frontendTheme:'dropbeat',primaryColor:'#4B55BE',accentColor:'#A469A8'});},colorMode);await page.waitForFunction(()=>getComputedStyle(document.querySelector('.uc-blog-card-body>.btn')).backgroundColor==='rgb(75, 85, 190)');
    const data=await layout(width,colorMode);metrics.push(data);assert.equal(data.overflow,false);
    assert.equal(data.buttonColor,'rgb(75, 85, 190)','Read More uses the active primary color');
    if(width<=760){assert.equal(data.padding,0);assert.ok(Math.abs(data.image.width-data.card.width)<=3,'Thumbnail spans full mobile card width');assert.ok(Math.abs(data.media.x-data.copy.x)<=1&&Math.abs(data.media.y-data.copy.y)<=1,'Image and text share a layer');assert.match(data.gradient,/linear-gradient/);assert.equal(data.text,'rgb(255, 255, 255)');assert.ok(data.button.bottom<=data.card.bottom&&data.heading.y>=data.card.y,'Text/CTA stay inside the image');}
    else{assert.equal(data.padding,24);assert.equal(data.gap,24);assert.ok(data.copy.x>data.media.right,'Desktop image/text use distinct columns');assert.ok(Math.abs(data.image.height-data.copy.height)<4||data.copy.height<=220,'Image fills the desktop content height');}
   }
   await page.evaluate(()=>{document.documentElement.dataset.colorMode='light';applySettings({...window.__ucLatestSettings,frontendTheme:'dropbeat',primaryColor:'#1C6B48',accentColor:'#A469A8'});});await page.waitForFunction(()=>getComputedStyle(document.querySelector('.uc-blog-card-body>.btn')).backgroundColor==='rgb(28, 107, 72)');assert.equal(await page.locator('.uc-blog-card-body>.btn').first().evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(28, 107, 72)','Saved/custom theme color propagates without new hardcoded purple');
   await page.evaluate(()=>applySettings({...window.__ucLatestSettings,frontendTheme:'dropbeat',primaryColor:'#4B55BE',accentColor:'#A469A8'}));await page.waitForFunction(()=>getComputedStyle(document.querySelector('.uc-blog-card-body>.btn')).backgroundColor==='rgb(75, 85, 190)');
   if([390,1440].includes(width))await page.screenshot({path:join(output,'public-fitness-index-'+width+'.png'),fullPage:true});
   await page.locator('.uc-blog-card-body>.btn').first().click();await loaded();assert.equal(await page.locator('.uc-article>.uc-article-cover').count(),1);assert.equal(await page.locator('.uc-article-body img[src*="fixture=1"]').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   if([390,1440].includes(width))await page.screenshot({path:join(output,'public-fitness-post-'+width+'.png'),fullPage:true});
   results.push('Index/detail at '+width+'px: light/dark, long text, primary-color propagation, clickable overlay link, single cover and no horizontal overflow');
  }
  await page.goto(origin+'/blog?page=2&tag=Fitness%20Tips',{waitUntil:'load'});await page.locator('.uc-blog-card').first().waitFor();assert.ok(requests.some(q=>q.includes('page=2')&&q.includes('tag=Fitness%20Tips')));assert.ok((await page.locator('.uc-blog-pagination a').first().getAttribute('href')).includes('tag='));
  mode='empty';await page.goto(origin+'/blog',{waitUntil:'load'});await page.locator('.uc-blog-empty').waitFor();assert.equal(await page.locator('.uc-blog-card').count(),0);
  mode='error';await page.reload({waitUntil:'load'});await page.locator('.uc-blog-empty').waitFor();assert.match(await page.locator('.uc-blog-empty').innerText(),/could not be loaded/);
  mode='normal';await page.goto(origin+'/blog-post?slug=missing',{waitUntil:'load'});await page.getByText('Fitness Tip not found.',{exact:true}).waitFor();
  results.push('Existing page/tag query strings, pagination links, empty/error states and missing posts');
  assert.deepEqual(errors,[]);await writeFile(join(output,'public-fitness-tips-results.json'),JSON.stringify({synthetic:true,results,metrics,requests,comments,errors},null,2)+'\n');console.log('Public Fitness Tips regression passed: '+results.length+' workflow groups.');
 }finally{await context.unroute('**/api/public/blogs*',blogsRoute);await context.unroute('**/api/public/blog-comments*',commentsRoute);await context.unroute('https://drive.google.com/**',driveRoute);}
}
