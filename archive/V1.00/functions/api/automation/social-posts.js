import { json, requireAutomation } from '../../_lib/utils.js';
import { processDueSocialPosts } from '../../_lib/social-posts.js';

export async function onRequestGet({request,env}){
  try{await requireAutomation(request,env);}catch(e){return json({error:e.message},401);}
  try{return json(await processDueSocialPosts(env,{limit:6}));}catch(e){return json({error:e.message||'Scheduled social posts could not be processed.'},500);}
}
export async function onRequestPost(ctx){return onRequestGet(ctx);}
