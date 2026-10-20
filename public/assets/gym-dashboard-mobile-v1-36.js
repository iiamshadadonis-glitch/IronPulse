/* IronPulse Gym V1.36 — mobile dashboard application layer.
   Presentation only: no API calls, storage writes, form field renaming or
   business-rule changes. Enhancements are finite and event driven so the
   Admin remains responsive even on large workspaces. */
(()=>{
  'use strict';

  const BUILD='dropbeat-1.36-20261013';
  const PHONE=window.matchMedia('(max-width:760px)');
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const $$=(selector,root=document)=>[...(root?.querySelectorAll?.(selector)||[])];
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  let passQueued=false;

  window.__DROPBEAT_DASHBOARD_MOBILE__={build:BUILD,mode:'presentation-only'};
  document.documentElement.dataset.dropbeatDashboardMobile=BUILD;

  function isDashboard(){return Boolean($('#adminApp,.portal-app'));}
  function isHiddenControl(control){return control.type==='hidden'||control.disabled;}
  function editableControls(root){
    return $$('input,select,textarea',root).filter(control=>!isHiddenControl(control));
  }

  function directOwner(node,form){
    let current=node;
    while(current&&current.parentElement!==form)current=current.parentElement;
    return current&&current.parentElement===form?current:null;
  }

  function fieldUnits(form){
    const selector='.field,.portal-field,fieldset,.toggle-row,.db107-toggle,.db108-switch-row,.uc94-enable-row,.uc-social-toggle-capsule,.uc-pay-toggle-capsule,.uc1705-switch-row';
    const candidates=$$(selector,form).filter(node=>{
      if(node.closest('[hidden]'))return false;
      const parent=node.parentElement?.closest(selector);
      return !parent||!form.contains(parent);
    });
    const unique=[];
    for(const node of candidates){
      if(!editableControls(node).length&&!$('button,[role="button"]',node))continue;
      if(!unique.includes(node))unique.push(node);
    }
    if(unique.length>=4)return unique;
    return [...form.children].filter(node=>{
      if(node.matches('input[type="hidden"],script,style,[hidden],.db136-wizard-progress,.db136-wizard-nav'))return false;
      if(node.matches('[data-msg],[role="status"]')||/msg|result/i.test(node.id||''))return false;
      return editableControls(node).length>0;
    });
  }

  function wizardLabel(units,index,total,form){
    const words=clean(units.map(unit=>unit.textContent).join(' ')).toLowerCase();
    const context=clean(`${form.id||''} ${form.className||''}`).toLowerCase();
    if(index===total-1)return 'Review & Save';
    if(/customer|client|student|member|name|email|phone|whatsapp|contact/.test(words))return /coach/.test(context+words)?'Coach Details':'Customer Details';
    if(/subscription|billing|payment|amount|price|rate|remuneration|coupon|invoice/.test(words))return 'Subscription & Billing';
    if(/class|session|schedule|availability|dance|coach|event|date|time|duration/.test(words))return 'Class & Schedule';
    if(/image|photo|media|banner|logo|thumbnail/.test(words))return 'Media & Display';
    if(/message|description|notes|terms|status|setting|notification/.test(words))return 'Options & Notes';
    return ['Details','Configuration','Schedule','Options','Review'][Math.min(index,4)];
  }

  function partition(units,form){
    const fieldCount=units.reduce((sum,unit)=>sum+Math.max(1,editableControls(unit).length),0);
    const desired=Math.max(2,Math.min(5,Math.ceil(fieldCount/4)));
    const target=Math.max(1,Math.ceil(fieldCount/desired));
    const steps=[];
    let current=[],weight=0;
    units.forEach((unit,index)=>{
      const unitWeight=Math.max(1,editableControls(unit).length);
      const remaining=units.length-index;
      const stepsLeft=desired-steps.length;
      if(current.length&&weight>=target&&remaining>=stepsLeft){steps.push(current);current=[];weight=0;}
      current.push(unit);weight+=unitWeight;
    });
    if(current.length)steps.push(current);
    while(steps.length>5){const tail=steps.pop();steps[steps.length-1].push(...tail);}
    return steps.map((items,index)=>({items,label:wizardLabel(items,index,steps.length,form)}));
  }

  function validateStep(form,index){
    const invalid=$$(`.db136-step-unit[data-db136-step="${index}"] input,.db136-step-unit[data-db136-step="${index}"] select,.db136-step-unit[data-db136-step="${index}"] textarea`,form)
      .find(control=>!isHiddenControl(control)&&typeof control.checkValidity==='function'&&!control.checkValidity());
    if(!invalid)return true;
    invalid.reportValidity?.();
    invalid.focus?.({preventScroll:true});
    invalid.scrollIntoView?.({behavior:'smooth',block:'center'});
    return false;
  }

  function syncWizard(form,nextIndex){
    const steps=Number(form.dataset.db136Steps||0);
    if(!steps)return;
    const current=Math.max(0,Math.min(steps-1,Number(nextIndex||0)));
    form.dataset.db136Current=String(current);
    $$('.db136-step-unit',form).forEach(unit=>unit.classList.toggle('db136-step-active',Number(unit.dataset.db136Step)===current));
    $$('.row,.portal-row,.uc-form-grid,.db119-form-grid',form).forEach(row=>{
      const units=$$('.db136-step-unit',row);
      row.classList.toggle('db136-step-container-hidden',Boolean(units.length&&!units.some(unit=>unit.classList.contains('db136-step-active'))));
    });
    $$('.db136-wizard-step',form).forEach((button,index)=>{
      const complete=index<current;
      button.classList.toggle('complete',complete);
      button.classList.toggle('active',index===current);
      button.disabled=index>current;
      button.setAttribute('aria-current',index===current?'step':'false');
      const circle=$('.db136-wizard-number',button);
      if(circle)circle.textContent=complete?'✓':String(index+1);
    });
    const back=$('[data-db136-back]',form),next=$('[data-db136-next]',form),counter=$('[data-db136-counter]',form);
    if(back)back.hidden=current===0;
    if(next)next.hidden=current===steps-1;
    if(counter)counter.textContent=`Step ${current+1} of ${steps}`;
    form.classList.toggle('db136-wizard-final',current===steps-1);
  }

  function enhanceForm(form){
    if(!PHONE.matches||form.dataset.db136NoWizard==='1')return;
    if(form.matches('#loginForm,[role="search"],.search-form,.filter-form,[class*="filter"]'))return;
    const controls=editableControls(form);
    const submit=$('button[type="submit"],input[type="submit"],button:not([type])',form);
    if(controls.length<5||!submit)return;
    if(form.dataset.db136Wizard==='1'&&$('.db136-wizard-progress',form)){syncWizard(form,Number(form.dataset.db136Current||0));return;}

    const units=fieldUnits(form);
    if(units.length<2)return;
    const actionOwner=directOwner(submit,form)||submit.closest('.form-actions')||submit;
    const contentUnits=units.filter(unit=>unit!==actionOwner&&!unit.contains(actionOwner));
    if(contentUnits.length<2)return;
    const steps=partition(contentUnits,form);
    if(steps.length<2)return;

    steps.forEach((step,index)=>step.items.forEach(unit=>{
      unit.classList.add('db136-step-unit');
      unit.dataset.db136Step=String(index);
    }));
    const actionUnit=directOwner(actionOwner,form)||actionOwner;
    actionUnit.classList.add('db136-step-unit','db136-submit-unit');
    actionUnit.dataset.db136Step=String(steps.length-1);

    const progress=document.createElement('div');
    progress.className='db136-wizard-progress';
    progress.setAttribute('aria-label','Form progress');
    progress.innerHTML=steps.map((step,index)=>`<button class="db136-wizard-step" type="button" data-db136-jump="${index}"><span class="db136-wizard-number">${index+1}</span><span>${step.label}</span></button>`).join('');
    const navigation=document.createElement('div');
    navigation.className='db136-wizard-nav';
    navigation.innerHTML='<button class="db136-wizard-back" type="button" data-db136-back>Back</button><span data-db136-counter></span><button class="db136-wizard-next" type="button" data-db136-next>Continue</button>';
    form.prepend(progress);
    form.append(navigation);
    form.dataset.db136Wizard='1';
    form.dataset.db136Steps=String(steps.length);

    $('[data-db136-back]',navigation).addEventListener('click',()=>syncWizard(form,Number(form.dataset.db136Current)-1));
    $('[data-db136-next]',navigation).addEventListener('click',()=>{
      const current=Number(form.dataset.db136Current||0);
      if(validateStep(form,current))syncWizard(form,current+1);
    });
    $$('.db136-wizard-step',progress).forEach(button=>button.addEventListener('click',()=>{
      const target=Number(button.dataset.db136Jump||0),current=Number(form.dataset.db136Current||0);
      if(target<=current)syncWizard(form,target);
    }));
    form.addEventListener('invalid',event=>{
      const unit=event.target.closest('.db136-step-unit');
      if(unit)syncWizard(form,Number(unit.dataset.db136Step||0));
    },true);
    form.addEventListener('reset',()=>setTimeout(()=>syncWizard(form,0),0));
    syncWizard(form,0);
  }

  function enhanceTable(table){
    if(table.dataset.db136Cards==='1'&&!table.tHead)return;
    const headerRow=table.tHead?.rows?.[table.tHead.rows.length-1]||$$('tr',table).find(row=>$('th',row));
    const labels=headerRow?[...headerRow.cells].map(cell=>clean(cell.textContent)||'Details'):[];
    table.classList.add('db136-card-table');
    table.dataset.db136Cards='1';
    $$('tbody tr',table).forEach(row=>{
      row.classList.add('db136-card-row');
      [...row.cells].forEach((cell,index)=>cell.dataset.db136Label=labels[index]||cell.dataset.label||'Details');
    });
  }

  function structuralHeaders(root){
    return $$('[class~="head"],[class*="-grid-head"],[class*="-list-head"],[class*="-table-head"]',root).filter(header=>{
      if(header.children.length<2||header.closest('[class*="calendar"]'))return false;
      const names=[...header.classList];
      return names.includes('head')||names.some(name=>/(?:grid|list|table)-head$/.test(name));
    });
  }

  function enhanceDivGrid(header){
    const parent=header.parentElement;if(!parent)return;
    const labels=[...header.children].map(cell=>clean(cell.textContent)||'Details');
    const names=[...header.classList];
    const shared=names.filter(name=>!/(^|-)head$/.test(name)&&/(grid|row|list)/.test(name)&&!/calendar/.test(name));
    const prefixes=names.filter(name=>/(?:grid|list|table)-head$/.test(name)).map(name=>name.replace(/-head$/,''));
    const rows=[...parent.children].filter(row=>{
      if(row===header||row.children.length===0)return false;
      const rowNames=[...row.classList];
      return shared.some(name=>row.classList.contains(name))||prefixes.some(prefix=>rowNames.some(name=>name.startsWith(prefix)&&/(row|grid|list)/.test(name)));
    });
    if(!rows.length)return;
    header.classList.add('db136-stacked-head');
    rows.forEach(row=>{
      row.classList.add('db136-stacked-row');
      [...row.children].forEach((cell,index)=>{
        cell.classList.add('db136-stacked-cell');
        cell.dataset.db136Label=labels[index]||'Details';
      });
    });
  }

  function carouselItems(container){return [...container.children].filter(child=>!child.classList.contains('db136-carousel-dots'));}
  function syncCarouselDots(container,dots){
    const items=carouselItems(container);if(!items.length)return;
    let closest=0,distance=Infinity;
    items.forEach((item,index)=>{const value=Math.abs(item.offsetLeft-container.scrollLeft-container.clientWidth*.08);if(value<distance){distance=value;closest=index;}});
    $$('button',dots).forEach((button,index)=>{
      button.classList.toggle('active',index===closest);
      button.setAttribute('aria-current',index===closest?'true':'false');
    });
  }

  function enhanceCarousel(container){
    if(!PHONE.matches)return;
    const items=carouselItems(container);if(items.length<2)return;
    container.classList.add('db136-card-carousel');
    items.forEach(item=>item.classList.add('db136-carousel-item'));
    let dots=container.nextElementSibling;
    if(!dots?.classList.contains('db136-carousel-dots')){
      dots=document.createElement('div');dots.className='db136-carousel-dots';dots.setAttribute('aria-label','Card pages');container.after(dots);
    }
    if(Number(dots.dataset.count||0)!==items.length){
      dots.replaceChildren(...items.map((item,index)=>{
        const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Show card ${index+1}`);
        button.addEventListener('click',()=>item.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}));return button;
      }));
      dots.dataset.count=String(items.length);
    }
    if(container.dataset.db136Carousel!=='1'){
      let frame=0;
      container.addEventListener('scroll',()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;syncCarouselDots(container,dots);});},{passive:true});
      container.dataset.db136Carousel='1';
    }
    syncCarouselDots(container,dots);
  }

  function wrapPortalMetrics(root){
    $$('.portal-grid',root).forEach(grid=>{
      const cards=[...grid.children].filter(card=>card.matches('.portal-card.third')&&$('.metric',card));
      if(cards.length<2)return;
      let strip=[...grid.children].find(child=>child.classList.contains('db136-metric-carousel'));
      if(!strip){strip=document.createElement('div');strip.className='db136-metric-carousel';grid.insertBefore(strip,cards[0]);cards.forEach(card=>strip.appendChild(card));}
      enhanceCarousel(strip);
    });
  }

  function classifyModal(modal){
    modal.classList.add('db136-mobile-sheet');
    const form=$('form',modal),tables=$$('table,[class*="-grid"]',modal).length,controls=editableControls(modal).length;
    const compact=!tables&&controls<=2&&(!form||editableControls(form).length<=2);
    modal.classList.toggle('db136-bottom-sheet',compact);
    modal.classList.toggle('db136-page-sheet',!compact);
    modal.setAttribute('data-db136-sheet',compact?'bottom':'page');
  }

  function renderPostAgenda(day){
    const shell=day.closest('.uc48-calendar-shell');if(!shell)return;
    let agenda=shell.nextElementSibling;
    if(!agenda?.classList.contains('db136-calendar-agenda')){agenda=document.createElement('section');agenda.className='db136-calendar-agenda db136-agenda';agenda.setAttribute('aria-live','polite');shell.after(agenda);}
    const posts=$$('.uc48-calendar-post',day);
    const number=clean($('.uc48-day-num',day)?.textContent);
    agenda.innerHTML=`<header><strong>Schedule for day ${number}</strong><small>${posts.length} scheduled item${posts.length===1?'':'s'}</small></header>`;
    const list=document.createElement('div');list.className='db136-agenda-list';
    if(posts.length)posts.forEach(post=>{const clone=post.cloneNode(true);clone.classList.add('db136-agenda-card');list.appendChild(clone);});
    else list.innerHTML='<div class="db136-agenda-empty">No scheduled items for this date.</div>';
    agenda.appendChild(list);
    agenda.scrollIntoView?.({behavior:'smooth',block:'nearest'});
  }

  function enhanceCalendar(calendar){
    calendar.classList.add('db136-compact-calendar');
    const days=$$('.db107-calendar-day:not(.empty),.db116-calendar-day,.uc48-day,.uc88-day',calendar);
    days.forEach(day=>{
      day.classList.add('db136-calendar-day');
      const hasEvent=day.matches('.has-session,.has-sessions,.has-marker,.holiday')||Boolean($('.uc48-calendar-post,.uc88-tag',day));
      const holiday=day.matches('.holiday,.studio-holiday')||/holiday/i.test(day.textContent||'');
      day.classList.toggle('db136-has-event',hasEvent);
      day.classList.toggle('db136-holiday',holiday);
      if(!day.getAttribute('aria-label'))day.setAttribute('aria-label',clean(day.textContent));
      if(day.matches('.uc48-day')&&day.dataset.db136Agenda!=='1'){
        day.dataset.db136Agenda='1';day.setAttribute('role','button');day.tabIndex=0;
        day.addEventListener('click',event=>{if(event.target.closest('.uc48-calendar-post'))return;renderPostAgenda(day);});
        day.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();renderPostAgenda(day);}});
      }
    });
    $$('.db107-day-summary,.db119-selected-card,[data-uc88-day-summary]',calendar.parentElement||document).forEach(agenda=>agenda.classList.add('db136-agenda'));
  }

  function surfaceRoots(){
    const roots=[];
    const active=$('#adminApp .panel.active')||$('#adminApp .panel:not([hidden])');if(active)roots.push(active);
    const portal=$('.portal-view:not([hidden])');if(portal)roots.push(portal);
    $$('.modal.open,.db114-modal:not([hidden]),.portal-v122-modal:not([hidden]),.portal-v122-forced-modal:not([hidden]),.uc1705-modal').forEach(modal=>roots.push(modal));
    return [...new Set(roots)];
  }

  function enhance(root=document){
    if(!PHONE.matches||!isDashboard())return;
    $$('table',root).forEach(enhanceTable);
    structuralHeaders(root).forEach(enhanceDivGrid);
    $$('form',root).forEach(enhanceForm);
    $$('.dashboard-cards,.portal-metrics,.attendance-summary-grid,.uc95-metric-grid,.uc92-kpis,.db116-attendance-metrics',root).forEach(enhanceCarousel);
    wrapPortalMetrics(root);
    const modalSelector='.modal.open,.db114-modal:not([hidden]),.portal-v122-modal:not([hidden]),.portal-v122-forced-modal:not([hidden]),.uc1705-modal';
    const modals=$$(modalSelector,root);
    if(root!==document&&root.matches?.(modalSelector))modals.unshift(root);
    [...new Set(modals)].forEach(classifyModal);
    $$('.db107-calendar,.db119-calendar-card,.uc48-calendar-shell,.uc88-analytics-card',root).forEach(enhanceCalendar);
  }

  function runPass(){surfaceRoots().forEach(enhance);}
  function queuePasses(){
    if(!PHONE.matches||passQueued)return;
    passQueued=true;
    runPass();
    [80,360,1200,2600].forEach((delay,index)=>setTimeout(()=>{runPass();if(index===3)passQueued=false;},delay));
  }

  function install(){
    if(!isDashboard())return;
    enhance(document);
    document.addEventListener('click',event=>{if(event.target.closest('button,a,summary,[role="button"]'))queuePasses();},true);
    document.addEventListener('submit',queuePasses,true);
    document.addEventListener('change',event=>{if(event.target.matches('select,input[type="checkbox"],input[type="radio"]'))queuePasses();},true);
    for(const name of ['dropbeat:portal-model','uc-products-rendered','uc:webinar-members-loaded','dropbeat:admin-ready'])window.addEventListener(name,queuePasses);
    window.addEventListener('popstate',queuePasses);
    PHONE.addEventListener?.('change',event=>{if(event.matches){enhance(document);queuePasses();}});
    document.dispatchEvent(new CustomEvent('dropbeat:dashboard-mobile-ready',{detail:{build:BUILD}}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
