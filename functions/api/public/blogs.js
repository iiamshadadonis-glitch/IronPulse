import { json, getApiSettings } from '../../_lib/utils.js';
import { loadSeoPosts, loadAuditionPostCache } from '../../_lib/seo-posts.js';
import { edgeCachedResponse } from '../../_lib/edge-response-cache.js';

function stamp(p){const v=p?.published_at||p?.created_at||p?.updated_at||'';const t=Date.parse(v);return Number.isFinite(t)?t:0;}
function byNewest(a,b){return stamp(b)-stamp(a)||String(b.id||'').localeCompare(String(a.id||''));}
async function viewMap(env){
  try{const {results}=await env.DB.prepare("SELECT path,COUNT(*) AS total FROM visitor_events WHERE path LIKE '/blog/%' GROUP BY path").all();const m=new Map();for(const r of results||[])m.set(String(r.path||''),Number(r.total||0));return m;}catch{return new Map();}
}
function addViews(posts,map){return (posts||[]).map(p=>({...p,view_count:Number(map.get('/blog/'+p.slug)||0)}));}
function tagsCloud(posts){const m=new Map();for(const p of posts||[])for(const raw of p.tags||[]){const tag=String(raw||'').trim();if(!tag)continue;const key=tag.toLowerCase();const cur=m.get(key)||{tag,count:0};cur.count++;m.set(key,cur);}return [...m.values()].sort((a,b)=>b.count-a.count||a.tag.localeCompare(b.tag)).slice(0,30);}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function sideData(all,excludeId=''){
  const eligible=all.filter(p=>String(p.id)!==String(excludeId||''));
  const recent=eligible.slice(0,6);
  const featured=eligible.filter(p=>Number(p.is_featured||0)===1).sort((a,b)=>stamp(b)-stamp(a))[0]||null;
  const popular=eligible.filter(p=>Number(p.view_count||0)>0).sort((a,b)=>Number(b.view_count||0)-Number(a.view_count||0)||byNewest(a,b)).slice(0,6);
  const random=shuffle(eligible).slice(0,8);
  return {recent,featured,popular,random};
}
function responseHeaders(){return {'cache-control':'public, max-age=20, stale-while-revalidate=60'};}

async function loadBlogsResponse({request,env}){
  const url=new URL(request.url),slug=String(url.searchParams.get('slug')||'').trim();
  try{
    let remote=null,fallbackWarning='';
    try{remote=await loadSeoPosts(env,{statuses:['live'],maxPages:24,cacheSeconds:20});}
    catch(remoteError){
      const settings=await getApiSettings(env).catch(()=>({})),blogId=String(settings.bloggerBlogId||'').trim();
      if(!blogId)throw remoteError;
      const cached=await loadAuditionPostCache(env,blogId,{includeBodies:true}).catch(()=>[]);
      const published=(cached||[]).filter(p=>String(p.status||'').toLowerCase()==='published');
      if(!published.length)throw remoteError;
      fallbackWarning=String(remoteError?.code||remoteError?.cause?.code||'')==='SEO_RECONNECT_REQUIRED'
        ?'Google SEO authorization needs reconnection. Showing the last synchronized Fitness Tips until an admin reconnects SEO.'
        :'The live SEO source could not be reached. Showing the last synchronized Fitness Tips.';
      remote={posts:published,blogId,blogName:String(settings.bloggerBlogName||''),cacheFallback:true};
    }
    const views=await viewMap(env);let all=addViews((remote.posts||[]).filter(p=>p.status==='published'),views).sort(byNewest);
    if(slug){
      const post=all.find(p=>String(p.slug||'')===slug)||null;
      const side=sideData(all,post?.id||'');
      const related=post?all.filter(p=>String(p.id)!==String(post.id)).slice(0,6):[];
      return json({post,...side,related,tags:tagsCloud(all),source:remote.cacheFallback?'synchronized-cache':'live-seo',warning:fallbackWarning},200,responseHeaders());
    }
    const page=Math.max(1,Number(url.searchParams.get('page')||1)||1),pageSize=10,tag=String(url.searchParams.get('tag')||'').trim().slice(0,80);
    if(tag)all=all.filter(p=>(p.tags||[]).some(t=>String(t).toLowerCase()===tag.toLowerCase()));
    const total=all.length,pages=Math.max(1,Math.ceil(total/pageSize)),safePage=Math.min(page,pages),offset=(safePage-1)*pageSize;
    const liveAll=addViews((remote.posts||[]).filter(p=>p.status==='published'),views).sort(byNewest),posts=all.slice(offset,offset+pageSize),side=sideData(liveAll);
    return json({posts,...side,tags:tagsCloud(liveAll),source:remote.cacheFallback?'synchronized-cache':'live-seo',warning:fallbackWarning,pagination:{page:safePage,pageSize,total,pages,hasPrev:safePage>1,hasNext:safePage<pages,tag}},200,responseHeaders());
  }catch(e){
    return json({error:'Fitness Tips could not be loaded from the connected SEO right now.',detail:String(e?.message||'')},502,{'cache-control':'no-store'});
  }
}
export async function onRequestGet({request,env,waitUntil,data}){
  const url=new URL(request.url),key=`blogs-v1700:${url.searchParams.get('slug')||''}:${url.searchParams.get('page')||'1'}:${url.searchParams.get('tag')||''}`;
  return edgeCachedResponse({request,waitUntil,prepare:data?.db150PreparePublicRead,key,ttl:120,load:()=>loadBlogsResponse({request,env})});
}
