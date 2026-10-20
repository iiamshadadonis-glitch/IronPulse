import { json, readJson, normalizePhone, sendWhatsAppText } from '../../_lib/utils.js';
import { mergeLeadSubmission } from '../../_lib/lead-profile.js';
import { contactContext } from '../../_lib/contact-context.js';

const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);

function uniqueLinks(values=[]){const seen=new Set(),out=[];for(const raw of values){const v=clean(raw,1200);if(!v)continue;if(!seen.has(v)){seen.add(v);out.push(v);}if(out.length>=5)break;}return out;}
function driveFileId(value){try{const u=new URL(value);if(!/(^|\.)drive\.google\.com$/i.test(u.hostname))return'';const m=u.pathname.match(/\/file\/d\/([^/]+)/i);return (m?.[1]||u.searchParams.get('id')||'').trim();}catch(_){return'';}}
function youtubeVideoId(value){try{const u=new URL(value),host=u.hostname.toLowerCase().replace(/^www\./,'');if(host==='youtu.be')return u.pathname.split('/').filter(Boolean)[0]||'';if(host.endsWith('youtube.com')){const parts=u.pathname.split('/').filter(Boolean);if(u.searchParams.get('v'))return u.searchParams.get('v')||'';if(['shorts','embed','live'].includes(parts[0]))return parts[1]||'';}return'';}catch(_){return'';}}
function collectMediaLinks(b,prefix){const supplied=Array.isArray(b[`${prefix}_links`])?b[`${prefix}_links`]:[];for(let i=1;i<=5;i++)supplied.push(b[`${prefix}_link_${i}`]);return uniqueLinks(supplied);}
function parseDateOfBirth(value){const dob=clean(value,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(dob))return null;const [year,month,day]=dob.split('-').map(Number),date=new Date(Date.UTC(year,month-1,day));if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;const now=new Date();if(date.getTime()>Date.now())return null;let age=now.getUTCFullYear()-year;const beforeBirthday=now.getUTCMonth()<month-1||(now.getUTCMonth()===month-1&&now.getUTCDate()<day);if(beforeBirthday)age--;return age>=0&&age<=120?{dob,age}:null;}

export async function onRequestPost({request,env}){
  const b=await readJson(request);
  const context=contactContext(request,b);
  if(String(b.website_url||'').trim())return json({ok:true,lead_id:null});
  const name=clean(b.name,160),rawPhone=clean(b.phone,30),cc=clean(b.country_code||'91',6).replace(/\D/g,'')||'91',email=clean(b.email,220).toLowerCase(),instagram=clean(b.instagram_id,220),gender=clean(b.gender,80),birth=parseDateOfBirth(b.date_of_birth||b.dob);
  if(!name)return json({error:'Please enter your name.'},400);
  if(!birth)return json({error:'Please select a valid date of birth.'},400);
  if(!gender)return json({error:'Please select your gender.'},400);
  if(!rawPhone||!/^\d+$/.test(rawPhone))return json({error:'Please enter your WhatsApp number using numbers only.'},400);
  if(cc==='91'&&rawPhone.length!==10)return json({error:'For +91 India, enter exactly 10 digits without the country code.'},400);
  const maxNationalDigits=Math.max(6,15-cc.length);
  if(cc!=='91'&&(rawPhone.length<6||rawPhone.length>maxNationalDigits))return json({error:`Enter a valid WhatsApp number using 6 to ${maxNationalDigits} digits for +${cc}.`},400);
  if(!email||!EMAIL_RE.test(email))return json({error:'Please enter a valid email address in the format name@domain.com.'},400);
  const photoLinks=collectMediaLinks(b,'photo'),videoLinks=collectMediaLinks(b,'video');
  for(const link of photoLinks)if(!driveFileId(link))return json({error:'Photo links must be public Google Drive file links. Upload the photo to Google Drive, choose Anyone with the link, then paste the file share link.'},400);
  for(const link of videoLinks)if(!youtubeVideoId(link))return json({error:'Video links must be valid YouTube links.'},400);
  const phone=cc==='91'?normalizePhone(rawPhone):`${cc}${rawPhone}`;
  const payload={
    name,phone,email,age:birth.age,date_of_birth:birth.dob,gender,instagram_id:instagram,
    current_occupation:clean(b.current_occupation,180),experience_level:clean(b.experience_level,100),projects_count:Math.max(0,Math.round(Number(b.projects_count||0))),future_goal:clean(b.future_goal,300),role_interest:clean(b.role_interest,240),profile_message:clean(b.profile_message,5000),photo_links:photoLinks,video_links:videoLinks,
    visitor_id:clean(b.visitor_id,80),source_detail:clean(b.source_detail||'/submit-profile',300),...context
  };
  const merged=await mergeLeadSubmission(env,payload,{submissionType:'profile',source:'submit_profile'});
  const adminNumber=env.WHATSAPP_ADMIN_NUMBER||'9193919375';
  await sendWhatsAppText(env,adminNumber,`DropBeat Dance Studio trial class request\nName: ${name}\nDate of birth: ${birth.dob}\nGender: ${gender}\nPhone: +${phone}\nEmail: ${email}\nAbout: ${payload.profile_message||'-'}${merged.duplicate?`\nMerged with existing client by: ${merged.matched_by}`:''}`).catch(()=>{});
  return json({ok:true,lead_id:merged.lead.id,duplicate:merged.duplicate,matched_by:merged.matched_by,message:merged.duplicate?'Your trial request was added to your existing profile.':'Your trial class request has been submitted successfully.'});
}
