import { getSetting, setSetting } from './utils.js';
import { loadSeoPosts } from './seo-posts.js';
import { distributePublishedArticle } from './social-publishing.js';
import { brandHomeUrl } from './branded-email.js';

const iso=()=>new Date().toISOString();
const ts=v=>{const n=Date.parse(String(v||''));return Number.isFinite(n)?n:0;};

export async function sweepRecentPublishedAuditions(env,{force=false,lookbackMinutes=1440,maxArticles=3}={}){
  const state=await getSetting(env,'social_publish_sweep_state',{}).catch(()=>({}));
  const last=ts(state.lastStartedAt);
  if(!force&&last&&Date.now()-last<90*1000)return {ok:true,skipped:true,reason:'Recent publication sweep already ran within the last 90 seconds.',lastStartedAt:state.lastStartedAt};
  const startedAt=iso();
  await setSetting(env,'social_publish_sweep_state',{...state,lastStartedAt:startedAt,lastError:''}).catch(()=>{});
  try{
    const data=await loadSeoPosts(env,{statuses:['live'],maxPages:1,cacheSeconds:0});
    const cutoff=Date.now()-Math.max(5,Number(lookbackMinutes)||45)*60*1000;
    const recent=(data.posts||[]).filter(p=>{const t=ts(p.published_at||p.created_at||p.updated_at);return t&&t>=cutoff;});
    const candidates=[];const limit=Math.max(1,Math.min(5,Number(maxArticles)||3));
    const home=brandHomeUrl(env);
    for(const post of recent){const key=String(post.blogger_post_id||post.id||post.slug||''),slug=String(post.slug||post.post_slug||post.id||'fitness-update').replace(/^\/+|\/+$/g,''),articleUrl=`${home}/blog/${encodeURIComponent(slug)}`;const done=await env.DB.prepare("SELECT status FROM social_publish_log WHERE platform='distribution' AND (article_key=? OR article_url=?) ORDER BY updated_at DESC LIMIT 1").bind(key,articleUrl).first().catch(()=>null);if(done?.status==='published')continue;candidates.push(post);if(candidates.length>=limit)break;}
    const results=[];
    for(const post of candidates){results.push({id:post.id,slug:post.slug,publishedAt:post.published_at,distribution:await distributePublishedArticle(env,post)});}
    const next={lastStartedAt:startedAt,lastCompletedAt:iso(),checked:candidates.length,lastError:'',lastResults:results.slice(0,3)};
    await setSetting(env,'social_publish_sweep_state',next).catch(()=>{});
    return {ok:true,checked:candidates.length,results};
  }catch(e){const message=String(e?.message||e).slice(0,1800);await setSetting(env,'social_publish_sweep_state',{...state,lastStartedAt:startedAt,lastCompletedAt:iso(),lastError:message}).catch(()=>{});return {ok:false,error:message};}
}
