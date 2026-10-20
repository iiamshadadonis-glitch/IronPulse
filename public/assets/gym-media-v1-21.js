/* DropBeat V1.21 — inline display compatibility for existing Google Drive images. */
(()=>{
  'use strict';
  function driveReference(value=''){
    const raw=String(value||'').trim();if(!raw)return{id:'',resourceKey:''};
    try{
      const url=new URL(raw,location.origin),host=url.hostname.toLowerCase();
      if(host!=='drive.google.com'&&!host.endsWith('.drive.google.com')&&host!=='docs.google.com')return{id:'',resourceKey:''};
      return {id:String(url.pathname.match(/\/(?:file\/d|d)\/([^/]+)/i)?.[1]||url.searchParams.get('id')||'').trim(),resourceKey:String(url.searchParams.get('resourcekey')||url.searchParams.get('resourceKey')||'').trim()};
    }catch(_){return{id:'',resourceKey:''};}
  }
  function inlineUrl(value=''){
    const {id,resourceKey}=driveReference(value);return id?`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w2000${resourceKey?`&resourcekey=${encodeURIComponent(resourceKey)}`:''}`:String(value||'');
  }
  function repair(image){
    if(!(image instanceof HTMLImageElement))return;
    const original=image.getAttribute('src')||'',reference=driveReference(original),id=reference.id;if(!id)return;
    const next=inlineUrl(original);if(next&&next!==original){image.dataset.dbDriveId=id;image.dataset.dbDriveResourceKey=reference.resourceKey;image.src=next;}
    if(image.dataset.dbDriveFallbackBound)return;image.dataset.dbDriveFallbackBound='1';
    image.addEventListener('error',()=>{if(image.dataset.dbDriveFallbackUsed||!image.dataset.dbDriveId)return;image.dataset.dbDriveFallbackUsed='1';image.src=`https://lh3.googleusercontent.com/d/${encodeURIComponent(image.dataset.dbDriveId)}=w2000${image.dataset.dbDriveResourceKey?`?resourcekey=${encodeURIComponent(image.dataset.dbDriveResourceKey)}`:''}`;});
  }
  function scan(root=document){if(root instanceof HTMLImageElement)repair(root);root.querySelectorAll?.('img[src]').forEach(repair);}
  window.dropbeatMediaUrl=inlineUrl;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>scan(),{once:true});else scan();
  new MutationObserver(records=>{for(const record of records){if(record.type==='attributes')repair(record.target);else for(const node of record.addedNodes)if(node.nodeType===1)scan(node);}}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
})();
