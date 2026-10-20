import { getPublicProducts } from './_lib/public-data.js';
import { preferredPublicOrigin } from './_lib/utils.js';

const clean=(value,max=500)=>String(value??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const esc=(value='')=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsonLd=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');

function absolute(base,value){try{return new URL(value||'/assets/icon-512.png',base).href;}catch{return `${base}/assets/icon-512.png`;}}
function replaceHead(html,pattern,tag){return pattern.test(html)?html.replace(pattern,tag):html.replace(/<\/head>/i,`${tag}</head>`);}
function setMeta(html,key,value,{property=false}={}){
  const attr=property?'property':'name',pattern=new RegExp(`<meta\\s+[^>]*${attr}=["']${key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["'][^>]*>`,`i`);
  return replaceHead(html,pattern,`<meta ${attr}="${esc(key)}" content="${esc(value)}">`);
}

async function staticShell(request,env){
  if(!env?.ASSETS?.fetch)throw new Error('Static asset binding is unavailable.');
  const assetUrl=new URL('/offer-details.html',request.url);
  return env.ASSETS.fetch(new Request(assetUrl,{headers:request.headers}));
}

export async function onRequestGet({request,env}){
  const asset=await staticShell(request,env);
  let html=await asset.text();
  const url=new URL(request.url),slug=clean(url.searchParams.get('plan'),180);
  if(!slug)return new Response(html,{status:asset.status,headers:asset.headers});

  let product=null;
  try{product=(await getPublicProducts(env)).find(item=>String(item.slug)===slug)||null;}catch(_){return new Response(html,{status:asset.status,headers:asset.headers});}
  if(!product){
    html=setMeta(html,'robots','noindex,follow');
    html=html.replace(/<div id="offerDetail" class="container">[\s\S]*?<\/div><\/section>/i,'<div id="offerDetail" class="container"><div class="notice"><strong>Plan not found.</strong><br><a href="/offers">View available dance memberships</a></div></div></section>');
    return new Response(html,{status:404,headers:{...Object.fromEntries(asset.headers),'content-type':'text/html; charset=utf-8'}});
  }

  const base=String(preferredPublicOrigin(request,env)||url.origin).replace(/\/$/,''),canonical=`${base}/offer-details?plan=${encodeURIComponent(product.slug)}`;
  const title=`${clean(product.name,90)} | DropBeat Dance Studio`;
  const description=clean(product.short_description||product.description||`View class details and membership information for ${product.name}.`,160);
  const image=absolute(base,product.images?.find(item=>Number(item.is_cover||0)===1)?.public_url||product.images?.[0]?.public_url||'/assets/icon-512.png');
  const mapping=product.class_mapping||{},coach=mapping.coach||null,styles=Array.isArray(mapping.dance_styles)?mapping.dance_styles:[];
  const price=Number(product.offer_price_paise??product.regular_price_paise??0)/100;
  const structured={
    '@context':'https://schema.org',
    '@graph':[
      {'@type':'DanceSchool','@id':`${base}/#dance-studio`,name:'DropBeat Dance Studio',url:`${base}/`,logo:{'@type':'ImageObject',url:`${base}/assets/icon-512.png`}},
      {'@type':'Course','@id':`${canonical}#course`,name:clean(product.name,120),description,image,provider:{'@id':`${base}/#dance-studio`},educationalLevel:clean(product.eligibility,160)||undefined,teaches:styles.length?styles:undefined,instructor:coach?{'@type':'Person',name:clean(coach.name,120),url:`${base}/about#coach-${encodeURIComponent(coach.slug||coach.id||'')}`} : undefined,offers:{'@type':'Offer',url:canonical,price:Number.isFinite(price)?price.toFixed(2):undefined,priceCurrency:clean(product.currency,8)||'INR',availability:'https://schema.org/InStock'},hasCourseInstance:mapping.enabled?{'@type':'CourseInstance',courseMode:clean(mapping.class_type,50).replace(/_/g,' '),startDate:mapping.schedule_start_date||undefined,location:mapping.location_or_link?{'@type':mapping.class_type==='offline_class'?'Place':'VirtualLocation',name:clean(mapping.location_or_link,200)}:undefined}:undefined},
      {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:`${base}/`},{'@type':'ListItem',position:2,name:'Offers',item:`${base}/offers`},{'@type':'ListItem',position:3,name:clean(product.name,120),item:canonical}]}
    ]
  };

  html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${esc(title)}</title>`);
  html=setMeta(html,'description',description);
  html=setMeta(html,'robots','index,follow,max-image-preview:large');
  html=replaceHead(html,/<link\s+[^>]*rel=["']canonical["'][^>]*>/i,`<link rel="canonical" href="${esc(canonical)}">`);
  for(const [key,value] of Object.entries({'og:type':'website','og:site_name':'DropBeat Dance Studio','og:title':title,'og:description':description,'og:url':canonical,'og:image':image,'og:image:alt':title}))html=setMeta(html,key,value,{property:true});
  for(const [key,value] of Object.entries({'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':image}))html=setMeta(html,key,value);
  html=replaceHead(html,/<script[^>]+id=["']db107-static-schema["'][^>]*>[\s\S]*?<\/script>/i,`<script id="db107-static-schema" type="application/ld+json">${jsonLd(structured)}</script>`);
  return new Response(html,{status:200,headers:{...Object.fromEntries(asset.headers),'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, stale-while-revalidate=300'}});
}
