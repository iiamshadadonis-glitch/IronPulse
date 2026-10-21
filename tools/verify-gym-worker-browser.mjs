/* Test actual Cloudflare page routing with synthetic provider data and temporary local D1. */
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {request} from 'node:https';
import assert from 'node:assert/strict';
const root=resolve(process.env.GYM_TEST_ROOT||fileURLToPath(new URL('../',import.meta.url)));
const state=await mkdtemp(join(tmpdir(),'ironpulse-pages-browser-')),port=Number(process.env.GYM_WORKER_PORT||8801),origin='https://127.0.0.1:'+port;
const childEnv={...process.env,CI:'1',WRANGLER_SEND_METRICS:'false',...(process.env.GYM_NETWORK_TEST_SHIM?{NODE_OPTIONS:'--require='+process.env.GYM_NETWORK_TEST_SHIM}:{})};
function get(path){return new Promise((resolve,reject)=>{const req=request(origin+path,{rejectUnauthorized:false,headers:{accept:'text/html'}},res=>{let body='';res.on('data',b=>body+=b);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});req.on('error',reject);req.setTimeout(20000,()=>req.destroy(Error('Worker request timed out')));req.end();});}
let server;
try{
  server=spawn(process.execPath,[join(root,'node_modules/wrangler/bin/wrangler.js'),'pages','dev','public','--ip','127.0.0.1','--port',String(port),'--inspector-port',String(port+1),'--local-protocol','https','--persist-to',state,'--binding','SITE_URL='+origin],{cwd:root,env:childEnv});
  let log='';await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Worker startup timed out: '+log.slice(-2000))),30000);const read=b=>{log+=b;if(log.includes('Ready on')){clearTimeout(timer);resolve();}};server.stdout.on('data',read);server.stderr.on('data',read);server.once('exit',code=>{clearTimeout(timer);reject(Error('Worker exited '+code+': '+log.slice(-2000)));});});
  const page=await get('/blog');assert.equal(page.status,200);assert.match(page.body,/db107-blog-schema/,'The test must use the Worker-generated shell, not public/blog.html');
  console.log('Testing actual /blog Worker shell at '+origin+' with a temporary local database.');
  const args=[fileURLToPath(new URL('./verify-gym-browser.mjs',import.meta.url)),...process.argv.slice(2)];
  await new Promise((resolve,reject)=>{const runner=spawn(process.execPath,args,{cwd:root,env:{...process.env,GYM_TEST_ROOT:root,GYM_TEST_ORIGIN:origin},stdio:'inherit'});runner.on('error',reject);runner.on('exit',code=>code===0?resolve():reject(Error('Worker browser regression exited '+code)));});
}finally{
  server?.kill('SIGTERM');if(server)await new Promise(resolve=>{server.once('exit',resolve);setTimeout(resolve,1000);});await rm(state,{recursive:true,force:true});
}
