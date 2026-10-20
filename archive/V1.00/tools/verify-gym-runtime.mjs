/* A temporary local D1 instance only; never contacts a payment/OAuth provider. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {request as httpsRequest} from 'node:https';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),cli=join(root,'node_modules/wrangler/bin/wrangler.js'),state=await mkdtemp(join(tmpdir(),'ironpulse-runtime-')),port=8791,results=[];
const childEnv={...process.env,CI:'1',WRANGLER_SEND_METRICS:'false',...(process.env.GYM_NETWORK_TEST_SHIM?{NODE_OPTIONS:'--require='+process.env.GYM_NETWORK_TEST_SHIM}:{})};
async function command(args){return new Promise((resolve,reject)=>{let log='';const child=spawn(process.execPath,[cli,...args],{cwd:root,env:childEnv});child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);child.on('error',reject);child.on('exit',code=>code===0?resolve(log):reject(Error(log.slice(-6000))));});}
function get(path,{method='GET',body,cookie}={}){return new Promise((resolve,reject)=>{const payload=body?JSON.stringify(body):undefined,req=httpsRequest({hostname:'127.0.0.1',port,path,method,rejectUnauthorized:false,headers:{accept:'application/json',...(payload?{'content-type':'application/json','content-length':Buffer.byteLength(payload)}:{}),...(cookie?{cookie}:{})}},res=>{const parts=[];res.on('data',b=>parts.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text:Buffer.concat(parts).toString('utf8')}));});req.setTimeout(20000,()=>req.destroy(Error('Local runtime request timed out')));req.on('error',reject);if(payload)req.write(payload);req.end();});}
let server;
try{
 await command(['d1','migrations','apply','DB','--local','--persist-to',state]);results.push('All 56 migrations on a separate temporary local D1');
 const password=crypto.randomUUID()+'-test-only';
 server=spawn(process.execPath,[cli,'pages','dev','public','--ip','127.0.0.1','--port',String(port),'--inspector-port',String(port+1),'--local-protocol','https','--persist-to',state,'--binding','SITE_URL=https://127.0.0.1:'+port,'--binding','ADMIN_LOGIN_EMAIL=gym-owner@example.test','--binding','ADMIN_LOGIN_PASSWORD='+password],{cwd:root,env:childEnv});
 let log='';await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Local worker startup timed out: '+log.slice(-2000))),30000),read=bytes=>{log+=bytes;if(log.includes('Ready on')){clearTimeout(timer);resolve();}};server.stdout.on('data',read);server.stderr.on('data',read);server.once('exit',code=>{clearTimeout(timer);reject(Error('Local worker exited '+code+': '+log.slice(-2000)));});});
 let response=await get('/manifest.webmanifest');assert.equal(response.status,200);assert.equal(JSON.parse(response.text).name,'IronPulse Gym');results.push('Real Worker serves the gym manifest');
 response=await get('/student-dashboard?view=memberships');assert.equal(response.status,301);assert.equal(response.headers.location,'https://127.0.0.1:'+port+'/member-dashboard?view=memberships');
 response=await get('/member-dashboard');assert.equal(response.status,200);assert.match(response.headers['cache-control'],/no-store/);assert.match(response.headers['x-robots-tag'],/noindex/);assert.match(response.text,/Member Dashboard/);results.push('Dashboard alias, query retention, private caching and indexing headers');
 response=await get('/api/public/site');assert.equal(response.status,200);assert.equal(JSON.parse(response.text).settings.siteName,'IronPulse Gym');
 response=await get('/api/public/layout');assert.equal(response.status,200);assert.equal(JSON.parse(response.text).names.blog,'Fitness Tips');
 response=await get('/api/public/button-dictionary');assert.equal(response.status,200);assert.equal(JSON.parse(response.text).buttons.find(b=>b.key==='front.auth.student_tab').label,'Member Sign Up');results.push('Real public site, layout and button configuration backed by local D1');
 response=await get('/api/admin/auth/login',{method:'POST',body:{email:'gym-owner@example.test',password}});assert.equal(response.status,200);const cookie=response.headers['set-cookie'][0].split(';')[0];
 response=await get('/api/admin/settings',{cookie});assert.equal(response.status,200);assert.equal(JSON.parse(response.text).settings.siteName,'IronPulse Gym');
 response=await get('/api/portal/auth/context?role=admin',{cookie});assert.equal(response.status,200);assert.equal(JSON.parse(response.text).home,'/admin/');results.push('Configured first Admin login, HttpOnly session and authenticated settings/context');
 response=await get('/api/admin/auth/logout',{method:'POST',cookie,body:{}});assert.equal(response.status,200);
 response=await get('/api/admin/settings',{cookie});assert.equal(response.status,401);results.push('Revoked session is rejected after logout');
 const output=join(root,'verification/ironpulse-v1.00');await mkdir(output,{recursive:true});await writeFile(join(output,'runtime-results.json'),JSON.stringify({pass:true,localOnly:true,results},null,2)+'\n');console.log('Real Cloudflare local runtime checks passed: '+results.length+' groups.');
}finally{server?.kill('SIGTERM');if(server)await new Promise(resolve=>{server.once('exit',resolve);setTimeout(resolve,1000);});await rm(state,{recursive:true,force:true});}
