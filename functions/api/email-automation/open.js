import { trackEmailAutomationOpen } from '../../_lib/email-automations.js';

const GIF=Uint8Array.from([71,73,70,56,57,97,1,0,1,0,128,0,0,255,255,255,0,0,0,33,249,4,1,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59]);
export async function onRequestGet({request,env,context}){
  const token=new URL(request.url).searchParams.get('token')||'';
  if(token)try{context?.waitUntil?.(trackEmailAutomationOpen(env,token));}catch{}
  return new Response(GIF,{headers:{'content-type':'image/gif','cache-control':'no-store, private','content-length':String(GIF.length)}});
}
