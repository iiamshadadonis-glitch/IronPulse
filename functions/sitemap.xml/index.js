import { getNavigationModel } from '../_lib/navigation.js';
import { preferredPublicOrigin } from '../_lib/utils.js';
const xml=v=>String(v??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const iso=v=>{try{const d=new Date(String(v||''));return Number.isNaN(d.getTime())?'':d.toISOString();}catch{return'';}};
export async function onRequestGet({env,request}){
  const home=String(preferredPublicOrigin(request,env)||'https://dance-class-at2.pages.dev').replace(/\/$/,'');
  const fixed=[
    ['/','daily','1.0'],['/offers','daily','0.95'],['/yearly-plans','weekly','0.85'],['/festival-offers','daily','0.85'],['/blog','daily','0.90'],['/about','monthly','0.80'],['/contact','monthly','0.75'],['/submit-profile','monthly','0.80'],['/success-stories','weekly','0.70'],['/faq','monthly','0.65'],['/requests','monthly','0.65'],['/privacy-policy','yearly','0.40'],['/terms-and-conditions','yearly','0.40'],['/refund-and-cancellation','yearly','0.40']
  ];
  const urls=new Map(fixed.map(x=>[x[0],x]));
  try{
    const model=await getNavigationModel(env);
    const excluded=new Set(['admin-login','track-order']);
    for(const item of model.items||[]){
      if(!excluded.has(item.key)&&item.href&&!item.custom)urls.set(item.href,[item.href,item.key==='blog'?'daily':'weekly',item.key==='offers'?'0.95':'0.80']);
      for(const c of item.children||[])if(c.href&&!c.custom)urls.set(c.href,[c.href,'weekly','0.80']);
    }
    const rows=(await env.DB.prepare("SELECT slug,updated_at FROM content_pages WHERE is_custom=1 AND trim(COALESCE(slug,''))<>'' ORDER BY updated_at DESC,id DESC").all()).results||[];
    for(const r of rows)urls.set(`/page/${encodeURIComponent(String(r.slug).trim())}`,[`/page/${encodeURIComponent(String(r.slug).trim())}`,'weekly','0.75',r.updated_at||'']);
    const products=(await env.DB.prepare("SELECT slug,updated_at FROM products WHERE status='active' AND trim(COALESCE(slug,''))<>'' ORDER BY sort_order,id").all()).results||[];
    for(const product of products){const path=`/offer-details?plan=${encodeURIComponent(String(product.slug).trim())}`;urls.set(path,[path,'weekly','0.88',product.updated_at||'']);}
    const posts=(await env.DB.prepare("SELECT slug,COALESCE(NULLIF(updated_at_remote,''),published_at_remote) AS updated_at FROM audition_post_cache WHERE lower(COALESCE(status,''))='published' AND trim(COALESCE(slug,''))<>'' ORDER BY updated_at DESC LIMIT 5000").all()).results||[];
    for(const post of posts){const path=`/blog/${encodeURIComponent(String(post.slug).replace(/^\/+|\/+$/g,''))}`;urls.set(path,[path,'daily','0.85',post.updated_at||'']);}
  }catch(_){}
  const body=[...urls.values()].map(([path,freq,priority,lastmod])=>`  <url><loc>${xml(home+path)}</loc>${iso(lastmod)?`<lastmod>${xml(iso(lastmod))}</lastmod>`:''}<changefreq>${freq}</changefreq><priority>${priority}</priority></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=60, s-maxage=180'}});
}
