/* V16.25 small additive UI assurances for Product Images + Plan Description. */
(()=>{'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  function ensurePlanDescriptionState(){const f=$('#productForm'),d=f?.querySelector('[name="description"]'),id=$('#productId')?.value||'';if(!d)return;const isNew=!id;d.required=isNew;if(isNew)d.setAttribute('aria-required','true');else d.removeAttribute('aria-required');const l=d.closest('.field')?.querySelector(':scope > label');if(l)l.textContent=isNew?'Plan Description *':'Plan Description';}
  function mediaIcons(){const info=$('#ucV1624MediaInfo'),back=$('#ucV1624MediaBack');if(info)info.classList.add('uc-info-btn');if(back)back.classList.add('uc-info-back-btn');}
  const oldNew=window.newProduct;if(typeof oldNew==='function'&&!oldNew.__v1625){const w=function(){const r=oldNew.apply(this,arguments);setTimeout(ensurePlanDescriptionState,0);return r;};w.__v1625=true;window.newProduct=w;}
  const oldEdit=window.editProduct;if(typeof oldEdit==='function'&&!oldEdit.__v1625){const w=function(){const r=oldEdit.apply(this,arguments);setTimeout(ensurePlanDescriptionState,0);return r;};w.__v1625=true;window.editProduct=w;}
  function init(){mediaIcons();ensurePlanDescriptionState();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,900));else setTimeout(init,900);
})();
