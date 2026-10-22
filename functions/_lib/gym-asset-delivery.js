import manifest from './gym-asset-manifest.js';

export function versionGymAsset(value,requestUrl){
  try{
    const base=new URL(requestUrl),url=new URL(String(value).replaceAll('&amp;','&'),base);
    const fingerprint=manifest.assets[url.pathname];
    if(url.origin!==base.origin||!fingerprint)return value;
    url.searchParams.set('ip',manifest.version+'.'+manifest.build+'.'+fingerprint);
    return url.pathname+url.search+url.hash;
  }catch{return value;}
}

// A module loaded by both a script tag and an import must share one identity.
// Compatibility cache parameters are not semantic module options.
export function versionGymModule(value,requestUrl){
  try{const url=new URL(String(value).replaceAll('&amp;','&'),requestUrl);if(url.origin!==new URL(requestUrl).origin||!manifest.assets[url.pathname])return value;for(const key of ['v','build','gym','dropbeat','IronPulse','ip'])url.searchParams.delete(key);return versionGymAsset(url.pathname+url.search+url.hash,requestUrl);}catch{return value;}
}

export function finalizeGymHtml(html,requestUrl){
  // Cloudflare's /blog route builds a different shell from public/blog.html.
  // Apply the card stylesheet after every inherited/injected stylesheet.
  if(/<body\b[^>]*\bdata-uc-load=["']blog-list["']/i.test(html)){
    html=html.replace(/<link\b[^>]*\bhref=["']\/assets\/gym-fitness-tips-v1-06\.css[^"']*["'][^>]*>/gi,'');
    html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/gym-fitness-tips-v1-06.css"></head>');
  }
  html=html.replace(/<(?:script|link)\b[^>]*>/gi,tag=>tag.replace(/\b(src|href)=(['"])([^'"]+)\2/gi,(match,key,quote,value)=>key+'='+quote+(/\btype=["']module["']/i.test(tag)?versionGymModule(value,requestUrl):versionGymAsset(value,requestUrl)).replaceAll('&','&amp;')+quote));
  // Imports inside unchanged ES modules also receive their current build URL.
  if(manifest.modules.length&&!html.includes('id="ironpulse-asset-imports"')){
    const imports=Object.fromEntries(manifest.modules.map(path=>[path,versionGymModule(path,requestUrl)]));
    const map='<script type="importmap" id="ironpulse-asset-imports">'+JSON.stringify({imports}).replaceAll('<','\\u003c')+'</script>';
    const charset=/<meta\b[^>]*\bcharset=[^>]*>/i;
    html=charset.test(html)?html.replace(charset,match=>match+map):html.replace(/<head\b[^>]*>/i,head=>head+map);
  }
  return html;
}

export function applyGymAssetHeaders(headers,url){
  if(!manifest.assets[url.pathname])return;
  // Dynamic imports/loaders using compatibility URLs must also revalidate.
  headers.set('Cache-Control','no-cache, max-age=0, must-revalidate');
  headers.set('CDN-Cache-Control','no-cache');
  headers.set('Cloudflare-CDN-Cache-Control','no-cache');
  headers.set('X-IronPulse-Asset-Build',manifest.build);
}
