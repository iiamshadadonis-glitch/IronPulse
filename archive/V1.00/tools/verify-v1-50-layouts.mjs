/* Reuse the established synthetic API harness, with nine payment records. */
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const project=fileURLToPath(new URL('../',import.meta.url)),temporary=await mkdtemp(join(tmpdir(),'dropbeat-v150-'));
let runner=await readFile(new URL('./verify-mobile-v1-49-final.mjs',import.meta.url),'utf8');
runner=runner.replace("'./v149-final-cases.mjs'",JSON.stringify(new URL('./v150-layout-cases.mjs',import.meta.url).href));
runner=runner.replace('\nconst pageStats=',"\npaymentRows.push(...Array.from({length:7},(_,i)=>({...paymentRows[0],id:i+3,order_id:'TEST-ORDER-'+(i+3),transaction_reference:'pay_fixture_'+(i+3)})));\nconst pageStats=");
const script=join(temporary,'runner.mjs');await writeFile(script,runner);
const child=spawn(process.execPath,[script],{cwd:project,env:{...process.env,DROPBEAT_TEST_ROOT:project},stdio:'inherit'});
const code=await new Promise(resolve=>child.on('exit',resolve));await rm(temporary,{recursive:true,force:true});process.exitCode=code??1;
