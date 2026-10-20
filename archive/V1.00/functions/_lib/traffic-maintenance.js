import { sweepRecentPublishedAuditions } from './social-publish-sweep.js';
import { sweepSocialStatusCampaigns } from './social-status-sweep.js';
import { processDueSocialPosts } from './social-posts.js';

// V16.89: ordinary public page traffic remains a fallback trigger for scheduled
// publishing, but an edge-cache lease prevents every page view from repeating
// the three D1 scans. Exact automation/cron endpoints remain unchanged.
const LEASE_SECONDS=15*60;
let localLeaseUntil=0;

function leaseRequest(origin='https://local.invalid'){
  let base='https://local.invalid';
  try{base=new URL(origin).origin;}catch{}
  return new Request(`${base}/__uc-internal/v16-89-traffic-maintenance-lease`,{method:'GET'});
}

async function claimLease(origin){
  const now=Date.now();
  if(now<localLeaseUntil)return false;
  localLeaseUntil=now+LEASE_SECONDS*1000;
  const cache=globalThis.caches?.default;
  if(!cache)return true;
  const key=leaseRequest(origin);
  try{
    if(await cache.match(key))return false;
    await cache.put(key,new Response('scheduled',{headers:{'cache-control':`public, max-age=${LEASE_SECONDS}`}}));
  }catch{}
  return true;
}

export async function runTrafficMaintenance(env,{origin='https://local.invalid'}={}){
  if(!await claimLease(origin))return {ok:true,skipped:true,reason:'Traffic maintenance is already covered by the shared 15-minute lease.'};
  const settled=await Promise.allSettled([
    sweepRecentPublishedAuditions(env,{lookbackMinutes:1440,maxArticles:3}),
    sweepSocialStatusCampaigns(env,{maxCampaigns:3}),
    processDueSocialPosts(env,{limit:2})
  ]);
  return {ok:true,ran:true,results:settled.map(x=>x.status==='fulfilled'?x.value:{ok:false,error:String(x.reason?.message||x.reason||'Maintenance task failed.')})};
}

export const TRAFFIC_MAINTENANCE_LEASE_SECONDS=LEASE_SECONDS;
