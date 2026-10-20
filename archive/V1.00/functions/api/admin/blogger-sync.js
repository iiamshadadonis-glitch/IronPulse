import { json, requireAdmin } from '../../_lib/utils.js';
import { loadSeoPosts } from '../../_lib/seo-posts.js';

// Compatibility endpoint retained for older admin buttons. It is now a read-only refresh:
// posts stay in the connected SEO and are never copied into the website database.
export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  try{
    const data=await loadSeoPosts(env,{statuses:['live','draft'],maxPages:20,cacheSeconds:0});
    const published=(data.posts||[]).filter(x=>x.status==='published').length,drafts=(data.posts||[]).filter(x=>x.status==='draft').length;
    return json({ok:true,total:(data.posts||[]).length,published,drafts,imported:0,updated:0,message:`Loaded ${published} published and ${drafts} Draft fitness class fitness tip(s) directly from ${data.blogName||'the selected SEO'}. No website database copy was created.`});
  }catch(e){return json({error:`SEO refresh failed: ${e.message}`,hint:'Confirm SEO is connected in Settings → Integrations → SEO, then try Load Fitness Tips again.'},502);}
}
