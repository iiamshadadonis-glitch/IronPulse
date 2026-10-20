/* V16.41 — shared admin JSON request helper hotfix.
   Additive only: exposes window.apiJson for late-loaded social integration add-ons
   while preserving the existing window.api transport whenever it is available. */
(function(){
  'use strict';
  if(typeof window.apiJson==='function')return;
  window.apiJson=async function(path,options={}){
    if(typeof window.api==='function')return window.api(path,options);
    const isFormData=typeof FormData!=='undefined'&&options.body instanceof FormData;
    const headers={...(isFormData?{}:{'content-type':'application/json'}),...(options.headers||{})};
    const response=await fetch(path,{credentials:'same-origin',...options,headers});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||(data&&data.ok===false&&data.error))throw new Error(data?.error||`Request failed with HTTP ${response.status}.`);
    return data;
  };
})();
