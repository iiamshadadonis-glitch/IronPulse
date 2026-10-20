import { json } from '../../_lib/utils.js';
import { edgeCachedResponse } from '../../_lib/edge-response-cache.js';
export async function onRequestGet({request,env,waitUntil,data}){
  const u=new URL(request.url),slug=String(u.searchParams.get('slug')||'').trim(),key=u.searchParams.get('key')||'about';
  return edgeCachedResponse({request,waitUntil,prepare:data?.db150PreparePublicRead,key:'pages-dropbeat-v151:'+(slug?'slug:'+slug:'key:'+key),ttl:60,load:async()=>{
  const page=slug
    ? await env.DB.prepare('SELECT * FROM content_pages WHERE is_custom=1 AND slug=? LIMIT 1').bind(slug).first()
    : await env.DB.prepare('SELECT * FROM content_pages WHERE page_key=?').bind(key).first();
  const faqKey=slug?'':key;
  const faqResult=faqKey==='faq'?await env.DB.prepare("SELECT * FROM faq_items WHERE status='active' ORDER BY sort_order,id").all():{results:[]};
  return json({page,faqs:faqResult.results||[]},200,{'cache-control':'public, max-age=60'});
  }});
}
