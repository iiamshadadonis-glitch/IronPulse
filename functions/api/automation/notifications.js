import {json,requireAutomation} from '../../_lib/utils.js';
import {processNotificationQueue} from '../../_lib/notifications-v1-58.js';
export async function onRequestPost({request,env}){try{await requireAutomation(request,env);}catch{return json({error:'Automation authorization required.'},401,{'cache-control':'no-store'});}try{return json(await processNotificationQueue(env,{origin:new URL(request.url).origin,batches:8}),200,{'cache-control':'no-store'});}catch{return json({error:'Queued notifications could not be processed. Retry on the next run.'},503,{'cache-control':'no-store'});}}
