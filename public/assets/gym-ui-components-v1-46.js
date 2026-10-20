/* Shared presentation primitives. No requests, saved colors or business state. */
(()=>{
  'use strict';
  if(window.DropBeatUI?.version==='1.46')return;
  // Exact path and 1.8 stroke from the original Refund Details disclosure.
  const disclosure=()=>'<svg class="db-disclosure-indicator" data-db-disclosure style="width:20px!important;height:20px!important;min-width:20px!important;max-width:20px!important;min-height:20px!important;max-height:20px!important;stroke-width:1.8!important;fill:none!important;flex:0 0 20px!important;color:var(--dropbeat-primary,var(--primary,var(--db138-primary,#4B55BE)))!important" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m9 5 7 7-7 7" style="stroke-width:1.8!important;fill:none!important"/></svg>';
  const refresh=()=>'<svg class="db145-refresh-icon" data-db-refresh viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7v5h-5"/><path d="M20 12a8 8 0 1 1-2.35-5.65L20 9"/></svg>';
  function legends(root=document){
    root.querySelectorAll?.('.uc88-color,.uc92-legend>span,.uc90-color-swatch').forEach(pill=>{
      pill.classList.add('db-dot-text-capsule');
      const input=pill.querySelector('input[type="color"]'),swatch=pill.querySelector('i');
      const sync=()=>{const color=input?.value||(swatch&&getComputedStyle(swatch).getPropertyValue('--c'))||pill.style.getPropertyValue('--c');if(color)pill.style.setProperty('--db-legend-color',color);};
      sync();
      if(input&&!input.dataset.db142Color){input.dataset.db142Color='1';input.setAttribute('aria-label','Change '+pill.textContent.trim()+' color');input.addEventListener('input',sync);input.addEventListener('change',sync);}
    });
  }
  // Both calendars use this same contract; existing date/scheduling handlers stay live.
  function calendar(root){
    root.classList.add('db-mobile-calendar');
    root.querySelectorAll('.db107-calendar-day:not(.empty),.db116-calendar-day,.uc48-day,.uc88-day').forEach(day=>{
      day.classList.add('db-mobile-calendar-date');
      const selected=day.matches('.selected,.is-selected,[aria-selected="true"]');
      day.setAttribute('aria-selected',String(selected));
    });
  }
  window.DropBeatUI=Object.freeze({version:'1.46',disclosure,refresh,legends,calendar});
  const start=()=>{
    legends();
    let queued=false;
    new MutationObserver(records=>{
      if(queued||!records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1)))return;
      queued=true;requestAnimationFrame(()=>{queued=false;legends();});
    }).observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
