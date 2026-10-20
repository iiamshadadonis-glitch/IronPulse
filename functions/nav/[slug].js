import { getNavigationModel } from '../_lib/navigation.js';
import { getSetting } from '../_lib/utils.js';
import { brandHomeUrl } from '../_lib/branded-email.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function proxyPage(request,target,item,env){
  const origin=new URL(request.url).origin,upstream=new URL(target,origin);
  const headers=new Headers(request.headers);headers.set('x-uc-navigation-alias','1');
  let res;
  try{
    const assetRequest=new Request(upstream.toString(),{method:'GET',headers,redirect:'follow'});
    if(env?.ASSETS?.fetch){
      res=await env.ASSETS.fetch(assetRequest);
      // Pages ASSETS only serves static output. Dynamic canonical routes (for example /blog)
      // may return 404 here, so fall through to the normal route pipeline for those pages.
      if(res?.status===404)res=null;
    }
    if(!res)res=await fetch(assetRequest);
  }catch(_){return Response.redirect(upstream.toString(),302);}
  const ct=res.headers.get('content-type')||'';if(!ct.includes('text/html'))return res;
  let html=await res.text();const aliasUrl=new URL(request.url).toString();
  html=html.replace(/<link\s+rel=["']canonical["'][^>]*>/ig,'').replace(/<meta\s+property=["']og:url["'][^>]*>/ig,'');
  const schema={"@context":"https://schema.org","@type":"WebPage","name":item.label,"url":aliasUrl,"isPartOf":{"@type":"WebSite","url":brandHomeUrl(env)}};
  const robots=(item.key==='admin-login'||item.key==='track-order')?'<meta name="robots" content="noindex,follow">':'';html=html.replace(/<\/head>/i,`${robots}<link rel="canonical" href="${esc(aliasUrl)}"><meta property="og:url" content="${esc(aliasUrl)}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script></head>`);
  const outHeaders=new Headers(res.headers);outHeaders.set('cache-control','no-store, max-age=0');outHeaders.delete('content-length');
  return new Response(html,{status:res.status,headers:outHeaders});
}
export async function onRequestGet({request,params,env}){
  const slug=String(params?.slug||'').trim().toLowerCase();if(!slug)return new Response('Page not found',{status:404});
  const model=await getNavigationModel(env);const item=(model.items||[]).find(x=>!x.custom&&x.kind==='core'&&String(x.slug||'')===slug&&String(x.href||'').startsWith('/nav/'));
  if(item)return proxyPage(request,item.canonicalHref,item,env);
  const history=await getSetting(env,'navigation_alias_history',{}).catch(()=>({})),oldPath=`/nav/${slug}`,next=String(history?.[oldPath]||'');
  if(next)return Response.redirect(new URL(next,request.url).toString(),301);
  return new Response('Page not found',{status:404,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
}
