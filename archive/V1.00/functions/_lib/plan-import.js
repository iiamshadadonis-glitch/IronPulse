import {googleDriveInlineImageUrl} from './google-drive-upload.js';
/* V1.40 CSV adapter. It converts spreadsheet values to the existing Plans &
   Offers payload; the normal plan/class validators remain authoritative. */
export const PLAN_IMPORT_COLUMNS=[
  'sku','name','slug','short_description','description','payment_type','regular_price','offer_price_enabled','offer_price','billing_period','billing_interval',
  'trial_enabled','trial_amount','trial_value','trial_unit','status','badge','eligibility','features','spot_limit','filling_fast_limit','low_spot_limit','sort_order',
  'class_mapping_enabled','class_name','class_type','coach_id','schedule_start_date','hide_start_after_date','start_mode','class_access_start_date','class_access_end_date',
  'dance_styles','class_time','duration_hours','duration_minutes','days_per_week','class_days','timezone','meeting_provider','location_or_link','reminders_enabled','reminder_minutes_before','reminder_channels',
  'placements','image_1_url','image_1_alt','image_1_cover','image_2_url','image_2_alt','image_2_cover','image_3_url','image_3_alt','image_3_cover'
];
const aliases={'Product Name':'name','Regular Price':'regular_price','Offer Price':'offer_price',page_keys:'placements',dance_styles_json:'dance_styles',class_days_json:'class_days',reminder_channels_json:'reminder_channels',features_json:'features',access_start_date:'class_access_start_date',access_end_date:'class_access_end_date',trial_amount_rupees:'trial_amount',regular_price_rupees:'regular_price',offer_price_rupees:'offer_price'};
const text=value=>String(value??'').trim();
const has=(row,key)=>Object.hasOwn(row,key)&&text(row[key])!=='';
function number(row,key,fallback,{min=0,max=1e12,integer=false}={}){
  if(!has(row,key))return fallback;const value=Number(row[key]);
  if(!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))throw new Error(key+' must be '+(integer?'a whole number':'a number')+' between '+min+' and '+max+'.');
  return value;
}
function boolean(row,key,fallback=0){
  if(!has(row,key))return fallback?1:0;const value=text(row[key]).toLowerCase();
  if(['1','true','yes','on'].includes(value))return 1;
  if(['0','false','no','off'].includes(value))return 0;
  throw new Error(key+' must be 1 or 0 (true or false).');
}
function choice(row,key,values,fallback){
  const value=has(row,key)?text(row[key]).toLowerCase():fallback;
  if(!values.includes(value))throw new Error(key+' must be one of: '+values.join(', ')+'.');return value;
}
function list(value,label){
  if(Array.isArray(value))return value.map(text).filter(Boolean);
  const raw=text(value);if(!raw)return [];
  if(raw.startsWith('[')){let out;try{out=JSON.parse(raw);}catch{throw new Error(label+' contains invalid JSON. Use a JSON array or separate values with |.');}if(!Array.isArray(out))throw new Error(label+' must be a list.');return out.map(text).filter(Boolean);}
  return raw.split(/[|\n]/).map(text).filter(Boolean);
}
function date(value,label){const raw=text(value);if(!raw)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)||!Number.isFinite(Date.parse(raw))||new Date(raw+'T00:00:00Z').toISOString().slice(0,10)!==raw)throw new Error(label+' must be a real date in YYYY-MM-DD format.');return raw;}
export function publicImageURL(value){
  let url;try{url=new URL(text(value));}catch{throw new Error('Image URLs must be valid public HTTPS links.');}
  const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||host==='localhost'||host==='::1'||host==='[::1]'||host.endsWith('.local')||/^127\.|^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host))throw new Error('Image URLs must be public HTTPS links; local/private URLs are not allowed.');
  if(/(^|\.)drive\.google\.com$/i.test(host)){
    const id=url.pathname.match(/\/file\/d\/([^/]+)/i)?.[1]||url.searchParams.get('id');
    if(id)return googleDriveInlineImageUrl(id);
  }
  return url.href;
}
export function normalizePlanImportRow(input={},existing={}){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Each CSV row must be an object.');
  const supplied={};for(const [key,value]of Object.entries(input)){const name=aliases[key]||text(key).toLowerCase();supplied[name]=value;}
  const row={...existing,...supplied};
  const sku=text(row.sku),name=text(row.name),description=text(row.description);
  if(!sku||!name)throw new Error('sku and name are required. Keep sku stable to update an existing plan.');
  if(!description)throw new Error('description is required, just as in Add New Plan / Offer.');
  const payment=choice(row,'payment_type',['subscription','one_time'],'subscription');
  const regular=has(supplied,'regular_price_paise')?number(supplied,'regular_price_paise',0):has(supplied,'regular_price')?Math.round(number(supplied,'regular_price',0)*100):number(existing,'regular_price_paise',0);
  const offer=has(supplied,'offer_price_paise')?number(supplied,'offer_price_paise',0):has(supplied,'offer_price')?Math.round(number(supplied,'offer_price',0)*100):number(existing,'offer_price_paise',0);
  const payload={
    sku,name,description,slug:text(row.slug),short_description:text(row.short_description),payment_type:payment,
    regular_price_paise:regular,offer_price_paise:offer,offer_price_enabled:boolean(row,'offer_price_enabled',offer>0),
    billing_period:choice(row,'billing_period',['monthly','yearly'],'monthly'),billing_interval:number(row,'billing_interval',1,{min:1,max:120,integer:true}),
    trial_enabled:payment==='subscription'?boolean(row,'trial_enabled'):0,
    trial_amount_paise:has(supplied,'trial_amount_paise')?number(supplied,'trial_amount_paise',100):has(supplied,'trial_amount')?Math.round(number(supplied,'trial_amount',1)*100):number(existing,'trial_amount_paise',100),
    trial_value:number(row,'trial_value',7,{min:1,max:10000,integer:true}),trial_unit:choice(row,'trial_unit',['days','weeks','months','years'],'days'),
    status:choice(row,'status',['active','draft','archived'],'active'),badge:text(row.badge),eligibility:text(row.eligibility),features:list(row.features??row.features_json,'features'),
    spot_limit:number(row,'spot_limit',0,{integer:true}),filling_fast_limit:number(row,'filling_fast_limit',0,{integer:true}),low_spot_limit:number(row,'low_spot_limit',0,{integer:true}),sort_order:number(row,'sort_order',0,{integer:true}),
    class_mapping_enabled:boolean(row,'class_mapping_enabled'),class_name:text(row.class_name),class_type:choice(row,'class_type',['online_class','offline_class','demo','webinar','trial'],'online_class'),
    coach_id:number(row,'coach_id',0,{integer:true}),schedule_start_date:date(row.schedule_start_date,'schedule_start_date'),
    hide_start_after_date:boolean(row,'hide_start_after_date'),class_access_start_date:date(row.class_access_start_date,'class_access_start_date'),class_access_end_date:date(row.class_access_end_date,'class_access_end_date'),
    dance_styles:list(row.dance_styles??row.dance_styles_json,'dance_styles'),class_days:list(row.class_days??row.class_days_json,'class_days').map(value=>value.toLowerCase()),
    class_time:text(row.class_time)||'10:00',duration_hours:number(row,'duration_hours',1,{max:12,integer:true}),duration_remainder_minutes:number(row,'duration_minutes',0,{max:59,integer:true}),
    timezone:text(row.timezone)||'Asia/Kolkata',meeting_provider:choice(row,'meeting_provider',['google_meet','zoom','external'],'google_meet'),location_or_link:text(row.location_or_link),
    reminders_enabled:boolean(row,'reminders_enabled'),reminder_minutes_before:number(row,'reminder_minutes_before',15,{min:1,max:525600,integer:true}),reminder_channels:list(row.reminder_channels??row.reminder_channels_json,'reminder_channels')
  };
  payload.days_per_week=number(row,'days_per_week',payload.class_days.length||1,{min:1,max:7,integer:true});
  payload.start_mode=has(row,'start_mode')?choice(row,'start_mode',['purchase_date','fixed_visible','promotional_until_start'],'purchase_date'):payload.schedule_start_date?(payload.hide_start_after_date?'promotional_until_start':'fixed_visible'):'purchase_date';
  if(payment==='one_time'&&!payload.class_mapping_enabled)throw new Error('One-time plans require Class or Event Details and class access start/end dates.');
  if(payload.offer_price_enabled&&offer>regular)throw new Error('offer_price cannot exceed regular_price.');
  if(payload.trial_enabled&&payload.trial_amount_paise<100)throw new Error('trial_amount must be at least 1 rupee.');
  if(payload.features.length>24||payload.features.some(value=>value.length>80))throw new Error('Use at most 24 features, each at most 80 characters.');
  if(payload.spot_limit&&(payload.filling_fast_limit>payload.spot_limit||payload.low_spot_limit>payload.spot_limit))throw new Error('Availability thresholds cannot exceed spot_limit.');
  if(payload.filling_fast_limit&&payload.low_spot_limit>payload.filling_fast_limit)throw new Error('low_spot_limit cannot exceed filling_fast_limit.');
  if(payload.class_mapping_enabled){
    if(!payload.class_name)throw new Error('class_name is required when class details are enabled.');
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.class_time))throw new Error('class_time must use 24-hour HH:MM format.');
    if(payload.class_days.some(day=>!['mon','tue','wed','thu','fri','sat','sun'].includes(day))||new Set(payload.class_days).size!==payload.class_days.length)throw new Error('class_days must contain unique mon|tue|wed|thu|fri|sat|sun values.');
    const minutes=payload.duration_hours*60+payload.duration_remainder_minutes;if(minutes<15||minutes>720)throw new Error('Class duration must be between 15 and 720 minutes.');
    try{new Intl.DateTimeFormat('en',{timeZone:payload.timezone});}catch{throw new Error('timezone must be a valid IANA timezone, for example Asia/Kolkata.');}
    if(payload.reminder_channels.some(channel=>!['email','whatsapp','sms'].includes(channel)))throw new Error('reminder_channels supports email|whatsapp|sms.');
  }
  const placements=text(supplied.placements).split(/[|,]/).map(text).filter(Boolean);
  if(placements.some(page=>!/^[a-zA-Z0-9_/-]{1,120}$/.test(page)))throw new Error('placements must use page keys separated by |.');
  const images=[];for(let index=1;index<=3;index++){
    const url=text(supplied['image_'+index+'_url']);if(!url)continue;
    images.push({image_url:publicImageURL(url),alt_text:text(supplied['image_'+index+'_alt'])||name,is_cover:boolean(supplied,'image_'+index+'_cover',images.length===0)});
  }
  if(new Set(images.map(image=>image.image_url)).size!==images.length)throw new Error('Image URLs must be distinct.');
  if(images.filter(image=>image.is_cover).length>1)throw new Error('Only one imported image can be the cover image.');
  return {payload,placements,images,hasPlacements:Object.hasOwn(supplied,'placements')&&placements.length>0};
}

export function savedPlanImportDefaults(product,mapping={}){
  const parse=(value,fallback=[])=>{try{return JSON.parse(value||'[]');}catch{return fallback;}};
  return {...product,features:parse(product.features_json),class_mapping_enabled:Number(mapping.enabled||0),...Object.fromEntries(['class_name','class_type','coach_id','schedule_start_date','start_mode','class_time','days_per_week','timezone','meeting_provider','location_or_link','reminders_enabled'].map(key=>[key,mapping[key]])),
    class_access_start_date:mapping.access_start_date,class_access_end_date:mapping.access_end_date,
    dance_styles:parse(mapping.dance_styles_json),class_days:parse(mapping.class_days_json),duration_hours:Math.floor(Number(mapping.duration_minutes||60)/60),duration_minutes:Number(mapping.duration_minutes||60)%60,
    reminder_channels:parse(mapping.reminder_plan_json).map(item=>item.channel),reminder_minutes_before:parse(mapping.reminder_plan_json)[0]?.minutesBefore||15
  };
}
