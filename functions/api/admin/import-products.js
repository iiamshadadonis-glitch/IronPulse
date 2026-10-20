/* V1.40 Bulk Plan Upload. The route is retained for existing admin links. */
import {json,requireAdmin,readJson} from '../../_lib/utils.js';
import {ensureDanceStudioSchema,validateProductClassDetails} from '../../_lib/fitness-platform.js';
import {normalizePlanImportRow,savedPlanImportDefaults} from '../../_lib/plan-import.js';
import {onRequestPost as createPlan,onRequestPut as updatePlan} from './products.js';
import {onRequestPost as addImage} from './media.js';

function internalRequest(request,method,payload){
  const headers=new Headers(request.headers);headers.set('content-type','application/json');headers.delete('content-length');
  return new Request(new URL('/api/admin/products',request.url),{method,headers,body:JSON.stringify(payload)});
}
export async function onRequestPost({request,env,waitUntil}){
  try{await requireAdmin(request,env);}catch(error){return json({error:error.message},401);}
  let rows;try{({rows}=await readJson(request));}catch{return json({error:'Upload a valid CSV file.'},400);}
  if(!Array.isArray(rows)||!rows.length)return json({error:'The CSV contains no plan rows.'},400);
  if(rows.length>50)return json({error:'Import up to 50 plans per file. Split larger spreadsheets into files of 50 rows.'},400);
  await ensureDanceStudioSchema(env);
  let created=0,updated=0;const errors=[],results=[],seen=new Set();
  for(const [index,input]of rows.entries()){
    const row=index+2;let savedId=0,kind='';
    try{
      const sku=String(input?.sku||input?.SKU||'').trim();
      if(seen.has(sku))throw new Error('This sku appears more than once in the file. Keep one row per plan.');
      if(sku)seen.add(sku);
      const current=sku?await env.DB.prepare('SELECT * FROM products WHERE sku=?').bind(sku).first():null;
      const mapping=current?await env.DB.prepare('SELECT * FROM product_class_mappings WHERE product_id=?').bind(current.id).first():null;
      const {payload,placements,images,hasPlacements}=normalizePlanImportRow(input,current?savedPlanImportDefaults(current,mapping||{}):{});
      await validateProductClassDetails(env,payload,{requireAccessDates:payload.payment_type==='one_time'});
      const currentImages=current?(await env.DB.prepare('SELECT * FROM product_images WHERE product_id=? ORDER BY sort_order,id').bind(current.id).all()).results||[]:[];
      const newImages=images.filter(image=>!currentImages.some(existing=>existing.source_url===image.image_url||existing.public_url===image.image_url));
      if(currentImages.length+newImages.length>3)throw new Error('A plan supports at most 3 scrolling images. Remove an old image before importing another URL.');
      const response=current
        ?await updatePlan({request:internalRequest(request,'PUT',{...payload,id:current.id}),env})
        :await createPlan({request:internalRequest(request,'POST',payload),env,skipGatewayProvisioning:true});
      const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'The plan could not be saved.');
      savedId=Number(current?.id||data.id);kind=current?'updated':'created';if(current)updated++;else created++;
      for(const image of images){
        const existing=currentImages.find(saved=>saved.source_url===image.image_url||saved.public_url===image.image_url);
        if(existing){
          const statements=[];if(image.is_cover)statements.push(env.DB.prepare('UPDATE product_images SET is_cover=0 WHERE product_id=?').bind(savedId));
          statements.push(env.DB.prepare('UPDATE product_images SET alt_text=?,is_cover=? WHERE id=? AND product_id=?').bind(image.alt_text,image.is_cover,existing.id,savedId));await env.DB.batch(statements);continue;
        }
        const imageResponse=await addImage({request:internalRequest(request,'POST',{product_id:savedId,...image,post_social_status:0}),env,waitUntil});
        const imageData=await imageResponse.json();if(!imageResponse.ok)throw new Error(imageData.error||'An image URL could not be linked.');
      }
      // Apply explicit display choices after image attachment: the existing
      // first-image handler adds default Home/Offers placements.
      if(hasPlacements){
        const statements=[env.DB.prepare('DELETE FROM page_placements WHERE product_id=?').bind(savedId)];
        placements.forEach((page,sort)=>statements.push(env.DB.prepare('INSERT INTO page_placements(product_id,page_key,section_key,sort_order,visible) VALUES(?,?,?,?,1)').bind(savedId,page,page==='offers'?'memberships':page==='festival'?'festival':page==='yearly'?'yearly':'featured',sort)));
        await env.DB.batch(statements);
      }
      results.push({row,sku:payload.sku,id:savedId,status:kind,images:images.length});
    }catch(error){
      errors.push({row,sku:String(input?.sku||input?.SKU||''),error:error.message,...(savedId?{saved_id:savedId,stage:'images_or_display',plan_saved:true}:{plan_saved:false})});
      results.push({row,id:savedId||undefined,status:savedId?kind+'_with_errors':'rejected'});
    }
  }
  return json({ok:errors.length===0,created,updated,errors,results,message:errors.length?'Review the row errors. Plans marked saved_id were saved; correct their image/display errors before retrying.':'Plans imported successfully.'});
}
