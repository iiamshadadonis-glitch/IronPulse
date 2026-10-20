/* IronPulse Gym V1.39 — native mobile dashboard interaction layer.
   This file changes presentation and navigation only. Existing form controls,
   click handlers, validation, API calls and saved data remain authoritative. */
(()=>{
  'use strict';

  const BUILD='dropbeat-1.39-20261013';
  const PHONE=window.matchMedia('(max-width:760px)');
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const $$=(selector,root=document)=>[...(root?.querySelectorAll?.(selector)||[])];
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  const titleCase=value=>clean(value).replace(/(^|\s)\S/g,char=>char.toUpperCase());
  let passQueued=false;
  document.documentElement.dataset.dropbeatMobileController='v139';
  document.body.classList.toggle('db138-mobile',PHONE.matches);

  window.__DROPBEAT_DASHBOARD_MOBILE_V139__={build:BUILD,mode:'presentation-only'};
  document.documentElement.dataset.dropbeatDashboardMobileV138=BUILD;

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
    const card=$('.db137-choice-card',sheet);let startY=null;
    card.addEventListener('touchstart',event=>{startY=event.target.closest('header,.db137-sheet-handle')?event.touches[0].clientY:null;},{passive:true});
    card.addEventListener('touchend',event=>{if(startY!==null&&event.changedTouches[0].clientY-startY>65)closeChoiceSheet();startY=null;},{passive:true});
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
        const count=sourceBadgeCount(item.source);if(count){const badge=document.createElement('span');badge.className='db138-sheet-badge';badge.textContent=count>99?'99+':String(count);button.appendChild(badge);}
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
      [...select.options].filter(option=>!option.hidden).forEach(option=>{
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
    if(select.dataset.db137Select==='1'){syncSelectTrigger(select);const trigger=select.nextElementSibling;if(trigger?.matches('.db137-select-trigger'))trigger.disabled=select.disabled;return;}
    if(select.closest('#db137ChoiceSheet'))return;
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
    if(input.dataset.db137Temporal==='1'){syncTemporalTrigger(input);const trigger=input.nextElementSibling;if(trigger?.matches('.db137-select-trigger'))trigger.disabled=input.disabled||input.readOnly;return;}
    if(input.closest('#db137ChoiceSheet')||input.readOnly)return;
    input.dataset.db137Temporal='1';input.classList.add('db137-native-control');
    const trigger=document.createElement('button');trigger.type='button';trigger.className='db137-select-trigger db137-temporal-trigger';
    trigger.addEventListener('click',()=>openChoiceSheet({title:controlLabel(input),trigger,render(content){
      const picker=document.createElement('input');picker.type=input.type;picker.className='db137-sheet-input';picker.value=input.value||'';
      if(input.min)picker.min=input.min;if(input.max)picker.max=input.max;if(input.step)picker.step=input.step;
      content.appendChild(picker);
      const apply=document.createElement('button');apply.type='button';apply.className='db137-sheet-apply';apply.textContent='Apply';
      apply.addEventListener('click',()=>{if(!picker.reportValidity())return;input.value=picker.value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));syncTemporalTrigger(input);closeChoiceSheet();queuePasses();});
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
        choiceGridButtons(grid).filter(source=>!source.hidden).forEach(source=>{
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
    $$('.db121-style-picker',root).forEach(enhanceCheckboxPicker);
  }

  function enhanceCheckboxPicker(picker){
    if(picker.dataset.db138Picker==='1')return;
    picker.dataset.db138Picker='1';picker.classList.add('db138-original-picker');
    const trigger=document.createElement('button');trigger.type='button';trigger.className='db137-choice-trigger';
    const sync=()=>{const selected=$$('input:checked',picker).map(input=>input.value);trigger.textContent=selected.length?selected.join(', '):clean($('summary',picker)?.textContent)||'Choose Fitness Specialties';};
    trigger.onclick=()=>{const render=content=>{content.replaceChildren();$$('input[type="checkbox"]',picker).filter(input=>!input.hidden).forEach(input=>{const button=document.createElement('button');button.type='button';button.className='db137-choice-option';button.textContent=clean(input.closest('label')?.textContent||input.value);button.classList.toggle('selected',input.checked);button.disabled=input.disabled;button.onclick=()=>{input.click();sync();render(content);};content.appendChild(button);});};openChoiceSheet({title:controlLabel(picker),trigger,render,done:true});};
    picker.after(trigger);picker.addEventListener('change',sync);sync();
  }

  /* ---------- One owner per form; semantic steps include complete field groups ---------- */
  const formStates=new WeakMap();
  const FIELD_SELECTOR='.field,.portal-field,fieldset,.check,.toggle-row,.db107-toggle,.db108-switch-row,.uc94-enable-row,.uc-social-toggle-capsule,.uc-pay-toggle-capsule,.uc1705-switch-row,.db121-remuneration-toggle';
  const ATOMIC_SELECTOR='[data-db108-manual-class],[data-db107-plan-class],#ucSubscriptionOptions,.db121-availability-editor,[data-db121-availability],.db121-availability,.db122-coach-pay';
  function formControls(form){return $$('input,select,textarea',form).filter(control=>!control.closest('.uc-info-back-panel,#ucPlanHelp,.db138-review'));}
  function formUnits(form){
    const atomics=$$(ATOMIC_SELECTOR,form),units=[];
    atomics.forEach(unit=>units.push(unit));
    formControls(form).forEach(control=>{
      if(control.type==='hidden'&&!control.matches('[name="features_json"]'))return;
      if(atomics.some(unit=>unit.contains(control)))return;
      let unit=control.closest(FIELD_SELECTOR)||control.parentElement;
      if(!unit||unit===form||!form.contains(unit)||unit.closest('.form-actions,.uc-form-actions,.uc93-email-actions,.uc-v9-doc-actions'))return;
      let parent=unit.parentElement?.closest(FIELD_SELECTOR);
      while(parent&&parent!==form&&form.contains(parent)){unit=parent;parent=unit.parentElement?.closest(FIELD_SELECTOR);}
      if(!units.includes(unit))units.push(unit);
    });
    $$('.field,.portal-field',form).forEach(unit=>{
      if($('.db107-choice-grid,[data-db111-feature-editor],.db121-style-picker,[data-photo-preview],.db108-readonly-status',unit)&&!atomics.some(group=>group.contains(unit))&&!units.includes(unit))units.push(unit);
    });
    return units.filter(unit=>!units.some(other=>other!==unit&&other.contains(unit))).sort((a,b)=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);
  }
  function unitNames(unit){return $$('input,select,textarea',unit).map(control=>control.name||'').join(' ');}
  function unitWords(unit){return clean(($('label,legend',unit)?.textContent||'')+' '+unitNames(unit)).toLowerCase();}
  function specializedStep(form,unit){
    const names=unitNames(unit),id=form.id||'';
    if(form.matches('[data-coach-form]')){
      if(unit.matches('.db121-availability'))return 1;
      if(unit.matches('.db122-coach-pay'))return 2;
      if(/\b(?:instagram_url|facebook_url)\b/.test(names))return 3;
      return 0;
    }
    if(id==='subscriptionBox'||id==='oneTimeBox'){
      if(unit.matches('[data-db108-manual-class]')||/^(?:class_|coach_|schedule_|dance_|duration_|days_per_|location_|reminder_|hide_start)/.test(names))return 1;
      if(/\b(?:customer_name|customer_phone|customer_email|plan_name|email_subject|notes|service_summary|purpose)\b/.test(names))return 0;
      return 2;
    }
    if(id==='productForm'){
      if(unit.matches('[data-db107-plan-class]'))return 2;
      if(unit.matches('#ucSubscriptionOptions')||/\b(?:regular_price_rupees|offer_price_rupees|offer_price_enabled|payment_type|billing_period|billing_interval|trial_enabled|trial_amount_rupees|trial_value|trial_unit)\b/.test(names))return 1;
      if(/\b(?:name|status|sku|slug)\b/.test(names))return 0;
      return 3;
    }
    return null;
  }
  function buildSteps(form,units){
    if(form.matches('[data-coach-form]'))return ['Coach Details','Schedule & Availability','Approved Remuneration','Options & Save'].map((label,index)=>({label,items:units.filter(unit=>specializedStep(form,unit)===index)})).filter(step=>step.items.length);
    if(form.id==='subscriptionBox'||form.id==='oneTimeBox')return ['Customer Details','Class Details','Payment Details','Review & Create'].map((label,index)=>({label,items:units.filter(unit=>specializedStep(form,unit)===index)}));
    if(form.id==='productForm')return ['Plan Basics','Pricing & Billing','Class & Schedule','Display & Review'].map((label,index)=>({label,items:units.filter(unit=>specializedStep(form,unit)===index)}));
    if(units.length<=4)return [{label:'Details',items:units}];
    const groups=['Contact Details','Schedule & Availability','Payment Details','Media & Display','Options & Save'].map(label=>({label,items:[]}));
    units.forEach(unit=>{
      const words=unitWords(unit);
      const index=/price|billing|payment|amount|rate|remuneration/.test(words)?2:/class|session|schedule|date|time|availability|dance/.test(words)?1:/media|image|photo|video|banner/.test(words)?3:/name|email|phone|whatsapp|customer|student|coach|gender|age/.test(words)?0:4;
      groups[index].items.push(unit);
    });
    return groups.filter(group=>group.items.length);
  }
  function clearLegacyWizard(form){
    form.dataset.db136NoWizard='1';
    $$('.db136-wizard-progress,.db136-wizard-nav,.db137-wizard-progress,.db137-wizard-nav',form).forEach(node=>node.remove());
    $$('.db136-step-unit,.db137-step-unit,.db138-step-decoration',form).forEach(unit=>{
      unit.classList.remove('db136-step-unit','db136-step-active','db136-submit-unit','db137-step-unit','db137-step-active','db138-step-decoration');
      delete unit.dataset.db136Step;delete unit.dataset.db137Step;
    });
    $$('.db136-step-container-hidden,.db137-step-empty',form).forEach(row=>row.classList.remove('db136-step-container-hidden','db137-step-empty'));
    delete form.dataset.db136Wizard;
  }
  function conditionallyHidden(control,form){
    for(let node=control;node&&node!==form;node=node.parentElement){
      if(node.hidden||node.style?.display==='none')return true;
    }
    return false;
  }
  function invalidControl(form,units){
    return units.flatMap(unit=>$$('input,select,textarea',unit)).find(control=>control.type!=='hidden'&&!control.disabled&&!conditionallyHidden(control,form)&&!control.checkValidity());
  }
  function revealInvalid(form,control){
    if(form.__db138RevealingInvalid)return;
    form.__db138RevealingInvalid=true;
    try{
    const state=formStates.get(form),unit=state?.steps.flatMap(step=>step.items).find(item=>item.contains(control));
    if(unit)syncWizard(form,Number(unit.dataset.db137Step),true);
    const trigger=control.nextElementSibling?.matches('.db137-select-trigger')?control.nextElementSibling:control;
    trigger.focus?.({preventScroll:true});trigger.scrollIntoView?.({block:'center'});
    if(trigger!==control)trigger.click();else control.reportValidity?.();
    }finally{form.__db138RevealingInvalid=false;}
  }
  function validateWizardStep(form,index){
    const state=formStates.get(form),invalid=invalidControl(form,state?.steps[index]?.items||[]);
    if(!invalid)return true;
    revealInvalid(form,invalid);return false;
  }
  function decorateFormContent(form,state){
    $$('div,section,fieldset',state.body).forEach(row=>{
      if(state.units.includes(row)||state.units.some(unit=>unit.contains(row)))return;
      const children=state.units.filter(unit=>row.contains(unit));if(children.length)row.classList.toggle('db137-step-empty',!children.some(unit=>unit.classList.contains('db137-step-active')));
    });
    const candidates=[...state.body.children];
    candidates.forEach(node=>{
      if(!node.matches('h2,h3,h4,p,.hint,.notice,.uc-one-time-warning,.db107-modal-note')||node.matches('[id*="Msg"],[data-msg]')||node.contains($('input',node)))return;
      if(node.matches('.uc-plan-next-step')){node.classList.add('db138-mobile-hidden');return;}
      let next=node.nextElementSibling,owner=null;
      while(next&&!owner){owner=state.units.find(unit=>unit===next||next.contains(unit));next=next.nextElementSibling;}
      if(!owner)owner=state.units.at(-1);
      if(owner){node.classList.add('db138-step-decoration');node.dataset.db137Step=owner.dataset.db137Step;node.classList.toggle('db137-step-active',owner.classList.contains('db137-step-active'));}
    });
  }
  function reviewForm(form,state){
    if(!state.review)return;
    state.review.replaceChildren();
    state.steps.slice(0,-1).forEach(step=>{
      const section=document.createElement('section'),heading=document.createElement('h3'),grid=document.createElement('dl');
      heading.textContent=step.label;section.append(heading,grid);
      step.items.forEach(unit=>formControls(unit).forEach(control=>{
        if(control.type==='hidden'||control.disabled||control.type==='password'||conditionallyHidden(control,form))return;
        const label=controlLabel(control),value=control.type==='checkbox'?(control.checked?'Enabled':'Disabled'):control.tagName==='SELECT'?[...control.selectedOptions].map(option=>clean(option.textContent)).join(', '):control.value;
        if(!value)return;
        const term=document.createElement('dt'),definition=document.createElement('dd');term.textContent=label;definition.textContent=value;grid.append(term,definition);
      }));
      if(grid.children.length)state.review.appendChild(section);
    });
  }
  function syncWizard(form,next,shouldScroll=false){
    const state=formStates.get(form);if(!state)return;
    const current=Math.max(0,Math.min(state.steps.length-1,Number(next||0)));state.current=current;form.dataset.db137Current=String(current);
    state.units.forEach(unit=>unit.classList.toggle('db137-step-active',Number(unit.dataset.db137Step)===current));
    decorateFormContent(form,state);
    $$('.db137-wizard-step',state.progress).forEach((button,index)=>{
      const complete=index<current;button.classList.toggle('complete',complete);button.classList.toggle('active',index===current);button.disabled=index>state.furthest;
      button.setAttribute('aria-current',index===current?'step':'false');$('.db137-wizard-number',button).textContent=complete?'✓':String(index+1);
    });
    $('[data-db137-back]',state.nav).disabled=current===0;
    $('[data-db137-next]',state.nav).hidden=current===state.steps.length-1;
    $$('[data-db137-finish]',state.nav).forEach(button=>button.hidden=current!==state.steps.length-1);
    $('[data-db137-counter]',state.nav).textContent='Step '+(current+1)+' of '+state.steps.length;
    if(state.review){state.review.hidden=current!==state.steps.length-1;if(!state.review.hidden)reviewForm(form,state);}
    form.classList.toggle('db137-wizard-final',current===state.steps.length-1);
    if(shouldScroll)state.body.scrollTop=0;
  }
  function originalSubmit(form,source){
    const state=formStates.get(form),invalid=invalidControl(form,state.units);
    if(invalid){revealInvalid(form,invalid);return;}
    if(source.disabled)return;
    if(source.type==='submit'&&typeof form.requestSubmit==='function')form.requestSubmit(source);else source.click();
    const classError=$('[data-db108-class-error]',form);
    if(classError&&clean(classError.textContent)){
      const unit=state.units.find(item=>item.contains(classError));
      if(unit)syncWizard(form,Number(unit.dataset.db137Step),true);
      classError.scrollIntoView?.({block:'center'});
    }
    queuePasses();
  }
  function enhanceForm(form){
    if(form.matches('#loginForm,[role="search"],.search-form,.filter-form,[class*="filter"]')||form.closest('#db137ChoiceSheet'))return;
    const controls=formControls(form),submit=$('button[type="submit"],input[type="submit"],button:not([type])',form);
    if(controls.filter(control=>control.type!=='hidden').length<2||!submit)return;
    const signature=controls.map(control=>(control.name||control.dataset.slotField||'')+':'+control.type).join('|'),old=formStates.get(form);
    if(old&&old.signature===signature){syncWizard(form,old.current);return;}
    const current=old?.current||0,furthest=old?.furthest||0;
    clearLegacyWizard(form);
    let body=$(':scope>.db138-form-content',form);
    if(!body){body=document.createElement('div');body.className='db138-form-content';const children=[...form.childNodes];form.appendChild(body);children.forEach(node=>body.appendChild(node));}
    $('.db138-review',body)?.remove();
    const units=formUnits(form);if(!units.length)return;
    const steps=buildSteps(form,units);
    steps.forEach((step,index)=>step.items.forEach(unit=>{unit.classList.add('db137-step-unit');unit.dataset.db137Step=String(index);}));
    const actions=submit.closest('.form-actions,.uc-form-actions,.uc93-email-actions,.uc-v9-doc-actions')||submit;
    actions.classList.add('db137-original-actions');
    const sources=actions.matches('button,input')?[submit]:$$('button,input[type="submit"]',actions).filter(button=>!button.matches('[data-db137-finish]')&&!/^clear|^cancel|^reset/i.test(clean(button.textContent||button.value)));
    const progress=document.createElement('nav');progress.className='db137-wizard-progress';progress.setAttribute('aria-label','Form progress');
    steps.forEach((step,index)=>{
      const button=document.createElement('button');button.type='button';button.className='db137-wizard-step';button.dataset.db137Jump=String(index);
      const number=document.createElement('span'),label=document.createElement('span');number.className='db137-wizard-number';number.textContent=String(index+1);label.textContent=step.label;button.append(number,label);progress.appendChild(button);
    });
    const nav=document.createElement('footer');nav.className='db137-wizard-nav';nav.innerHTML='<button type="button" class="db137-wizard-back" data-db137-back>Back</button><span data-db137-counter></span><button type="button" class="db137-wizard-next" data-db137-next>Continue</button>';
    sources.forEach((source,index)=>{
      const finish=document.createElement('button');finish.type='button';finish.className='db137-wizard-finish'+(index?' db138-secondary-finish':'');finish.dataset.db137Finish='1';
      finish.textContent=clean(source.textContent||source.value)||'Save';finish.onclick=()=>originalSubmit(form,source);nav.appendChild(finish);
    });
    const review=['subscriptionBox','oneTimeBox'].includes(form.id)?document.createElement('div'):null;
    if(review){review.className='db138-review';body.appendChild(review);}
    const state={body,units,steps,progress,nav,review,signature,current,furthest};formStates.set(form,state);
    form.dataset.db137Wizard='1';form.dataset.db137Steps=String(steps.length);form.dataset.db138Wizard='1';form.prepend(progress);form.append(nav);
    $('[data-db137-back]',nav).onclick=()=>syncWizard(form,state.current-1,true);
    $('[data-db137-next]',nav).onclick=()=>{if(validateWizardStep(form,state.current)){state.furthest=Math.max(state.furthest,state.current+1);syncWizard(form,state.current+1,true);}};
    $$('.db137-wizard-step',progress).forEach(button=>button.onclick=()=>{const target=Number(button.dataset.db137Jump);if(target<=state.furthest)syncWizard(form,target,true);});
    if(form.dataset.db138Events!=='1'){
      form.dataset.db138Events='1';
      form.addEventListener('invalid',event=>revealInvalid(form,event.target),true);
      form.addEventListener('reset',()=>setTimeout(()=>{const latest=formStates.get(form);if(latest){latest.furthest=0;syncWizard(form,0);}},0));
      form.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('input:not([type="file"])')){const latest=formStates.get(form);if(latest&&latest.current<latest.steps.length-1){event.preventDefault();$('[data-db137-next]',latest.nav).click();}}});
    }
    syncWizard(form,Math.min(current,steps.length-1));
    prepareInlineForm(form);
  }

  /* ---------- Two-card viewport, maximum two-row metric carousels ---------- */
  function metricItems(container){return [...container.children].filter(child=>!child.matches('.db136-carousel-dots,.db137-carousel-dots'));}
  function syncMetricDots(container,dots){
    const rows=Number(container.dataset.db137Rows||1),items=metricItems(container),perPage=rows*2,pages=Math.max(1,Math.ceil(items.length/perPage));
    let active=0,best=Infinity;
    const origin=container.getBoundingClientRect().left;
    for(let page=0;page<pages;page++){const target=items[Math.min(page*perPage,items.length-1)];if(!target)continue;const distance=Math.abs(target.getBoundingClientRect().left-origin);if(distance<best){best=distance;active=page;}}
    $$('button',dots).forEach((button,index)=>{button.classList.toggle('active',index===active);button.setAttribute('aria-current',index===active?'true':'false');});
  }

  function enhanceMetricCarousel(container){
    const items=metricItems(container);if(items.length<2)return;
    const rows=items.length>5?2:1,perPage=rows*2,pages=Math.max(1,Math.ceil(items.length/perPage));
    container.classList.remove('db136-card-carousel');container.classList.add('db137-metric-carousel');container.dataset.db137Rows=String(rows);container.style.setProperty('--db137-rows',String(rows));
    items.forEach(item=>{item.classList.remove('db136-carousel-item');item.classList.add('db137-metric-card');});
    let legacy=container.nextElementSibling;while(legacy?.matches('.db136-carousel-dots')){const next=legacy.nextElementSibling;legacy.remove();legacy=next;}
    let dots=container.nextElementSibling?.matches('.db137-carousel-dots')?container.nextElementSibling:null;
    if(!dots){dots=document.createElement('div');dots.className='db137-carousel-dots';dots.setAttribute('aria-label','Metric pages');container.after(dots);}
    if(Number(dots.dataset.pages||0)!==pages){
      dots.replaceChildren(...Array.from({length:pages},(_,page)=>{
        const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Show metric page ${page+1}`);
        button.onclick=()=>{const current=metricItems(container),target=current[Math.min(page*perPage,current.length-1)],left=target?target.getBoundingClientRect().left-container.getBoundingClientRect().left+container.scrollLeft:0;container.scrollTo({left,behavior:'smooth'});};return button;
      }));dots.dataset.pages=String(pages);
    }
    dots.hidden=pages<=1;
    if(container.dataset.db137Carousel!=='1'){
      let frame=0;container.addEventListener('scroll',()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;syncMetricDots(container,dots);});},{passive:true});container.dataset.db137Carousel='1';
    }
    syncMetricDots(container,dots);
  }

  function enhanceCarousels(root){
    $$('.dashboard-cards,.portal-metrics,.attendance-summary-grid,.uc95-metric-grid,.uc92-kpis,.db116-attendance-metrics,.uc-client-stat-grid,.db136-metric-carousel,.db137-role-metrics,[data-uc88-growth-summary]',root).forEach(enhanceMetricCarousel);
    $$('.portal-grid',root).forEach(grid=>{
      const cards=[...grid.children].filter(card=>card.matches('.portal-card.third')&&$('.metric',card));if(cards.length<2)return;
      let strip=[...grid.children].find(child=>child.classList.contains('db137-role-metrics'));
      if(!strip){strip=document.createElement('div');strip.className='db137-role-metrics';grid.insertBefore(strip,cards[0]);cards.forEach(card=>strip.appendChild(card));}
      enhanceMetricCarousel(strip);
    });
  }

  /* ---------- Compact cards, dashboard copy and controls ---------- */
  function enhanceTable(table){
    const head=table.tHead?.rows?.[table.tHead.rows.length-1],labels=head?[...head.cells].map(cell=>clean(cell.textContent)):[];
    table.classList.add('db136-card-table');table.dataset.db136Cards='1';
    $$('tbody tr',table).forEach(row=>{
      row.classList.add('db136-card-row','db137-compact-record');
      [...row.cells].forEach((cell,index)=>{
        cell.dataset.db136Label=labels[index]||cell.dataset.db136Label||cell.dataset.label||'Details';
        if(cell.colSpan>1){cell.classList.add('db138-empty-cell');return;}
        let value=$(':scope>.db138-cell-value',cell);
        if(!value){value=document.createElement('div');value.className='db138-cell-value';[...cell.childNodes].forEach(node=>value.appendChild(node));cell.appendChild(value);}
        const label=cell.dataset.db136Label;
        if(/price|amount|charge/i.test(label))cell.classList.add('db137-price-cell');
        if(/plan|offer|name/i.test(label))cell.classList.add('db137-primary-cell');
        if(table.closest('#productTable')&&/price/i.test(label))value.classList.add('db138-plan-price-values');
      });
    });
  }
  function enhanceDivGrids(root){
    $$('[class~="head"],[class*="-grid-head"],[class*="-list-head"],[class*="-table-head"]',root).forEach(header=>{
      if(header.children.length<2||header.closest('[class*="calendar"]'))return;
      const names=[...header.classList],shared=names.filter(name=>!/(^|-)head$/.test(name)&&/(grid|row|list)/.test(name)&&!/calendar/.test(name)),prefixes=names.filter(name=>/(?:grid|list|table)-head$/.test(name)).map(name=>name.replace(/-head$/,''));
      if(!names.includes('head')&&!prefixes.length)return;
      const labels=[...header.children].map(cell=>clean(cell.textContent)||'Details'),rows=[...header.parentElement.children].filter(row=>row!==header&&row.children.length&&(shared.some(name=>row.classList.contains(name))||prefixes.some(prefix=>[...row.classList].some(name=>name.startsWith(prefix)&&/(row|grid|list)/.test(name)))));
      if(!rows.length)return;
      header.classList.add('db136-stacked-head');
      rows.forEach(row=>{
        row.classList.add('db136-stacked-row','db137-compact-record');
        [...row.children].forEach((cell,index)=>{
          cell.classList.add('db136-stacked-cell');cell.dataset.db136Label=labels[index]||'Details';
          if(cell.dataset.db136Label==='Details'&&$('input[type="checkbox"]',cell))cell.dataset.db136Label='Select';
          let value=$(':scope>.db138-cell-value',cell);
          if(!value){value=document.createElement('div');value.className='db138-cell-value';[...cell.childNodes].forEach(node=>value.appendChild(node));cell.appendChild(value);}
        });
      });
    });
  }
  function enhanceCompactCards(root){
    $$('table',root).forEach(enhanceTable);enhanceDivGrids(root);
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

  /* ---------- Full-screen form pages; closing leaves the current workspace ---------- */
  const MODALS='.modal.open,.db114-modal:not([hidden]),.portal-modal:not([hidden]),.portal-v122-modal:not([hidden]),.portal-v122-forced-modal:not([hidden]),.uc1705-modal';
  function updateModalLock(){
    document.body.classList.toggle('db138-form-open',Boolean($('#customSubscription[data-db138-open="true"],.db138-inline-form-open')));
  }
  function openPaymentPage(){
    if(!PHONE.matches)return;
    const panel=$('#customSubscription');if(!panel)return;
    enhanceCustomSubscription();panel.dataset.db138Open='true';updateModalLock();
    const form=$('.payment-mode-box:not([hidden])',panel);if(form){enhanceForm(form);syncWizard(form,Number(form.dataset.db137Current||0));}
  }
  function closePaymentPage(){
    const panel=$('#customSubscription');if(panel)panel.dataset.db138Open='false';closeChoiceSheet();updateModalLock();
  }
  function enhanceCustomSubscription(){
    const panel=$('#customSubscription');if(!panel)return;
    panel.classList.add('db138-payment-page');
    if(!panel.dataset.db138Open)panel.dataset.db138Open='false';
    let head=$(':scope>.db138-page-header',panel);
    if(!head){
      head=document.createElement('header');head.className='db138-page-header';head.innerHTML='<h1>Create Subscription</h1><div class="db138-header-icons"><button type="button" class="db138-icon-button" data-db138-payment-help aria-label="Help for this payment link"></button><button type="button" class="db138-icon-button" data-db138-payment-close aria-label="Close Create Subscription"></button></div>';
      panel.prepend(head);$('[data-db138-payment-close]',head).innerHTML=icon('close');$('[data-db138-payment-close]',head).onclick=closePaymentPage;
      const help=$('[data-db138-payment-help]',head);help.innerHTML=icon('info');help.onclick=()=>{const form=$('.payment-mode-box:not([hidden])',panel),source=$('.uc-info-btn',form);if(source)openHelp(source);else openTextSheet('Payment link instructions','Complete Customer Details, Class Details and Payment Details. Review the information, then create the existing secure payment link.',help);};
    }
    const modes=$(':scope>.tabs',panel);modes?.classList.add('db137-segmented-modes');
    directButtons(modes).forEach(button=>button.setAttribute('aria-pressed',button.classList.contains('active')?'true':'false'));
    $$('.payment-mode-box',panel).forEach(form=>form.classList.add('db137-payment-mode-form'));
  }
  function prepareInlineForm(form){
    if(['subscriptionBox','oneTimeBox'].includes(form.id)||form.closest(MODALS)||form.dataset.db138Inline==='1')return;
    form.dataset.db138Inline='1';form.classList.add('db138-inline-form');
    const owner=form.closest('.card,details,.portal-card,.panel,.portal-view'),title=clean($('h2,h3,h1,summary',owner)?.textContent)||'Edit Details';
    const launcher=document.createElement('button');launcher.type='button';launcher.className='btn compact db138-open-form';launcher.textContent='Open '+title;launcher.__form=form;form.before(launcher);
    const header=document.createElement('header');header.className='db138-page-header';
    const heading=document.createElement('h2'),close=document.createElement('button');heading.textContent=title;close.type='button';close.className='db138-icon-button';close.setAttribute('aria-label','Close '+title);close.innerHTML=icon('close');header.append(heading,close);form.prepend(header);
    launcher.onclick=()=>{form.classList.add('db138-inline-form-open');updateModalLock();syncWizard(form,Number(form.dataset.db137Current||0));};
    close.onclick=()=>{form.classList.remove('db138-inline-form-open');closeChoiceSheet();updateModalLock();launcher.focus?.({preventScroll:true});};
  }
  function classifySheets(root){
    const modals=$$(MODALS,root);if(root.matches?.(MODALS))modals.unshift(root);
    [...new Set(modals)].forEach(modal=>{
      modal.classList.remove('db136-bottom-sheet');modal.classList.add('db137-fullscreen-sheet');modal.dataset.db137Sheet='fullscreen';
      const card=$('.modal-card,.db114-modal-card,.portal-modal-card,.portal-v122-dialog-card,.portal-v122-forced-card,.uc1705-modal-card',modal);
      if(card&&$('form',card))card.classList.add('db138-form-dialog');
      if(card){
        const head=$(':scope>.top,:scope>.modal-head,:scope>.modal-header',card);
        if(head){
          head.classList.add('db138-dialog-header');
          const close=$$('button',head).find(button=>/^close$|^×$|^x$/i.test(clean(button.textContent))||/close/i.test(button.getAttribute('aria-label')||''));
          if(close)iconify(close,'close','Close form');
          const tools=$(':scope>.uc-info-toolbar',card);
          if(tools&&!head.contains(tools)){tools.classList.add('db138-header-help');head.appendChild(tools);}
          $$('.uc-info-btn,.uc-plan-help-btn',head).forEach(button=>button.classList.add('db138-header-info'));
        }
      }
    });
  }

  /* ---------- Consistent mobile header icons and help sheets ---------- */
  function icon(kind){
    const paths={
      search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
      refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 2M18 17a7 7 0 0 1-12 1l-2-2"/>',
      download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
      close:'<path d="m6 6 12 12M18 6 6 18"/>',
      info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7" r=".7" fill="currentColor"/>',
      more:'<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
      plus:'<path d="M12 4v16M4 12h16"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(paths[kind]||paths.info)+'</svg>';
  }
  function iconify(source,kind,label){
    if(source.dataset.db138Icon)return;
    source.dataset.db138Icon=kind;source.classList.add('db138-icon-button');
    const original=document.createElement('span');original.className='db138-desktop-label';[...source.childNodes].forEach(node=>original.appendChild(node));
    source.appendChild(original);source.insertAdjacentHTML('beforeend',icon(kind));
    source.setAttribute('aria-label',label||clean(original.textContent));source.title=label||clean(original.textContent);
  }
  function headerActions(head){
    if(!head)return null;head.classList.add('db138-icon-header');
    let actions=$(':scope>.db138-header-icons',head);if(!actions){actions=document.createElement('div');actions.className='db138-header-icons';head.appendChild(actions);}return actions;
  }
  function proxyIcon(source,actions,kind,label){
    if(!source||!actions)return null;
    let proxy=source.__db138Proxy;
    if(!proxy||!proxy.isConnected){
      proxy=document.createElement('button');proxy.type='button';proxy.className='db138-icon-button db138-proxy-icon';proxy.innerHTML=icon(kind);proxy.setAttribute('aria-label',label||clean(source.textContent));proxy.title=label||clean(source.textContent);
      proxy.onclick=()=>source.click();proxy.__db138Source=source;actions.appendChild(proxy);source.__db138Proxy=proxy;source.classList.add('db138-proxied');
    }else if(proxy.parentElement!==actions)actions.appendChild(proxy);
    proxy.dataset.db139Action=kind;proxy.dataset.db139Source=source.className;
    proxy.disabled=source.disabled;return proxy;
  }
  const HELP_CONTENT='.uc-info-back-body,#ucPlanHelp,.uc-v163-order-help-inner,.uc88-help,.uc92-help,.uc49-help,.uc93-help,.uc84-tg-help,.uc-v1624-media-help,.uc-v1635-create-help,.uc-v11-doc-help-panel,.db123-coach-settings-back,.db123-flip-back,[data-db123-coach-help],[data-uc88-help],[data-uc92-help]';
  let helpReplay=false;
  function findHelp(button){
    if(button.matches('.uc-plan-help-btn'))return $('#ucPlanHelp');
    if(button.dataset.orderHelp)return $('[data-order-flip="'+button.dataset.orderHelp+'"] .uc-v163-order-help-inner');
    let node=button.parentElement;
    for(let depth=0;node&&depth<8;depth++,node=node.parentElement){
      const candidates=$$(HELP_CONTENT,node).filter(content=>!content.contains(button)&&!content.closest('#db137ChoiceSheet'));
      const found=candidates.find(content=>clean(content.textContent));if(found)return found;
      if(node.matches('.panel,.portal-view,#adminApp'))break;
    }
    return null;
  }
  function openHelp(button){
    let content=findHelp(button);
    if(!content){
      const owner=button.closest('.card,.modal-card,details,.panel,.portal-card')||button.parentElement;
      const snapshot=[owner,...$$('[hidden],[class*="front"],[class*="help"]',owner)].map(node=>({node,hidden:node.hidden,className:node.getAttribute('class')}));
      helpReplay=true;try{button.click();content=findHelp(button);}finally{helpReplay=false;snapshot.forEach(item=>{item.node.hidden=item.hidden;if(item.className!==null)item.node.setAttribute('class',item.className);});}
    }
    if(!content)return false;
    const title=clean(button.getAttribute('aria-label')||button.title)||'Help & Instructions';
    openChoiceSheet({title,trigger:button,done:true,render(host){
      const copy=document.createElement('article');copy.className='db138-help-copy';copy.innerHTML=content.innerHTML;
      $$('button,.uc-info-back-head,.uc-info-back-btn,input,select,textarea',copy).forEach(node=>node.remove());
      $$('[hidden]',copy).forEach(node=>node.removeAttribute('hidden'));host.appendChild(copy);
    }});
    return true;
  }
  function mobileHelpClick(event){
    if(!PHONE.matches||helpReplay||event.target.closest('#db137ChoiceSheet'))return;
    const button=event.target.closest('.uc-info-btn,.uc-plan-help-btn,[data-uc-info-open],.uc-info-toggle,.portal-info-btn,[data-db123-show-help]');
    if(button&&!button.matches('.uc-info-back-btn')&&openHelp(button)){event.preventDefault();event.stopImmediatePropagation();}
  }
  function mobileHeader(source){
    const owner=source.closest('.top,.block-head,.portal-view-head,.modal-head,.db121-availability-head,.portal-card,.dashboard-block,.card,details,.panel,.portal-view');
    if(!owner)return null;
    let head=owner.matches('.top,.block-head,.portal-view-head,.modal-head,.db121-availability-head')?owner:$(':scope>.top,:scope>.block-head,:scope>.db138-list-header,:scope>header,:scope>h2,:scope>h3,:scope>summary',owner);
    if(!head)return null;
    if(head.matches('h2,h3')){
      let wrapper=head.closest('.db138-list-header');if(!wrapper){wrapper=document.createElement('div');wrapper.className='db138-list-header';head.before(wrapper);wrapper.appendChild(head);}head=wrapper;
    }
    normalizeHeader(head);return head;
  }
  function normalizeHeader(head){
    if(head.parentElement?.id==='customSubscription'&&head.matches('.top')){head.classList.remove('db139-header');return;}
    head.classList.add('db139-header');
    [...head.children].forEach(child=>{
      if(child.matches('.db138-header-icons'))return;
      if($(':scope>h1,:scope>h2,:scope>h3',child))child.classList.add('db139-header-copy');
    });
    const heading=$(':scope>h1,:scope>h2,:scope>h3,.db139-header-copy>h1,.db139-header-copy>h2,.db139-header-copy>h3',head);
    if(heading)heading.classList.add('db139-header-title');
  }
  function enhanceHeaderIcons(root){
    $$('.top,.block-head,.portal-view-head,.modal-head,.db138-list-header,.db138-dialog-header',root).forEach(normalizeHeader);
    $$('button,a',root).forEach(source=>{
      if(source.matches('.db138-proxy-icon,.db138-open-form,.db138-search-toggle,.db138-product-fab')||source.closest('#db137ChoiceSheet,.uc-info-back-panel'))return;
      const text=clean(source.textContent);
      const help=source.matches('.uc-info-btn,.uc-plan-help-btn,.db137-subscription-info,.portal-info-btn,[data-uc-info-open],[data-db123-show-help]');
      const kind=source.dataset.db138Icon==='close'?'close':help?'info':/^Refresh(?:\s+(?:Payments|Data|List|Calendar|Status|Sessions|Contacts|Records|Overview))?$/i.test(text)?'refresh':/^Download\s+(?:Excel|CSV|Sheet|Excel Sheet)$/i.test(text)?'download':null;
      if(!kind)return;
      if(kind==='refresh'&&source.closest('#dashboard>.top')){
        source.classList.add('db139-dashboard-refresh');source.classList.remove('db138-proxied');
        source.__db138Proxy?.remove();return;
      }
      const head=mobileHeader(source);
      const label=source.getAttribute('aria-label')||source.title||(help?'Help & Instructions':text);
      if(head)proxyIcon(source,headerActions(head),kind,label);
      else iconify(source,kind,label);
    });
    const top=$('#dashboard>.top');if(top){
      top.classList.add('db139-dashboard-top');const actions=$(':scope>.top-actions',top);
      actions?.classList.add('db139-dashboard-buttons');
    }
    $$('[data-order-bucket]>summary',root).forEach(head=>{
      head.classList.add('db139-order-heading');
      $$('[data-uc86-tab-count],[class*="count"],[class*="badge"]',head).filter(node=>!node.closest('.db138-header-icons')).forEach(node=>node.classList.add('db139-hide'));
    });
    $$('.uc-info-toolbar,.uc88-top-actions,.top-actions',root).forEach(bar=>{
      if(!bar.children.length||[...bar.children].every(child=>child.matches('.db138-proxied,.db139-hide')))bar.classList.add('db139-empty-toolbar');
    });
  }

  /* ---------- Fitted primary navigation and status menus ---------- */
  function labelWithoutBadges(button){
    const copy=button.cloneNode(true);$$('[class*="badge"],[data-uc86-tab-count]',copy).forEach(node=>node.remove());return clean(copy.textContent);
  }
  function sourceBadgeCount(button){
    return $$('[class*="badge"],[data-uc86-tab-count]',button).filter(node=>!node.hidden).reduce((sum,node)=>sum+(Number(clean(node.textContent).replace('+',''))||0),0);
  }
  function syncMoreBadge(more,buttons){
    const count=buttons.reduce((sum,button)=>sum+sourceBadgeCount(button),0);let badge=$('.db138-more-badge',more);
    if(count&&!badge){badge=document.createElement('span');badge.className='db138-more-badge';more.appendChild(badge);}
    if(badge){badge.hidden=!count;badge.textContent=count>99?'99+':String(count);}
  }
  function addMoreButton(tabs,buttons,label='More'){
    let more=$(':scope>.db137-more-nav',tabs);
    if(!more){more=document.createElement('button');more.type='button';more.className='pill db137-more-nav db138-more-button';const text=document.createElement('span');text.className='db138-more-label';text.textContent=label;more.appendChild(text);more.insertAdjacentHTML('beforeend',icon('more'));tabs.appendChild(more);}
    more.onclick=()=>openActionSheet('Choose a section',buttons.map(source=>({source,label:labelWithoutBadges(source)})),more);
    syncMoreBadge(more,buttons.filter(button=>button.classList.contains('db137-nav-overflow')));return more;
  }
  function segmentTabs(tabs,buttons,visible=2){
    tabs.classList.add('db138-segment-tabs');
    buttons.forEach((button,index)=>button.classList.toggle('db137-nav-overflow',index>=visible));
    if(buttons.length>visible)addMoreButton(tabs,buttons);
  }
  function enhanceTabNavigation(root){
    $$('.uc84-sales-tabs',root).forEach(tabs=>segmentTabs(tabs,directButtons(tabs).filter(button=>!button.classList.contains('db137-more-nav'))));
    $$('.uc86-hub-tabs',root).forEach(tabs=>{
      const buttons=directButtons(tabs).filter(button=>!button.matches('.db137-more-nav,.db138-search-toggle'));
      if(tabs.closest('#operationsHub')){
        tabs.classList.add('db138-operations-tabs');buttons.forEach(button=>button.classList.remove('db137-nav-overflow'));$('.db137-more-nav',tabs)?.remove();
      }else segmentTabs(tabs,buttons);
    });
    $$('.uc86-order-tabs',root).forEach(tabs=>{
      segmentTabs(tabs,directButtons(tabs).filter(button=>!button.matches('.db137-more-nav,.db137-filter-nav')));
      $('.db137-filter-nav',tabs)?.remove();
    });
    $$('.uc86-inner-tabs:not(.uc86-order-tabs),.tabs:not(.uc84-sales-tabs):not(.uc86-hub-tabs):not(.uc86-inner-tabs)',root).forEach(tabs=>{
      if(tabs.matches('.uc-client-tabs,.uc88-chart-types,.uc88-data-modes,.uc92-mini-tabs,.db137-segmented-modes'))return;
      const buttons=directButtons(tabs).filter(button=>!button.matches('.db137-more-nav,.db137-filter-nav'));if(buttons.length<2)return;
      if(tabs.closest('#adminTickets')||buttons.length<=5){tabs.classList.add('db138-fit-tabs');tabs.style.setProperty('--db138-tab-count',String(buttons.length));buttons.forEach(button=>button.classList.remove('db137-nav-overflow'));$('.db137-more-nav',tabs)?.remove();$('.db137-filter-nav',tabs)?.remove();}
      else segmentTabs(tabs,buttons);
    });
  }

  /* ---------- One expandable search field per header ---------- */
  function makeSearch(bar,head,{orders=false}={}){
    const input=$('input[type="search"],input.search-input,input[placeholder*="Search" i]',bar);if(!input)return null;
    bar.classList.add('db138-search-bar');if(orders)bar.classList.add('db138-orders-search');
    let toggle=bar.__db138Toggle;
    if(!toggle||!toggle.isConnected){
      toggle=document.createElement('button');toggle.type='button';toggle.className='db138-icon-button db138-search-toggle';toggle.innerHTML=icon('search');toggle.setAttribute('aria-label','Open search');toggle.setAttribute('aria-expanded','false');
      normalizeHeader(head);
      const actions=head.matches?.('.uc86-hub-tabs')?head:headerActions(head);actions?.appendChild(toggle);bar.__db138Toggle=toggle;
      toggle.onclick=()=>{const open=bar.classList.toggle('db138-search-open');toggle.setAttribute('aria-expanded',String(open));if(open)input.focus?.({preventScroll:true});};
    }
    $$('button',bar).filter(button=>/^Search(?:\s*\/\s*Refresh)?$/i.test(clean(button.textContent))).forEach(button=>{
      if(!orders){iconify(button,'search','Search records');button.classList.add('db138-search-submit');}
    });
    input.classList.add('db138-search-input');return toggle;
  }
  function enhanceSearch(root){
    const order=$('#orders',root)|| (root.id==='orders'?root:null);
    if(order){
      const bar=$(':scope>.top .top-actions',order),tabs=$('#operationsHub>.uc86-hub-tabs');if(bar&&tabs){makeSearch(bar,tabs,{orders:true});bar.parentElement.classList.add('db138-orders-search-head');}
      $$('[data-order-bucket]',order).forEach(details=>{
        details.classList.add('db138-order-bucket');const summary=$(':scope>summary',details),body=$('.uc-v163-order-body',details),toolbar=$('.uc-v163-order-toolbar',details),search=$('.uc86-order-bucket-search',details);if(!summary||!body)return;
        const actions=headerActions(summary);
        if(search)makeSearch(search,summary);
        if(toolbar){
          const help=$('[data-order-help]',toolbar),download=$('[data-order-export]',toolbar);
          proxyIcon(help,actions,'info','Help for '+clean($('.uc-v163-order-summary strong',summary)?.textContent));
          proxyIcon(download,actions,'download','Download Excel');
          toolbar.classList.add('db138-mobile-hidden');
        }
      });
    }
    $$('.top-actions,.uc-v14-ni-search,.uc86-refund-record-search',root).filter(bar=>!bar.closest('#orders')).forEach(bar=>{
      const head=bar.closest('.top,.portal-view-head')||$(':scope>h2,:scope>h3',bar.parentElement)?.parentElement;if(head)makeSearch(bar,head);
    });
  }
  function enhanceProducts(){
    const panel=$('#products');if(!panel)return;
    const add=$(':scope>.top button[onclick*="newProduct"]',panel);if(add&&!panel.__db138Fab){
      const fab=document.createElement('button');fab.type='button';fab.className='db138-product-fab';fab.setAttribute('aria-label','Add New Plan or Offer');fab.innerHTML=icon('plus');fab.onclick=()=>add.click();panel.appendChild(fab);panel.__db138Fab=fab;add.classList.add('db138-mobile-hidden');
    }
    $$('.uc-plan-next-step',panel).forEach(node=>node.classList.add('db138-mobile-hidden'));
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
    calendar.classList.add('db137-mobile-calendar','db136-compact-calendar');
    const days=$$('.db107-calendar-day:not(.empty),.db116-calendar-day,.uc48-day,.uc88-day',calendar);
    days.forEach(day=>{
      day.classList.add('db137-calendar-day');
      const label=clean(day.getAttribute('aria-label')||day.textContent),holiday=day.matches('.studio-holiday,.holiday')||/holiday/i.test(label),event=holiday||day.matches('.has-session,.has-sessions,.has-marker')||Boolean($('.uc48-calendar-post,.uc88-tag,.db107-cell-stats,.db123-holiday-label',day));
      if(!day.getAttribute('aria-label'))day.setAttribute('aria-label',label);
      day.classList.toggle('db137-has-event',event);day.classList.toggle('db137-holiday',holiday);
      if(day.matches('.uc48-day')&&day.dataset.db138Agenda!=='1'){
        day.dataset.db138Agenda='1';day.setAttribute('role','button');day.tabIndex=0;
        const show=()=>{let agenda=calendar.nextElementSibling?.matches('.db136-calendar-agenda')?calendar.nextElementSibling:null;if(!agenda){agenda=document.createElement('section');agenda.className='db136-calendar-agenda';calendar.after(agenda);}const heading=document.createElement('h3');heading.textContent='Schedule for day '+clean($('.uc48-day-num',day)?.textContent);const list=document.createElement('div');list.className='db136-agenda-list';$$('.uc48-calendar-post',day).forEach(post=>{const copy=post.cloneNode(true);copy.classList.add('db136-agenda-card');list.appendChild(copy);});if(!list.children.length){const empty=document.createElement('p');empty.textContent='No scheduled items for this date.';list.appendChild(empty);}agenda.replaceChildren(heading,list);$$('.uc48-day',calendar).forEach(cell=>cell.classList.toggle('selected',cell===day));};
        day.addEventListener('click',show);day.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();show();}});
      }
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
    const signature=chart+'|'+days.join('|')+'|'+series.map(item=>item.key+':'+(item.values||[]).join(',')).join('|');
    if(canvas.dataset.db139ChartKey!==signature){canvas.parentElement.scrollLeft=0;canvas.parentElement.scrollTop=0;state.index=null;canvas.dataset.db139ChartKey=signature;}
    canvas.parentElement.classList.toggle('db139-donut-shell',chart==='pie');
    canvas.style.setProperty('--db139-chart-width',width+'px');canvas.style.setProperty('--db139-chart-height',height+'px');
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
      let timer=0,start=null,held=false;
      canvas.addEventListener('pointermove',event=>{if(event.pointerType!=='touch')inspect(event);},{passive:true});
      canvas.addEventListener('touchstart',event=>{
        clearTimeout(timer);held=false;start=event.touches[0];
        timer=setTimeout(()=>{held=true;inspect(event);},350);
      },{passive:true});
      canvas.addEventListener('touchmove',event=>{
        const finger=event.touches[0];
        if(!held&&start&&(Math.abs(finger.clientX-start.clientX)>7||Math.abs(finger.clientY-start.clientY)>7))clearTimeout(timer);
        if(held){event.preventDefault();inspect(event);}
      },{passive:false});
      const end=()=>{clearTimeout(timer);held=false;start=null;};
      canvas.addEventListener('touchend',end,{passive:true});canvas.addEventListener('touchcancel',end,{passive:true});
      canvas.dataset.db137Scrubber='1';
    }
    canvas.__db137ChartData={data,days,chart};return true;
  }

  function paintMarketingChart({canvas,data,chart,colors=[]}){
    const series=(data.channels||[]).map((channel,index)=>{const values=(data.buckets||[]).map(bucket=>Number(data.map.get(bucket)?.[channel]||0));return {key:channel,label:channel,values,total:values.reduce((sum,value)=>sum+value,0),color:colors[index%colors.length]};});
    const formatValue=/_paise$/.test(data.metric||'')?value=>`₹${(Number(value||0)/100).toLocaleString('en-IN',{maximumFractionDigits:2})}`:value=>Number(value||0).toLocaleString('en-IN');
    return paintMobileChart({canvas,data:{days:data.buckets||[],series},chart,palette:(key,index)=>series[index]?.color||colors[index%colors.length],formatValue});
  }

  window.DropBeatMobileChart={paint:paintMobileChart,paintMarketing:paintMarketingChart};

  function enhanceCompactFilters(root){
    $$('.uc88-toolbar,[data-attendance-filters]',root).forEach(filters=>{
      if(filters.closest('#heatMaps')){
        filters.classList.add('db139-heat-filters');
        $('[data-uc92-heat-path]',filters)?.closest('.field')?.classList.add('db139-wide-filter');
      }else if(filters.matches('[data-attendance-filters]'))filters.classList.add('db139-attendance-filters');
    });
    const heat=$('#heatMaps');
    if(heat&&root.contains(heat)||root===heat){
      const list=$('[data-uc92-engagement]',heat),aside=list?.closest('aside');
      if(aside&&!$('.db139-engagement-open',aside)){
        const trigger=document.createElement('button');trigger.type='button';trigger.className='btn secondary db139-engagement-open';trigger.textContent='Top Engagement Elements';
        trigger.onclick=()=>openChoiceSheet({title:'Top Engagement Elements',trigger,done:true,render(content){const copy=list.cloneNode(true);copy.removeAttribute('data-uc92-engagement');copy.removeAttribute('id');copy.classList.remove('db139-hide');copy.classList.add('db139-engagement-copy');content.appendChild(copy);}});
        aside.appendChild(trigger);list.classList.add('db139-hide');$('h3',aside)?.classList.add('db139-hide');
      }
    }
    $$('#refunds .pay-detail',root).forEach(detail=>{
      const search=$('.refund-search-btn',detail),launcher=$('.db138-open-form',detail);
      if(!search||!launcher)return;
      let actions=$('.db139-refund-actions',detail);
      if(!actions){
        actions=document.createElement('div');actions.className='db139-refund-actions';
        launcher.before(actions);
        const submit=document.createElement('button');submit.type='button';submit.className='btn compact db139-refund-search-action';submit.textContent='Search';submit.onclick=()=>search.click();
        actions.append(submit,launcher);search.classList.add('db138-proxied');
      }
    });
  }

  function enhanceCharts(root){
    $$('canvas',root).filter(canvas=>canvas.closest('[class*="chart"],#growthAnalytics,[class*="analytics"]')).forEach(canvas=>{canvas.parentElement?.classList.add('db137-generic-chart-shell');});
    $$('.uc88-toolbar',root).forEach(toolbar=>toolbar.classList.add('db137-chart-controls'));
    $$('.uc88-chart-types,.uc88-legend',root).forEach(row=>row.classList.add('db137-scroll-legend'));
  }

  /* ---------- One event-driven controller for late data and all three dashboards ---------- */
  const observed=new Map();
  let running=false;
  function activeRoots(){
    const roots=[],active=$('#adminApp .panel.active');if(active)roots.push(active);
    $$('.portal-view:not([hidden]),'+MODALS).forEach(root=>roots.push(root));
    return [...new Set(roots)];
  }
  function enhance(root){
    if(!PHONE.matches||!isDashboard())return;
    classifySheets(root);enhanceCarousels(root);enhanceCompactCards(root);enhanceTabNavigation(root);enhanceSearch(root);
    $$('form',root).forEach(enhanceForm);enhanceSelectors(root);
    $$('.db107-calendar,.db119-calendar-card,.uc48-calendar-shell,.uc88-analytics-card',root).forEach(enhanceCalendar);
    enhanceCharts(root);enhanceClientModal();enhanceCustomSubscription();enhanceDashboardCopy();enhanceProducts();enhanceHeaderIcons(root);enhanceCompactFilters(root);
  }
  function observeSurfaces(){
    if(typeof MutationObserver!=='function'||!PHONE.matches)return;
    const main=$('#adminApp .main,.portal-main'),roots=[document.body,main,...$$(MODALS)].filter(Boolean);
    for(const [root,observer] of observed){if(!roots.includes(root)){observer.disconnect();observed.delete(root);}}
    roots.forEach(root=>{
      let observer=observed.get(root);
      if(!observer){
        observer=new MutationObserver(records=>{
          if(running)return;
          const relevant=records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1&&!String(node.className||'').includes('db138-')&&!String(node.className||'').includes('db137-carousel-dots')));
          if(relevant)queuePasses();
        });
        observed.set(root,observer);
      }
      observer.observe(root,{childList:true,subtree:root!==document.body});
    });
  }
  function runPass(){
    if(!PHONE.matches||running)return;
    running=true;observed.forEach(observer=>observer.disconnect());
    try{document.body.classList.add('db138-mobile');activeRoots().forEach(enhance);wrapPresentationRoutes();updateModalLock();}
    finally{running=false;observeSurfaces();}
  }
  function queuePasses(){
    if(!PHONE.matches||passQueued)return;passQueued=true;
    requestAnimationFrame(()=>{runPass();passQueued=false;});
  }
  function wrapPresentationRoutes(){
    const names=['tab','newProduct','editProduct','editProductById','renderProducts','renderUCClientDetails','load_dashboard','load_products','load_orders','load_refunds','load_leads','load_requests','load_subscribers','load_unsubscribed','load_oneTimeUsers','load_favorites','load_pages','loadUCSubscriptionOverview','db125OpenScheduleMeeting'];
    names.forEach(name=>{
      const original=window[name];if(typeof original!=='function'||original.__db138)return;
      const wrapped=function(){
        const args=[...arguments],result=original.apply(this,args);
        if(PHONE.matches){
          if(name==='tab'){
            if(args[0]==='customSubscription')openPaymentPage();else if(args[0]!=='salesHub')closePaymentPage();
            $$('.db137-scroll-chart,.db137-generic-chart-shell').forEach(shell=>{shell.scrollLeft=0;shell.scrollTop=0;});
          }
          if(['newProduct','editProduct','editProductById'].includes(name)){const form=$('#productForm');if(formStates.has(form)){formStates.get(form).furthest=0;syncWizard(form,0);}}
          queuePasses();
          if(result&&typeof result.then==='function')result.then(queuePasses,queuePasses);
        }
        return result;
      };
      Object.assign(wrapped,original);wrapped.__db138=true;window[name]=wrapped;
    });
  }
  function install(){
    if(!isDashboard())return;
    choiceSheet();document.addEventListener('click',mobileHelpClick,true);
    window.addEventListener('click',event=>{
      if(PHONE.matches&&event.target.closest?.('[data-portal-nav],[data-settings-tab]'))queuePasses();
    },true);
    document.addEventListener('click',event=>{
      if(!PHONE.matches)return;
      const summary=event.target.closest('.db138-order-bucket>summary');if(summary&&!event.target.closest('button,a'))event.preventDefault();
      const source=event.target.closest('[data-uc84-sales="customSubscription"]');
      if(source)setTimeout(openPaymentPage,0);
      if(event.target.closest('button,a,summary,[role="button"]'))queuePasses();
    });
    document.addEventListener('submit',queuePasses,true);document.addEventListener('change',queuePasses,true);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&PHONE.matches){if(!$('#db137ChoiceSheet')?.hidden)closeChoiceSheet();else if($('#customSubscription[data-db138-open="true"]'))closePaymentPage();}
    });
    for(const name of ['dropbeat:portal-model','uc-products-rendered','uc:webinar-members-loaded','dropbeat:admin-ready','dropbeat:chart-rendered']){
      window.addEventListener(name,queuePasses);document.addEventListener(name,queuePasses);
    }
    window.addEventListener('popstate',queuePasses);
    PHONE.addEventListener?.('change',event=>{
      document.body.classList.toggle('db138-mobile',event.matches);
      if(event.matches)queuePasses();else{observed.forEach(observer=>observer.disconnect());closeChoiceSheet();closePaymentPage();enhanceDashboardCopy();}
    });
    runPass();
    // Existing workspace installers finish in bounded stages. Rebind presentation
    // only after those stages; never issue requests or schedule a recurring poll.
    [80,650,1900,5800,8600].forEach(delay=>setTimeout(runPass,delay));
    document.dispatchEvent(new CustomEvent('dropbeat:dashboard-mobile-v138-ready',{detail:{build:BUILD}}));
  }
  window.DropBeatMobileUI={build:BUILD,refresh:queuePasses,openPaymentPage,closePaymentPage,openHelp};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
