import { ensureV122Schema } from './v1-22-schema.js';

const clean=(value,max=500)=>String(value??'').replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s{2,}/g,' ').trim().slice(0,max);
const phoneKey=value=>String(value??'').replace(/\D/g,'').slice(-10);
const phoneSql=field=>`substr(replace(replace(replace(replace(replace(COALESCE(${field},''),'+',''),' ',''),'-',''),'(',''),')',''),-10)`;

export async function syncStudentLeadForAccount(env,accountOrId){
  await ensureV122Schema(env);await env.DB.prepare('ALTER TABLE contact_leads ADD COLUMN updated_at TEXT').run().catch(()=>{});const account=typeof accountOrId==='object'&&accountOrId?accountOrId:await env.DB.prepare("SELECT * FROM portal_accounts WHERE id=? AND role='student' LIMIT 1").bind(Number(accountOrId||0)).first();if(!account||account.role!=='student')return {updated:0,created:0};
  const address=clean(account.email,240).toLowerCase(),number=clean(account.phone,60),key=phoneKey(number),name=clean(account.display_name||account.real_name||address,180),where=`(lower(trim(COALESCE(email,'')))=? OR (?<>'' AND ${phoneSql('phone')}=?))`,matches=(await env.DB.prepare(`SELECT id FROM contact_leads WHERE ${where} ORDER BY id`).bind(address,key,key).all().catch(()=>({results:[]}))).results||[];
  for(const row of matches)await env.DB.prepare('UPDATE contact_leads SET name=?,email=?,phone=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(name,address,number,Number(row.id)).run().catch(()=>{});
  const paid=await env.DB.prepare(`SELECT 1 ok FROM orders WHERE (lower(COALESCE(payment_status,'')) IN ('paid','captured','active','successful','success','authenticated','trialing') OR lower(COALESCE(status,'')) IN ('paid','captured','active','successful','success','authenticated','trialing')) AND (lower(trim(COALESCE(customer_email,'')))=? OR (?<>'' AND (${phoneSql('customer_phone')}=? OR ${phoneSql('website_phone')}=? OR ${phoneSql('razorpay_phone')}=?))) LIMIT 1`).bind(address,key,key,key,key).first().catch(()=>null);
  if(matches.length||paid)return {updated:matches.length,created:0,paid:!!paid};
  const inserted=await env.DB.prepare(`INSERT INTO contact_leads(name,phone,email,message,source,status,source_detail,created_at,updated_at) VALUES(?,?,?,'Student created an account and is awaiting purchase.','student_signup','new','/student-signup',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`).bind(name,number,address).first();return {updated:0,created:Number(inserted?.id||0)?1:0,leadId:Number(inserted?.id||0)};
}

export async function syncStudentLeadAccounts(env,{limit=500}={}){
  await ensureV122Schema(env);const rows=(await env.DB.prepare("SELECT * FROM portal_accounts WHERE role='student' ORDER BY updated_at DESC,id DESC LIMIT ?").bind(Math.max(1,Math.min(2000,Number(limit||500)))).all()).results||[];let updated=0,created=0;for(const row of rows){const result=await syncStudentLeadForAccount(env,row);updated+=Number(result.updated||0);created+=Number(result.created||0);}return {updated,created,checked:rows.length};
}

/** Keep the authenticated profile authoritative across CRM, commerce and class
 * records. This is deliberately called only after authenticated/OTP-verified
 * edits; anonymous checkout and contact-form submissions never call it. */
export async function syncAuthoritativeIdentity(env,{accountId,role,email,oldEmail='',phone,oldPhone='',name}={}){
  await ensureV122Schema(env);const id=Number(accountId||0),address=clean(email,240).toLowerCase(),previousEmail=clean(oldEmail||email,240).toLowerCase(),number=clean(phone,60),previousPhone=clean(oldPhone||phone,60),displayName=clean(name,180);if(!id)return {updated:false};
  const statements=[];
  if(role==='student'){
    statements.push(
      env.DB.prepare(`UPDATE webinar_members SET customer_name=?,customer_email=?,customer_phone=?,updated_at=CURRENT_TIMESTAMP WHERE lower(customer_email)=? OR (?<>'' AND customer_phone=?)`).bind(displayName,address,number,previousEmail,previousPhone,previousPhone),
      env.DB.prepare(`UPDATE orders SET customer_name=?,customer_email=?,customer_phone=?,updated_at=CURRENT_TIMESTAMP WHERE lower(COALESCE(customer_email,''))=? OR (?<>'' AND customer_phone=?)`).bind(displayName,address,number,previousEmail,previousPhone,previousPhone),
      env.DB.prepare(`UPDATE contact_leads SET name=?,email=?,phone=? WHERE lower(COALESCE(email,''))=? OR (?<>'' AND phone=?)`).bind(displayName,address,number,previousEmail,previousPhone,previousPhone),
      env.DB.prepare(`UPDATE subscribers SET name=?,email=?,phone=?,updated_at=CURRENT_TIMESTAMP WHERE lower(COALESCE(email,''))=? OR (?<>'' AND phone=?)`).bind(displayName,address,number,previousEmail,previousPhone,previousPhone)
    );
  }else if(role==='coach')statements.push(env.DB.prepare('UPDATE dance_coaches SET name=?,contact_email=?,contact_phone=?,updated_at=CURRENT_TIMESTAMP WHERE portal_account_id=?').bind(displayName,address,number,id));
  for(const statement of statements)await statement.run().catch(()=>{});if(role==='student')await syncStudentLeadForAccount(env,{id,role,email:address,phone:number,display_name:displayName,real_name:displayName}).catch(()=>{});return {updated:true};
}
