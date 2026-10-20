import { preferredPublicOrigin } from '../_lib/utils.js';

const xml=v=>String(v??'').replace(/[<>&"']/g,c=>({
  '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'
}[c]));
const isoDate=v=>{
  const d=new Date(String(v||''));
  return Number.isNaN(d.getTime())?'':d.toISOString();
};

export async function onRequestGet({env,request}){
  const home=String(preferredPublicOrigin(request,env)||'https://dance-class-at2.pages.dev').replace(/\/$/,'');
  const q=await env.DB.prepare(`SELECT slug,updated_at_remote,published_at_remote,row_json
    FROM audition_post_cache
    WHERE lower(COALESCE(status,''))='published' AND trim(COALESCE(slug,''))<>''
    ORDER BY COALESCE(NULLIF(updated_at_remote,''),published_at_remote) DESC
    LIMIT 5000`).all().catch(()=>({results:[]}));
  const seen=new Set(),urls=[];
  for(const row of q.results||[]){
    let slug=String(row.slug||'').trim();
    if(!slug&&row.row_json){try{slug=String(JSON.parse(row.row_json)?.slug||'').trim();}catch{}}
    if(!slug||seen.has(slug))continue;seen.add(slug);
    const loc=`${home}/blog/${encodeURIComponent(slug.replace(/^\/+|\/+$/g,''))}`;
    const lastmod=isoDate(row.updated_at_remote||row.published_at_remote);
    urls.push(`<url><loc>${xml(loc)}</loc>${lastmod?`<lastmod>${xml(lastmod)}</lastmod>`:''}<changefreq>daily</changefreq><priority>0.85</priority></url>`);
  }
  const body=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(body,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=60, s-maxage=300'}});
}
