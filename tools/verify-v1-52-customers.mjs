/* Real shipped HTML/scripts; local synthetic API responses only. */
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const project=fileURLToPath(new URL('../',import.meta.url)),temporary=await mkdtemp(join(tmpdir(),'dropbeat-v152-'));
let runner=await readFile(new URL('./verify-mobile-v1-49-final.mjs',import.meta.url),'utf8');
runner=runner.replace("'./v149-final-cases.mjs'",JSON.stringify(new URL('./v152-customers-cases.mjs',import.meta.url).href));
runner=runner.replace("if(request.method()!=='GET')writes.push({path:url.pathname,body:request.postData()});", "if(request.method()!=='GET')writes.push({path:url.pathname,body:request.postData()}); if(url.pathname==='/api/admin/subscribers'&&request.method()==='POST'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,created:1,updated:0,errors:[]})});return;}");
const script=join(temporary,'runner.mjs');await writeFile(script,runner);
const child=spawn(process.execPath,[script],{cwd:project,env:{...process.env,DROPBEAT_TEST_ROOT:project},stdio:'inherit'});
const code=await new Promise(resolve=>child.on('exit',resolve));await rm(temporary,{recursive:true,force:true});process.exitCode=code??1;
