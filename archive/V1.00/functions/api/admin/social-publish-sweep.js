import { json, requireAdmin } from '../../_lib/utils.js';
import { sweepRecentPublishedAuditions } from '../../_lib/social-publish-sweep.js';
export async function onRequestPost({request,env}){try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}const r=await sweepRecentPublishedAuditions(env,{force:true,lookbackMinutes:180,maxArticles:5});return json(r,r.ok?200:502);}
