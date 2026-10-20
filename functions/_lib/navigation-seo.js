import { getSocialIntegrationSettings, setSetting } from './utils.js';
import { submitSearchConsoleSitemap, submitIndexNowUrls } from './social-publishing.js';
import { brandHomeUrl } from './branded-email.js';

const clean=(v,n=1800)=>String(v??'').trim().slice(0,n);
function absolute(home,value){const v=clean(value);if(!v)return'';try{return new URL(v,`${home}/`).toString();}catch{return'';}}
export async function refreshNavigationSeo(env,{urls=[],reason='navigation changed'}={}){
  const social=await getSocialIntegrationSettings(env),home=brandHomeUrl(env).replace(/\/$/,'');
  const out={reason,mainSitemap:`${home}/sitemap.xml`,searchConsole:null,indexNow:[]};
  if(social.searchConsole?.enabled&&social.searchConsole?.refreshToken){
    try{out.searchConsole=await submitSearchConsoleSitemap(env,{config:{...social.searchConsole,sitemapUrl:`${home}/sitemap.xml`}});}catch(e){out.searchConsole={ok:false,error:clean(e.message,1200)};}
  }
  if(social.indexNow?.enabled&&social.indexNow?.key){
    const unique=[...new Set((urls||[]).map(x=>absolute(home,x)).filter(Boolean))].slice(0,8);
    if(unique.length){try{out.indexNow.push(await submitIndexNowUrls(env,unique));}catch(e){out.indexNow.push({ok:false,urls:unique,error:clean(e.message,1200)});}}
  }
  await setSetting(env,'navigation_seo_last_refresh',{...out,at:new Date().toISOString()}).catch(()=>{});
  return out;
}
export function scheduleNavigationSeoRefresh(ctx,opts={}){
  const job=refreshNavigationSeo(ctx.env,opts).catch(()=>{});
  if(typeof ctx.waitUntil==='function')ctx.waitUntil(job);else job.catch(()=>{});
}
