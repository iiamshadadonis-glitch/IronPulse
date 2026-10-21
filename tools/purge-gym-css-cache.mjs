import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import manifest from '../functions/_lib/gym-asset-manifest.js';
import {versionGymAsset} from '../functions/_lib/gym-asset-delivery.js';

export async function purgeGymCssCache({origin,zoneId='',token='',fetchImpl=fetch}){
  const base=new URL(origin);
  if(base.protocol!=='https:'||base.username||base.password)throw Error('Use your deployed HTTPS website origin.');
  // pages.dev belongs to Cloudflare, not a zone owned by the project user.
  if(base.hostname==='pages.dev'||base.hostname.endsWith('.pages.dev'))return {status:'pages-deployment-cache',requests:0,message:'Pages deployment refreshes its managed asset cache. Build-hashed asset URLs bypass previous browser/CDN URLs; a customer zone purge is not available for pages.dev.'};
  if(!/^[a-f0-9]{32}$/i.test(zoneId)||!token)throw Error('For your custom domain, set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN with Cache Purge permission, then run this command after deployment.');
  const urls=[...new Set(Object.keys(manifest.assets).filter(path=>path.endsWith('.css')).flatMap(path=>[new URL(path,base.origin).href,new URL(versionGymAsset(path,base.origin),base.origin).href]))];
  let requests=0;
  for(let index=0;index<urls.length;index+=25){
    const response=await fetchImpl('https://api.cloudflare.com/client/v4/zones/'+zoneId+'/purge_cache',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({files:urls.slice(index,index+25)}),signal:AbortSignal.timeout(20000)});
    let data;try{data=await response.json();}catch{throw Error('Cloudflare cache purge returned an invalid response (HTTP '+response.status+').');}
    if(!response.ok||data.success!==true)throw Error('Cloudflare did not accept the CSS purge (HTTP '+response.status+'). Check zone ownership and Cache Purge token permission.');
    requests++;
  }
  return {status:'accepted',requests,urls:urls.length,message:'Cloudflare accepted the CSS URL purge requests for '+base.hostname+'.'};
}
export function gymPurgeOptions(){
  const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
  return {origin:process.env.GYM_CACHE_PURGE_ORIGIN||config.vars.PUBLIC_SITE_URL||config.vars.SITE_URL,zoneId:process.env.CLOUDFLARE_ZONE_ID||'',token:process.env.CLOUDFLARE_API_TOKEN||''};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const result=await purgeGymCssCache(gymPurgeOptions());console.log(result.message);}catch(error){console.error(error.message);process.exitCode=1;}
}
