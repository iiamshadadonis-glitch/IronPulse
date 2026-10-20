import { json, readJson } from '../../_lib/utils.js';

const clean=(v,n=400)=>String(v??'').trim().slice(0,n);

export async function onRequestPost({request,env}){
  try{
    const b=await readJson(request),visitorId=clean(b.visitor_id,80),productId=Number(b.product_id||0),slug=clean(b.product_slug,220);
    if(!visitorId)return json({error:'Visitor reference is required.'},400);
    let product=null;
    if(productId>0)product=await env.DB.prepare("SELECT id,name,slug FROM products WHERE id=? AND status='active' LIMIT 1").bind(productId).first();
    else if(slug)product=await env.DB.prepare("SELECT id,name,slug FROM products WHERE slug=? AND status='active' LIMIT 1").bind(slug).first();
    if(!product)return json({error:'This plan / offer could not be found.'},404);
    const source=clean(b.source_path,800)||'/offer-details';
    await env.DB.prepare(`INSERT INTO product_interest_events(visitor_id,product_id,product_slug,source_path,created_at,updated_at)
      VALUES(?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT(visitor_id,product_id) DO UPDATE SET product_slug=excluded.product_slug,source_path=excluded.source_path,updated_at=CURRENT_TIMESTAMP`)
      .bind(visitorId,product.id,product.slug||'',source).run();
    return json({ok:true,product_id:product.id,product_name:product.name,message:'Interest saved.'});
  }catch(e){return json({error:e.message||'Could not save your interest.'},500);}
}
