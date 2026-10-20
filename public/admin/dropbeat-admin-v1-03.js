/* DropBeat Dance Studio Admin V1.03
   Presentation/interaction compatibility layer only; existing data and API logic remain authoritative. */
(function(){
  'use strict';
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const $$=(selector,root=document)=>Array.from(root?.querySelectorAll?.(selector)||[]);
  const skip=new Set(['SCRIPT','STYLE','CODE','PRE','TEXTAREA']);

  function danceTipText(value=''){
    return String(value)
      .replace(/Post New (?:Fitness Tip|Fitness Tips)/gi,'Post New Fitness Tip')
      .replace(/Post (?:Fitness Tip|Fitness Tips)/gi,'Post Fitness Tip')
      .replace(/Load (?:Fitness Tips|Fitness Tips Updates)/gi,'Load Fitness Tips')
      .replace(/Add Advertisements to This (?:Fitness Tip|Fitness Tips)/gi,'Add Advertisements to These Fitness Tips')
      .replace(/Existing (?:Fitness Classes|Fitness Tips)/gi,'Existing Fitness Tips')
      .replace(/Fitness Tips/gi,'Fitness Tips')
      .replace(/Fitness Tip/gi,'Fitness Tip')
      .replace(/\bFitness Tips\b/g,'Fitness Tips')
      .replace(/\barticles\b/g,'Fitness Tips')
      .replace(/\bFitness Tips\b/g,'Fitness Tip')
      .replace(/\barticle\b/g,'Fitness Tip');
  }

  function setSidebarLabel(button,label){
    if(!button||button.hasAttribute('data-db157-name'))return;
    const badge=$('.nav-badge',button),arrow=$('.nav-arrow',button);
    const labelNode=[...button.children].find(node=>node!==badge&&node!==arrow&&!node.classList.contains('uc53-group-notification'));
    if(labelNode){if(labelNode.textContent!==label)labelNode.textContent=label;}
    else{
      const textNode=[...button.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);
      if(textNode){if(textNode.nodeValue.trim()!==label)textNode.nodeValue=label;}
      else button.insertBefore(document.createTextNode(label),button.firstChild||null);
    }
  }

  function patchDanceTips(){
    const root=$('#blogs');
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){return node.parentElement&&(skip.has(node.parentElement.tagName)||node.parentElement.closest('[data-db157-name],[data-db159-name],.db156-ui,.db157-ui'))?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){const next=danceTipText(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;}
    $$('[placeholder],[title],[aria-label]',root).forEach(element=>{
      for(const name of ['placeholder','title','aria-label'])if(element.hasAttribute(name)){
        const current=element.getAttribute(name),next=danceTipText(current);if(next!==current)element.setAttribute(name,next);
      }
    });
  }

  function selectOnlyPostTab(button){
    if(!button?.matches?.('#socialPosts .uc48-tabs .pill'))return;
    $$('#socialPosts .uc48-tabs .pill').forEach(tab=>{
      const selected=tab===button;tab.classList.toggle('active',selected);tab.setAttribute('aria-selected',String(selected));
    });
  }

  function syncPostTabs(){
    const tabs=$$('#socialPosts .uc48-tabs .pill');if(!tabs.length)return;
    const pollOpen=!!$('#ucV1648PostsWorkspace .uc76-poll-launcher');
    const activeKey=String(window.UCV1648Posts?.tab||'text');
    tabs.forEach(tab=>{
      const selected=pollOpen?tab.hasAttribute('data-uc76-polls-tab'):tab.dataset.uc48Tab===activeKey;
      tab.classList.toggle('active',selected);tab.setAttribute('aria-selected',String(selected));
    });
  }

  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('#socialPosts .uc48-tabs .pill');
    if(button)requestAnimationFrame(()=>selectOnlyPostTab(button));
  },true);

  let queued=0;
  function patchAll(){patchDanceTips();syncPostTabs();}
  function schedulePatch(){clearTimeout(queued);queued=setTimeout(patchAll,0);}
  function init(){patchAll();new MutationObserver(schedulePatch).observe(document.body,{childList:true,subtree:true,characterData:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
