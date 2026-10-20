import { getSocialIntegrationSettings } from './_lib/utils.js';
export async function onRequestGet({env}){
  const s=await getSocialIntegrationSettings(env),key=String(s.indexNow?.key||'').trim();
  if(!key)return new Response('IndexNow key is not configured.',{status:404,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
  return new Response(key,{status:200,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
}
