/* IronPulse Gym V1.37 — native mobile dashboard interaction layer.
   This file changes presentation and navigation only. Existing form controls,
   click handlers, validation, API calls and saved data remain authoritative. */
(()=>{
  'use strict';

  const BUILD='dropbeat-1.37-20261013';
  const PHONE=window.matchMedia('(max-width:760px)');
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const $$=(selector,root=document)=>[...(root?.querySelectorAll?.(selector)||[])];
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  const titleCase=value=>clean(value).replace(/(^|\s)\S/g,char=>char.toUpperCase());
  let passQueued=false;

  window.__DROPBEAT_DASHBOARD_MOBILE_V137__={build:BUILD,mode:'presentation-only'};
  document.documentElement.dataset.dropbeatDashboardMobileV137=BUILD;

  function isDashboard(){return Boolean($('#adminApp,.portal-app'));}
  function directButtons(root){return [...(root?.children||[])].filter(node=>node.matches?.('button,a,[role="button"]'));}
  function visibleControls(root){return $$('input,select,textarea',root).filter(control=>control.type!=='hidden'&&!control.disabled);}

  /* ---------- Reusable compact bottom sheet ---------- */
  function choiceSheet(){
    let sheet=$('#db137ChoiceSheet');
    if(sheet)return sheet;
    sheet=document.createElement('div');
    sheet.id='db137ChoiceSheet';
    sheet.className='db137-choice-sheet';
    sheet.hidden=true;
    sheet.innerHTML='<button class="db137-sheet-scrim" type="button" data-db137-sheet-close aria-label="Close options"></button><section class="db137-choice-card" role="dialog" aria-modal="true" aria-labelledby="db137ChoiceTitle"><div class="db137-sheet-handle" aria-hidden="true"></div><header><h2 id="db137ChoiceTitle">Choose an option</h2><button type="button" class="db137-sheet-close" data-db137-sheet-close aria-label="Close">×</button></header><div class="db137-choice-content"></div><footer class="db137-choice-footer" hidden><button type="button" class="db137-sheet-done" data-db137-sheet-done>Done</button></footer></section>';
    document.body.appendChild(sheet);
    $$('[data-db137-sheet-close]',sheet).forEach(button=>button.addEventListener('click',closeChoiceSheet));
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!sheet.hidden)closeChoiceSheet();});
    return sheet;
  }

  function closeChoiceSheet(){
    const sheet=$('#db137ChoiceSheet');if(!sheet)return;
    sheet.hidden=true;document.body.classList.remove('db137-sheet-open');
    const trigger=sheet.__trigger;sheet.__trigger=null;trigger?.focus?.({preventScroll:true});
  }

  function openChoiceSheet({title='Choose an option',trigger,render,done=false}){
    const sheet=choiceSheet(),content=$('.db137-choice-content',sheet),footer=$('.db137-choice-footer',sheet);
    $('#db137ChoiceTitle',sheet).textContent=title;
    content.replaceChildren();
    render(content,sheet);
    footer.hidden=!done;
    const doneButton=$('[data-db137-sheet-done]',sheet);
    doneButton.onclick=closeChoiceSheet;
    sheet.__trigger=trigger||document.activeElement;
    sheet.hidden=false;document.body.classList.add('db137-sheet-open');
    requestAnimationFrame(()=>$('.db137-choice-option,.db137-sheet-input',content)?.focus?.({preventScroll:true}));
  }

  function openActionSheet(title,items,trigger){
    const usable=items.filter(item=>item?.source&&!item.source.disabled);
    openChoiceSheet({title,trigger,render(content){
      usable.forEach(item=>{
        const button=document.createElement('button');
        button.type='button';button.className='db137-choice-option';
        button.textContent=item.label||clean(item.source.textContent)||'Open';
        if(item.source.classList.contains('active'))button.classList.add('selected');
        button.addEventListener('click',()=>{closeChoiceSheet();item.source.click();queuePasses();});
        content.appendChild(button);
      });
    }});
  }

  function openTextSheet(title,text,trigger){
    openChoiceSheet({title,trigger,render(content){
      const copy=document.createElement('p');copy.className='db137-choice-copy';copy.textContent=text;content.appendChild(copy);
    },done:true});
  }

  /* ---------- Native mobile selectors; original controls stay authoritative ---------- */
  function controlLabel(control){
    const field=control.closest('.field,.portal-field,fieldset');
    return clean($('label,legend',field)?.textContent||control.getAttribute('aria-label')||control.name||'Choose an option');
  }

  function syncSelectTrigger(select){
    const trigger=select.nextElementSibling?.matches('.db137-select-trigger')?select.nextElementSibling:null;if(!trigger)return;
    const selected=[...select.selectedOptions].map(option=>clean(option.textContent)).filter(Boolean);
    trigger.textContent=selected.join(', ')||select.getAttribute('placeholder')||`Choose ${controlLabel(select)}`;
    trigger.classList.toggle('db137-placeholder',!selected.length);
  }

  function openSelectSheet(select,trigger){
    const multiple=Boolean(select.multiple);
    const render=(content)=>{
      content.replaceChildren();
      [...select.options].forEach(option=>{
        const button=document.createElement('button');button.type='button';button.className='db137-choice-option';button.textContent=clean(option.textContent);
        button.disabled=option.disabled;button.classList.toggle('selected',option.selected);
        button.addEventListener('click',()=>{
          if(multiple)option.selected=!option.selected;
          else{select.value=option.value;[...select.options].forEach(item=>item.selected=item===option);}
          select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));
          syncSelectTrigger(select);
          if(multiple){render(content);return;}
          closeChoiceSheet();queuePasses();
        });
        content.appendChild(button);
      });
    };
    openChoiceSheet({title:controlLabel(select),trigger,render,done:multiple});
  }

  function enhanceSelect(select){
    if(select.dataset.db137Select==='1'||select.closest('#db137ChoiceSheet')||select.disabled||select.size>1)return;
    select.dataset.db137Select='1';select.classList.add('db137-native-control');
    const trigger=document.createElement('button');trigger.type='button';trigger.className='db137-select-trigger';
    trigger.setAttribute('aria-label',controlLabel(select));trigger.addEventListener('click',()=>openSelectSheet(select,trigger));
    select.after(trigger);select.addEventListener('change',()=>syncSelectTrigger(select));syncSelectTrigger(select);
  }

  function displayTemporal(input){
    if(!input.value)return input.placeholder||`Choose ${controlLabel(input)}`;
    if(input.type==='time')return input.value;
    const date=new Date(input.type==='date'?`${input.value}T00:00:00`:input.value);
    return Number.isNaN(date.getTime())?input.value:date.toLocaleString('en-IN',input.type==='date'?{dateStyle:'medium'}:{dateStyle:'medium',timeStyle:'short'});
  }

  function syncTemporalTrigger(input){
    const trigger=input.nextElementSibling?.matches('.db137-select-trigger')?input.nextElementSibling:null;if(!trigger)return;
    trigger.textContent=displayTemporal(input);trigger.classList.toggle('db137-placeholder',!input.value);
  }

  function enhanceTemporal(input){
    if(input.dataset.db137Temporal==='1'||input.closest('#db137ChoiceSheet')||input.disabled||input.readOnly)return;
    input.dataset.db137Temporal='1';input.classList.add('db137-native-control');
    const trigger=document.createElement('button');trigger.type='button';trigger.className='db137-select-trigger db137-temporal-trigger';
    trigger.addEventListener('click',()=>openChoiceSheet({title:controlLabel(input),trigger,render(content){
      const picker=document.createElement('input');picker.type=input.type;picker.className='db137-sheet-input';picker.value=input.value||'';
      if(input.min)picker.min=input.min;if(input.max)picker.max=input.max;if(input.step)picker.step=input.step;
      content.appendChild(picker);
      const apply=document.createElement('button');apply.type='button';apply.className='db137-sheet-apply';apply.textContent='Apply';
      apply.addEventListener('click',()=>{input.value=picker.value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));syncTemporalTrigger(input);closeChoiceSheet();queuePasses();});
      content.appendChild(apply);
    }}));
    input.after(trigger);input.addEventListener('change',()=>syncTemporalTrigger(input));syncTemporalTrigger(input);
  }

  function choiceGridButtons(grid){return $$(':scope > button,[role="button"]',grid).filter(button=>!button.matches('.db137-choice-trigger'));}
  function selectedChoiceButtons(grid){return choiceGridButtons(grid).filter(button=>button.classList.contains('selected')||button.getAttribute('aria-pressed')==='true'||$('input:checked',button));}
  function syncChoiceTrigger(grid){
    const trigger=grid.nextElementSibling?.matches('.db137-choice-trigger')?grid.nextElementSibling:null;if(!trigger)return;
    const count=selectedChoiceButtons(grid).length,label=controlLabel(grid);
    trigger.textContent=`${label}${count?` · ${count} selected`:''}`;
  }

  function enhanceChoiceGrid(grid){
    if(grid.dataset.db137ChoiceGrid==='1')return;
    const originals=choiceGridButtons(grid);if(!originals.length)return;
    grid.dataset.db137ChoiceGrid='1';grid.classList.add('db137-original-choice-grid');
    const trigger=document.createElement('button');trigger.type='button';trigger.className='db137-choice-trigger';
    trigger.addEventListener('click',()=>{
      const render=(content)=>{
        content.replaceChildren();
        originals.forEach(source=>{
          const button=document.createElement('button');button.type='button';button.className='db137-choice-option';button.textContent=clean(source.textContent);
          button.disabled=source.disabled;button.classList.toggle('selected',source.classList.contains('selected')||source.getAttribute('aria-pressed')==='true'||Boolean($('input:checked',source)));
          button.addEventListener('click',()=>{source.click();syncChoiceTrigger(grid);render(content);queuePasses();});
          content.appendChild(button);
        });
      };
      openChoiceSheet({title:controlLabel(grid),trigger,render,done:true});
    });
    grid.after(trigger);syncChoiceTrigger(grid);
  }

  function enhanceSelectors(root){
    $$('select',root).forEach(enhanceSelect);
    $$('input[type="date"],input[type="time"],input[type="datetime-local"]',root).forEach(enhanceTemporal);
    $$('.db107-choice-grid,[data-db107-style-picks],[data-db107-day-picks],[data-coach-styles],[data-coach-days],[data-coach-types]',root).forEach(enhanceChoiceGrid);
  }

  /* ---------- True step-based form wizard ---------- */
  const FIELD_SELECTOR='.field,.portal-field,fieldset,.toggle-row,.db107-toggle,.db108-switch-row,.uc94-enable-row,.uc-social-toggle-capsule,.uc-pay-toggle-capsule,.uc1705-switch-row';
  function formUnits(form){
    const units=[];
    visibleControls(form).forEach(control=>{
      const unit=control.closest(FIELD_SELECTOR)||control.parentElement;
      if(unit&&form.contains(unit)&&!units.includes(unit))units.push(unit);
    });
    return units.filter(unit=>!unit.matches('.form-actions,.uc-form-actions,.uc93-email-actions,.uc-v9-doc-actions'));
  }

  function unitWords(unit){return clean(`${$('label,legend',unit)?.textContent||''} ${unit.textContent||''} ${visibleControls(unit).map(x=>x.name).join(' ')}`).toLowerCase();}
  function specializedStep(form,unit){
    const words=unitWords(unit),id=form.id||'';
    if(id==='subscriptionBox'){
      if(/customer|contact|email|plan name/.test(words))return ['Customer Details',0];
      if(/subscription type|billing|subscription amount|setup|trial amount|cycles/.test(words))return ['Subscription & Billing',1];
      return ['Class & Plan Details',2];
    }
    if(id==='oneTimeBox'){
      if(/customer|whatsapp|email/.test(words))return ['Customer Details',0];
      if(/payment amount|purpose/.test(words))return ['Payment Details',1];
      return ['Review & Create',2];
    }
    if(id==='productForm'){
      if(/plan name|status|sku|slug|payment type|billing period|billing length|frequency/.test(words))return ['Plan Basics',0];
      if(/price|trial|discount|coupon|amount/.test(words))return ['Pricing & Billing',1];
      if(/class|session|dance|coach|days|time|duration|meeting|availability/.test(words))return ['Class & Schedule',2];
      return ['Display & Review',3];
    }
    return null;
  }

  function genericSteps(form,units){
    const desired=Math.max(2,Math.min(5,Math.ceil(units.length/4))),size=Math.ceil(units.length/desired),steps=[];
    for(let index=0;index<units.length;index+=size){
      const items=units.slice(index,index+size),words=items.map(unitWords).join(' ');
      let label='Details';
      if(/name|email|phone|whatsapp|customer|student|coach/.test(words))label=/coach/.test(words)?'Coach Details':'Contact Details';
      else if(/price|billing|payment|amount|rate|remuneration/.test(words))label='Payment & Billing';
      else if(/class|session|schedule|date|time|availability|dance/.test(words))label='Schedule & Availability';
      else if(/media|image|photo|video|banner/.test(words))label='Media & Display';
      else if(index+size>=units.length)label='Review & Save';
      else label=`Details ${steps.length+1}`;
      steps.push({label,items});
    }
    return steps;
  }

  function buildSteps(form,units){
    const special=units.map(unit=>({unit,step:specializedStep(form,unit)}));
    if(special.some(item=>item.step)){
      const map=new Map();
      special.forEach(({unit,step})=>{const value=step||['Display & Review',99],key=`${value[1]}:${value[0]}`;if(!map.has(key))map.set(key,{label:value[0],order:value[1],items:[]});map.get(key).items.push(unit);});
      return [...map.values()].sort((a,b)=>a.order-b.order);
    }
    return genericSteps(form,units);
  }

  function clearLegacyWizard(form){
    form.dataset.db136NoWizard='1';
    $$('.db136-wizard-progress,.db136-wizard-nav',form).forEach(node=>node.remove());
    $$('.db136-step-unit',form).forEach(unit=>{unit.classList.remove('db136-step-unit','db136-step-active','db136-submit-unit');delete unit.dataset.db136Step;});
    $$('.db136-step-container-hidden',form).forEach(row=>row.classList.remove('db136-step-container-hidden'));
    delete form.dataset.db136Wizard;delete form.dataset.db136Steps;delete form.dataset.db136Current;
  }

  function validateWizardStep(form,index){
    const invalid=$$(`.db137-step-unit[data-db137-step="${index}"] input,.db137-step-unit[data-db137-step="${index}"] select,.db137-step-unit[data-db137-step="${index}"] textarea`,form)
      .find(control=>control.type!=='hidden'&&!control.disabled&&!control.checkValidity());
    if(!invalid)return true;
    const trigger=invalid.nextElementSibling?.matches('.db137-select-trigger')?invalid.nextElementSibling:invalid;
    trigger.focus?.({preventScroll:true});trigger.scrollIntoView?.({behavior:'smooth',block:'center'});
    if(invalid.matches('select,input[type="date"],input[type="time"],input[type="datetime-local"]'))trigger.click?.();
    else invalid.reportValidity?.();
    return false;
  }

  function syncWizard(form,next,shouldScroll=false){
    const count=Number(form.dataset.db137Steps||0);if(!count)return;
    const current=Math.max(0,Math.min(count-1,Number(next||0)));form.dataset.db137Current=String(current);
    $$('.db137-step-unit',form).forEach(unit=>unit.classList.toggle('db137-step-active',Number(unit.dataset.db137Step)===current));
    $$('.row,.portal-row,.uc-form-grid,.db119-form-grid,.uc-v9-doc-grid',form).forEach(row=>{
      const units=$$('.db137-step-unit',row);row.classList.toggle('db137-step-empty',Boolean(units.length&&!units.some(unit=>unit.classList.contains('db137-step-active'))));
    });
    $$('.db137-wizard-step',form).forEach((button,index)=>{
      const complete=index<current;button.classList.toggle('complete',complete);button.classList.toggle('active',index===current);button.disabled=index>current;
      $('.db137-wizard-number',button).textContent=complete?'✓':String(index+1);
    });
    const back=$('[data-db137-back]',form),nextButton=$('[data-db137-next]',form),finish=$('[data-db137-finish]',form),counter=$('[data-db137-counter]',form);
    back.hidden=current===0;nextButton.hidden=current===count-1;finish.hidden=current!==count-1;counter.textContent=`Step ${current+1} of ${count}`;
    form.classList.toggle('db137-wizard-final',current===count-1);
    if(shouldScroll)$('.db137-step-active',form)?.scrollIntoView?.({behavior:'smooth',block:'start'});
  }

  function enhanceForm(form){
    if(form.matches('#loginForm,[role="search"],.search-form,.filter-form')||form.closest('#db137ChoiceSheet'))return;
    const controls=visibleControls(form),submit=$('button[type="submit"],input[type="submit"],button:not([type])',form);
    if(controls.length<4||!submit)return;
    const signature=controls.map(control=>`${control.name}:${control.type}`).join('|');
    if(form.dataset.db137Wizard==='1'&&form.dataset.db137Signature===signature){syncWizard(form,Number(form.dataset.db137Current||0));return;}
    clearLegacyWizard(form);$$('.db137-wizard-progress,.db137-wizard-nav',form).forEach(node=>node.remove());
    $$('.db137-step-unit',form).forEach(unit=>{unit.classList.remove('db137-step-unit','db137-step-active');delete unit.dataset.db137Step;});
    const units=formUnits(form);if(units.length<3)return;
    const steps=buildSteps(form,units).filter(step=>step.items.length);if(steps.length<2)return;
    steps.forEach((step,index)=>step.items.forEach(unit=>{unit.classList.add('db137-step-unit');unit.dataset.db137Step=String(index);}));
    const actions=submit.closest('.form-actions,.uc-form-actions,.uc93-email-actions,.uc-v9-doc-actions')||submit;
    actions.classList.add('db137-original-actions');actions.dataset.db137Step=String(steps.length-1);

    const progress=document.createElement('nav');progress.className='db137-wizard-progress';progress.setAttribute('aria-label','Form progress');
    progress.innerHTML=steps.map((step,index)=>`<button class="db137-wizard-step" type="button" data-db137-jump="${index}"><span class="db137-wizard-number">${index+1}</span><span>${step.label}</span></button>`).join('');
    const navigation=document.createElement('div');navigation.className='db137-wizard-nav';
    const finishLabel=clean(submit.textContent||submit.value)||'Save';
    navigation.innerHTML=`<button type="button" class="db137-wizard-back" data-db137-back>Back</button><span data-db137-counter></span><button type="button" class="db137-wizard-next" data-db137-next>Continue</button><button type="button" class="db137-wizard-finish" data-db137-finish>${finishLabel}</button>`;
    form.prepend(progress);form.append(navigation);
    form.dataset.db137Wizard='1';form.dataset.db137Steps=String(steps.length);form.dataset.db137Signature=signature;
    $('[data-db137-back]',navigation).onclick=()=>syncWizard(form,Number(form.dataset.db137Current)-1,true);
    $('[data-db137-next]',navigation).onclick=()=>{const current=Number(form.dataset.db137Current||0);if(validateWizardStep(form,current))syncWizard(form,current+1,true);};
    $('[data-db137-finish]',navigation).onclick=()=>{const current=Number(form.dataset.db137Current||0);if(validateWizardStep(form,current))submit.click();};
    $$('.db137-wizard-step',progress).forEach(button=>button.onclick=()=>{const target=Number(button.dataset.db137Jump),current=Number(form.dataset.db137Current||0);if(target<=current)syncWizard(form,target,true);});
    form.addEventListener('invalid',event=>{const unit=event.target.closest('.db137-step-unit');if(unit)syncWizard(form,Number(unit.dataset.db137Step||0),true);},true);
    syncWizard(form,0);
  }

  /* ---------- Two-card viewport, maximum two-row metric carousels ---------- */
  function metricItems(container){return [...container.children].filter(child=>!child.matches('.db136-carousel-dots,.db137-carousel-dots'));}
  function syncMetricDots(container,dots){
    const rows=Number(container.dataset.db137Rows||1),items=metricItems(container),perPage=rows*2,pages=Math.max(1,Math.ceil(items.length/perPage));
    let active=0,best=Infinity;
    for(let page=0;page<pages;page++){const target=items[Math.min(page*perPage,items.length-1)];if(!target)continue;const distance=Math.abs(target.offsetLeft-container.scrollLeft);if(distance<best){best=distance;active=page;}}
    $$('button',dots).forEach((button,index)=>{button.classList.toggle('active',index===active);button.setAttribute('aria-current',index===active?'true':'false');});
  }

  function enhanceMetricCarousel(container){
    const items=metricItems(container);if(items.length<2)return;
    const rows=items.length>5?2:1,perPage=rows*2,pages=Math.max(1,Math.ceil(items.length/perPage));
    container.classList.remove('db136-card-carousel');container.classList.add('db137-metric-carousel');container.dataset.db137Rows=String(rows);container.style.setProperty('--db137-rows',String(rows));
    items.forEach(item=>{item.classList.remove('db136-carousel-item');item.classList.add('db137-metric-card');});
    const legacy=container.nextElementSibling?.matches('.db136-carousel-dots')?container.nextElementSibling:null;legacy?.remove();
    let dots=container.nextElementSibling?.matches('.db137-carousel-dots')?container.nextElementSibling:null;
    if(!dots){dots=document.createElement('div');dots.className='db137-carousel-dots';dots.setAttribute('aria-label','Metric pages');container.after(dots);}
    if(Number(dots.dataset.pages||0)!==pages){
      dots.replaceChildren(...Array.from({length:pages},(_,page)=>{
        const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Show metric page ${page+1}`);
        button.onclick=()=>{const target=items[Math.min(page*perPage,items.length-1)];container.scrollTo({left:target?.offsetLeft||0,behavior:'smooth'});};return button;
      }));dots.dataset.pages=String(pages);
    }
    dots.hidden=pages<=1;
    if(container.dataset.db137Carousel!=='1'){
      let frame=0;container.addEventListener('scroll',()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;syncMetricDots(container,dots);});},{passive:true});container.dataset.db137Carousel='1';
    }
    syncMetricDots(container,dots);
  }

  function enhanceCarousels(root){
    $$('.dashboard-cards,.portal-metrics,.attendance-summary-grid,.uc95-metric-grid,.uc92-kpis,.db116-attendance-metrics,.db136-card-carousel,.uc-client-stat-grid',root).forEach(enhanceMetricCarousel);
    $$('.portal-grid',root).forEach(grid=>{
      const cards=[...grid.children].filter(card=>card.matches('.portal-card.third')&&$('.metric',card));if(cards.length<2)return;
      let strip=[...grid.children].find(child=>child.classList.contains('db137-role-metrics'));
      if(!strip){strip=document.createElement('div');strip.className='db137-role-metrics';grid.insertBefore(strip,cards[0]);cards.forEach(card=>strip.appendChild(card));}
      enhanceMetricCarousel(strip);
    });
  }

  /* ---------- Compact cards, dashboard copy and controls ---------- */
  function enhanceCompactCards(root){
    $$('table tbody tr',root).forEach(row=>{
      row.classList.add('db137-compact-record');
      $$('td',row).forEach(cell=>{
        const label=clean(cell.dataset.db136Label||cell.dataset.label||'');
        if(/price|amount|charge/i.test(label))cell.classList.add('db137-price-cell');
        if(/plan|offer|name/i.test(label))cell.classList.add('db137-primary-cell');
      });
    });
    $$('.db136-stacked-row',root).forEach(row=>row.classList.add('db137-compact-record'));
  }

  function mobileCopy(element,text){
    if(!element)return;if(!element.dataset.db137DesktopText)element.dataset.db137DesktopText=element.textContent;
    element.textContent=PHONE.matches?text:element.dataset.db137DesktopText;
  }

  function enhanceDashboardCopy(){
    const dashboard=$('#dashboard');if(!dashboard)return;
    const copy={
      'Business Dashboard':'Leads, subscriptions and payments at a glance.',
      'Follow-ups Overview':'Calls, WhatsApp and payment follow-ups.',
      'Subscriptions Overview':'Subscriptions, renewals and failed charges.',
      'Payments Overview':'Gateway payment activity.'
    };
    $$('.dashboard-block',dashboard).forEach(block=>{const heading=clean($('h2',block)?.textContent),paragraph=$(':scope > p.muted,.block-head p.muted',block);if(copy[heading])mobileCopy(paragraph,copy[heading]);});
    const controls=$('.uc-sub-overview-controls',dashboard);
    if(controls&&!$('.db137-subscription-info',controls)){
      const info=document.createElement('button');info.type='button';info.className='db137-subscription-info';info.textContent='i';info.setAttribute('aria-label','Subscription overview update information');
      info.onclick=()=>openTextSheet('Subscription overview','Saved subscription overview data is shown immediately. Payment webhooks refresh changed data, and a lightweight safety check runs every five minutes.',info);
      controls.appendChild(info);
    }
    const message=$('#ucSubscriptionOverviewMsg');
    if(message){
      let mobile=message.nextElementSibling?.matches('.db137-last-changed')?message.nextElementSibling:null;
      if(!mobile){mobile=document.createElement('div');mobile.className='db137-last-changed';message.after(mobile);}
      const text=clean(message.textContent),match=text.match(/last changed(?:\s+on)?\s*[:\-]?\s*(.+)$/i),timestamp=text.match(/\b\d{4}-\d{2}-\d{2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?\b/);mobile.textContent=match?`Last changed: ${match[1]}`:timestamp?`Last changed: ${timestamp[0]}`:'Last changed: waiting for an update';
      message.classList.add('db137-desktop-subscription-message');
    }
  }

  /* ---------- Mobile page sheets and true segmented modes ---------- */
  function enhanceCustomSubscription(){
    const panel=$('#customSubscription');if(!panel)return;
    panel.classList.add('db137-form-page');
    let head=$(':scope > .db137-page-header',panel);
    if(!head){
      head=document.createElement('header');head.className='db137-page-header';head.innerHTML='<button type="button" class="db137-page-close" aria-label="Close Create Subscription">×</button><h1>Create Subscription</h1><span aria-hidden="true"></span>';
      panel.prepend(head);$('.db137-page-close',head).onclick=()=>window.tab?.('dashboard');
    }
    const modes=$(':scope > .tabs',panel);modes?.classList.add('db137-segmented-modes');
    directButtons(modes).forEach(button=>{button.setAttribute('aria-pressed',button.classList.contains('active')?'true':'false');});
    $$('.payment-mode-box',panel).forEach(form=>form.classList.add('db137-payment-mode-form'));
  }

  function classifySheets(root){
    const modals=$$('.modal.open,.db114-modal:not([hidden]),.portal-v122-modal:not([hidden]),.portal-v122-forced-modal:not([hidden]),.uc1705-modal',root);
    if(root.matches?.('.modal.open,.db114-modal:not([hidden]),.portal-v122-modal:not([hidden]),.portal-v122-forced-modal:not([hidden]),.uc1705-modal'))modals.unshift(root);
    [...new Set(modals)].forEach(modal=>{modal.classList.remove('db136-bottom-sheet');modal.classList.add('db137-fullscreen-sheet');modal.dataset.db137Sheet='fullscreen';});
  }

  /* ---------- Navigation and search compaction ---------- */
  function addMoreButton(tabs,buttons,label='More'){
    let more=$(':scope > .db137-more-nav',tabs);
    if(!more){more=document.createElement('button');more.type='button';more.className='pill db137-more-nav';tabs.appendChild(more);}
    more.textContent=label;more.onclick=()=>openActionSheet('Choose a section',buttons.map(source=>({source,label:clean(source.textContent)})),more);
    return more;
  }

  function enhanceTabNavigation(root){
    $$('.uc86-hub-tabs',root).forEach(tabs=>{
      const buttons=directButtons(tabs).filter(button=>!button.classList.contains('db137-more-nav'));if(buttons.length<=2)return;
      tabs.classList.add('db137-primary-nav');buttons.forEach((button,index)=>button.classList.toggle('db137-nav-overflow',index>1));addMoreButton(tabs,buttons);
    });
    $$('.uc86-inner-tabs',root).forEach(tabs=>{
      const buttons=directButtons(tabs).filter(button=>!button.classList.contains('db137-filter-nav'));if(buttons.length<=2)return;
      tabs.classList.add('db137-secondary-nav');buttons.forEach(button=>button.classList.add('db137-nav-overflow'));
      let filter=$(':scope > .db137-filter-nav',tabs);
      if(!filter){filter=document.createElement('button');filter.type='button';filter.className='pill db137-filter-nav';tabs.appendChild(filter);}
      const active=buttons.find(button=>button.classList.contains('active'))||buttons[0];filter.textContent=`Filter: ${clean(active.textContent)}`;
      filter.onclick=()=>openActionSheet('Filter records',buttons.map(source=>({source,label:clean(source.textContent)})),filter);
    });
    $$('.tabs',root).filter(tabs=>!tabs.matches('.uc86-hub-tabs,.uc86-inner-tabs,.uc-client-tabs,.uc88-chart-types,.uc88-data-modes,.db137-segmented-modes')).forEach(tabs=>{
      const buttons=directButtons(tabs).filter(button=>!button.classList.contains('db137-more-nav'));if(buttons.length<=4)return;
      tabs.classList.add('db137-primary-nav');buttons.forEach((button,index)=>button.classList.toggle('db137-nav-overflow',index>1));addMoreButton(tabs,buttons);
    });
  }

  function enhanceSearch(root){
    $$('.uc86-order-bucket-search,.top-actions,.uc-v163-orders-top,.uc-v14-ni-search',root).forEach(bar=>{
      const input=$('input[type="search"],input.search-input,input[placeholder*="Search" i]',bar);if(!input||bar.dataset.db137Search==='1')return;
      bar.dataset.db137Search='1';bar.classList.add('db137-collapsible-search');
      const button=document.createElement('button');button.type='button';button.className='db137-search-toggle';button.setAttribute('aria-label','Open search');button.textContent='⌕';
      button.onclick=()=>{bar.classList.toggle('open');button.setAttribute('aria-expanded',bar.classList.contains('open')?'true':'false');if(bar.classList.contains('open'))input.focus();};
      bar.prepend(button);
    });
  }

  /* ---------- Premium Client Details mobile workspace ---------- */
  function enhanceClientTabs(modal){
    const tabs=$('.uc-client-tabs',modal);if(!tabs)return;
    const buttons=directButtons(tabs).filter(button=>!button.classList.contains('db137-client-more'));if(buttons.length<3)return;
    tabs.classList.add('db137-client-tabs');
    buttons.forEach(button=>{const label=clean(button.textContent);button.classList.toggle('db137-client-overflow',!['Summary','Payments'].includes(label));});
    let more=$(':scope > .db137-client-more',tabs);
    if(!more){more=document.createElement('button');more.type='button';more.className='db137-client-more';tabs.appendChild(more);}
    const active=buttons.find(button=>button.classList.contains('active')),activeLabel=clean(active?.textContent);
    more.textContent=!['Summary','Payments'].includes(activeLabel)&&activeLabel?`More: ${activeLabel}`:'More ···';
    more.onclick=()=>openActionSheet('Client details',buttons.map(source=>({source,label:clean(source.textContent)})),more);
  }

  function enhanceClientActions(modal){
    const bar=$('.uc-client-actionbar',modal);if(!bar)return;
    const buttons=directButtons(bar).filter(button=>!button.classList.contains('db137-client-actions-more'));
    buttons.forEach(button=>{const label=clean(button.textContent);button.classList.toggle('db137-client-secondary-action',!/Add Follow-up|Add Payment/i.test(label));});
    let more=$(':scope > .db137-client-actions-more',bar);
    if(!more){more=document.createElement('button');more.type='button';more.className='btn secondary compact db137-client-actions-more';more.textContent='More ···';bar.appendChild(more);}
    const secondary=buttons.filter(button=>button.classList.contains('db137-client-secondary-action'));
    more.onclick=()=>openActionSheet('More client actions',secondary.map(source=>({source,label:clean(source.textContent)})),more);
  }

  function enhanceClientPayments(modal){
    $$('.uc-payment-records tbody tr',modal).forEach(row=>{
      if(row.dataset.db137Expandable==='1'||row.classList.contains('uc-empty-payment-row'))return;
      row.dataset.db137Expandable='1';row.classList.add('db137-expandable-payment');
      const cells=$$('td',row);if(cells[0])cells[0].classList.add('db137-payment-primary');
      const amount=cells.find(cell=>/amount/i.test(cell.dataset.db136Label||''))||cells[5];amount?.classList.add('db137-payment-primary');
      row.tabIndex=0;row.setAttribute('role','button');row.setAttribute('aria-expanded','false');
      const toggle=event=>{if(event.target.closest('button,a,input,select'))return;const open=row.classList.toggle('open');row.setAttribute('aria-expanded',open?'true':'false');};
      row.addEventListener('click',toggle);row.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle(event);}});
    });
  }

  function enhanceProfileMedia(modal){
    $$('.uc-profile-media-section',modal).forEach(section=>{
      if(section.parentElement?.matches('details.db137-profile-accordion'))return;
      const details=document.createElement('details');details.className='db137-profile-accordion';
      const summary=document.createElement('summary');summary.textContent=clean($('h3',section)?.textContent)||'Profile media';details.appendChild(summary);
      section.before(details);details.appendChild(section);
    });
  }

  function enhanceClientModal(){
    const modal=$('#ucClientModal.open,#ucClientModal');if(!modal)return;
    modal.classList.add('db137-client-fullscreen');
    $('.uc-client-modal-card,.modal-card',modal)?.classList.add('db137-client-card');
    $('.uc-client-stat-grid',modal)?.classList.add('db137-client-stats');
    enhanceClientTabs(modal);enhanceClientActions(modal);enhanceClientPayments(modal);enhanceProfileMedia(modal);
    $('#ucTabSummary',modal)?.classList.add('db137-client-summary');
    $('#ucTabProfile',modal)?.classList.add('db137-client-profile');
    $('#ucTabHistory',modal)?.classList.add('db137-client-history');
    $('#ucTabPayments',modal)?.classList.add('db137-client-payments');
    $('#ucTabRefunds',modal)?.classList.add('db137-client-refunds');
    $('#ucTabInvoices',modal)?.classList.add('db137-client-invoices');
  }

  /* ---------- Borderless mobile calendars, agenda and action FAB ---------- */
  function enhanceCalendar(calendar){
    calendar.classList.add('db137-mobile-calendar');
    const days=$$('.db107-calendar-day:not(.empty),.db116-calendar-day,.uc48-day,.uc88-day',calendar);
    days.forEach(day=>{
      day.classList.add('db137-calendar-day');
      const label=clean(day.getAttribute('aria-label')||day.textContent),holiday=day.matches('.studio-holiday,.holiday')||/holiday/i.test(label),event=holiday||day.matches('.has-session,.has-sessions,.has-marker')||Boolean($('.uc48-calendar-post,.uc88-tag,.db107-cell-stats,.db123-holiday-label',day));
      if(!day.getAttribute('aria-label'))day.setAttribute('aria-label',label);
      day.classList.toggle('db137-has-event',event);day.classList.toggle('db137-holiday',holiday);
    });
    const panel=calendar.closest('.panel,.portal-view');if(panel)enhanceCalendarFab(panel);
  }

  function enhanceCalendarFab(panel){
    const actions=$$('button',panel).filter(button=>/Add Coach|Add (?:New )?Member|Schedule Meeting/i.test(clean(button.textContent))&&!button.closest('.modal'));
    if(actions.length<2)return;
    actions.forEach(button=>button.classList.add('db137-fab-source'));
    let fab=$(':scope > .db137-calendar-fab',panel);
    if(!fab){fab=document.createElement('button');fab.type='button';fab.className='db137-calendar-fab';fab.textContent='+';fab.setAttribute('aria-label','Calendar actions');panel.appendChild(fab);}
    fab.onclick=()=>openActionSheet('Calendar actions',actions.map(source=>({source,label:clean(source.textContent)})),fab);
  }

  /* ---------- Touch-first chart renderer used by the existing analytics logic ---------- */
  function chartTheme(canvas){const style=getComputedStyle(canvas.closest('.uc88-analytics-card')||document.body);return {text:style.color||'#25263a',muted:style.getPropertyValue('--muted').trim()||'#687083',line:style.getPropertyValue('--line').trim()||style.getPropertyValue('--border').trim()||'#d8dce7',surface:style.getPropertyValue('--surface').trim()||'#fff'};}
  function ensureChartReadout(canvas){
    const shell=canvas.parentElement;let readout=shell.previousElementSibling?.matches('.db137-chart-readout')?shell.previousElementSibling:null;
    if(!readout){readout=document.createElement('div');readout.className='db137-chart-readout';readout.setAttribute('aria-live','polite');shell.before(readout);}
    shell.classList.add('db137-scroll-chart');return readout;
  }

  function paintMobileChart({canvas,data,chart,palette,formatValue=value=>Number(value||0).toLocaleString('en-IN')}){
    if(!PHONE.matches)return false;
    const ctx=canvas.getContext('2d'),theme=chartTheme(canvas),readout=ensureChartReadout(canvas),rawDays=data.days||data.buckets||[],days=rawDays.map((day,index)=>typeof day==='string'?day:clean(day?.label||day?.start||String(index+1))),series=data.series||[],color=typeof palette==='function'?palette:(key,index)=>['#4b55be','#a469a8','#f2b705','#16a466','#3b82f6','#7c3aed','#f97316','#0891b2'][index%8];
    const state=canvas.__db137ChartState||(canvas.__db137ChartState={index:null});
    let width=chart==='pie'?520:chart==='hbar'?680:Math.max(760,days.length*78),height=chart==='hbar'?Math.max(340,days.length*62):chart==='pie'?520:380;
    canvas.width=width;canvas.height=height;canvas.style.width=chart==='pie'?'min(100%, 520px)':`${width}px`;canvas.style.height=chart==='pie'?'auto':`${height}px`;canvas.classList.toggle('db137-donut-canvas',chart==='pie');
    const draw=()=>{
      ctx.clearRect(0,0,width,height);ctx.fillStyle=theme.text;ctx.font='12px system-ui';
      if(chart==='pie'){
        const total=series.reduce((sum,item)=>sum+item.total,0)||1,cx=width/2,cy=height/2,r=170,inner=104;let angle=-Math.PI/2;
        series.forEach((item,index)=>{const next=angle+item.total/total*Math.PI*2;ctx.beginPath();ctx.arc(cx,cy,r,angle,next);ctx.arc(cx,cy,inner,next,angle,true);ctx.closePath();ctx.fillStyle=color(item.key,index);ctx.fill();angle=next;});
        const grandTotal=series.reduce((sum,item)=>sum+item.total,0);ctx.fillStyle=theme.text;ctx.textAlign='center';ctx.font='800 26px system-ui';ctx.fillText(formatValue(grandTotal),cx,cy);ctx.font='700 13px system-ui';ctx.fillStyle=theme.muted;ctx.fillText('TOTAL',cx,cy+24);readout.textContent='Aggregated totals for the selected period';return;
      }
      if(chart==='hbar'){
        const totals=days.map((day,index)=>series.reduce((sum,item)=>sum+Number(item.values?.[index]||0),0)),left=24,right=28,top=20,band=(height-top-14)/Math.max(1,days.length),max=Math.max(1,...totals);
        days.forEach((day,index)=>{const y=top+index*band,widthBar=(width-left-right)*totals[index]/max;ctx.fillStyle=theme.text;ctx.font='700 12px system-ui';ctx.textAlign='left';ctx.fillText(`${day} · ${formatValue(totals[index])}`,left,y+14);ctx.fillStyle=color(day,index);ctx.fillRect(left,y+23,widthBar,Math.max(12,band-34));});readout.textContent='Period totals · date labels appear above each bar';return;
      }
      const left=52,right=24,top=26,bottom=54,innerWidth=width-left-right,innerHeight=height-top-bottom,max=Math.max(1,...series.flatMap(item=>item.values||[]));
      ctx.strokeStyle=theme.line;ctx.lineWidth=1;
      for(let tick=0;tick<=4;tick++){const y=top+innerHeight*tick/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(width-right,y);ctx.stroke();ctx.fillStyle=theme.muted;ctx.textAlign='right';ctx.fillText(String(Math.round(max*(1-tick/4))),left-8,y+4);}
      const slot=innerWidth/Math.max(1,days.length),barWidth=Math.max(3,slot*.68/Math.max(1,series.length));
      days.forEach((day,index)=>{ctx.fillStyle=theme.muted;ctx.textAlign='center';ctx.fillText(day.slice(5),left+slot*(index+.5),height-23);});
      series.forEach((item,seriesIndex)=>{ctx.strokeStyle=ctx.fillStyle=color(item.key,seriesIndex);ctx.lineWidth=3;ctx.beginPath();(item.values||[]).forEach((value,index)=>{const x=left+slot*(index+.5),y=top+innerHeight-innerHeight*value/max;if(chart==='bar')ctx.fillRect(x-slot*.34+seriesIndex*barWidth,y,Math.max(2,barWidth-1),top+innerHeight-y);else{index?ctx.lineTo(x,y):ctx.moveTo(x,y);ctx.fillRect(x-3,y-3,6,6);}});if(chart==='line')ctx.stroke();});
      if(Number.isInteger(state.index)&&days[state.index]){
        const x=left+slot*(state.index+.5);ctx.strokeStyle=theme.text;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+innerHeight);ctx.stroke();
        readout.textContent=`${days[state.index]} · ${series.map(item=>`${item.label}: ${formatValue(item.values?.[state.index]||0)}`).join(' · ')}`;
      }else readout.textContent=days.length?`${days[0]} to ${days[days.length-1]} · Touch and drag to inspect`:'No points in this period';
    };
    canvas.__db137ChartDraw=draw;draw();
    if(canvas.dataset.db137Scrubber!=='1'){
      const inspect=event=>{if(!canvas.__db137ChartData||canvas.__db137ChartData.chart==='pie'||canvas.__db137ChartData.chart==='hbar')return;const rect=canvas.getBoundingClientRect(),x=(event.touches?.[0]?.clientX??event.clientX)-rect.left,left=52,right=24,count=canvas.__db137ChartData.days.length,slot=(rect.width-left-right)/Math.max(1,count),index=Math.max(0,Math.min(count-1,Math.floor((x-left)/slot)));state.index=index;canvas.__db137ChartDraw?.();};
      canvas.addEventListener('pointermove',inspect,{passive:true});canvas.addEventListener('pointerdown',inspect,{passive:true});canvas.addEventListener('touchmove',inspect,{passive:true});canvas.dataset.db137Scrubber='1';
    }
    canvas.__db137ChartData={data,days,chart};return true;
  }

  function paintMarketingChart({canvas,data,chart,colors=[]}){
    const series=(data.channels||[]).map((channel,index)=>{const values=(data.buckets||[]).map(bucket=>Number(data.map.get(bucket)?.[channel]||0));return {key:channel,label:channel,values,total:values.reduce((sum,value)=>sum+value,0),color:colors[index%colors.length]};});
    const formatValue=/_paise$/.test(data.metric||'')?value=>`₹${(Number(value||0)/100).toLocaleString('en-IN',{maximumFractionDigits:2})}`:value=>Number(value||0).toLocaleString('en-IN');
    return paintMobileChart({canvas,data:{days:data.buckets||[],series},chart,palette:(key,index)=>series[index]?.color||colors[index%colors.length],formatValue});
  }

  window.DropBeatMobileChart={paint:paintMobileChart,paintMarketing:paintMarketingChart};

  function enhanceCharts(root){
    $$('canvas',root).filter(canvas=>canvas.closest('[class*="chart"],#growthAnalytics,[class*="analytics"]')).forEach(canvas=>{canvas.parentElement?.classList.add('db137-generic-chart-shell');});
    $$('.uc88-toolbar',root).forEach(toolbar=>toolbar.classList.add('db137-chart-controls'));
    $$('.uc88-chart-types,.uc88-legend',root).forEach(row=>row.classList.add('db137-scroll-legend'));
  }

  /* ---------- Finite enhancement passes ---------- */
  function activeRoots(){
    const roots=[],$active=$('#adminApp .panel.active')||$('#adminApp .panel:not([hidden])');if($active)roots.push($active);
    $$('.portal-view:not([hidden]),.modal.open,.db114-modal:not([hidden]),.portal-v122-modal:not([hidden]),.portal-v122-forced-modal:not([hidden]),.uc1705-modal').forEach(root=>roots.push(root));
    return [...new Set(roots)];
  }

  function enhance(root){
    if(!PHONE.matches||!isDashboard())return;
    classifySheets(root);enhanceCarousels(root);enhanceCompactCards(root);enhanceTabNavigation(root);enhanceSearch(root);
    $$('form',root).forEach(enhanceForm);enhanceSelectors(root);
    $$('.db107-calendar,.db119-calendar-card,.uc48-calendar-shell,.uc88-analytics-card',root).forEach(enhanceCalendar);
    enhanceCharts(root);enhanceClientModal();enhanceCustomSubscription();enhanceDashboardCopy();
  }

  function runPass(){if(!PHONE.matches)return;activeRoots().forEach(enhance);}
  function queuePasses(){
    if(!PHONE.matches||passQueued)return;passQueued=true;runPass();
    [70,260,700,1500].forEach((delay,index)=>setTimeout(()=>{runPass();if(index===3)passQueued=false;},delay));
  }

  function install(){
    if(!isDashboard())return;choiceSheet();runPass();
    document.addEventListener('click',event=>{if(event.target.closest('button,a,summary,[role="button"]'))setTimeout(queuePasses,0);},true);
    document.addEventListener('submit',queuePasses,true);document.addEventListener('change',queuePasses,true);
    for(const name of ['dropbeat:portal-model','uc-products-rendered','uc:webinar-members-loaded','dropbeat:admin-ready','dropbeat:chart-rendered'])window.addEventListener(name,queuePasses);
    window.addEventListener('popstate',queuePasses);
    PHONE.addEventListener?.('change',event=>{if(event.matches)queuePasses();else{closeChoiceSheet();enhanceDashboardCopy();}});
    document.dispatchEvent(new CustomEvent('dropbeat:dashboard-mobile-v137-ready',{detail:{build:BUILD}}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
