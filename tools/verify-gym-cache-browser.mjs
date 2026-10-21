/* Real Chromium HTTP cache: keep the stale CSS cached, then load the hashed deployment URL. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {finalizeGymHtml,applyGymAssetHeaders} from '../functions/_lib/gym-asset-delivery.js';
import manifest from '../functions/_lib/gym-asset-manifest.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.GYM_PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),output=resolve(process.env.GYM_TEST_OUTPUT||join(root,'browser-verification'));
await mkdir(output,{recursive:true});
const path='/assets/gym-fitness-tips-v1-06.css',css=await readFile(join(root,'public',path),'utf8');
const stale='/* cached previous stylesheet */ .uc-blog-card{display:block;padding:61px;gap:61px}.uc-blog-card-body{position:static}';
const shell='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+path+'"><style>html{--dropbeat-primary:#4B55BE}body{margin:0;padding:16px}.uc-blog-list{max-width:900px;margin:auto}.uc-blog-card{box-sizing:border-box;border:1px solid #ddd}.uc-blog-card-body{display:flex;flex-direction:column}.uc-blog-excerpt{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}.btn{padding:12px;box-sizing:border-box;text-decoration:none}img{display:block}</style></head><body class="uc-blog-page" data-uc-load="blog-list"><div class="uc-blog-list"><article class="uc-blog-card"><a class="uc-blog-card-media" href="#post"><img alt="Gym fixture" src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'800\' height=\'600\'%3E%3Crect width=\'800\' height=\'600\' fill=\'%23777\'/%3E%3C/svg%3E"></a><div class="uc-blog-card-body"><h3>Build a consistent fitness routine</h3><p class="uc-blog-excerpt">Practical training ideas and habits you can build on.</p><a class="btn" href="#post">Read More</a></div></article></div></body></html>';
let deployment='previous';const requests=[];
const server=createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname===path){requests.push({path:url.pathname,version:url.searchParams.get('ip')||'',deployment});const headers=new Headers({'content-type':'text/css','cache-control':'public, max-age=3600'});if(url.searchParams.has('ip'))applyGymAssetHeaders(headers,url);res.writeHead(200,Object.fromEntries(headers));res.end(url.searchParams.has('ip')?css:stale);return;}res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});res.end(deployment==='previous'?shell:finalizeGymHtml(shell,'http://'+req.headers.host+'/blog'));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.GYM_CHROMIUM_PATH?{executablePath:process.env.GYM_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer','--no-zygote','--single-process']});
const errors=[],results=[];
try{
  const context=await browser.newContext({viewport:{width:390,height:900}}),page=await context.newPage(),network=await context.newCDPSession(page);page.on('pageerror',e=>errors.push(String(e)));
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:900});await network.send('Network.clearBrowserCache');
    deployment='previous';const start=requests.length;await page.goto(origin+'/blog');assert.equal(await page.locator('.uc-blog-card').evaluate(n=>getComputedStyle(n).paddingLeft),'61px');
    deployment='current';await page.reload();
    if(width<=760){assert.equal(await page.locator('.uc-blog-card-body').evaluate(n=>getComputedStyle(n).position),'absolute');assert.match(await page.locator('.uc-blog-card-body').evaluate(n=>getComputedStyle(n).backgroundImage),/linear-gradient/);}
    else{assert.equal(await page.locator('.uc-blog-card').evaluate(n=>getComputedStyle(n).paddingLeft),'24px');assert.equal(await page.locator('.uc-blog-card').evaluate(n=>getComputedStyle(n).columnGap),'24px');}
    const stillCached=await page.evaluate(path=>fetch(path,{cache:'force-cache'}).then(r=>r.text()),path);assert.equal(stillCached,stale,'Old CSS stays in the real browser cache while the new layout uses a different URL');
    assert.equal(requests.slice(start).filter(r=>!r.version).length,1,'No network request was needed to retrieve the old cached CSS');
    assert.equal(requests.slice(start).filter(r=>r.version.startsWith('V1.06.'+manifest.build)).length,1);
    await page.reload();assert.equal(requests.slice(start).filter(r=>r.version).length,2,'The current stylesheet also obeys revalidation headers');
    results.push('Real browser warm cache at '+width+'px: old CSS retained, new build URL fetched, layout corrected and subsequent revalidation confirmed');
  }
  assert.deepEqual(errors,[]);await writeFile(join(output,'asset-cache-results.json'),JSON.stringify({realBrowserHttpCache:true,noNetworkInterception:true,results,requests,errors},null,2)+'\n');console.log('Real browser cache checks passed: '+results.length+' workflow groups.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
