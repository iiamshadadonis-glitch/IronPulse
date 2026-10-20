/* IronPulse Gym V1.47 — shared native mobile dashboard components.
   This file changes presentation and navigation only. Existing form controls,
   click handlers, validation, API calls and saved data remain authoritative. */
(()=>{
  'use strict';
  if(window.__DROPBEAT_DASHBOARD_MOBILE_V147__)return;

  const BUILD='dropbeat-1.47-20261017';
  const PHONE=window.matchMedia('(max-width:760px)');
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const $$=(selector,root=document)=>[...(root?.querySelectorAll?.(selector)||[])];
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  const titleCase=value=>clean(value).replace(/(^|\s)\S/g,char=>char.toUpperCase());
  let passQueued=false;
  document.documentElement.dataset.dropbeatMobileController='v145';
  document.body.classList.toggle('db138-mobile',PHONE.matches);

  window.__DROPBEAT_DASHBOARD_MOBILE_V147__={build:BUILD,mode:'presentation-only'};
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
    sheet.__db143Restore?.();sheet.__db143Restore=null;
    const trigger=sheet.__trigger;sheet.__trigger=null;trigger?.focus?.({preventScroll:true});
  }

  function openChoiceSheet({title='Choose an option',trigger,render,done=false}){
    const sheet=choiceSheet(),content=$('.db137-choice-content',sheet),footer=$('.db137-choice-footer',sheet);
    sheet.__db143Restore?.();sheet.__db143Restore=null;
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
    const mapped=v146ControlLabel(control);if(mapped)return mapped;
    const field=control.closest('.field,.portal-field,fieldset,.uc48-field-shell,.uc48-platform-block');
    const label=control.labels?.[0]||control.closest('label')||$('label,legend',field);
    if(label){const copy=label.cloneNode(true);$$('input,select,textarea,small,.hint,.switch',copy).forEach(node=>node.remove());const text=clean(copy.textContent);if(text)return text;}
    return clean(control.getAttribute('aria-label')||titleCase((control.name||'').replaceAll('_',' '))||'Choose an option');
  }

  function syncSelectTrigger(select){
    const trigger=select.nextElementSibling?.matches('.db137-select-trigger')?select.nextElementSibling:null;if(!trigger)return;
    const selected=[...select.selectedOptions].map(option=>clean(option.textContent)).filter(Boolean);
    const text=selected.join(', ')||select.getAttribute('placeholder')||'Choose '+controlLabel(select);
    if(trigger.classList.contains('db143-coach-choice')&&$('span',trigger))$('span',trigger).textContent=text;else trigger.textContent=text;
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
  const FIELD_SELECTOR='.field,.portal-field,fieldset,.check,.toggle-row,.db107-toggle,.db108-switch-row,.uc94-enable-row,.uc-social-toggle-capsule,.uc-pay-toggle-capsule,.uc1705-switch-row,.db121-remuneration-toggle,.uc48-field-shell,.uc-v1624-control-card,.uc-v153-featured-control,.uc-auto-ad-row,.uc-v157-schedule-control';
  const ATOMIC_SELECTOR='[data-db145-unit],[data-db144-unit],[data-db108-manual-class],[data-db107-plan-class],#ucSubscriptionOptions,.db121-availability-editor,[data-db121-availability],.db121-availability,.db122-coach-pay,[data-db140-media-step],[data-db140-ad-row],#ucV157ScheduleControl,[data-db142-post-step]';
  function formControls(form){return $$('input,select,textarea',form).filter(control=>!control.closest('.uc-info-back-panel,#ucPlanHelp,.db138-review'));}
  function formUnits(form){
    const brand=v145FormUnits(form);if(brand)return brand;
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
    const names=unitNames(unit),id=form.getAttribute('id')||'';
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
    const brand=v145FormSteps(form,units);if(brand)return brand;
    const reviewed=steps=>[...steps,{label:'Review',items:[]}];
    if(form.matches('#uc48TextForm,#uc48ImageForm,#uc48VideoForm,#uc48StoryForm,form[id^="uc56CarouselForm_"]')){
      const carousel=form.getAttribute('id').startsWith('uc56'),labels=carousel?['Media Assembly','Content & Settings']:['Content & Settings'];
      if(!carousel&&form.matches('#uc48ImageForm,#uc48VideoForm'))labels[0]='Media, Content & Settings';
      return [...labels.map((label,index)=>({label,items:units.filter(unit=>Number(unit.dataset.db142PostStep)===index)})),{label:'Review & Publish',items:[]}];
    }
    if(form.matches('#ucV9InvoiceForm,#ucV10InvoiceForm,#ucV14RefundInvoiceForm'))return reviewed(['Customer Details','Billing & Plans','Terms & Notes'].map((label,index)=>({label,items:units.filter(unit=>{
      const names=unitNames(unit);
      const step=/\b(?:invoiceNo|invoiceDate|refundDate|billTo|phone|email|address)\b/.test(names)?0:/\b(?:terms|notes|legalName|legalAddress|description)\b/.test(names)?2:1;
      return step===index;
    })})));
    if(form.getAttribute('id')==='db141ClientRefundForm')return reviewed(['Customer Details','Payment Details','Refund Details'].map((label,index)=>({label,items:units.filter((unit,position)=>{
      const step=position<3?0:unit.querySelector('#ucV14RefundAmount,#ucV14RefundReason')?2:1;return step===index;
    })})));
    if(form.getAttribute('id')==='ucV1624MediaForm')return reviewed(['Upload','Social Status','Scrolling Images'].map((label,index)=>({label,items:units.filter(unit=>Number(unit.dataset.db140MediaStep)===index)})));
    if(form.dataset.db144Faq)return reviewed([{label:'FAQ Details',items:units}]);
    if(form.dataset.db144Integration){const groups=[],labels=['Connection Details','Options','Advanced Settings'];for(let i=0;i<units.length;i+=6)groups.push({label:labels[groups.length]||'Additional Settings '+(groups.length-2),items:units.slice(i,i+6)});return reviewed(groups);}
    if(form.dataset.db143PageEditor)return reviewed([{label:'Editor',items:units}]);
    if(form.matches('[data-db122-class-change-form]'))return reviewed(['Class & Coach','Schedule & Reason'].map((label,index)=>({label,items:units.filter(unit=>(/changeType|newCoachId/.test(unitNames(unit))?0:1)===index)})));
    if(form.getAttribute('id')==='blogForm')return reviewed(['Fitness Tip','Image & Publishing','Social & Schedule'].map((label,index)=>({label,items:units.filter(unit=>blogStep(unit)===index)})).filter(step=>step.items.length));
    if(form.getAttribute('id')==='db140AdvertisementForm')return reviewed([{label:'Advertisements',items:units}]);
    if(form.matches('[data-coach-form]'))return reviewed(['Coach Details','Schedule & Availability','Approved Remuneration','Social Profiles'].map((label,index)=>({label,items:units.filter(unit=>specializedStep(form,unit)===index)})).filter(step=>step.items.length));
    if(form.getAttribute('id')==='subscriptionBox'||form.getAttribute('id')==='oneTimeBox')return ['Customer Details','Class Details','Payment Details','Review & Create'].map((label,index)=>({label,items:units.filter(unit=>specializedStep(form,unit)===index)}));
    if(form.getAttribute('id')==='productForm')return reviewed(['Plan Basics','Pricing & Billing','Class & Schedule','Plan Features'].map((label,index)=>({label,items:units.filter(unit=>specializedStep(form,unit)===index)})));
    if(units.length<=4)return reviewed([{label:'Details',items:units}]);
    const groups=['Contact Details','Schedule & Availability','Payment Details','Media & Display','Options'].map(label=>({label,items:[]}));
    units.forEach(unit=>{
      const words=unitWords(unit);
      const index=/price|billing|payment|amount|rate|remuneration/.test(words)?2:/class|session|schedule|date|time|availability|dance/.test(words)?1:/media|image|photo|video|banner/.test(words)?3:/name|email|phone|whatsapp|customer|student|coach|gender|age/.test(words)?0:4;
      groups[index].items.push(unit);
    });
    return reviewed(groups.filter(group=>group.items.length));
  }
  function blogStep(unit){
    const names=unitNames(unit);
    if(/social_first_comment|is_featured|auto_ads|schedule|poll/i.test(names+' '+unit.id))return 2;
    if(/cover_image|status|uc54Fitness TipsImage/.test(names+' '+unit.id))return 1;
    return 0;
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
    if(invalid){revealInvalid(form,invalid);return false;}
    return validateSocialStep(form,index);
  }
  function decorateFormContent(form,state){
    $$('div,section,fieldset',state.body).forEach(row=>{
      if(state.units.includes(row)||state.units.some(unit=>unit.contains(row)))return;
      const children=state.units.filter(unit=>row.contains(unit));if(children.length)row.classList.toggle('db137-step-empty',!children.some(unit=>unit.classList.contains('db137-step-active')));
    });
    const candidates=[...state.body.children];
    candidates.forEach(node=>{
      if(!node.matches('h2,h3,h4,p,.hint,.notice,.uc-one-time-warning,.db107-modal-note')||node.matches('[id*="Msg"],[data-msg]')||node.contains($('input',node)))return;
      if(node.matches('.db142-validation'))return;
      if(node.matches('.uc-plan-next-step')){node.classList.add('db138-mobile-hidden');return;}
      let next=node.nextElementSibling,owner=null;
      while(next&&!owner){owner=state.units.find(unit=>unit===next||next.contains(unit));next=next.nextElementSibling;}
      if(!owner)owner=state.units.at(-1);
      if(owner){node.classList.add('db138-step-decoration');node.dataset.db137Step=owner.dataset.db137Step;node.classList.toggle('db137-step-active',owner.classList.contains('db137-step-active'));}
    });
  }
  function reviewForm(form,state){
    if(!state.review)return;
    const fingerprint=v145ReviewKey(form,state);if(state.reviewKey===fingerprint)return;state.reviewKey=fingerprint;
    state.review.replaceChildren();
    if(v145BrandReview(form,state))return;
    if(form.dataset.db142Social){reviewSocialForm(form,state);return;}
    if(form.closest('#tracking')){trackingReview(form,state);return;}
    state.steps.slice(0,-1).forEach(step=>{
      const section=document.createElement('section'),heading=document.createElement('h3'),grid=document.createElement('dl');
      heading.textContent=step.label;section.append(heading,grid);
      const seen=new Set();
      step.items.forEach(unit=>formControls(unit).forEach(control=>{
        const structured=control.type==='hidden'&&/features_json|dance_styles_json|class_days_json|reminder_channels_json|availability_json|class_types_json/.test(control.name);
        if((control.type==='hidden'&&!structured)||(control.disabled&&form.getAttribute('id')!=='db141ClientRefundForm')||control.type==='password'||(form.dataset.db144Integration&&/secret|token|private.?key|api.?key|authHeader|password/i.test(control.name||control.id))||control.closest('#currentProductMedia')||conditionallyHidden(control,form))return;
        const label=structured?titleCase(control.name.replace(/_json$/,'').replaceAll('_',' ')):controlLabel(control);
        let value=control.type==='checkbox'?(control.checked?'Enabled':'Disabled'):control.type==='file'?[...control.files].map(file=>file.name).join(', '):control.tagName==='SELECT'?[...control.selectedOptions].map(option=>clean(option.textContent)).join(', '):control.value;
        if(structured){try{const data=JSON.parse(value);if(Array.isArray(data))value=data.map(item=>typeof item==='object'?Object.values(item).join(' · '):item).join(', ');}catch{}}
        if(form.dataset.db145Brand&&control.readOnly&&!value)value=control.placeholder||'Not configured';
        if(!value)return;
        const key=label+':'+value;if(seen.has(key))return;seen.add(key);
        const term=document.createElement('dt'),definition=document.createElement('dd');term.textContent=label;definition.textContent=value;grid.append(term,definition);
      }));
      if(grid.children.length)state.review.appendChild(section);
    });
    if(form.getAttribute('id')==='ucV1624MediaForm')reviewMedia(form,state.review);
    if(form.dataset.db144Integration)v144IntegrationReview(form,state);
    if(form.dataset.db142Social)reviewSocialMedia(form,state.review);
    v145PrivateReview(form,state);
    if(!state.review.childElementCount){const note=document.createElement('p');note.className='hint';note.textContent='No optional details entered.';state.review.appendChild(note);}
  }
  function syncWizard(form,next,shouldScroll=false){
    const state=formStates.get(form);if(!state)return;
    const current=Math.max(0,Math.min(state.steps.length-1,Number(next||0)));state.current=current;form.dataset.db137Current=String(current);
    state.units.forEach(unit=>unit.classList.toggle('db137-step-active',Number(unit.dataset.db137Step)===current));
    decorateFormContent(form,state);
    $$('.db137-wizard-step',state.progress).forEach((button,index)=>{
      const complete=index<current;button.classList.toggle('complete',complete);button.classList.toggle('active',index===current);button.disabled=!socialFreeNavigation(form)&&index>state.furthest;
      button.setAttribute('aria-current',index===current?'step':'false');$('.db137-wizard-number',button).textContent=complete?'✓':String(index+1);
    });
    $('[data-db137-back]',state.nav).disabled=current===0;
    $('[data-db137-next]',state.nav).hidden=current===state.steps.length-1;
    $$('[data-db137-finish]',state.nav).forEach(button=>{button.hidden=current!==state.steps.length-1;button.disabled=Boolean(button.__source?.disabled);});
    $('[data-db137-counter]',state.nav).textContent='Step '+(current+1)+' of '+state.steps.length;
    if(state.review){state.review.hidden=current!==state.steps.length-1;if(!state.review.hidden)reviewForm(form,state);}
    form.classList.toggle('db137-wizard-final',current===state.steps.length-1);
    if(form.dataset.db145Brand)v146ScopeForm(form,state);
    if(state.review&&!state.review.hidden)v146FormatReview(state.review);
    if(shouldScroll)state.body.scrollTop=0;
  }
  function originalSubmit(form,source){
    const state=formStates.get(form),invalid=invalidControl(form,state.units);
    if(invalid){revealInvalid(form,invalid);return;}
    if(!source||source.disabled)return;
    if(socialFreeNavigation(form)){for(let index=0;index<state.steps.length-1;index++){if(!validateSocialStep(form,index)){syncWizard(form,index,true);return;}}}
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
    if(form.matches('[data-email-template-form],[data-db122-remuneration-filter],#loginForm,[role="search"],.search-form,.filter-form,[class*="filter"],[data-statement-filters]')||form.closest('#db137ChoiceSheet,.db140-filter-overlay'))return;
    prepareMediaWizard(form);prepareSocialForm(form);
    const controls=formControls(form),submit=form.dataset.db145Brand==='settings'?v145OriginalActions(form).final:$('[data-db143-source-submit],button[type="submit"],input[type="submit"],button:not([type]),.blog-buttons button,.uc-v9-doc-actions button,#ucV14RefundButton',form);
    if(!controls.some(control=>control.type!=='hidden')||!submit)return;
    const signature=(form.dataset.db145Brand?form.dataset.db145Brand+':'+form.dataset.db145Mode+':'+form.dataset.db145View:form.dataset.db144Integration||form.dataset.db144Faq||'')+'|'+controls.map(control=>(control.name||control.dataset.slotField||'')+':'+control.type).join('|'),old=formStates.get(form);
    if(old&&old.signature===signature&&old.units.every(unit=>form.contains(unit))){syncWizard(form,old.current);return;}
    const current=old?.current||0,furthest=old?.furthest||0;
    clearLegacyWizard(form);
    let body=$(':scope>.db138-form-content',form);
    if(!body){body=document.createElement('div');body.className='db138-form-content';const children=[...form.childNodes];form.appendChild(body);children.forEach(node=>body.appendChild(node));}
    $('.db138-review',body)?.remove();
    const units=formUnits(form);if(!units.length)return;
    const steps=buildSteps(form,units);
    steps.forEach((step,index)=>step.items.forEach(unit=>{unit.classList.add('db137-step-unit');unit.dataset.db137Step=String(index);}));
    const actions=submit.closest('.form-actions,.uc-form-actions,.uc93-email-actions,.uc-v9-doc-actions,.blog-buttons,.uc-v14-refund-actions')||submit;
    actions.classList.add('db137-original-actions');
    const sources=form.dataset.db145Brand?[submit]:actions.matches('button,input')?[submit]:$$('button,input[type="submit"]',actions).filter(button=>!button.matches('[data-db137-finish]')&&!/^clear|^cancel|^reset/i.test(clean(button.textContent||button.value))&&(!(form.dataset.db143PageEditor||form.dataset.db144Integration)||button.hasAttribute('data-db143-source-submit')));
    const progress=document.createElement('nav');progress.className='db137-wizard-progress';progress.setAttribute('aria-label','Form progress');
    steps.forEach((step,index)=>{
      const button=document.createElement('button');button.type='button';button.className='db137-wizard-step';button.dataset.db137Jump=String(index);
      const number=document.createElement('span'),label=document.createElement('span');number.className='db137-wizard-number';number.textContent=String(index+1);label.textContent=step.label;button.append(number,label);progress.appendChild(button);
    });
    const nav=document.createElement('footer');nav.className='db137-wizard-nav';nav.innerHTML='<button type="button" class="db137-wizard-back" data-db137-back>Back</button><span data-db137-counter></span><button type="button" class="db137-wizard-next" data-db137-next>Continue</button>';
    sources.forEach((source,index)=>{
      const finish=document.createElement('button');finish.type='button';finish.className='db137-wizard-finish'+(index?' db138-secondary-finish':'');finish.dataset.db137Finish='1';
      finish.textContent=clean(source.textContent||source.value)||'Save';finish.onclick=()=>originalSubmit(form,source);nav.appendChild(finish);
      finish.__source=source;
      if(source.id==='ucV14RefundButton')finish.classList.add('danger');
      if(form.matches('#ucV9InvoiceForm,#ucV10InvoiceForm,#ucV14RefundInvoiceForm')){
        finish.classList.add('db141-document-action');
        finish.innerHTML=icon(index===0?'download':index===1?'whatsapp':'mail')+'<span>'+(index===0?'Invoice PDF':index===1?'WhatsApp':'Gmail')+'</span>';
        finish.setAttribute('aria-label',clean(source.textContent));
      }
    });
    const review=document.createElement('div');
    if(review){review.className='db138-review';body.appendChild(review);}
    const state={body,units,steps,progress,nav,review,signature,current,furthest};formStates.set(form,state);
    form.dataset.db137Wizard='1';form.dataset.db137Steps=String(steps.length);form.dataset.db138Wizard='1';form.prepend(progress);form.append(nav);
    $('[data-db137-back]',nav).onclick=()=>syncWizard(form,state.current-1,true);
    $('[data-db137-next]',nav).onclick=()=>{if(socialFreeNavigation(form)||validateWizardStep(form,state.current)){state.furthest=Math.max(state.furthest,state.current+1);syncWizard(form,state.current+1,true);}};
    $$('.db137-wizard-step',progress).forEach(button=>button.onclick=()=>{const target=Number(button.dataset.db137Jump);if(socialFreeNavigation(form)||target<=state.furthest)syncWizard(form,target,true);});
    if(form.dataset.db138Events!=='1'){
      form.dataset.db138Events='1';
      // Existing async handlers sometimes await integration settings before
      // calling preventDefault. Cancel browser navigation synchronously while
      // leaving the original submit handler and its API request in charge.
      form.addEventListener('submit',event=>{if(form.hasAttribute('onsubmit')||typeof form.onsubmit==='function')event.preventDefault();},true);
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
    const origin=container.getBoundingClientRect().left,maxScroll=Math.max(0,container.scrollWidth-container.clientWidth);
    for(let page=0;page<pages;page++){const target=items[Math.min(page*perPage,items.length-1)];if(!target)continue;const offset=target.getBoundingClientRect().left-origin+container.scrollLeft,position=Math.max(0,Math.min(maxScroll,offset)),distance=Math.abs(container.scrollLeft-position);if(distance<best){best=distance;active=page;}}
    $$('button',dots).forEach((button,index)=>{button.classList.toggle('active',index===active);button.setAttribute('aria-current',index===active?'true':'false');});
  }

  function enhanceMetricCarousel(container){
    const items=metricItems(container);
    if(items.length<2){
      container.classList.remove('db136-card-carousel','db137-metric-carousel');container.classList.toggle('db141-single-metric',items.length===1);delete container.dataset.db137Rows;
      items.forEach(item=>item.classList.add('db137-metric-card'));
      let dots=container.nextElementSibling;
      while(dots?.matches('.db136-carousel-dots,.db137-carousel-dots')){const next=dots.nextElementSibling;dots.remove();dots=next;}
      return;
    }
    container.classList.remove('db141-single-metric');
    const rows=items.length>5?2:1,perPage=rows*2,pages=Math.max(1,Math.ceil(items.length/perPage));
    container.classList.remove('db136-card-carousel');container.classList.add('db137-metric-carousel');container.dataset.db137Rows=String(rows);container.style.setProperty('--db137-rows',String(rows));
    items.forEach(item=>{item.classList.remove('db136-carousel-item');item.classList.add('db137-metric-card');});
    let legacy=container.nextElementSibling;while(legacy?.matches('.db136-carousel-dots')){const next=legacy.nextElementSibling;legacy.remove();legacy=next;}
    let dots=container.nextElementSibling?.matches('.db137-carousel-dots')?container.nextElementSibling:null;
    if(!dots){dots=document.createElement('div');dots.className='db137-carousel-dots';dots.setAttribute('aria-label','Metric pages');container.after(dots);}
    if(Number(dots.dataset.pages||0)!==pages){
      dots.replaceChildren(...Array.from({length:pages},(_,page)=>{
        const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Show metric page ${page+1}`);
        button.onclick=()=>{const current=metricItems(container),perPage=Number(container.dataset.db137Rows||1)*2,target=current[Math.min(page*perPage,current.length-1)],left=target?target.getBoundingClientRect().left-container.getBoundingClientRect().left+container.scrollLeft:0;container.scrollTo({left,behavior:'smooth'});};return button;
      }));dots.dataset.pages=String(pages);
    }
    dots.hidden=pages<=1;
    if(container.dataset.db137Carousel!=='1'){
      let frame=0;container.addEventListener('scroll',()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;const dots=container.nextElementSibling;if(dots?.matches('.db137-carousel-dots'))syncMetricDots(container,dots);});},{passive:true});container.dataset.db137Carousel='1';
    }
    syncMetricDots(container,dots);
  }

  function enhanceCarousels(root){
    $$('.dashboard-cards,.portal-metrics,.attendance-summary-grid,.uc95-metric-grid,.uc92-kpis,.db116-attendance-metrics,.uc-client-stat-grid,.db136-metric-carousel,.db137-role-metrics,[data-uc88-growth-summary],.uc-source-summary,.uc-period-summary',root).forEach(enhanceMetricCarousel);
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
    $$('[class~="head"],[class*="-head"]',root).forEach(header=>{
      if(header.children.length<2||header.closest('[class*="calendar"]'))return;
      const names=[...header.classList],shared=names.filter(name=>!/(^|-)head$/.test(name)&&/(grid|row|list)/.test(name)&&!/calendar/.test(name)),prefixes=names.filter(name=>/-head$/.test(name)).map(name=>name.replace(/-head$/,''));
      if(!names.includes('head')&&!prefixes.length)return;
      const labels=[...header.children].map(cell=>clean(cell.textContent)||'Details'),rows=[...header.parentElement.children].filter(row=>row!==header&&row.children.length&&(shared.some(name=>row.classList.contains(name))||prefixes.some(prefix=>['-row','-grid-row','-list-row'].some(suffix=>row.classList.contains(prefix+suffix)))));
      if(!rows.length)return;
      header.classList.add('db136-stacked-head');
      header.parentElement.classList.add('db141-record-list');
      rows.forEach(row=>{
        row.classList.add('db136-stacked-row','db137-compact-record','db141-record');
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
  const MODAL_NODES='.modal,.db114-modal,.portal-modal,.portal-v122-modal,.portal-v122-forced-modal,.uc1705-modal';
  function updateModalLock(){
    document.body.classList.toggle('db138-form-open',Boolean($('#customSubscription[data-db138-open="true"],.db138-inline-form-open,.db140-filter-overlay:not([hidden]),.modal.open,.portal-modal:not([hidden]),.db114-modal:not([hidden])')));
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
    if(['subscriptionBox','oneTimeBox'].includes(form.getAttribute('id'))||form.closest(MODALS)||form.dataset.db138Inline==='1')return;
    form.dataset.db138Inline='1';form.classList.add('db138-inline-form');
    const owner=form.closest('.card,details,.portal-card,.panel,.portal-view'),title=form.dataset.db144Title||clean($('h2,h3,h1,summary',owner)?.textContent)||'Edit Details';
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
      if(card&&$('form:not([data-statement-filters]):not(.filter-form):not([data-attendance-filters])',card))card.classList.add('db138-form-dialog');
      if(card){
        if(!$('form',card))card.classList.add('db145-safe-scroll');
        $$('[id$="Body"],.modal-body,.portal-modal-body,.uc1705-modal-body,.db114-modal-body',card).forEach(body=>body.classList.add('db145-safe-scroll'));
        const head=$(':scope>.top,:scope>.modal-head,:scope>.modal-header,:scope>.uc94-modal-head,:scope>.uc-v1634-modal-head,:scope>[data-create-front]>.uc-v1634-modal-head,:scope>#ucV1624MediaFront>.top',card);
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
    if(kind==='chevron')return window.DropBeatUI.disclosure();
    if(kind==='refresh')return window.DropBeatUI.refresh();
    const paths={
      copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
      search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
      refresh:'<path d="M20 7v5h-5"/><path d="M20 12a8 8 0 1 1-2.35-5.65L20 9"/>',
      download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
      close:'<path d="m6 6 12 12M18 6 6 18"/>',
      info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7" r=".7" fill="currentColor"/>',
      more:'<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
      filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
      plus:'<path d="M12 4v16M4 12h16"/>'
      ,up:'<path d="M12 20V4m-6 6 6-6 6 6"/>',down:'<path d="M12 4v16m-6-6 6 6 6-6"/>'

      ,line:'<path d="M3 3v18h18M6 15l4-6 5 4 5-8"/>'
      ,bar:'<path d="M3 3v18h18M7 17v-5m5 5V6m5 11V9"/>'
      ,hbar:'<path d="M3 3v18h18M7 7h9M7 12h13M7 17h6"/>'
      ,pie:'<path d="M12 3v9h9A9 9 0 0 0 12 3Z"/><path d="M8 4a9 9 0 1 0 12 12H8Z"/>'
      ,mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>'
      ,whatsapp:'<path d="M5 18 3 21l5-1a9 9 0 1 0-3-2Z"/><path d="m8 8 2 3 2 2 3 1 1-2-3-1-1 1-2-2 1-1-1-2Z"/>'
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
    if(!source||!actions)return null;if(source.__db145Actions?.isConnected)actions=source.__db145Actions;
    let proxy=source.__db138Proxy;
    if(!proxy||!proxy.isConnected){
      proxy=document.createElement('button');proxy.type='button';proxy.className='db138-icon-button db138-proxy-icon';proxy.innerHTML=icon(kind);proxy.setAttribute('aria-label',label||clean(source.textContent));proxy.title=label||clean(source.textContent);
      proxy.onclick=()=>source.click();proxy.__db138Source=source;actions.insertBefore(proxy,$(':scope>.db141-header-close',actions));source.__db138Proxy=proxy;source.classList.add('db138-proxied');
    }else if(proxy.parentElement!==actions)actions.insertBefore(proxy,$(':scope>.db141-header-close',actions));
    proxy.dataset.db139Action=kind;proxy.dataset.db139Source=source.className;
    proxy.disabled=source.disabled;return proxy;
  }
  const HELP_BUTTONS='.uc-card-eye,.uc-info-btn,.uc-plan-help-btn,[data-uc-info-open],.uc-info-toggle,.portal-info-btn,.db123-info-button,[data-db123-show-help],.uc48-info-btn,.uc49-info-btn,.uc93-info-btn,.uc88-help-toggle,.uc89-mode-help,.uc82-automation-info,.uc1700-info,[data-uc88-help-open],[data-uc90-mode-help],[data-uc92-help-open],[data-uc93-help],[data-uc97-webinar-help],[data-template-help],[data-uc82-automation-help],[data-create-info],[data-leave-info],[data-provider-help],[data-ai-help],[data-order-help],[data-uc84-tg-help]';
  const HELP_CONTENT='.uc-flip-back,.uc1707-provider-help,.uc-info-back-body,#ucPlanHelp,.uc-v163-order-help-inner,.uc88-help,.uc92-help,.uc49-help,.uc49-info-help,.uc93-help,.uc84-tg-help,.uc-v1624-media-help,.uc-v1635-create-help,.uc-v11-doc-help-panel,.db123-coach-settings-back,.db123-flip-back,.uc48-help,.uc48-info-back,.uc56-carousel-help,.uc82-help-back,[data-db123-coach-help],[data-uc88-help],[data-uc92-help],[data-template-help-panel],[data-uc97-webinar-help-panel],[data-uc93-help-panel],[data-uc93-back]';
  let helpReplay=false;
  function findHelp(button){
    const controlled=button.getAttribute('aria-controls')||button.dataset.helpTarget||button.dataset.infoTarget;
    if(controlled){const content=document.getElementById(controlled.replace(/^#/,''));if(content&&clean(content.textContent))return content;}
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
    if(button.__db138Source)return openHelp(button.__db138Source);
    if(button.matches('[data-uc88-help-open]')&&button.closest('#growthAnalytics')){const current=$('[data-uc90-mode-help]',$('#growthAnalytics'));if(current)return openHelp(current);}
    let content=findHelp(button),html=content?.innerHTML;
    {
      // Always run the current view renderer. Existing help HTML is not a cache.
      const owner=button.closest('.uc64-library-card,.card,.modal-card,details,.panel,.portal-card')||button.parentElement;
      const previousHelp=new Set($$(HELP_CONTENT,owner));
      // Legacy fronts often have only a data attribute, not a "front" class.
      // Restore every existing HTML node so help can never leave a page flipped.
      const snapshot=[owner,...$$('*',owner)].filter(node=>'hidden' in node).map(node=>({node,hidden:node.hidden,className:node.getAttribute('class')}));
      helpReplay=true;try{if(typeof button.onclick==='function'){const event=new MouseEvent('click',{bubbles:true,cancelable:true});Object.defineProperties(event,{target:{value:button},currentTarget:{value:button}});button.onclick.call(button,event);}else button.click();content=findHelp(button);html=content?.innerHTML;}finally{
        helpReplay=false;snapshot.forEach(item=>{item.node.hidden=item.hidden;if(item.className!==null)item.node.setAttribute('class',item.className);});
        $$(HELP_CONTENT,owner).filter(node=>!previousHelp.has(node)).forEach(node=>node.remove());
      }
    }
    if(!content){openTextSheet('Help & Instructions',clean(button.dataset.help||button.getAttribute('data-info')||button.title||button.getAttribute('aria-label'))||'Help is not available for this section yet.',button);return true;}
    const title='Help & Instructions';
    openChoiceSheet({title,trigger:button,done:true,render(host){
      const copy=document.createElement('article');copy.className='db138-help-copy';copy.innerHTML=html||content.innerHTML;
      $$('button,.uc-info-back-head,.uc-info-back-btn,input,select,textarea,script',copy).forEach(node=>node.remove());
      $$('[id]',copy).forEach(node=>node.removeAttribute('id'));
      $$('[hidden]',copy).forEach(node=>node.removeAttribute('hidden'));host.appendChild(copy);
    }});
    return true;
  }
  function mobileHelpClick(event){
    if(!PHONE.matches||helpReplay||event.target.closest('#db137ChoiceSheet'))return;
    const button=event.target.closest(HELP_BUTTONS);
    if(button&&!button.matches('.uc-info-back-btn')&&openHelp(button)){event.preventDefault();event.stopImmediatePropagation();}
  }
  function mobileHeader(source){
    const social=source.closest('form.db142-social-form'),socialHead=$(':scope>.db138-page-header',social);if(socialHead){normalizeHeader(socialHead);return socialHead;}
    const owner=source.closest('.top,.block-head,.portal-view-head,.modal-head,.db138-dialog-header,.uc-v9-doc-head,.db121-availability-head,.portal-card,.dashboard-block,.card,details,.panel,.portal-view');
    if(!owner)return null;
    let head=owner.matches('.top,.block-head,.portal-view-head,.modal-head,.db138-dialog-header,.uc-v9-doc-head,.db121-availability-head')?owner:$(':scope>.top,:scope>.block-head,:scope>.db138-dialog-header,:scope>.uc-v9-doc-head,:scope>.db138-list-header,:scope>header,:scope>h2,:scope>h3,:scope>summary',owner);
    if(!head)return null;
    if(head.matches('h2,h3')){
      let wrapper=head.closest('.db138-list-header');if(!wrapper){wrapper=document.createElement('div');wrapper.className='db138-list-header';head.before(wrapper);wrapper.appendChild(head);}head=wrapper;
    }
    normalizeHeader(head);return head;
  }
  function normalizeHeader(head){
    if(head.parentElement?.id==='customSubscription'&&head.matches('.top')){head.classList.remove('db139-header');return;}
    if(head.matches('.db138-page-header')){
      const close=directButtons(head).find(button=>/^close/i.test(button.getAttribute('aria-label')||''));
      if(close){close.classList.add('db141-header-close');headerActions(head).appendChild(close);}
    }
    head.classList.add('db139-header');
    [...head.children].forEach(child=>{
      if(child.matches('.db138-header-icons'))return;
      if($(':scope>h1,:scope>h2,:scope>h3',child))child.classList.add('db139-header-copy');
      else if(child.children.length&&[...child.children].every(node=>node.classList.contains('db138-proxied')))child.classList.add('db139-empty-toolbar');
    });
    const heading=$(':scope>h1,:scope>h2,:scope>h3,.db139-header-copy>h1,.db139-header-copy>h2,.db139-header-copy>h3',head);
    if(heading)heading.classList.add('db139-header-title');
  }
  function enhanceHeaderIcons(root){
    $$('.top,.block-head,.portal-view-head,.modal-head,.db138-list-header,.db138-dialog-header',root).forEach(normalizeHeader);
    $$('button,a',root).forEach(source=>{
      // The document help installer requires its direct header buttons in place.
      // Iconify those buttons in place rather than inserting proxy descendants.
      if(source.closest('#ucV9DocumentModal .uc-v9-doc-head'))return;
      if(source.matches('.db146-remove-location,.db138-proxy-icon,.db138-open-form,.db138-search-toggle,.db138-product-fab,.db140-filter-trigger')||source.closest('#db137ChoiceSheet,.uc-info-back-panel,.db140-refund-help,.db140-filter-overlay'))return;
      const text=clean(source.textContent);
      const help=source.matches(HELP_BUTTONS+',.db137-subscription-info');
      const kind=source.dataset.db138Icon==='close'?'close':help?'info':/^Refresh(?:\s+(?:Payments|Data|List|Calendar|Status|Sessions|Contacts|Records|Overview|Display))?$/i.test(text)?'refresh':/^Download\s+(?:Sample CSV|Excel|CSV|Sheet|Excel Sheet)$/i.test(text)?'download':null;
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
      if(tabs.matches('.uc49-tabs,.uc-client-tabs,.uc88-chart-types,.uc88-data-modes,.uc92-mini-tabs,.db137-segmented-modes'))return;
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
    let more=$(':scope > .db137-client-more',tabs);
    if(!more){more=document.createElement('button');more.type='button';more.className='db137-client-more';tabs.appendChild(more);}
    // Fit measured labels rather than reserving two oversized fixed-width pills.
    const available=modal.clientWidth-28,limit=available<350?3:4;
    const preferred=['Summary','Profile','History','Payments'];
    buttons.forEach(button=>button.classList.toggle('db137-client-overflow',!preferred.slice(0,limit).includes(clean(button.textContent))));
    const active=buttons.find(button=>button.classList.contains('active')),activeLabel=clean(active?.textContent);
    more.textContent='More';more.setAttribute('aria-label',active?.classList.contains('db137-client-overflow')?'More tabs. Selected: '+activeLabel:'More client tabs');
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
    enhanceClientMeta(modal);
    enhanceClientTabs(modal);enhanceClientActions(modal);enhanceClientPayments(modal);enhanceProfileMedia(modal);
    $('#ucTabSummary',modal)?.classList.add('db137-client-summary');
    $('#ucTabProfile',modal)?.classList.add('db137-client-profile');
    $('#ucTabHistory',modal)?.classList.add('db137-client-history');
    $('#ucTabPayments',modal)?.classList.add('db137-client-payments');
    $('#ucTabRefunds',modal)?.classList.add('db137-client-refunds');
    $('#ucTabInvoices',modal)?.classList.add('db137-client-invoices');
  }

  function enhanceClientMeta(modal){
    const fixed=$('.uc-client-fixed',modal);if(!fixed)return;
    const existing=$('.db140-visit-disclosures',fixed);
    if(existing){
      const panel=$('#db140VisitPanel2',existing);
      $$('.uc-page-chips',fixed).filter(chips=>!panel.contains(chips)).forEach(chips=>{panel.replaceChildren(chips);chips.hidden=false;});
      $$('.uc-v1634-page-history',fixed).forEach(section=>{const chips=$('.uc-page-chips',section);if(chips){section.before(chips);chips.hidden=false;}section.remove();});
      return;
    }
    const row=$(':scope>.uc-client-analytics-row',fixed),pages=$('.uc-page-chips',fixed);
    if(!row&&!pages)return;
    const box=document.createElement('section');box.className='db140-visit-disclosures';
    const menus=document.createElement('div');menus.className='db140-visit-menu';box.appendChild(menus);
    const groups=[['Visit Info',row?$$(':scope>.uc-crm-chip',row):[]],['Source',row?$$(':scope>.uc-source-pill',row):[]],['Most Visited',pages?[pages]:[]]];
    groups.forEach(([label,nodes],index)=>{
      const button=document.createElement('button'),panel=document.createElement('div');
      button.type='button';button.className='db140-meta-pill';button.textContent=label;button.setAttribute('aria-expanded','false');
      panel.id='db140VisitPanel'+index;panel.className='db140-visit-panel';panel.hidden=true;button.setAttribute('aria-controls',panel.id);
      nodes.forEach(node=>panel.appendChild(node));
      if(index===2){panel.classList.add('db141-visited-pages');nodes.forEach(node=>node.hidden=false);}
      if(!nodes.length){const empty=document.createElement('small');empty.textContent='No saved information.';panel.appendChild(empty);}
      button.onclick=()=>{const open=panel.hidden;$$('.db140-visit-panel',box).forEach(item=>item.hidden=true);$$('button',menus).forEach(item=>item.setAttribute('aria-expanded','false'));panel.hidden=!open;button.setAttribute('aria-expanded',String(open));};
      menus.appendChild(button);box.appendChild(panel);
    });
    row?.remove();const tabs=$('.uc-client-tabs',fixed);fixed.insertBefore(box,tabs);
    $$('.uc-v1634-page-history',fixed).forEach(section=>section.remove());
  }

  /* Product Images owns three real input sections and a separate Review.
     Existing upload, crop, cover and social handlers keep their original controls. */
  function prepareMediaWizard(form){
    if(form.getAttribute('id')!=='ucV1624MediaForm')return;
    const host=$(':scope>.db138-form-content',form)||form;
    const group=index=>{
      let node=$('[data-db140-media-step="'+index+'"]',form);
      if(!node){node=document.createElement('section');node.dataset.db140MediaStep=String(index);host.appendChild(node);}
      return node;
    };
    const upload=group(0),social=group(1),order=group(2);
    const title=(node,text)=>{if(!$(':scope>h3',node)){const h=document.createElement('h3');h.className='db140-media-title';h.textContent=text;node.prepend(h);}};
    title(upload,'Product Image');title(social,'Social Status');title(order,'Scrolling Images');
    const move=(node,target)=>{if(node&&!target.contains(node))target.appendChild(node);};
    ['image_url','drive_image_file','alt_text','is_cover'].forEach(name=>{
      const control=$('[name="'+name+'"]',form);move(control?.closest(name==='is_cover'?'.uc-v1624-cover-choice':'.field'),upload);
    });
    move($('#ucV1624SocialStatusToggle',form)?.closest('.uc-v1624-social-status-choice'),social);
    move($('#ucV1624SocialStatusFields',form),social);
    move($('#currentProductMedia'),order);
    const options=$('.uc-v1624-media-options',form);if(options&&!options.children.length)options.remove();
    let staged=$('.db140-staged-image',order);
    if(!staged){
      staged=document.createElement('article');staged.className='db140-staged-image';staged.hidden=true;
      staged.innerHTML='<img alt="New product image preview"><strong>New image</strong><div><button type="button" data-db140-stage-move="-1" aria-label="Move new image earlier">↑</button><button type="button" data-db140-stage-move="1" aria-label="Move new image later">↓</button></div>';
      order.appendChild(staged);
      $$('[data-db140-stage-move]',staged).forEach(button=>button.onclick=()=>{
        const count=$$('#currentProductMedia .media-card').length,index=Number(form.dataset.db140NewImageIndex??count),next=Math.max(0,Math.min(count,index+Number(button.dataset.db140StageMove)));
        form.dataset.db140NewImageIndex=String(next);syncMediaPreview(form);
      });
    }
    syncMediaPreview(form);
  }
  function syncMediaPreview(form){
    const staged=$('.db140-staged-image',form);if(!staged)return;
    const file=$('[name="drive_image_file"]',form)?.files?.[0],url=$('[name="image_url"]',form)?.value||'';
    if(file!==form.__db140PreviewFile){
      if(form.__db140ObjectURL)URL.revokeObjectURL(form.__db140ObjectURL);
      form.__db140PreviewFile=file;form.__db140ObjectURL=file?URL.createObjectURL(file):'';
    }
    const source=form.__db140ObjectURL||url;staged.hidden=!source;
    if(source){const image=$('img',staged);if(image.getAttribute('src')!==source)image.src=source;}
    const current=$('#currentProductMedia',form),cards=$$('.media-card',current),grid=$('.media-grid',current);
    const index=Math.max(0,Math.min(cards.length,Number(form.dataset.db140NewImageIndex??cards.length)));
    if(grid){if(staged.parentElement!==grid||staged.nextElementSibling!==cards[index])grid.insertBefore(staged,cards[index]||null);}
    $('strong',staged).textContent='New image · position '+(index+1);
    $$('[data-db140-stage-move]',staged).forEach(button=>button.disabled=Number(button.dataset.db140StageMove)<0?index===0:index===cards.length);
  }
  function reviewMedia(form,review){
    const section=document.createElement('section'),heading=document.createElement('h3');heading.textContent='Image Preview & Order';section.appendChild(heading);
    const cards=$$('#currentProductMedia .media-card,.db140-staged-image:not([hidden])',form);
    cards.forEach((card,index)=>{const source=$('img',card);if(!source)return;const row=document.createElement('div');row.className='db140-image-review-row';const image=source.cloneNode(true),label=document.createElement('span');label.textContent=(index+1)+'. '+(card.classList.contains('db140-staged-image')?'New product image':clean($('small',card)?.textContent)||'Saved image');row.append(image,label);section.appendChild(row);});
    if(cards.length)review.appendChild(section);
  }

  /* Filters have a dedicated overlay so opening a select/date choice sheet
     never detaches or destroys the live filter controls. The overlay stays in
     its original panel to preserve scoped queries in existing Apply handlers. */
  const filterStates=new Map();
  const FILTERS='.uc88-toolbar,[data-attendance-filters],[data-statement-filters],.portal-filter-form,.filter-form,.uc93-toolbar,.uc49-filter-row,.uc48-calendar-filters,.uc-v16-filter-row,.uc-multi-sub-filters,.uc-source-filter-card,.uc-sub-analytics-filters,.uc-sub-overview-controls,[data-mobile-filters],#ucV9DocumentModal .uc-v9-date-row';
  function filterFields(filters){
    return $$('.field,.portal-field',filters).filter(field=>!field.parentElement?.closest('.field,.portal-field')||!filters.contains(field.parentElement.closest('.field,.portal-field')));
  }
  function syncFilterGrid(filters){
    const fields=filterFields(filters).filter(field=>!conditionallyHidden(field,filters)&&getComputedStyle(field).display!=='none');
    fields.forEach((field,index)=>field.classList.toggle('db140-filter-span',fields.length%2===1&&index===0));
    filters.dataset.db140FieldCount=String(fields.length);
  }
  function closeFilterSheet(state){
    if(!state)return;state.overlay.hidden=true;state.filters.classList.remove('db140-filter-open');state.trigger.setAttribute('aria-expanded','false');updateModalLock();state.trigger.focus?.({preventScroll:true});
  }
  function enhanceGlobalFilters(root){
    $$(FILTERS,root).forEach(filters=>{
      if(filters.closest('#search,form[data-db138-wizard],#db137ChoiceSheet')||!filterFields(filters).length)return;
      let state=filterStates.get(filters);
      if(state){syncFilterGrid(filters);return;}
      const owner=filters.closest('.dashboard-block,.panel,.portal-view,.portal-modal-card,.modal-card')||filters.parentElement;
      let head=$(':scope>.top,:scope>.block-head,:scope>.portal-view-head,:scope>.modal-head,:scope>.db138-dialog-header,:scope>.uc-v9-doc-head,:scope>.db117-statement-head',owner)||mobileHeader(filters);
      if(!head){head=document.createElement('div');head.className='db138-list-header';const heading=document.createElement('h3');heading.textContent='Records';head.appendChild(heading);owner.prepend(head);}
      const trigger=document.createElement('button');trigger.type='button';trigger.className='db138-icon-button db140-filter-trigger';trigger.innerHTML=icon('filter');trigger.setAttribute('aria-label','Filter records');trigger.setAttribute('aria-expanded','false');
      headerActions(head).appendChild(trigger);normalizeHeader(head);
      const overlay=document.createElement('div');overlay.className='db140-filter-overlay';overlay.hidden=true;
      overlay.innerHTML='<button type="button" class="db140-filter-scrim" aria-label="Close filters"></button><section class="db140-filter-sheet" role="dialog" aria-modal="true" aria-label="Filters"><div class="db137-sheet-handle"></div><header><h2>Filters</h2><button type="button" class="db138-icon-button" aria-label="Close filters"></button></header><div class="db140-filter-content"></div><footer><button type="button" class="btn" data-db140-apply>Apply</button></footer></section>';
      const marker=document.createComment('mobile filter original position');filters.before(marker);owner.appendChild(overlay);$('.db140-filter-content',overlay).appendChild(filters);
      filters.classList.add('db140-filter-controls');state={filters,overlay,trigger,marker};filterStates.set(filters,state);
      $('header button',overlay).innerHTML=icon('close');
      $$('.db140-filter-scrim,header button',overlay).forEach(button=>button.onclick=()=>closeFilterSheet(state));
      const apply=$$('button,input[type="submit"]',filters).find(button=>/^apply|^search|^view statement|^show|^generate statement|^load/i.test(clean(button.textContent||button.value)));
      if(apply)apply.classList.add('db140-filter-source-apply');
      $('[data-db140-apply]',overlay).onclick=()=>{const invalid=visibleControls(filters).find(control=>!conditionallyHidden(control,filters)&&!control.checkValidity());if(invalid){revealInvalid(filters,invalid);return;}if(apply)apply.click();else if(filters.matches('form'))filters.requestSubmit();closeFilterSheet(state);queuePasses();};
      trigger.onclick=()=>{syncFilterGrid(filters);overlay.hidden=false;filters.classList.add('db140-filter-open');trigger.setAttribute('aria-expanded','true');updateModalLock();};
      let y=null;const card=$('.db140-filter-sheet',overlay);
      card.addEventListener('touchstart',event=>{y=event.target.closest('header,.db137-sheet-handle')?event.touches[0].clientY:null;},{passive:true});
      card.addEventListener('touchend',event=>{if(y!==null&&event.changedTouches[0].clientY-y>65)closeFilterSheet(state);y=null;},{passive:true});
      syncFilterGrid(filters);
    });
    for(const [filters,state]of filterStates)if(!filters.isConnected){state.overlay.remove();state.trigger.remove();filterStates.delete(filters);}
  }

  function enhanceCalendarList(root){
    const panel=root.id==='businessCalendar'?root:$('#businessCalendar',root);if(!panel)return;
    const list=$('.uc88-list',panel);panel.classList.toggle('db140-calendar-list-view',Boolean(list));
    if(!list)return;
    $$('.uc88-list-row',list).forEach(row=>{
      const date=$('strong',row),net=$('small',row);if(!date||!net)return;
      const wrap=date.parentElement;wrap.classList.add('db140-date-copy');
      if(!row.__db143DateOriginal){const marker=document.createComment('Desktop calendar net value');net.before(marker);row.__db143DateOriginal={marker,net};}
      if(net.parentElement===wrap)row.appendChild(net);
      net.classList.add('db140-date-net');
      if(!$('.db140-date-chevron',row)){const chevron=document.createElement('span');chevron.className='db140-date-chevron';chevron.innerHTML=icon('chevron');chevron.setAttribute('aria-hidden','true');row.appendChild(chevron);}
      if(row.dataset.db140Day==='1')return;row.dataset.db140Day='1';
      if(!row.matches('button,a')){row.tabIndex=0;row.setAttribute('role','button');row.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();row.click();}});}
      row.addEventListener('click',()=>{
        if(!PHONE.matches)return;
        const summary=$('[data-uc88-day-summary]',panel);
        openChoiceSheet({title:clean($('h3',summary)?.textContent)||clean(date.textContent),trigger:row,done:true,render(content){
          const list=document.createElement('dl');list.className='db140-day-breakdown';
          $$('.uc88-summary>div',summary).forEach(card=>{const label=document.createElement('dt'),value=document.createElement('dd');label.textContent=clean($('span',card)?.textContent);value.textContent=clean($('strong',card)?.textContent);list.append(label,value);});content.appendChild(list);
          const sources=$$('[data-uc88-detail]',summary);
          if(sources.length){const actions=document.createElement('div');actions.className='db140-day-record-actions';sources.forEach(source=>{const button=document.createElement('button');button.type='button';button.className='btn secondary compact';button.textContent=clean(source.textContent);button.onclick=()=>{closeChoiceSheet();source.click();};actions.appendChild(button);});content.appendChild(actions);}
        }});
      });
    });
  }

  function enhanceRecordHierarchy(root){
    $$('.db136-stacked-row,.db136-card-row,.uc-dashboard-client-card',root).forEach(card=>{
      if(card.closest('.db137-metric-carousel,.db137-role-metrics'))return;
      card.classList.add('db140-record-card');
    });
    $$('.db107-event-grid,.db107-event-table,.db119-attendance-table,.db116-attendance-table',root).forEach(table=>table.classList.add('db140-keyvalue-table'));
    $$('.uc97-grid-heading,.db107-section-heading,.db107-calendar-heading',root).forEach(node=>node.classList.add('db140-calendar-helper'));
  }

  function enhanceRefundHelp(root){
    $$('#refunds .pay-detail',root).forEach(detail=>{
      const summary=$(':scope>summary',detail),body=$(':scope>.pay-detail-body,:scope>.uc-info-front,:scope>.collapsed-body',detail)||[...detail.children].find(node=>node!==summary&&!node.matches('summary'));
      if(!summary||!body)return;
      body.classList.add('db140-refund-help-host');
      const sources=$$('.uc-info-btn',detail).filter(button=>!button.matches('.uc-info-back-btn'));
      if(!sources.length)return;
      let head=$(':scope>.db140-refund-help',body);
      if(!head){head=document.createElement('div');head.className='db140-refund-help';body.prepend(head);}
      sources.forEach(source=>{
        if(!head.contains(source))head.appendChild(source);
        source.__db138Proxy?.remove();source.__db138Proxy=null;source.classList.remove('db138-proxied');iconify(source,'info','Refund instructions');
      });
      $$('.db138-header-icons',summary).forEach(actions=>{if(!actions.children.length)actions.remove();});
    });
  }

  function enhanceDanceTipNavigation(root){
    const panel=root.id==='blogs'?root:$('#blogs',root);if(!panel)return;
    $$('details.admin-collapsed-card',panel).forEach(details=>{
      const summary=$(':scope>summary',details),body=$(':scope>.collapsed-body',details);if(!summary||!body)return;
      details.classList.add('db140-native-form-row');
      let form=$('form',body);
      if(!form&&$('#auditionAdsBox',body)){
        form=document.createElement('form');form.setAttribute('id','db140AdvertisementForm');form.className='form';form.onsubmit=event=>{event.preventDefault();window.saveBlogAudition?.(event,'published');};
        const nodes=[...body.childNodes];body.appendChild(form);nodes.forEach(node=>form.appendChild(node));
        const post=$$('button',form).find(button=>/Post Fitness Tip With|Post.*With Advertisements/i.test(clean(button.textContent)));if(post){post.type='submit';post.removeAttribute('onclick');}
        const add=$$('button',form).find(button=>/Add More Advertisement/i.test(clean(button.textContent)));
        if(add){const unit=document.createElement('div');unit.dataset.db140AdRow='1';add.closest('.form-actions').before(unit);unit.appendChild(add);}
      }
      if(!form)return;
      $$('#auditionAdsBox>div',form).forEach(row=>row.dataset.db140AdRow='1');
      enhanceForm(form);
      const launcher=form.previousElementSibling?.matches('.db138-open-form')?form.previousElementSibling:null;
      if(launcher)launcher.classList.add('db140-hidden-launcher');
      if(details.dataset.db140Native==='1')return;details.dataset.db140Native='1';
      summary.addEventListener('click',event=>{
        if(!PHONE.matches||event.target.closest('button,a'))return;event.preventDefault();details.open=true;
        if(form.getAttribute('id')==='db140AdvertisementForm'&&!$('input,select,textarea',form))window.addAuditionAdRow?.();
        enhanceForm(form);
        form.classList.add('db138-inline-form-open');updateModalLock();syncWizard(form,Number(form.dataset.db137Current||0));
      });
      summary.setAttribute('aria-label',clean(summary.textContent)+' — open form');
    });
  }

  /* ---------- Borderless mobile calendars, agenda and action FAB ---------- */
  function enhanceCalendar(calendar){
    calendar.classList.add('db137-mobile-calendar','db136-compact-calendar');
    window.DropBeatUI.calendar(calendar);
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
      if(aside&&!$('.db139-engagement-open',heat)){
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

  /* ---------- V1.42 shared record, navigation and document components ---------- */
  function decorateRecordCell(cell,label){
    cell.classList.add('db136-stacked-cell');cell.dataset.db136Label=label||'Details';
    if(!$(':scope>.db138-cell-value',cell)){
      const value=document.createElement('div');value.className='db138-cell-value';value.append(...cell.childNodes);cell.appendChild(value);
    }
  }
  function enhanceOverviewLists(root){
    // Some original grids put all cells directly in the grid, with no row node.
    // Group the live nodes; display:contents restores the original desktop grid.
    $$('.uc-v14-refund-grid',root).forEach(grid=>{
      if(grid.dataset.db141Flat==='1')return;
      const heads=$$(':scope>.uc-v14-grid-head',grid),labels=heads.map(head=>clean(head.textContent));
      if(!labels.length)return;
      const cells=$$(':scope>.uc-v14-grid-cell',grid);grid.dataset.db141Flat='1';
      for(let i=0;i<cells.length;i+=labels.length){
        const row=document.createElement('article');row.className='db141-flat-row db141-record';row.setAttribute('role','listitem');
        cells[i].before(row);cells.slice(i,i+labels.length).forEach((cell,index)=>{decorateRecordCell(cell,labels[index]);row.appendChild(cell);});
      }
      heads.forEach(head=>head.classList.add('db136-stacked-head'));grid.classList.add('db141-record-list');
    });
    $$('.db141-record-list',root).forEach(list=>{
      list.setAttribute('role','list');
      for(let parent=list.parentElement;parent&&parent!==root;parent=parent.parentElement){
        if(parent.matches('.table-wrap,[class*="grid-wrap"],[class*="grid-scroll"],[class*="list-wrap"]'))parent.classList.add('db141-list-shell');
      }
    });
    $$('.uc98-visitor-row',root).forEach(row=>{
      row.classList.add('db141-visitor-card');row.setAttribute('role','listitem');
      const cells=[...row.children];
      if(cells[2]&&!cells[2].dataset.db141Visits){cells[2].dataset.db141Visits='1';const value=$('.db138-cell-value',cells[2])||cells[2];const caption=document.createElement('small');caption.textContent='visits';value.appendChild(caption);}
    });
    $$('.uc-source-grid-row',root).forEach(row=>row.classList.add('db141-traffic-source-card'));
    $$('.uc-multi-sub-row,.uc-sub-list-row,.uc-sub-detail-row',root).forEach(row=>row.classList.add('db141-customer-record'));
    if(root.matches?.('.modal,.portal-modal,.db114-modal')||root.closest?.('.modal,.portal-modal,.db114-modal')){
      $$('table.db136-card-table',root).forEach(table=>{table.classList.add('db141-sheet-table');table.closest('.table-wrap,[class*="-wrap"]')?.classList.add('db141-list-shell');});
    }
    $$('.uc-dashboard-client-card',root).forEach(card=>{card.classList.add('db141-client-summary');card.parentElement.classList.add('db141-client-list');});
  }

  function enhanceImageOrdering(root){
    $$('#currentProductMedia .media-card',root).forEach(card=>{
      card.classList.add('db141-image-card');
      $$('.media-sort-actions button',card).forEach((button,index)=>{
        if(button.dataset.db141Move)return;button.dataset.db141Move=index?'down':'up';
        iconify(button,index?'down':'up',index?'Move image down':'Move image up');
      });
    });
  }

  function primaryTabs(tabs){
    tabs.classList.add('db141-content-tabs');tabs.setAttribute('role','tablist');
    directButtons(tabs).filter(button=>!button.matches('.db137-more-nav,.db138-search-toggle')).forEach(button=>{
      button.setAttribute('role','tab');button.setAttribute('aria-selected',String(button.classList.contains('active')));
    });
  }
  function enhanceChartSegments(root){
    $$('[data-uc88-chart],[data-uc92-chart]',root).forEach(button=>{
      const kind=button.dataset.uc88Chart||button.dataset.uc92Chart,tabs=button.parentElement;
      tabs.classList.add('db141-view-segments','db141-icon-segments');
      if(!button.dataset.db141Chart){
        button.dataset.db141Chart='1';const label=document.createElement('span');label.className='db141-desktop-label';label.append(...button.childNodes);button.append(label);button.insertAdjacentHTML('beforeend',icon(kind));button.setAttribute('aria-label',clean(label.textContent));button.title=clean(label.textContent);
      }
      button.setAttribute('aria-pressed',String(button.classList.contains('active')));
    });
  }
  function enhanceNavigationHierarchy(root){
    $$('.uc89-mode-tabs,.uc88-data-modes,.uc86-hub-tabs,.uc84-sales-tabs,.portal-tabs,[role="tablist"],.db138-fit-tabs,[class$="-tabs"],[class*="-tabs "]',root).forEach(tabs=>{
      if(tabs.closest('.db137-wizard-progress,.db140-filter-overlay')||tabs.matches('.db137-segmented-modes,.uc86-order-tabs,.uc-client-tabs'))return;
      if($('[data-uc88-view],[data-attendance-view]',tabs)||tabs.matches('.uc92-mini-tabs')){tabs.classList.remove('db141-content-tabs');tabs.classList.add('db141-view-segments');return;}
      if(directButtons(tabs).length<2)return;
      primaryTabs(tabs);
    });
    $$('.uc88-chart-types,.uc92-chart-types,[data-mobile-view-toggle],.portal-view-toggle',root).forEach(tabs=>tabs.classList.add('db141-view-segments'));
    enhanceChartSegments(root);
    const sales=$('[data-uc84-sales="customSubscription"]');if(sales)mobileCopy(sales,'+ Subscription');
    const panel=root.id==='growthAnalytics'?root:$('#growthAnalytics',root);if(!panel)return;
    const chartTypes=$('.uc88-chart-types',panel),toolbar=$('.uc88-toolbar',panel),period=$('[data-uc88-period]',panel);
    if(!chartTypes||!period)return;
    let controls=$('.db141-chart-controls',panel);
    if(!controls){
      controls=document.createElement('div');controls.className='db141-chart-controls';chartTypes.before(controls);
      const quick=document.createElement('div');quick.className='db141-time-segments';quick.setAttribute('role','group');quick.setAttribute('aria-label','Quick time period');
      [['Day','daily'],['Week','weekly'],['Month','monthly']].forEach(([label,value])=>{
        const button=document.createElement('button');button.type='button';button.dataset.db141Period=value;button.textContent=label;
        button.onclick=()=>{period.value=value;period.dispatchEvent(new Event('input',{bubbles:true}));period.dispatchEvent(new Event('change',{bubbles:true}));$('[data-uc88-apply]',panel)?.click();queuePasses();};quick.appendChild(button);
      });
      controls.append(quick,chartTypes);
    }
    $$('[data-db141-period]',controls).forEach(button=>{const active=button.dataset.db141Period===period.value;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    const state=filterStates.get(toolbar);
    if(state){
      const trigger=state.trigger;trigger.classList.add('db141-filter-fab');
      if(!$('.db141-fab-label',trigger)){const label=document.createElement('span');label.className='db141-fab-label';label.textContent='Filter';trigger.appendChild(label);}
      if(trigger.parentElement!==panel)panel.appendChild(trigger);trigger.setAttribute('aria-label','Filter Growth Analytics');
    }
  }

  const modalLayers=new Map();let modalOrder=0;
  function syncModalLayers(){
    const open=$$(MODALS);
    for(const [modal]of modalLayers)if(!open.includes(modal))modalLayers.delete(modal);
    open.forEach(modal=>{if(!modalLayers.has(modal))modalLayers.set(modal,++modalOrder);modal.style.setProperty('--db141-layer',String(14000+modalLayers.get(modal)*20));});
  }
  function mobileEscape(event){
    if(!PHONE.matches||event.key!=='Escape')return;
    const choice=$('#db137ChoiceSheet'),filter=[...filterStates.values()].find(state=>!state.overlay.hidden);
    const top=[...modalLayers].filter(([modal])=>modal.matches(MODALS)).sort((a,b)=>b[1]-a[1])[0]?.[0];
    if(choice&&!choice.hidden)closeChoiceSheet();
    else if(filter)closeFilterSheet(filter);
    else if(top){const close=$('[data-db139-action="close"],button[onclick*="Close"],button[onclick*="close"],[data-close],header button[aria-label^="Close"]',top);if(close)close.click();else top.classList.remove('open');syncModalLayers();updateModalLock();}
    else if($('#customSubscription[data-db138-open="true"]'))closePaymentPage();else return;
    event.preventDefault();event.stopImmediatePropagation();
  }
  function prepareClientDocuments(root){
    const modal=root.id==='ucV9DocumentModal'?root:$('#ucV9DocumentModal',root);if(!modal)return;
    const statement=Boolean($('#ucV10StatementPeriod,#ucV9StatementPeriod',modal));
    modal.classList.toggle('db141-statement-sheet',statement);modal.classList.toggle('db141-invoice-sheet',!statement);
    const head=$('.uc-v9-doc-head',modal);head?.classList.add('db138-dialog-header');
    const close=$('button[onclick*="closeUCV9DocumentModal"]',head);if(close)iconify(close,'close','Close document');
    if(statement){
      const filters=$('.uc-v9-date-row',modal);filters?.setAttribute('data-mobile-filters','statement');
      const from=$('[id$="StatementFrom"]',modal),to=$('[id$="StatementTo"]',modal),period=$('[id$="StatementPeriod"]',modal);
      [from,to].forEach(input=>{
        if(!input)return;input.closest('.field').hidden=false;
        if(!input.dataset.db141Custom){input.dataset.db141Custom='1';input.addEventListener('change',()=>{period.value='custom';syncSelectTrigger(period);});}
      });
      if(period&&!period.dataset.db141Period){
        period.dataset.db141Period='1';period.addEventListener('change',()=>{
          [from,to].forEach(input=>{if(input)input.closest('.field').hidden=false;});
          if(period.value!=='custom'){
            const end=new Date(),start=new Date(end);start.setMonth(start.getMonth()-Number(period.value));
            const iso=date=>date.toISOString().slice(0,10);
            if(from)from.value=iso(start);if(to)to.value=iso(end);[from,to].filter(Boolean).forEach(syncTemporalTrigger);
          }
        });
      }
      const download=$('#ucV9StatementDownload',modal);
      if(download&&!download.dataset.db141Statement){download.dataset.db141Statement='1';download.innerHTML=icon('download')+'<span>Statement</span>';download.classList.add('db141-statement-action');download.setAttribute('aria-label','Download Statement');}
      if(!$('.db137-sheet-handle',modal)){const handle=document.createElement('div');handle.className='db137-sheet-handle';$('.modal-card',modal)?.prepend(handle);}
      const card=$('.modal-card',modal);
      if(card&&!card.dataset.db141Drag){
        card.dataset.db141Drag='1';let startY=null;
        card.addEventListener('touchstart',event=>{startY=modal.classList.contains('db141-statement-sheet')&&event.target.closest('.uc-v9-doc-head,.db137-sheet-handle')?event.touches[0].clientY:null;},{passive:true});
        card.addEventListener('touchend',event=>{if(startY!==null&&event.changedTouches[0].clientY-startY>65)window.closeUCV9DocumentModal?.();startY=null;},{passive:true});
      }
      enhanceGlobalFilters(modal);
      const state=filterStates.get(filters);if(state){state.trigger.classList.add('db141-statement-filter');if(state.trigger.parentElement!==$('.modal-card',modal))$('.modal-card',modal).appendChild(state.trigger);}
      $$('.db138-header-icons',head).filter(actions=>!actions.children.length).forEach(actions=>actions.remove());
    }
  }
  function retireDocumentView(){
    const modal=$('#ucV9DocumentModal');if(!modal)return;
    for(const [filters,state]of filterStates){
      if(!modal.contains(filters))continue;
      state.overlay.remove();state.trigger.remove();state.marker.remove();filterStates.delete(filters);
    }
    $$('.db138-header-icons',modal).filter(actions=>!actions.children.length).forEach(actions=>actions.remove());
    $$('.uc-v11-doc-help-btn,.uc-v11-doc-help-panel',modal).forEach(help=>help.remove());
    $('.uc-v9-doc-card',modal)?.classList.remove('uc-v11-doc-help-open');
    $$('.uc-v9-doc-card>.db137-sheet-handle',modal).forEach(handle=>handle.remove());
    modal.classList.remove('db141-statement-sheet','db141-invoice-sheet');
  }

  let clientRefund=null;
  function removeClientRefund(){
    if(!clientRefund)return;
    const {modal,marker,editor}=clientRefund;
    if(marker.isConnected)marker.after(editor);marker.remove();modal.remove();clientRefund=null;
  }
  function openClientRefund(){
    if(!PHONE.matches)return;
    enhanceClientRefund();if(!clientRefund)return;
    const {modal,form}=clientRefund;modal.classList.add('open');classifySheets(modal);syncModalLayers();updateModalLock();syncWizard(form,Number(form.dataset.db137Current||0));
  }
  function enhanceClientRefund(){
    const panel=$('#ucTabRefunds');if(!panel)return;
    if(clientRefund&&!clientRefund.marker.isConnected)removeClientRefund();
    const editor=$('.uc-v14-refund-editor',panel);
    if(editor&&!editor.closest('form')){
      const marker=document.createComment('mobile refund form position');editor.before(marker);
      const modal=document.createElement('div');modal.id='db141ClientRefundModal';modal.className='modal db141-refund-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','db141RefundTitle');
      modal.innerHTML='<section class="modal-card db141-refund-card"><header class="top"><h2 id="db141RefundTitle">Refund Details</h2><button type="button" class="db138-icon-button" aria-label="Close Refund Details"></button></header><form id="db141ClientRefundForm"></form></section>';
      const form=$('form',modal);form.dataset.db138Inline='1';form.onsubmit=event=>event.preventDefault();form.appendChild(editor);document.body.appendChild(modal);
      const close=$('header button',modal);close.innerHTML=icon('close');close.onclick=()=>{modal.classList.remove('open');closeChoiceSheet();syncModalLayers();updateModalLock();};
      clientRefund={modal,form,marker,editor};
      const launcher=document.createElement('button');launcher.type='button';launcher.className='db141-refund-launch';launcher.innerHTML='<span>Refund Details</span>'+icon('chevron');launcher.onclick=openClientRefund;marker.after(launcher);
      enhanceForm(form);enhanceSelectors(modal);
    }
    const toolbar=$('.uc-v14-refund-toolbar',panel);if(toolbar){toolbar.classList.add('db139-header');$('h3',toolbar)?.classList.add('db139-header-title');const source=$('button[onclick*="ucV14ReloadRefunds"]',toolbar);if(source)proxyIcon(source,headerActions(toolbar),'refresh','Refresh refunds');}
    $$('.uc-v14-refund-section>p',panel).forEach(paragraph=>paragraph.classList.add('db138-mobile-hidden'));
    $$('.uc-v14-refund-payment-grid>.db141-flat-row',panel).forEach(row=>{
      if(row.dataset.db141RefundRow)return;row.dataset.db141RefundRow='1';row.classList.add('db141-refundable-record');row.tabIndex=0;row.setAttribute('role','button');row.setAttribute('aria-label','Select payment and open Refund Details');
      const select=$('button[onclick*="ucV14SelectRefundRow"]',row),radio=$('input[type="radio"]',row);
      const activate=event=>{if(event.target.closest('button,a,input'))return;select?.click();};row.addEventListener('click',activate);row.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select?.click();}});
      if(radio)radio.addEventListener('change',()=>requestAnimationFrame(openClientRefund));
    });
  }

  /* V1.42 shared navigation surfaces: source handlers and controls remain live. */
  function disclosureRow(button,label){
    button.classList.add('db142-navigation-row','pill');
    for(const [property,value]of Object.entries({display:'flex','align-items':'center','justify-content':'space-between',width:'100%','min-height':'48px',padding:'12px 14px','font-size':'13px'}))button.style.setProperty(property,value,'important');
    if(!button.querySelector('[data-db-disclosure]')){
      const text=document.createElement('span');text.className='db142-row-label';text.textContent=label||clean(button.textContent);
      button.replaceChildren(text);button.insertAdjacentHTML('beforeend',icon('chevron'));
    }
  }
  function enhanceDisclosureRows(root){
    $$('.db140-native-form-row>summary',root).forEach(summary=>{
      summary.classList.add('db142-disclosure-summary');
      if(!$(':scope>[data-db-disclosure]',summary))summary.insertAdjacentHTML('beforeend',icon('chevron'));
    });
    $$('.db141-refund-launch,.db140-date-chevron,.db142-template-chevron',root).forEach(row=>{
      if(!$('[data-db-disclosure]',row)){$$('svg',row).forEach(svg=>svg.remove());row.insertAdjacentHTML('beforeend',icon('chevron'));}
    });
    $$('[data-mobile-disclosure],.db139-engagement-open',root).forEach(row=>{if(!$('[data-db-disclosure]',row))row.insertAdjacentHTML('beforeend',icon('chevron'));});
  }
  function enhanceBadgeTabs(root){
    $$('.tabs,[role="tablist"],.portal-tabs,[class$="-tabs"],[class*="-tabs "]',root).forEach(tabs=>{
      if(tabs.closest('.db137-wizard-progress'))return;
      tabs.classList.add('db142-tab-bar');
      $$('.uc86-count-badge,.uc87-nav-badge,.db138-more-badge,[data-uc86-tab-count]',tabs).forEach(badge=>badge.classList.add('db142-navigation-badge'));
    });
  }
  function filterFab(state,panel,label){
    if(!state)return;const trigger=state.trigger;trigger.classList.add('db141-filter-fab');
    if(!$('.db141-fab-label',trigger)){const span=document.createElement('span');span.className='db141-fab-label';span.textContent='Filter';trigger.appendChild(span);}
    if(trigger.parentElement!==panel)panel.appendChild(trigger);trigger.setAttribute('aria-label',label);
  }
  function enhanceHeatActions(root){
    const panel=root.id==='heatMaps'?root:$('#heatMaps',root);if(!panel)return;
    const head=$(':scope>.top',panel),source=$('[data-uc92-help-open]',panel);if(!head)return;
    if(source)proxyIcon(source,headerActions(head),'info','Heat Maps Help & Instructions');
    $$('.uc92-card-tools,.uc94-heat-tools,.uc92-pane-head',panel).forEach(tools=>{if(![...tools.children].some(child=>!child.classList.contains('db138-proxied')&&clean(child.textContent)))tools.classList.add('db142-empty-help-slot');});
    const toolbar=$('.uc88-toolbar',panel);filterFab(filterStates.get(toolbar),panel,'Filter Heat Maps');
  }

  const refundPortals=new Map();let refundProvider='razorpay';
  function restoreRefundNavigation(){
    for(const {form,marker,modal,results,resultMarker}of refundPortals.values()){
      if(marker.isConnected)marker.after(form);marker.remove();modal.remove();
      if(resultMarker?.isConnected)resultMarker.after(results);resultMarker?.remove();
      form.classList.remove('db142-gateway-form');
    }
    refundPortals.clear();
    $('#refunds .db142-refund-navigation')?.remove();$('#refunds')?.classList.remove('db142-direct-refunds');
  }
  function enhanceRefundNavigation(root){
    const panel=root.id==='refunds'?root:$('#refunds',root);if(!panel)return;
    panel.classList.add('db142-direct-refunds');
    let menu=$(':scope>.db142-refund-navigation',panel);
    if(!menu){
      menu=document.createElement('section');menu.className='db142-refund-navigation';
      menu.innerHTML='<label class="db142-refund-query-label" for="db142RefundQuery">Search Order ID / Phone</label><div class="db142-refund-search"><input id="db142RefundQuery" type="search" placeholder="Order ID, phone or payment ID"><button type="button" class="db138-icon-button" aria-label="Search refund payments"></button></div><div class="db142-refund-results"></div><div class="db142-refund-rows"></div>';
      $(':scope>.top',panel)?.after(menu);
      const search=$('.db142-refund-search button',menu);search.innerHTML=icon('search');
      const run=()=>{
        const provider=refundProvider==='manual'?'razorpay':refundProvider,input=$('#'+provider+'RefundSearch');
        if(input)input.value=$('#db142RefundQuery').value;
        for(const [key,state]of refundPortals)if(state.results)state.results.hidden=key!==provider;
        window.searchRefundGateway?.(provider);
      };
      search.onclick=run;$('#db142RefundQuery',menu).onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();run();}};
    }
    const labels={razorpay:'Refund through Razorpay',stripe:'Refund through Stripe',phonepe:'Refund through PhonePe',manual:'Manual Refund Record'};
    for(const [provider,label]of Object.entries(labels)){
      let state=refundPortals.get(provider);const source=$('#'+provider+'RefundForm');
      if(!source)continue;
      if(!state||!state.modal.isConnected){
        const detail=source.closest('details'),marker=document.createComment('original refund form position');source.before(marker);detail?.classList.add('db142-refund-source');
        // Build the fullscreen shell before enhancement so no inline Open button is added.
        const modal=document.createElement('div');modal.id='db142Refund_'+provider;modal.className='modal db142-gateway-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',label);
        modal.innerHTML='<section class="modal-card"><header class="top"><h2></h2><div class="db138-header-icons"><button type="button" class="db138-icon-button" data-db142-refund-help aria-label="Refund instructions"></button><button type="button" class="db138-icon-button" data-db142-refund-close aria-label="Close refund form"></button></div></header></section>';
        $('h2',modal).textContent=label;$('.modal-card',modal).appendChild(source);document.body.appendChild(modal);
        source.dataset.db138Inline='1';source.classList.remove('db138-inline-form','db138-inline-form-open');source.classList.add('db142-gateway-form');
        const close=$('[data-db142-refund-close]',modal);close.innerHTML=icon('close');close.onclick=()=>{modal.classList.remove('open');closeChoiceSheet();syncModalLayers();updateModalLock();};
        const help=$('[data-db142-refund-help]',modal);help.innerHTML=icon('info');help.onclick=()=>{const original=$('.uc-info-btn',detail);if(original)openHelp(original);else openTextSheet('Refund instructions','Search the saved payment, check its available refundable amount, and review all details before confirming the refund.',help);};
        const oldLauncher=source.previousElementSibling;if(oldLauncher?.matches('.db138-open-form'))oldLauncher.classList.add('db142-mobile-hidden');
        const results=$('#'+provider+'RefundResults'),resultMarker=results?document.createComment('original refund search results position'):null;
        if(results){results.before(resultMarker);$('.db142-refund-results',menu).appendChild(results);results.hidden=provider!==refundProvider;}
        const row=document.createElement('button');row.type='button';row.dataset.db142RefundProvider=provider;disclosureRow(row,label);$('.db142-refund-rows',menu).appendChild(row);
        state={form:source,modal,marker,results,resultMarker,row};refundPortals.set(provider,state);
        row.onclick=()=>{
          refundProvider=provider;
          for(const [key,item]of refundPortals)if(item.results)item.results.hidden=key!==provider;
          const input=$('#'+provider+'RefundSearch');if(input)input.value=$('#db142RefundQuery').value;
          modal.classList.add('open');enhanceForm(source);enhanceSelectors(modal);syncModalLayers();updateModalLock();
          const wizard=formStates.get(source);if(wizard){wizard.furthest=0;syncWizard(source,0);}
          if(provider!=='manual'&&input?.value.trim())window.searchRefundGateway?.(provider);
        };
      }
    }
    // Refund Records remains visible under the four direct routes on mobile.
    $('#refundLogTable',panel)?.closest('.card')?.classList.add('db142-refund-records');
  }
  function enhanceRefundRecordActions(root){
    const panel=root.id==='refunds'?root:$('#refunds',root);if(!panel)return;
    const card=$('#refundLogTable',panel)?.closest('.card');if(!card)return;
    let head=$(':scope>.db138-list-header,:scope>.top',card),heading=$(':scope>h2,:scope>h3',card);
    if(!head&&heading){head=document.createElement('header');head.className='db138-list-header';heading.before(head);head.appendChild(heading);}
    if(!head)return;normalizeHeader(head);const actions=headerActions(head);
    $$('.db138-proxy-icon,.db138-search-toggle',card).filter(icon=>!icon.closest('#refundLogTable,.db138-search-bar')).forEach(icon=>{if(icon.parentElement!==actions)actions.appendChild(icon);});
    actions.classList.add('db142-header-actions');
    const search=$('.uc86-refund-record-search',card);if(search?.__db138Toggle&&search.__db138Toggle.parentElement!==actions)actions.appendChild(search.__db138Toggle);
  }

  let socialOpenKey=null;
  const SOCIAL_FORMS='#uc48TextForm,#uc48ImageForm,#uc48VideoForm,#uc48StoryForm,form[id^="uc56CarouselForm_"]';
  function socialKey(form){return form.getAttribute('id').startsWith('uc56')?'carousel_'+form.getAttribute('id').replace('uc56CarouselForm_',''):form.getAttribute('id').replace('uc48','').replace('Form','').toLowerCase();}
  function prepareSocialForm(form){
    if(!form.matches(SOCIAL_FORMS))return;
    form.dataset.db142Social=socialKey(form);form.classList.add('db142-social-form');
    const body=$(':scope>.db138-form-content',form)||form;
    if(form.getAttribute('id')==='uc48StoryForm'&&!$('[name="tags"]',form)){
      const tags=document.createElement('div');tags.className='uc48-field-shell db142-story-addon';tags.innerHTML='<label>Tags / Hashtags Optional</label><input name="tags" maxlength="2000" placeholder="fitness, classes"><small class="uc48-helper">Separate tags with commas. Publishing uses the supported platform fields.</small>';
      const caption=$('[name="caption"]',form)?.closest('.uc48-field-shell'),media=$('.uc48-media-box',form);(caption||media)?.after(tags);
      if(window.ucV1676PollMarkup&&!$('[data-uc75-poll]',form)){const wrap=document.createElement('div');wrap.innerHTML=window.ucV1676PollMarkup('story');const poll=wrap.firstElementChild;poll.classList.add('db142-story-addon');$('.uc48-schedule-box',form)?.after(poll);}
    }
    if(!$(':scope>[data-db142-post-step]',body)){
      const carousel=form.getAttribute('id').startsWith('uc56'),groups=Array.from({length:carousel?2:1},(_,index)=>{const group=document.createElement('section');group.dataset.db142PostStep=String(index);group.className='db142-post-field-group';return group;});
      const nodes=[...body.children];groups.forEach(group=>body.appendChild(group));
      nodes.forEach(node=>{
        if(node.matches('.db138-page-header,.db137-wizard-progress,.db137-wizard-nav,.db138-review'))return;
        if(node.matches('.uc48-section-head,.uc56-carousel-mode-head,.uc48-info-card,.uc56-carousel-help')){node.classList.add('db142-post-instructions');return;}
        if(node.matches('[id$="Msg"],.uc48-submit-row'))return;
        const marker=document.createComment('original social field position');node.before(marker);(form.__db142Positions||(form.__db142Positions=[])).push({node,marker});
        const index=carousel&&!node.matches('.uc56-carousel-slots,.uc56-add-more')?1:0;groups[index].appendChild(node);
      });
    }
    $$('input[type="file"]',form).forEach(input=>{
      if(input.dataset.db142Upload)return;input.dataset.db142Upload='1';
      if(!input.id)input.id='db142Upload_'+Math.random().toString(36).slice(2);
      const area=document.createElement('label');area.className='db142-upload-area';area.htmlFor=input.id;
      area.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M7 16H5a4 4 0 0 1-.6-8A7 7 0 0 1 18 7a4.5 4.5 0 0 1 1 9h-2M12 21V10m-4 4 4-4 4 4"/></svg><strong>Upload Media</strong><small>Kickboxing to choose a photo or video</small>';
      input.before(area);area.appendChild(input);input.classList.add('db142-native-file');input.setAttribute('aria-label','Upload Media');
      const sync=()=>{const files=[...input.files];$('small',area).textContent=files.length?files.map(file=>file.name).join(', '):'Kickboxing to choose a photo or video';};input.addEventListener('change',sync);sync();
    });
  }
  function restoreSocialForms(){
    socialOpenKey=null;
    $$(SOCIAL_FORMS).forEach(form=>{
      (form.__db142Positions||[]).forEach(({node,marker})=>{if(marker.isConnected)marker.after(node);marker.remove();});form.__db142Positions=[];
      $$('[data-db142-post-step]',form).forEach(group=>group.remove());
      $$('.db142-upload-area',form).forEach(area=>{const input=$('input[type="file"]',area);if(input){area.before(input);input.classList.remove('db142-native-file');delete input.dataset.db142Upload;}area.remove();});
      clearLegacyWizard(form);formStates.delete(form);$('.db138-review',form)?.remove();
      delete form.dataset.db137Wizard;delete form.dataset.db138Wizard;form.classList.remove('db138-inline-form-open');
    });
  }
  function validateSocialStep(form,index){
    if(!form.dataset.db142Social)return true;
    const carousel=form.getAttribute('id').startsWith('uc56'),key=socialKey(form),kind=key.replace('carousel_','');
    let error='';
    if(carousel&&index===0){const media=window.UCV1656?.carousel?.uploads?.[kind]||[];if(media.filter(Boolean).length<2)error='Upload at least two carousel media items before publishing.';}
    if(!carousel&&kind!=='text'&&!window.UCV1648Posts?.uploads?.[kind])error='Choose your media and upload it to Google Drive before publishing.';
    if(index===(carousel?1:0)&&!error){
      const targets=$$('input[data-uc48-scope],input[data-uc56-carousel-target]',form).filter(control=>!control.disabled&&!conditionallyHidden(control,form));
      if(!targets.some(control=>control.checked))error='Select at least one eligible connected platform before publishing.';
      const scheduled=$('input[name="scheduleLater"]:checked,[data-uc56-schedule-toggle]:checked',form),date=$('input[name="scheduledAt"],input[type="datetime-local"]',form);
      if(scheduled&&(!date?.value||new Date(date.value).getTime()<=Date.now()))error='Choose a future date and time for this scheduled post.';
      const poll=window.ucV1676PollPayload?.(form);if(poll?.enabled&&(!poll.question||poll.options.length<2))error='Enter a poll question and at least two options before publishing.';
    }
    if(error){let note=$('.db142-validation',form);if(!note){note=document.createElement('p');note.className='db142-validation error';note.setAttribute('role','alert');($('.db138-form-content',form)||form).prepend(note);}note.textContent=error;return false;}
    $('.db142-validation',form)?.remove();return true;
  }
  function reviewSocialForm(form,state){
    const section=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('dl');heading.textContent='Content & Settings';section.append(heading,list);
    const add=(label,value)=>{if(!value)return;const term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=label;detail.textContent=value;list.append(term,detail);};
    formControls(form).forEach(control=>{
      if(control.type==='hidden'||control.type==='file'||control.type==='checkbox'||control.type==='radio'||control.disabled||conditionallyHidden(control,form))return;
      add(controlLabel(control),control.tagName==='SELECT'?[...control.selectedOptions].map(option=>clean(option.textContent)).join(', '):control.value);
    });
    const scopes=new Map();$$('input[data-uc48-scope]:checked,input[data-uc56-carousel-target]:checked',form).forEach(control=>{const scope=control.dataset.uc48Scope||'main',names=scopes.get(scope)||[];names.push(clean(control.closest('label')?.textContent)||control.value);scopes.set(scope,names);});
    for(const [scope,names]of scopes)add(scope==='main'||!scope.startsWith('video-')?'Platforms':scope==='video-short'?'Short-form Platforms':'Full-length Platforms',names.join(', '));
    const poll=$('[data-uc75-poll-toggle]',form);if(poll)add('Poll',poll.checked?'Enabled':'Disabled');
    const first=$('[name="firstCommentEnabled"]',form);if(first)add('First Comment / Reply',first.checked?'Enabled':'Disabled');
    state.review.appendChild(section);reviewSocialMedia(form,state.review);
  }
  function reviewSocialMedia(form,review){
    const section=document.createElement('section');section.className='db142-media-review';
    const heading=document.createElement('h3');heading.textContent='Media Preview';section.appendChild(heading);
    const media=[];
    $$('img,video',form).filter(node=>!node.closest('.db138-review,.db142-post-instructions')).forEach(node=>media.push({url:node.getAttribute('src'),video:node.tagName==='VIDEO'}));
    const key=socialKey(form),kind=key.replace('carousel_',''),upload=window.UCV1648Posts?.uploads?.[kind];
    if(upload)media.push({url:upload.url,video:String(upload.mimeType||'').startsWith('video/')});
    if(form.getAttribute('id').startsWith('uc56'))(window.UCV1656?.carousel?.uploads?.[kind]||[]).filter(Boolean).forEach(upload=>media.push({url:upload.url,video:String(upload.mimeType||'').startsWith('video/')}));
    const seen=new Set();media.forEach(item=>{if(!item.url||seen.has(item.url))return;seen.add(item.url);const preview=document.createElement(item.video?'video':'img');preview.src=item.url;if(item.video){preview.controls=true;preview.preload='metadata';}else preview.alt='Selected post media';section.appendChild(preview);});
    if(seen.size)review.prepend(section);
    const settings=document.createElement('section');settings.innerHTML='<h3>Publishing</h3>';const description=document.createElement('p');
    const scheduled=$('input[name="scheduleLater"]:checked,[data-uc56-schedule-toggle]:checked',form),time=$('input[name="scheduledAt"],input[type="datetime-local"]',form);
    description.textContent=scheduled?'Scheduled for '+(time?.value||'the selected date and time'):'Publish now to the selected eligible platforms';settings.appendChild(description);review.appendChild(settings);
  }
  function enhanceSocialNavigation(root){
    const panel=root.id==='socialPosts'?root:$('#socialPosts',root);if(!panel)return;
    const workspace=$('#ucV1648PostsWorkspace',panel);if(!workspace)return;
    panel.classList.add('db142-social-posts');
    panel.classList.toggle('db142-schedule-view',window.UCV1648Posts?.tab==='schedule');
    let back=$('.db142-post-back',panel);if(!back){back=document.createElement('button');back.type='button';back.className='pill db142-post-back';back.textContent='Back to Post Types';workspace.before(back);back.onclick=async()=>{socialOpenKey=null;await window.ucV1648PostsTab?.('text');queuePasses();};}
    let menu=$('.db142-post-menu',panel);
    if(!menu){
      menu=document.createElement('nav');menu.className='db142-post-menu';menu.setAttribute('aria-label','Create a social post');workspace.before(menu);
      [['text','Text Post'],['image','Image Post'],['carousel_image','Image Carousel'],['carousel_video','Video Carousel'],['carousel_mixed','Image + Video Carousel'],['video','Video Post'],['story','Story / Status'],['schedule','Post Scheduling']].forEach(([key,label])=>{
        const row=document.createElement('button');row.type='button';row.dataset.db142Post=key;disclosureRow(row,label);menu.appendChild(row);
        row.onclick=async()=>{
          socialOpenKey=key==='schedule'?null:key;
          await window.ucV1648PostsTab?.(key.startsWith('carousel_')?'carousel':key);
          enhanceSocialNavigation(panel);queuePasses();
          if(key==='schedule')$('#uc48ScheduleArea',panel)?.scrollIntoView({block:'start',behavior:'smooth'});
        };
      });
    }
    if(typeof window.ucV1676OpenPollComposer==='function'&&!$('[data-db142-poll]',menu)){
      const row=document.createElement('button');row.type='button';row.dataset.db142Poll='1';disclosureRow(row,'Poll Post');menu.appendChild(row);
      row.onclick=()=>openChoiceSheet({title:'Choose a poll post format',trigger:row,done:false,render(host){[['text','Text Poll'],['image','Image Poll'],['carousel','Carousel Poll'],['video','Video Poll']].forEach(([kind,label])=>{const choice=document.createElement('button');choice.type='button';choice.className='db137-choice-option';choice.textContent=label;choice.onclick=async()=>{socialOpenKey=kind==='carousel'?'carousel_image':kind;closeChoiceSheet();await window.ucV1676OpenPollComposer(kind);queuePasses();};host.appendChild(choice);});}});
    }
    $$(SOCIAL_FORMS,panel).forEach(form=>{
      if(form.closest('details'))form.closest('details').open=true;
      enhanceForm(form);const launcher=form.previousElementSibling?.matches('.db138-open-form')?form.previousElementSibling:null;
      launcher?.classList.add('db142-mobile-hidden');
      const key=socialKey(form),header=$(':scope>.db138-page-header',form);
      if(header&&!$('.db142-social-help',header)){
        const source=$('.uc48-info-btn',form)||$('.uc48-info-btn',form.closest('details'));
        if(source){const proxy=proxyIcon(source,headerActions(header),'info','Post Help & Instructions');proxy.classList.add('db142-social-help');}
        else{const help=document.createElement('button');help.type='button';help.className='db138-icon-button db142-social-help';help.innerHTML=icon('info');help.setAttribute('aria-label','Post Help & Instructions');headerActions(header).prepend(help);help.onclick=()=>openTextSheet('Post Help & Instructions','Add content and media, choose eligible connected platforms, then review before publishing or scheduling.',help);}
      }
      const close=$('button[aria-label^="Close"]',header);
      if(close&&!close.dataset.db142Close){close.dataset.db142Close='1';const original=close.onclick;close.onclick=event=>{socialOpenKey=null;original?.call(close,event);};}
      form.classList.toggle('db138-inline-form-open',socialOpenKey===key);if(socialOpenKey===key)updateModalLock();
    });
  }
  function enhanceSocialCalendar(root){
    const panel=root.id==='socialPosts'?root:$('#socialPosts',root);if(!panel)return;
    const toolbar=$('.uc48-calendar-toolbar',panel);if(!toolbar)return;
    toolbar.classList.add('db142-calendar-toolbar');
    const nav=$('.uc48-calendar-nav',toolbar),view=$('.uc48-calendar-view',toolbar),title=$('.uc48-calendar-title',nav);
    if(nav&&!nav.dataset.db142Calendar){
      nav.dataset.db142Calendar='1';nav.classList.add('db-mobile-calendar-header');
      const prev=$('button[onclick*="CalendarMove(-1)"]',nav),next=$('button[onclick*="CalendarMove(1)"]',nav),today=$('button[onclick*="CalendarToday"]',nav);
      if(prev&&next&&title)nav.replaceChildren(prev,title,next);if(today&&view)view.prepend(today);
    }
    const area=$('#uc48ScheduleArea',panel);if(view&&area&&view.parentElement!==area.parentElement)view.classList.add('db142-calendar-secondary');
    if(view&&area&&area.nextElementSibling!==view)area.after(view);
    const calendar=$('.uc48-calendar-shell',area);if(calendar)enhanceCalendar(calendar);
    const info=$('.uc48-info-card',panel);info?.classList.add('db142-post-instructions');
    $$('.uc48-composer-card>.notice',panel).forEach(notice=>notice.classList.add('db142-post-instructions'));
  }
  function enhanceAutomations(root){
    $$('.uc64-flow-grid,.uc1705-flow-grid',root).forEach(grid=>{
      const headSelector=grid.matches('.uc64-flow-grid')?'.uc64-grid-head':'.uc1705-grid-head',cellSelector=grid.matches('.uc64-flow-grid')?'.uc64-grid-cell':'.uc1705-grid-cell';
      const heads=$$(':scope>'+headSelector,grid),cells=$$(':scope>'+cellSelector,grid),labels=heads.map(head=>clean(head.textContent));
      if(!labels.length)return;grid.classList.add('db142-flow-list');heads.forEach(head=>head.classList.add('db142-mobile-hidden'));
      for(let index=0;index<cells.length;index+=labels.length){const row=document.createElement('article');row.className='db142-flow-card db140-record-card';cells[index].before(row);cells.slice(index,index+labels.length).forEach((cell,position)=>{cell.dataset.db136Label=labels[position];cell.classList.add('db142-flow-field');row.appendChild(cell);});}
    });
    $$('.uc64-library-head,.uc75-custom-head,.uc1705-library-head',root).forEach(head=>{
      head.classList.add('db142-automation-header');
      const buttons=$$('button',head).filter(button=>/Run Due Now|New Flow|New Automation/i.test(clean(button.textContent)));
      if(!buttons.length)return;let actions=$(':scope>.db142-automation-actions',head);if(!actions){actions=document.createElement('div');actions.className='db142-automation-actions';head.appendChild(actions);}buttons.forEach(button=>{if(button.parentElement!==actions)actions.appendChild(button);});
    });
    $$('.uc1705-template-cards>article',root).forEach(card=>{
      const source=$('[data-uc1705-template]',card);if(!source)return;source.classList.add('pill');if(card.dataset.db142Template){card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','Use '+clean($('h3',card)?.textContent));return;}
      card.dataset.db142Template='1';card.classList.add('db142-template-card');card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','Use '+clean($('h3',card)?.textContent));source.classList.add('db142-mobile-hidden');
      const chevron=document.createElement('span');chevron.className='db142-template-chevron';chevron.innerHTML=icon('chevron');card.appendChild(chevron);
      const use=event=>{if(!PHONE.matches||event.target.closest('button,a,input,select'))return;source.click();};card.addEventListener('click',use);card.addEventListener('keydown',event=>{if(PHONE.matches&&(event.key==='Enter'||event.key===' ')){event.preventDefault();source.click();}});
    });
  }


  /* V1.47: native navigation adapters; original controls and handlers stay live. */

  /* V1.47 mobile workflows keep original controls and submit handlers. */
  const v144DayPickers=new WeakMap(),v144IntegrationCards=new Map(),v144MenuInputs=new Map(),v144Icons=new Map(),v144MovedControls=new Map();
  const v144Days={sun:'Sunday',mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday'};
  function v144Icon(type){
    const paths={up:'M6 14l6-6 6 6',down:'M6 10l6 6 6-6',edit:'M4 20l4-1 12-12-3-3L5 16l-1 4M14 7l3 3'};
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[type]+'"/></svg>';
  }
  function v144NativeIcon(button,type,label){
    if(!button||v144Icons.has(button))return;
    v144Icons.set(button,{html:button.innerHTML,aria:button.getAttribute('aria-label'),title:button.getAttribute('title'),classes:button.className});
    button.innerHTML=v144Icon(type);button.setAttribute('aria-label',label);button.title=label;button.classList.add('db144-small-icon');
  }
  function v144TeachingDays(root){
    $$('.db122-day-grid',root).forEach(grid=>{
      let state=v144DayPickers.get(grid);
      if(!state){
        const row=document.createElement('button');row.type='button';row.className='db137-choice-trigger db143-coach-choice db144-days-trigger';
        row.setAttribute('aria-label','Teaching Days');row.innerHTML='<span></span>'+icon('chevron');grid.after(row);grid.classList.add('db144-original-days');
        const sync=()=>{$('span',row).textContent=$$('input:checked',grid).map(input=>v144Days[input.value]||clean(input.closest('label')?.textContent)||input.value).join(', ')||'Choose teaching days';};
        row.onclick=()=>openChoiceSheet({title:'Teaching Days',trigger:row,done:true,render(host){
          const render=()=>{host.replaceChildren();$$('input[type="checkbox"]',grid).forEach(input=>{
            const button=document.createElement('button');button.type='button';button.className='db137-choice-option';button.textContent=v144Days[input.value]||clean(input.closest('label')?.textContent)||input.value;
            button.classList.toggle('selected',input.checked);button.setAttribute('role','checkbox');button.setAttribute('aria-label',button.textContent);button.setAttribute('aria-checked',String(input.checked));button.disabled=input.disabled;
            button.onclick=()=>{input.click();sync();render();};host.appendChild(button);
          });};render();
        }});
        grid.addEventListener('change',sync);state={row,sync};v144DayPickers.set(grid,state);
      }state.sync();
    });
  }
  function v144OpenPageEditor(editor){
    const form=nativePageEditors.get(editor)?.form;if(!form)return;
    editor.open=true;form.classList.add('db138-inline-form-open');enhanceForm(form);syncWizard(form,0);updateModalLock();
  }
  function v144PageActions(editor,trigger){
    const form=nativePageEditors.get(editor)?.form;if(!form)return;
    const remove=$('[data-v1634-delete-page]',form);
    openChoiceSheet({title:clean($(':scope>summary',editor)?.textContent)||'Page Actions',trigger,render(host){
      const edit=document.createElement('button');edit.type='button';edit.className='db137-choice-option';edit.textContent='Edit this Page';
      edit.onclick=()=>{closeChoiceSheet();v144OpenPageEditor(editor);};host.appendChild(edit);
      if(remove){const del=document.createElement('button');del.type='button';del.className='db137-choice-option db144-danger-choice';del.textContent='Delete this Page';del.onclick=()=>{closeChoiceSheet();remove.click();queuePasses();};host.appendChild(del);}
    }});
  }
  function v144Pages(root){
    const faq=$('#faqForm',root),details=faq?.closest('details');
    if(details){faq.dataset.db144Faq='1';nativeDetail(details);details.classList.add('db144-faq-navigation');}
    $$('#pages .uc-v1637-grid-row',root).forEach(row=>{
      const cell=$(':scope>.uc-v1637-name-cell',row)||row.children[1],key=row.closest('[data-child-key],[data-nav-key]')?.dataset.childKey||row.closest('[data-nav-key]')?.dataset.navKey;
      if(!cell||!key)return;cell.classList.add('db144-menu-name-cell');
      if(!$('.db144-menu-input-wrap',cell)){
        const source=$('strong,[data-expand-nav]>span',cell),text=clean(source?.textContent)||clean($('input',cell)?.value)||key,wrap=document.createElement('div'),input=document.createElement('input');
        wrap.className='db144-menu-input-wrap';input.className='db144-menu-label';input.value=text;input.maxLength=80;input.readOnly=key==='home';input.setAttribute('aria-label','Menu label for '+text);
        input.onchange=async()=>{const label=clean(input.value);if(!label){input.value=text;return;}input.disabled=true;try{await window.DropBeatNavigationPresentation?.renameLabel(key,label);}catch(error){input.disabled=false;window.ucAdminToast?.(error.message||'The menu label could not be saved.','error');}};
        wrap.appendChild(input);const expand=$('[data-expand-nav]',row);
        if(expand){const button=document.createElement('button');button.type='button';button.className='db144-menu-children';button.innerHTML=v144Icon('down');button.setAttribute('aria-label','Manage sub-options for '+text);button.onclick=()=>expand.click();wrap.appendChild(button);}
        cell.appendChild(wrap);v144MenuInputs.set(wrap,input);
      }
      $$('[data-top-move],[data-child-move]',row).forEach(button=>{const up=Number(button.dataset.topMove||button.dataset.childMove)<0;v144NativeIcon(button,up?'up':'down',up?'Move up':'Move down');});
      $$('[data-nav-edit]',row).forEach(button=>v144NativeIcon(button,'edit','Edit menu item'));
    });
    $$('#pages .card>p',root).filter(node=>/Save All Page Edits saves/.test(node.textContent)).forEach(node=>node.classList.add('db144-mobile-hidden'));
  }

  /* V1.47 — shared mobile presentation adapters; original controls remain live. */
  /* V1.47 — exact mobile field ownership. Original nodes, events and save payloads stay in their original forms. */
  const v146Moved=new Map(),v146Scoped=new Set();
  function v146ControlLabel(control){
    const name=control.name||control.getAttribute('id')||'';
    const social=name.match(/^social_(\d+)_(url|enabled)$/);
    if(social){const platform=$('[name="social_'+social[1]+'_label"]',control.form||control.closest('form'))?.value||'Social profile';return platform+(social[2]==='enabled'?' Visibility':' URL');}
    const exact={siteName:'Brand Name',tagline:'Tagline',logoUrl:'Logo URL',logoFile:'Logo Image',faviconUrl:'Favicon URL',faviconFile:'Favicon Image',whatsappNumber:'Floating WhatsApp Number',ucAdminHelpEnabled:'Admin Information Help',adminHelpEnabled:'Admin Information Help',marqueeTabTitleEnabled:'Marquee Tab Title Effect',legalEntityEnabled:'Enable Legal Entity',legalEntityName:'Organization / Legal Name',legalEntityAddress:'Legal Address',ucTaxMaster:'Enable Taxes',ucTaxGst:'GST',ucTaxService:'Service Charge',ucTaxOther:'Other Tax',emailEnabled:'Email Notifications',whatsappEnabled:'WhatsApp Notifications',images:'Gym Images',alt_text:'Alt Text',visible:'Visibility'};
    if(exact[name])return exact[name];
    if(control.type==='file'){const label=$(':scope>label:not(.db143-upload-area)',control.closest('.field'));return clean(label?.textContent)||'Upload Image';}
    if(control.matches('[data-map-field]'))return titleCase(control.dataset.mapField.replaceAll('_',' '));
    return '';
  }
  function v146LeafUnits(form,accept){
    const units=[],outer='.toggle-row,.uc-v6-toggle-row,.uc-v7-help-master,.uc-v1649-marquee-master,.uc1700-notification-channel,.uc-map-location,[data-db145-unit]';
    formControls(form).filter(c=>c.type!=='hidden'&&accept(c)).forEach(control=>{
      let unit=control.closest(outer)||control.closest('.field,.portal-field,fieldset,.check,.toggle-control')||control.closest('label')||control.parentElement;
      if(!unit||unit===form||unit.closest('.db137-wizard-nav,.db138-page-header,.db138-review,.form-actions:not([data-db145-unit]),.uc-info-back-panel'))return;
      if(!units.includes(unit))units.push(unit);
    });
    $$('[data-db145-unit],.uc-map-head',form).forEach(unit=>{if(!units.includes(unit))units.push(unit);});
    return units.filter(unit=>!units.some(other=>other!==unit&&other.contains(unit))).sort((a,b)=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);
  }
  function v146ScopeForm(form,state){
    v146Scoped.add(form);
    const units=state.units,prune=node=>{
      if(node===state.review||units.some(unit=>unit===node||unit.contains(node))){if(node.classList.contains('db146-scope-excluded'))node.classList.remove('db146-scope-excluded');return;}
      const contains=units.some(unit=>node.contains(unit));
      const message=node.matches('[id$="Msg"],[id$="Message"],[data-msg],[data-db122-class-change-msg]');
      node.classList.toggle('db146-scope-excluded',!contains&&!message);
      if(contains)[...node.children].forEach(prune);
    };
    [...state.body.children].forEach(prune);
    // Review is independent, read-only content, never a duplicate of the live input DOM.
    if(!state.review.__db146ReadOnly){state.review.__db146ReadOnly=true;state.review.addEventListener('click',event=>event.stopPropagation());}
  }
  function v146FormatReview(review){
    $$('dl',review).forEach(list=>{
      [...list.children].filter(node=>node.tagName==='DT').forEach(term=>{
        const value=term.nextElementSibling;if(value?.tagName!=='DD')return;
        const row=document.createElement('div');row.className='db146-review-row';term.before(row);row.append(term,value);
        value.classList.toggle('db146-review-truncate',/URL|Image|File/i.test(term.textContent)||/^https?:\/\//i.test(value.textContent));value.title=value.textContent;value.setAttribute('aria-label',term.textContent+': '+value.textContent);
      });
    });
  }
  function v146SharedActions(panel){
    const form=$('form[data-db145-brand="settings"]',panel);if(!form)return;
    const mode=form.dataset.db145Mode,view=form.dataset.db145View;
    let box=$(':scope>.db146-settings-actions',panel);if(!box){box=document.createElement('div');box.className='db146-settings-actions';const after=$(':scope>.uc54-brand-context',panel)||$(':scope>.db145-brand-segments',panel);(after||panel.firstElementChild).after(box);}
    const key=mode+':'+view;if(box.dataset.key===key)return;box.dataset.key=key;box.replaceChildren();
    const choices=mode==='legal'?[['entity','Legal Entity'],['taxes','Taxes']]:[[view,mode==='colors'?(view==='theme'?'Theme':'Website Colors'):'Brand Profile']];
    choices.forEach(([value,title])=>{const row=document.createElement('button');row.type='button';row.dataset.db146SettingsView=value;v145SetRow(row,title);row.onclick=()=>{
      if(mode==='legal')form.dataset.db146LegalView=value;
      v145PrepareBrand(panel);form.dataset.db145View=value;form.dataset.db144Title=title;
      const state=v145BrandStates.get(form);if(state)state.title=title;enhanceForm(form);v145OpenBrand(form);queuePasses();
    };box.appendChild(row);});
  }
  function v146BannerActions(panel){
    let box=$(':scope>.db146-banner-actions',panel);if(!box){box=document.createElement('div');box.className='db146-banner-actions';const after=$(':scope>.uc54-brand-context',panel)||panel.firstElementChild;after.after(box);}
    [['#bannerForm','Home Banner'],['[data-studio-gallery-form]','Gym Images']].forEach(([selector,title])=>{
      const form=$(selector,panel),state=v145BrandStates.get(form);if(!form||!state)return;
      state.owner.classList.add('db146-banner-source');const key=selector==='#bannerForm'?'banner':'studio';let row=$('[data-db146-banner="'+key+'"]',box);
      if(!row){row=document.createElement('button');row.type='button';row.dataset.db146Banner=key;v145SetRow(row,title);box.appendChild(row);}
      row.onclick=()=>{v145PrepareBrand(panel);v145OpenBrand(form);};
    });
  }
  function v146Storage(root){
    const panel=root.id==='storage'?root:null;
    if(panel){
      const head=$(':scope>.top',panel);if(head){const actions=headerActions(head);$$(':scope>button:not(.db146-storage-info)',actions).forEach(button=>button.remove());
        if(!$('.db146-storage-info',actions)){const button=document.createElement('button');button.type='button';button.className='db138-icon-button db146-storage-info';button.innerHTML=icon('info');button.setAttribute('aria-label','Storage Help & Instructions');button.onclick=()=>openTextSheet('Storage — Help & Instructions',clean($('.uc-storage-safe-note',panel)?.textContent)+' Only eligible expired or old records can be reviewed for cleanup. Existing confirmation steps remain required before deletion.',button);actions.appendChild(button);}
      }
      const capsule=$('#ucStorageBattery',panel);if(capsule){let bar=$('.db146-storage-progress',capsule);if(!bar){bar=document.createElement('span');bar.className='db146-storage-progress';capsule.appendChild(bar);capsule.setAttribute('role','progressbar');capsule.setAttribute('aria-label','Available storage');capsule.setAttribute('aria-valuemin','0');capsule.setAttribute('aria-valuemax','100');}const value=Math.max(0,Math.min(100,parseFloat($('strong',capsule)?.textContent)||0));bar.style.width=value+'%';capsule.setAttribute('aria-valuenow',String(value));}
    }
    const modal=root.id==='ucStorageCleanupModal'?root:$('#ucStorageCleanupModal.open',root);
    if(modal){const actions=$('.uc-storage-delete-actions',modal),sources=actions?$$('button',actions):[];
      let fab=$('.db146-storage-delete-fab',modal);if(actions&&!fab){fab=document.createElement('button');fab.type='button';fab.className='db146-storage-delete-fab';fab.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/></svg>';fab.setAttribute('aria-label','Delete cleanup records');modal.appendChild(fab);}
      if(fab){fab.disabled=!sources.some(source=>!source.disabled);fab.onclick=()=>openChoiceSheet({title:'Delete eligible records',trigger:fab,render(host){sources.forEach((source,index)=>{const row=document.createElement('button');row.type='button';row.className='db137-choice-option db146-danger-option';row.textContent=index?'Delete All Eligible':'Delete Selected';row.disabled=source.disabled;row.onclick=()=>{closeChoiceSheet();source.click();};host.appendChild(row);});}});}
    }
    const detail=root.id==='ucStorageItemDetailModal'?root:$('#ucStorageItemDetailModal.open',root);if(detail){detail.classList.add('db146-storage-detail-sheet');detail.dataset.db137Sheet='bottom';}
  }
  function v146AnchorBrandTabs(root){
    if(!root.matches?.('.panel.active'))return;
    const tabs=$(':scope>.uc54-brand-tabs',root),active=tabs&&$('[data-uc54-brand-mode].active',tabs);if(!tabs||!active)return;
    if(tabs.__db146ActiveTab===active)return;
    tabs.__db146ActiveTab=active;
    requestAnimationFrame(()=>{if(!root.classList.contains('active')||!active.isConnected)return;const row=tabs.getBoundingClientRect(),item=active.getBoundingClientRect();if(item.left<row.left+8)tabs.scrollLeft-=row.left+8-item.left;else if(item.right>row.right-8)tabs.scrollLeft+=item.right-row.right+8;});
  }
  function v146BrandPolish(root){
    if(root.id==='settings')v146SharedActions(root);
    if(root.id==='banners')v146BannerActions(root);
    $$('[data-db145-brand]',root).forEach(form=>{
      const state=formStates.get(form);if(state)v146ScopeForm(form,state);
      if(form.dataset.db145Brand==='banners'&&form.classList.contains('db138-inline-form-open')){
        const head=$(':scope>.db138-page-header',form),extra=v145OriginalActions(form,v145BrandStates.get(form)?.owner).extras;
        if(head&&extra.some(source=>/^(?:clear|reset form)/i.test(clean(source.textContent)))&&!$('.db146-brand-more',head)){
          const more=document.createElement('button');more.type='button';more.className='db138-icon-button db146-brand-more';more.setAttribute('aria-label','More form actions');more.innerHTML=icon('more');more.onclick=()=>v145ShowBrandActions(form,more);const actions=headerActions(head);actions.insertBefore(more,$('.db141-header-close',actions));
        }
      }
      $$('input[type=file]',form).forEach(input=>{const caption=$('span',input.closest('.db143-upload-area'));if(caption){const label=[...input.files].map(file=>file.name).join(', ')||'Kickboxing to choose an image';if(caption.textContent!==label)caption.textContent=label;}});

      $$('.db138-page-header .db138-header-icons>[data-db139-action=info]',form).forEach(proxy=>{if(!proxy.classList.contains('db145-brand-help'))proxy.remove();});
      if(form.dataset.db145Brand==='settings')$$('.db138-open-form',root).filter(row=>row.__form===form).forEach(row=>{if(!v145RemovedNodes.has(row)){const marker=document.createComment('Original desktop settings launcher');row.before(marker);row.remove();v145RemovedNodes.set(row,marker);}});
      if(form.dataset.db145Security==='email'){
        const row=$$('.db138-open-form',root).find(row=>row.__form===form),source=$$(HELP_BUTTONS,v145BrandStates.get(form)?.owner).find(n=>!n.__db138Source&&!n.closest('.db138-page-header,.uc-info-back-panel'));
        if(row&&source&&!$('.db146-inline-info',row)){const info=document.createElement('span');info.className='db146-inline-info';info.setAttribute('role','button');info.tabIndex=0;info.setAttribute('aria-label','Change Admin Email Help & Instructions');info.innerHTML=icon('info');info.onclick=event=>{event.preventDefault();event.stopImmediatePropagation();openHelp(source);};info.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();info.click();}};row.insertBefore(info,$('[data-db-disclosure]',row));}
      }
    });
    $$('[onclick*="removeUCMapLocation"]',root).forEach(button=>{if(button.dataset.db146Remove)return;button.dataset.db146Remove='1';iconify(button,'close','Remove Location');button.classList.add('db146-remove-location');});
    v146Storage(root);v146AnchorBrandTabs(root);
  }
  function v146Restore(){
    $$('.db146-settings-actions,.db146-banner-actions,.db146-inline-info,.db146-storage-info,.db146-storage-progress,.db146-storage-delete-fab').forEach(node=>node.remove());
    $$('.db146-scope-excluded,.db146-banner-source,.db146-shared-launcher').forEach(node=>node.classList.remove('db146-scope-excluded','db146-banner-source','db146-shared-launcher'));
    $$('.db146-storage-detail-sheet').forEach(node=>node.classList.remove('db146-storage-detail-sheet'));
    v146Scoped.clear();
  }

  const v145BrandPanels=new Set(['settings','banners','socials','checkoutSettings','mapsReviews','brandEmails','coachSettings','security']);
  const v145BrandStates=new Map(),v145GeneratedEditors=new Map(),v145RemovedNodes=new Map(),v145NestedDetails=new Map(),v145StorageHeaders=new Map();
  const v145ModeNames={profile:'Brand Profile',colors:'Website Colors',legal:'Legal Info'};
  function v145ReviewKey(form,state){
    return JSON.stringify({mode:form.dataset.db145Mode,view:form.dataset.db145View,steps:state.steps.map(step=>step.label),
      controls:state.units.flatMap(unit=>formControls(unit).map(control=>[control.name,control.getAttribute('id'),control.type,control.type==='password'?!!control.value:control.value,control.checked,control.disabled,control.placeholder,controlLabel(control),conditionallyHidden(control,form),control.tagName==='SELECT'?[...control.selectedOptions].map(option=>option.textContent):null,control.type==='file'?[...control.files].map(file=>[file.name,file.size,file.lastModified]):null])),
      images:$$('img,video',form).filter(node=>!node.closest('.db138-review')).map(node=>[node.getAttribute('src'),node.getAttribute('poster'),node.getAttribute('alt')]),
      media:$('#currentProductMedia',form)?.textContent,theme:$('[name="frontendTheme"]',form)?.value});
  }
  function v145PrivateReview(form,state){
    if(form.dataset.db144Integration)return;
    const controls=formControls(form).filter(control=>control.type==='password'&&!control.disabled&&!conditionallyHidden(control,form));if(!controls.length)return;
    const section=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('dl');heading.textContent='Credentials';
    controls.forEach(control=>{const label=document.createElement('dt'),value=document.createElement('dd');label.textContent=controlLabel(control);value.textContent=control.value?'Value provided':/keep|saved|unchanged/i.test(control.placeholder)?'Keep saved value':'Not entered';list.append(label,value);});section.append(heading,list);state.review.appendChild(section);
  }
  function v145SettingsMode(unit){
    if(unit.closest('.uc-v9-legal-entity,.uc-v160-taxes-card')||$('input[id^="ucTax"]',unit))return 'legal';
    if(unit.closest('.uc-v7-theme-details,.uc-theme-builder,.uc129-theme-panel')||unit.matches('.uc-theme-builder,.uc129-theme-panel')||/\b(?:primaryColor|accentColor|colorPaletteType|frontendTheme)\b/.test(unitNames(unit)))return 'colors';
    return 'profile';
  }
  function v145FormUnits(form){
    if(!form.dataset.db145Brand)return null;
    if(form.dataset.db145Brand==='settings'){
      const mode=form.dataset.db145Mode,view=form.dataset.db145View;
      if(mode==='colors'){const unit=$(view==='theme'?'.uc129-theme-panel':'.uc-theme-builder',form);return unit?[unit]:[];}
      if(mode==='legal'){const unit=$(view==='taxes'?'.uc-v160-taxes-card':'.uc-v9-legal-entity',form);return unit?[unit]:[];}
      const allowed=new Set(['siteName','tagline','logoUrl','logoFile','faviconUrl','faviconFile','whatsappNumber','adminHelpEnabled','ucAdminHelpEnabled','marqueeTabTitleEnabled']);
      return v146LeafUnits(form,control=>allowed.has(control.name||control.getAttribute('id')));
    }
    if(form.dataset.db145Template)return $$('.field',form).filter(unit=>!unit.parentElement.closest('.field'));
    return v146LeafUnits(form,()=>true);
  }
  function v145FormSteps(form,units){
    if(!form.dataset.db145Brand)return null;
    let label='Details';
    if(form.dataset.db145Brand==='settings')label=form.dataset.db145Mode==='profile'?'Brand Details':form.dataset.db145Mode==='legal'?(form.dataset.db145View==='taxes'?'Tax Options':'Legal Entity'):'Settings';
    else if(form.dataset.db145Brand==='socials')label='All Social Links';
    else if(form.dataset.db145Brand==='coachSettings'||form.getAttribute('id')==='checkoutSettingsForm'||form.matches('#ucContactMapForm,#ucReviewsForm'))label='Settings';
    else if(form.dataset.db145Template)label='Editor';
    return [{label,items:units},{label:'Review',items:[]}];
  }
  function v145BrandReview(form,state){
    if(form.dataset.db145Brand==='settings'&&form.dataset.db145Mode==='colors'){
      const section=document.createElement('section'),h=document.createElement('h3'),dl=document.createElement('dl');h.textContent=form.dataset.db145View==='theme'?'Theme':'Website Colors';
      const add=(label,value)=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value||'—';dl.append(dt,dd);};
      if(form.dataset.db145View==='theme')add('Frontend Theme',clean($('.uc129-theme-choice[aria-pressed="true"] strong',form)?.textContent)||$('[name="frontendTheme"]',form)?.value);
      else{add('Palette',$('[name="colorPaletteType"]',form)?.selectedOptions?.[0]?.textContent);add('Primary Color',$('[name="primaryColor"]',form)?.value);add('Accent Color',$('[name="accentColor"]',form)?.value);}
      section.append(h,dl);state.review.appendChild(section);return true;
    }return false;
  }
  function v145OriginalActions(form,owner){
    const buttons=$$('button,input[type="submit"]',owner||form).filter(button=>!button.closest('.db137-wizard-nav,.db137-wizard-progress,.db138-page-header')&&!button.matches('.db138-open-form,.db138-proxy-icon,.db145-native-row')&&!button.__db138Source);
    const final=(form.dataset.db145Brand==='settings'?(form.dataset.db145Mode==='legal'&&form.dataset.db145View==='taxes'?$('#ucSaveTaxes',form):$('button[type=submit],input[type=submit]',form)):null)||$('[data-db145-source-submit]',form)||buttons.find(button=>button.form===form&&button.type==='submit')||buttons.find(button=>/^(?:save|confirm email change|connect google account|change password)\b/i.test(clean(button.textContent)))||buttons.find(button=>button.type==='submit');
    const extras=buttons.filter(button=>button!==final&&/^(?:preview|revert|clear(?: form)?|reset form|refresh reviews|test connection|connect|disconnect|sign in with google)\b/i.test(clean(button.getAttribute('aria-label')||button.title||button.textContent)));
    return {final,extras};
  }
  function v145SetRow(row,title){
    if(row.__db145Label===title&&$('[data-db-disclosure]',row))return;
    row.__db145Label=title;disclosureRow(row,title);row.classList.add('db145-native-row');
  }
  function v145OpenBrand(form){
    const state=v145BrandStates.get(form);if(!state)return;
    if(form.dataset.db145Template){const toggle=$('[data-enable-email-editing]',$('#brandEmails'));if(toggle&&!toggle.checked)toggle.click();}
    if(state.owner.matches('details'))state.owner.open=true;
    form.classList.add('db138-inline-form-open');state.owner.classList.add('db145-brand-open');
    enhanceForm(form);syncWizard(form,0);
    const head=$(':scope>.db138-page-header',form),title=$('h2',head);if(title&&title.textContent!==state.title)title.textContent=state.title;
    if(head&&!$('.db145-brand-help',head)){
      normalizeHeader(head);const help=document.createElement('button');help.type='button';help.className='db138-icon-button db145-brand-help';help.innerHTML=icon('info');help.setAttribute('aria-label',state.title+' Help & Instructions');
      help.onclick=()=>{const source=$$(HELP_BUTTONS,state.owner).find(button=>{if(button.matches('.db145-brand-help,.uc-info-back-btn')||button.__db138Source)return false;const section=button.closest('[data-uc-v1652-section]')?.dataset.ucV1652Section;return !section||section===form.dataset.db145Mode;});if(source)openHelp(source);else openTextSheet(state.title+' — Help & Instructions','Complete the fields, then continue to the read-only Review screen. Save uses the existing form action.',help);};headerActions(head).prepend(help);
    }
    $$('[data-db137-finish]',form).forEach(button=>{if(button.__source)button.textContent=clean(button.__source.textContent||button.__source.value)||'Save';});
    $('.db145-brand-help',head)?.setAttribute('aria-label',state.title+' Help & Instructions');
    const close=$('button[aria-label^="Close"]',head);if(close&&!close.__db145Close){const original=close.onclick;close.__db145Close=true;close.onclick=event=>{original?.call(close,event);state.owner.classList.remove('db145-brand-open');if(state.owner.matches('details'))state.owner.open=false;updateModalLock();};}
    updateModalLock();
  }
  function v145ShowBrandActions(form,trigger){
    const state=v145BrandStates.get(form),actions=v145OriginalActions(form,state.owner);
    if(!actions.extras.length){v145OpenBrand(form);return;}
    openChoiceSheet({title:state.title,trigger,render(host){
      const add=(label,action,disabled=false)=>{const button=document.createElement('button');button.type='button';button.className='db137-choice-option';button.textContent=label;button.disabled=disabled;button.onclick=action;host.appendChild(button);};
      add('Edit',()=>{closeChoiceSheet();v145OpenBrand(form);});
      actions.extras.forEach(source=>{
        const label=/refreshUCReviews|refresh.*Reviews/i.test(source.getAttribute('onclick')||'')?'Refresh Reviews Now':clean(source.getAttribute('aria-label')||source.title||source.textContent);
        add(label,()=>{if(/^preview/i.test(label)){source.click();return;}closeChoiceSheet();if(/^revert/i.test(label))v145OpenBrand(form);source.click();if(/^(?:clear|reset form)/i.test(label)){const panel=form.closest('.panel');if(panel)v145PrepareBrand(panel);v145OpenBrand(form);}queuePasses();},source.disabled&&!/^revert/i.test(label));
      });
    }});
  }
  function v145TemplateEditors(panel){
    $$('details[data-template]',panel).forEach(card=>{
      if($('[data-db145-template]',card))return;
      const fields=$(':scope>[data-template-fields]',card);if(!fields)return;
      const marker=document.createComment('Original email template fields'),editor=document.createElement('div');fields.before(marker);editor.className='form db145-template-editor';editor.setAttribute('role','form');editor.dataset.db145Template=card.dataset.template;editor.dataset.db145Brand='brandEmails';fields.before(editor);editor.appendChild(fields);
      v145GeneratedEditors.set(editor,{marker,original:fields});const save=$('[data-save-email]',editor);if(save){save.dataset.db145SourceSubmit='1';save.dataset.db143SourceSubmit='1';}
    });
  }
  function v145SecurityEditors(panel){
    $$('.card.form',panel).filter(card=>card.tagName!=='FORM'&&!$('form,[data-db145-security]',card)&&$('input',card)&&$('button',card)).forEach(card=>{
      const editor=document.createElement('form'),marker=document.createComment('Original security fields'),heading=$(':scope>h3',card);editor.className='form';editor.dataset.db145Security=$('#newAdminEmail',card)?'email':'google';editor.onsubmit=event=>event.preventDefault();
      const nodes=[...card.childNodes].filter(node=>node!==heading);card.appendChild(marker);card.appendChild(editor);nodes.forEach(node=>editor.appendChild(node));v145GeneratedEditors.set(editor,{marker,original:null});
      const final=$$('button',editor).find(button=>/^(Confirm Email Change|Connect Google Account)$/i.test(clean(button.textContent)));if(final){final.dataset.db145SourceSubmit='1';final.dataset.db143SourceSubmit='1';}
      const send=$('button[onclick*="requestEmailChange"]',editor);if(send)send.closest('.form-actions').dataset.db145Unit='1';
    });
  }
  function v145Segments(panel,key,choices,onSelect){
    let tabs=$(':scope>.db145-brand-segments',panel);
    if(!tabs){tabs=document.createElement('div');tabs.className='db145-brand-segments db141-view-segments';tabs.setAttribute('role','tablist');const navigation=$(':scope>.uc-v1652-brand-tabs',panel)||$(':scope>.uc54-brand-context',panel);if(navigation)navigation.after(tabs);else panel.prepend(tabs);
      choices.forEach(([value,label])=>{const button=document.createElement('button');button.type='button';button.dataset.db145View=value;button.textContent=label;button.setAttribute('role','tab');button.onclick=()=>onSelect(value);tabs.appendChild(button);});
    }
    $$('button',tabs).forEach(button=>{const selected=button.dataset.db145View===key;button.classList.toggle('active',selected);button.setAttribute('aria-selected',String(selected));});return tabs;
  }
  function v145PrepareBrand(root){
    if(!v145BrandPanels.has(root.id))return;
    const panel=root;
    if(panel.id==='settings'){
      const form=$('form',panel);if(!form)return;
      const mode=$('[data-uc54-brand-mode].active',panel)?.dataset.uc54BrandMode||'profile';form.dataset.db145Mode=['profile','colors','legal'].includes(mode)?mode:'profile';
      const builder=$('.uc-theme-builder',form);if(builder&&(!$('.uc129-appearance-tabs',form)||!builder.closest('.uc129-appearance-shell')?.contains($('.uc129-appearance-tabs',form))))window.DropBeatAppearanceUI?.ensure();
      form.dataset.db145View=mode==='colors'?($('.uc129-appearance-shell',form)?.dataset.db129ActivePanel||'colors'):mode==='legal'?(form.dataset.db146LegalView||'entity'):'profile';
      window.ucV1652ApplySettingsMode?.(form.dataset.db145Mode);
      if(mode==='colors')v145Segments(panel,form.dataset.db145View,[['colors','Website Colors'],['theme','Theme']],value=>{const source=$('[data-db129-appearance="'+value+'"]',form);source?.click();form.dataset.db145View=value;queuePasses();});
      else $(':scope>.db145-brand-segments',panel)?.remove();
    }
    if(panel.id==='brandEmails')v145TemplateEditors(panel);
    if(panel.id==='security')v145SecurityEditors(panel);
    $$('[data-db122-remuneration-filter]',panel).forEach(form=>form.classList.add('filter-form'));
    $$('form,[data-db145-template]',panel).filter(form=>!form.matches('[data-email-template-form],.filter-form')).forEach(form=>{
      form.dataset.db145Brand=panel.id;
      for(let host=form.parentElement;host&&host!==panel;host=host.parentElement)host.classList.add('db145-viewport-host');
      $$('details',form).forEach(details=>{if(!v145NestedDetails.has(details))v145NestedDetails.set(details,details.open);details.open=true;details.classList.add('db145-inner-section');});
      const owner=form.closest('details')||(!form.matches('.card')?form.closest('.card'):null)||form.parentElement;
      const summary=owner?.matches('details')?$(':scope>summary',owner):null;
      const ownHeading=$(':scope>h2,:scope>h3,:scope>.db138-form-content>h2,:scope>.db138-form-content>h3',form);
      let title=panel.id==='settings'?(form.dataset.db145Mode==='legal'?(form.dataset.db145View==='taxes'?'Taxes':'Legal Entity'):form.dataset.db145Mode==='colors'&&form.dataset.db145View==='theme'?'Theme':v145ModeNames[form.dataset.db145Mode]):summary?v144IntegrationLabel(owner):clean(ownHeading?.textContent)||clean($('h2,h3',owner)?.textContent)||'Edit Details';
      form.dataset.db144Title=title;
      const actions=v145OriginalActions(form,owner);
      if(!actions.final)return;actions.final.dataset.db143SourceSubmit='1';actions.final.dataset.db145SourceSubmit='1';
      let state=v145BrandStates.get(form);if(!state){state={owner,title,wasOpen:owner?.open};v145BrandStates.set(form,state);}state.title=title;state.owner=owner;
      if(summary){
        summary.classList.add('db145-native-summary');owner.classList.add('db145-brand-owner');
        if(!$(':scope>[data-db-disclosure]',summary))summary.insertAdjacentHTML('beforeend',icon('chevron'));
        if(!summary.__db145Brand){summary.__db145Brand=true;summary.addEventListener('click',event=>{if(!PHONE.matches||event.target.closest('button,a'))return;event.preventDefault();event.stopImmediatePropagation();v145ShowBrandActions(form,summary);},true);}
      }
    });
  }
  function v145CheckoutViews(panel){
    const key=panel.dataset.db145CheckoutView||'behaviour';
    v145Segments(panel,key,[['behaviour','Checkout Behaviour'],['notifications','Notifications'],['coupons','Coupon Codes']],value=>{panel.dataset.db145CheckoutView=value;queuePasses();});
    const behaviour=$('#checkoutSettingsForm',panel),coupon=$('#couponForm',panel);
    const group=form=>form?.closest('details')||form?.closest('.card')||form;
    const roots=[[group(behaviour),'behaviour'],[group(coupon),'coupons'],[$('#couponTable',panel)?.closest('.card'),'coupons'],[$('#uc1700AdminNotifications',panel),'notifications']];
    roots.forEach(([node,view])=>{node?.classList.toggle('db145-view-hidden',view!==key);if(node?.matches('form')&&node.previousElementSibling?.matches('.db138-open-form'))node.previousElementSibling.classList.toggle('db145-view-hidden',view!==key);});
  }
  function v145Refresh(root=document){
    $$('button,a',root).forEach(button=>{
      if(button.closest('.db138-desktop-label,#db137ChoiceSheet,.db138-review')||button.__db138Source?.closest('#dashboard>.top'))return;
      const label=clean(button.getAttribute('aria-label')||button.title||button.textContent);
      if(!button.matches('[data-db139-action="refresh"],[data-db138-icon="refresh"],.uc-refresh-icon')&&!/^refresh(?:\s|$)/i.test(label))return;
      if(button.closest('#dashboard>.top')&&!$('svg',button))return;
      if(!button.dataset.db138Icon&&!button.__db138Source)iconify(button,'refresh',label||'Refresh');
      let svg=$(':scope>svg',button);
      if(!svg){const text=document.createElement('span');text.className='db138-desktop-label';text.append(...button.childNodes);button.appendChild(text);button.insertAdjacentHTML('beforeend',icon('refresh'));svg=$(':scope>svg',button);}
      svg?.classList.add('db145-refresh-icon');
    });
  }
  function v145IntegrationHeads(root){
    const panel=root.id==='socialMediaIntegrations'?root:$('#socialMediaIntegrations',root);if(!panel)return;
    $$('.uc92-pane-head,.uc49-info-line',panel).forEach(head=>{head.classList.add('db145-context-header');normalizeHeader(head);const actions=headerActions(head);$$(':scope>button',head).filter(button=>button.matches(HELP_BUTTONS)).forEach(source=>{source.__db145Actions=actions;proxyIcon(source,actions,'info',source.getAttribute('aria-label')||'Help & Instructions');});});
    const api=$('#apiSettings',panel),head=$('[data-uc49-pane="api"]>.uc49-info-line',panel);
    if(api&&head){const source=$(':scope>.top button:not(.db138-proxy-icon)',api);if(source){source.__db145Actions=headerActions(head);proxyIcon(source,source.__db145Actions,'refresh','Refresh API Settings');}api.classList.add('db145-api-context');}
    $$('#apiEndpointList .endpoint,#webhookList .endpoint',panel).forEach(card=>{card.classList.add('db145-endpoint-card');$$('button',card).forEach(button=>{
      if(button.__db145Copy)return;button.__db145Copy=true;iconify(button,'copy','Copy endpoint URL');button.classList.add('db145-copy-action');});});
  }
  function v145StorageHeads(root){
    $$('[data-storage-card]',root).forEach(card=>{const front=$('.uc-flip-front',card),heading=$('h3',front),source=$('.uc-card-eye',front);if(!front||!heading||!source)return;
      let head=heading.closest('.db145-storage-header');if(!head){head=document.createElement('header');head.className='db145-storage-header';heading.before(head);head.appendChild(heading);v145StorageHeaders.set(head,heading);}
      normalizeHeader(head);source.__db145Actions=headerActions(head);proxyIcon(source,source.__db145Actions,'info',source.getAttribute('aria-label')||'Cleanup category help');
    });
    $$('.uc-storage-cleanup-head',root).forEach(head=>{normalizeHeader(head);const source=$('button:not(.db138-proxy-icon)',head);if(source){source.__db145Actions=headerActions(head);proxyIcon(source,source.__db145Actions,'refresh','Refresh Safe Cleanup');}});
  }
  function enhanceV145(root){
    for(const [form,state]of v145BrandStates){
      if(!form.isConnected){v145BrandStates.delete(form);continue;}if(!root.contains(form))continue;
      enhanceForm(form);
      if(form.classList.contains('db138-inline-form-open')){const heading=$(':scope>.db138-page-header h2',form);if(heading&&heading.textContent!==state.title)heading.textContent=state.title;}
      $$('[data-db137-finish]',form).forEach(button=>{const label=clean(button.__source?.textContent||button.__source?.value)||'Save';if(button.textContent!==label)button.textContent=label;});
      const launchers=$$('.db138-open-form',root).filter(button=>button.__form===form);
      for(const launcher of launchers){
        if(state.owner.matches('details')){if(!v145RemovedNodes.has(launcher)){const marker=document.createComment('Original desktop form launcher');launcher.before(marker);launcher.remove();v145RemovedNodes.set(launcher,marker);}}
        else{v145SetRow(launcher,state.title);launcher.onclick=()=>v145ShowBrandActions(form,launcher);}
      }
      if(state.owner.matches('details')&&!form.classList.contains('db138-inline-form-open'))state.owner.classList.remove('db145-brand-open');
      $$('input[type="file"]',form).forEach(input=>nativeUpload(input,'Upload Image'));
    }
    $$('#bannerTable .uc-table-grid,#couponTable .uc-table-grid,#couponTable .uc-grid',root).forEach(list=>{
      list.classList.add('db145-record-list');const labels=$$(':scope>.uc-grid-head',list).map(head=>clean(head.textContent));
      $$(':scope>.uc-grid-row',list).forEach(row=>{row.classList.add('db145-list-row');if(row.style.display==='contents')row.style.setProperty('display','grid','important');[...row.children].forEach((cell,index)=>cell.dataset.db136Label=labels[index]||'Details');});
    });
    const panel=root.id==='checkoutSettings'?root:$('#checkoutSettings',root);if(panel)v145CheckoutViews(panel);
    $$('.db145-brand-segments',root).forEach(tabs=>tabs.classList.remove('db141-content-tabs','db142-tab-bar'));
    $$('#bannerTable table,#couponTable table,.uc-storage-list-wrap',root).forEach(table=>table.classList.add('db145-record-list'));
    const faq=$('#faqForm',root),open=faq?.previousElementSibling;
    if(open?.matches('.db138-open-form')&&!v145RemovedNodes.has(open)){const marker=document.createComment('Desktop FAQ launcher');open.before(marker);open.remove();v145RemovedNodes.set(open,marker);}
    v145StorageHeads(root);v145IntegrationHeads(root);v145Refresh();v146BrandPolish(root);
  }
  function v145BindBrandEdits(root){
    for(const [name,selector]of [['editBanner','#bannerForm'],['editCoupon','#couponForm']]){
      const original=window[name];if(typeof original!=='function'||original.__db145Edit)continue;
      const wrapped=function(){const result=original.apply(this,arguments);if(PHONE.matches){const form=$(selector),panel=form?.closest('.panel');if(form&&panel?.classList.contains('active')){if(selector==='#couponForm')panel.dataset.db145CheckoutView='coupons';v145PrepareBrand(panel);v145OpenBrand(form);queuePasses();}}return result;};
      Object.assign(wrapped,original);wrapped.__db145Edit=true;window[name]=wrapped;
    }
    $$('[data-gallery-action="edit"]',root).forEach(button=>{if(button.__db145Edit)return;button.__db145Edit=true;button.addEventListener('click',()=>{if(!PHONE.matches)return;requestAnimationFrame(()=>{const form=$('[data-studio-gallery-form]'),panel=form?.closest('.panel');if(form&&panel){v145PrepareBrand(panel);v145OpenBrand(form);queuePasses();}});});});
  }
  function prepareV145(root){v145PrepareBrand(root);v145BindBrandEdits(root);}
  function restoreV145(){
    v146Restore();
    for(const [form,state]of v145BrandStates){form.classList.remove('db138-inline-form-open');state.owner?.classList.remove('db145-brand-open');if(state.owner?.matches('details'))state.owner.open=state.wasOpen;}
    v145BrandStates.clear();
    for(const [head,heading]of v145StorageHeaders){if(head.isConnected){head.before(heading);head.remove();}}v145StorageHeaders.clear();
    $$('[data-storage-card] button,.uc-storage-cleanup-head button').forEach(source=>delete source.__db145Actions);
    for(const [details,wasOpen]of v145NestedDetails){if(details.isConnected)details.open=wasOpen;details.classList.remove('db145-inner-section');}v145NestedDetails.clear();
    for(const [editor,{marker,original}]of v145GeneratedEditors){if(!editor.isConnected)continue;const body=$(':scope>.db138-form-content',editor)||editor;if(original)marker.replaceWith(original);else{[...body.childNodes].filter(node=>!node.matches?.('.db138-review')).forEach(node=>marker.before(node));marker.remove();}editor.previousElementSibling?.matches('.db138-open-form')&&editor.previousElementSibling.remove();editor.remove();}v145GeneratedEditors.clear();
    for(const [node,marker]of v145RemovedNodes){if(marker.isConnected)marker.replaceWith(node);}v145RemovedNodes.clear();
    $$('.db145-brand-segments').forEach(node=>node.remove());$$('.db145-view-hidden').forEach(node=>node.classList.remove('db145-view-hidden'));$$('[data-db145-brand]').forEach(node=>{delete node.dataset.db145Brand;delete node.dataset.db145Mode;delete node.dataset.db145View;});
    $$('#socialMediaIntegrations button').forEach(source=>delete source.__db145Actions);
    $$('.db145-list-row').forEach(row=>{if(row.style.display==='grid')row.style.setProperty('display','contents','important');});
  }


  function v144IntegrationLabel(card){
    const summary=$(':scope>summary',card),copy=summary?.cloneNode(true);
    $$('button,svg,small,.status,[class*="status-badge"],.uc49-status,.uc49-summary-status,.db138-header-icons',copy).forEach(node=>node.remove());
    return clean(copy?.textContent)||clean($('h2,h3',card)?.textContent)||'Integration Settings';
  }
  function v144IntegrationActions(card,form){
    const buttons=$$('button,a',card).filter(button=>!button.closest('.db137-wizard-nav,.db137-wizard-progress,.db138-page-header')&&!button.matches('.db138-open-form,.db138-proxy-icon')&&!button.__db138Source);
    const title=button=>clean(button.textContent||button.value);
    const save=buttons.find(button=>button.form===form&&(/^save\b/i.test(title(button))||button.type==='submit'));
    const connect=buttons.filter(button=>/^connect(?:\s|$)|^reconnect(?:\s|$)|^authorize(?:\s|$)/i.test(title(button))&&!/disconnect/i.test(title(button)));
    const test=buttons.find(button=>/^(?:test|check connection|verify connection|retry.*check)\b/i.test(title(button)));
    const disconnect=buttons.find(button=>/^disconnect\b|^remove connection\b/i.test(title(button)));
    const extra=buttons.filter(button=>button!==save&&button!==test&&button!==disconnect&&!connect.includes(button)&&button.closest('.form-actions,.uc-v167-actions,.uc-v152-api-actions,.uc93-provider-actions')&&/^(?:generate|revoke|submit|delete|refresh|fetch)\b/i.test(title(button)));
    return{save,connect,test,disconnect,extra};
  }
  function v144PrepareIntegrations(root){
    const panel=root.id==='socialMediaIntegrations'?root:$('#socialMediaIntegrations',root);if(!panel)return;
    $$('details',panel).filter(card=>!$('form',card)&&$('input,select,textarea',card)&&$('button[onclick*="save"]',card)).forEach(card=>{const body=$(':scope>.collapsed-body',card);if(!body)return;const form=document.createElement('form');form.className='form';form.dataset.db144GeneratedApi='1';form.onsubmit=event=>event.preventDefault();body.before(form);form.appendChild(body);});
    const cards=[...$$('details',panel).filter(card=>$(':scope>summary',card)&&$('form',card)&&!card.closest('form')),...$$('form',panel).filter(form=>!form.closest('details,.modal,.db144-integration-record')).map(form=>form.closest('.card')).filter(Boolean)];
    [...new Set(cards)].forEach(card=>{
      const form=$('form',card),label=v144IntegrationLabel(card);if(!form)return;
      let state=v144IntegrationCards.get(card);
      if(!state){state={form,label,wasOpen:card.open};v144IntegrationCards.set(card,state);}
      state.form=form;state.label=label;
      form.dataset.db144Integration='1';form.dataset.db144Title=label;
      const actions=v144IntegrationActions(card,form);if(actions.save)actions.save.dataset.db143SourceSubmit='1';
      [actions.save,...actions.connect,actions.test,actions.disconnect,...actions.extra].filter(Boolean).forEach(button=>button.classList.add('db144-provider-action'));
      const callback=$('.uc123-oauth-callback',card);
      if(callback&&!form.contains(callback)){const marker=document.createComment('Original OAuth callback location');callback.before(marker);form.prepend(callback);callback.dataset.db144Unit='1';v144MovedControls.set(callback,marker);}
      $$('.form-actions input[type="checkbox"][name]',form).forEach(input=>{const label=input.closest('label');if(!label||v144MovedControls.has(label))return;const marker=document.createComment('Original integration toggle');label.before(marker);$('.form-actions',form).before(label);label.dataset.db144Unit='1';v144MovedControls.set(label,marker);});
      $$('input:not([type="hidden"]),select,textarea',form).filter(control=>!control.closest('.form-actions,.db137-wizard-nav,.db138-review')).forEach(control=>{if(control.closest(FIELD_SELECTOR+', [data-db144-unit]'))return;const unit=control.closest('label')||control.parentElement;if(unit&&unit!==form)unit.dataset.db144Unit='1';});
      card.classList.add('db144-integration-card');let summary=$(':scope>summary',card);
      if(!summary){summary=$(':scope>.db144-integration-row',card);if(!summary){summary=document.createElement('button');summary.type='button';summary.className='db144-integration-row';disclosureRow(summary,label);card.prepend(summary);}}
      summary.classList.add('db142-disclosure-summary');
      if(!$(':scope>[data-db-disclosure]',summary))summary.insertAdjacentHTML('beforeend',icon('chevron'));
      if(!summary.__db144Integration){summary.__db144Integration=true;summary.addEventListener('click',event=>{
        if(!PHONE.matches||(summary.tagName!=='BUTTON'&&event.target.closest('button,a')))return;event.preventDefault();event.stopImmediatePropagation();v144ShowIntegrationActions(card,summary);
      },true);}
    });
  }
  function v144IntegrationHelp(card,trigger){
    const source=$$(HELP_BUTTONS,card).find(button=>!button.matches('.db144-integration-help'));
    if(source){openHelp(source);return;}
    openChoiceSheet({title:v144IntegrationLabel(card)+' — Help & Instructions',trigger,done:true,render(host){
      const copy=document.createElement('article');copy.className='db138-help-copy';
      const nodes=$$('.uc-social-info,.uc-social-help,.uc93-card-help,.uc49-info-help,.notice,.hint',card).filter(node=>!node.closest('.db138-review'));
      nodes.forEach(node=>{const clone=node.cloneNode(true);$$('input,select,textarea,button,script',clone).forEach(child=>child.remove());$$('[id]',clone).forEach(child=>child.removeAttribute('id'));clone.removeAttribute('id');clone.hidden=false;copy.appendChild(clone);});
      if(!copy.textContent.trim())copy.textContent='Review the existing connection settings and enabled status. Saved credentials remain unchanged when their secret fields are left blank.';
      host.appendChild(copy);
    }});
  }
  function v144OpenIntegration(card,source=null){
    const state=v144IntegrationCards.get(card),form=state?.form;if(!form)return;
    card.open=true;card.classList.add('db144-integration-open');form.__db144FinalSource=source;
    enhanceForm(form);form.classList.add('db138-inline-form-open');
    const header=$(':scope>.db138-page-header',form),heading=$('h2',header);if(heading)heading.textContent=state.label;
    if(header&&!$('.db144-integration-help',header)){
      normalizeHeader(header);const help=document.createElement('button');help.type='button';help.className='db138-icon-button db144-integration-help';help.setAttribute('aria-label',state.label+' Help & Instructions');help.innerHTML=icon('info');help.onclick=()=>v144IntegrationHelp(card,help);headerActions(header).prepend(help);
      const close=$('.db141-header-close',header);if(close&&!close.__db144Close){const original=close.onclick;close.__db144Close=true;close.onclick=event=>{original?.call(close,event);card.classList.remove('db144-integration-open');card.open=false;form.__db144FinalSource=null;};}
    }
    const current=formStates.get(form);if(current){current.furthest=0;syncWizard(form,0);const finish=$('[data-db137-finish]',current.nav);if(finish){const final=source||v144IntegrationActions(card,form).save;finish.textContent=clean(final?.textContent)||'Save Settings';finish.__source=final;finish.onclick=()=>originalSubmit(form,final);}}
    updateModalLock();
  }
  function v144ShowIntegrationActions(card,trigger){
    const state=v144IntegrationCards.get(card);if(!state)return;const actions=v144IntegrationActions(card,state.form);
    if(!actions.connect.length&&!actions.test&&!actions.disconnect&&!actions.extra.length){v144OpenIntegration(card);return;}
    openChoiceSheet({title:state.label,trigger,render(host){
      const add=(label,action,disabled=false)=>{const row=document.createElement('button');row.type='button';row.className='db137-choice-option';row.textContent=label;row.disabled=disabled;row.onclick=()=>{closeChoiceSheet();action();};host.appendChild(row);};
      add('Edit',()=>v144OpenIntegration(card));
      actions.connect.forEach(source=>add(clean(source.textContent),()=>v144OpenIntegration(card,source),source.disabled));
      if(actions.test)add('Test Connection',()=>{v144OpenIntegration(card);actions.test.click();},actions.test.disabled);
      if(actions.disconnect)add('Disconnect',()=>actions.disconnect.click(),actions.disconnect.disabled);
      actions.extra.forEach(source=>add(clean(source.textContent),()=>{v144OpenIntegration(card);source.click();},source.disabled));
    }});
  }
  function v144IntegrationReview(form,state){
    const section=document.createElement('section'),title=document.createElement('h3'),dl=document.createElement('dl');
    title.textContent='Connection Status';const add=(label,value)=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);};
    const enabled=$('input[name="enabled"],input[name="active"]',form);if(enabled)add(form.dataset.db144Title,enabled.checked?'Enabled':'Disabled');
    $$('input,textarea',form).filter(input=>input.type==='password'||/secret|token|private.?key|api.?key|authHeader|password/i.test(input.name||input.id)).forEach(input=>{const hint=clean(input.closest('.field')?.textContent);add(controlLabel(input),input.value?(input.readOnly?'Saved value available':'New value provided'):/saved|masked|keep saved/i.test(hint+' '+input.placeholder)?'Saved value retained':'Not set');});
    if(!dl.children.length)add('Configuration','Review the values above before saving');
    section.append(title,dl);state.review.appendChild(section);
  }
  function v144IntegrationTabs(panel){
    const tabs=$('.uc49-tabs',panel);if(!tabs)return;
    tabs.classList.add('db144-integration-tabs');$$(':scope>.db137-more-nav',tabs).forEach(button=>button.remove());
    const buttons=$$(':scope>[data-uc49-tab]',tabs);
    let more=$(':scope>.db144-integration-more',tabs);
    if(!more){more=document.createElement('button');more.type='button';more.className='pill db144-integration-more';more.textContent='More •••';more.setAttribute('aria-label','More integration categories');tabs.appendChild(more);}
    buttons.forEach(button=>button.classList.remove('db137-nav-overflow'));
    const canvas=v144IntegrationTabs.canvas||(v144IntegrationTabs.canvas=document.createElement('canvas')),context=canvas.getContext('2d'),font=getComputedStyle(buttons[0]||more).font;context.font=font;
    const width=tabs.getBoundingClientRect().width;let used=74,count=0;
    for(const button of buttons){const cost=Math.ceil(context.measureText(clean(button.textContent)).width)+28;if(count&&used+cost>width)break;if(!count&&used+cost>width)break;used+=cost;count++;}
    count=Math.max(1,count);buttons.forEach((button,index)=>button.classList.toggle('db144-tab-overflow',index>=count));
    more.classList.toggle('active',buttons.slice(count).some(button=>button.classList.contains('active')));
    more.onclick=()=>openActionSheet('Choose an integration category',buttons.slice(count).map(source=>({source})),more);
    tabs.dataset.db144VisibleTabs=String(count);
  }
  function v144IntegrationRecords(panel){
    $$('.uc49-grid,.uc93-grid',panel).forEach(grid=>{
      const cls=grid.classList.contains('uc49-grid')?'uc49':'uc93',heads=$$(':scope>.'+cls+'-grid-col',grid),cells=$$(':scope>.'+cls+'-grid-cell',grid);
      if(!heads.length||!cells.length)return;const labels=heads.map(head=>clean(head.textContent));heads.forEach(head=>head.classList.add('db144-mobile-hidden'));grid.classList.add('db144-integration-records');
      for(let index=0;index<cells.length;index+=labels.length){const record=document.createElement('article');record.className='db144-integration-record';cells[index].before(record);cells.slice(index,index+labels.length).forEach((cell,position)=>{cell.dataset.db144Label=labels[position];record.appendChild(cell);});}
    });
  }
  function v144Integrations(root){
    const panel=root.id==='socialMediaIntegrations'?root:$('#socialMediaIntegrations',root);if(!panel)return;
    v144IntegrationTabs(panel);v144IntegrationRecords(panel);
    for(const [card,state]of v144IntegrationCards){if(!card.isConnected){v144IntegrationCards.delete(card);continue;}if(!panel.contains(card))continue;
      const form=state.form;const header=$(':scope>.db138-page-header',form);if(header){const heading=$('h2',header);if(heading)heading.textContent=state.label;}
      const launcher=form.previousElementSibling;if(launcher?.matches('.db138-open-form'))launcher.classList.add('db144-mobile-hidden');
      if(!form.classList.contains('db138-inline-form-open'))card.classList.remove('db144-integration-open');
    }
    if(!panel.__db144Edit){panel.__db144Edit=true;panel.addEventListener('click',event=>{
      if(!PHONE.matches)return;const rowEdit=event.target.closest('[data-row-edit]');if(rowEdit){const card=$('[data-uc93-card="'+CSS.escape(rowEdit.dataset.rowEdit)+'"]',panel);if(card){event.preventDefault();event.stopImmediatePropagation();v144OpenIntegration(card);}}
    },true);}
    const emailEdit=window.ucV1707EditEmailProvider;
    if(typeof emailEdit==='function'&&!emailEdit.__db144){const wrapped=function(key){const result=emailEdit.apply(this,arguments);if(PHONE.matches){v144PrepareIntegrations(panel);const card=$('[data-uc1706-provider="'+CSS.escape(key)+'"]',panel);if(card)v144OpenIntegration(card);queuePasses();}return result;};Object.assign(wrapped,emailEdit);wrapped.__db144=true;window.ucV1707EditEmailProvider=wrapped;}
    const original=window.ucV1649EditIntegration;
    if(typeof original==='function'&&!original.__db144){const wrapped=function(category,key){const out=original.apply(this,arguments);if(PHONE.matches)setTimeout(()=>{v144PrepareIntegrations(panel);const card=category==='payments'?$('[data-pay-detail="'+CSS.escape(key)+'"]',panel):category==='ads'?$(key==='googleAdsense'?'#adsenseCard':key==='custom'?'#customAdNetworksCard':'#otherAdNetworksCard',panel):key==='seo'?$('#ucV152Blogger',panel):$('[data-social-card="'+CSS.escape(key)+'"]',panel);if(card)v144OpenIntegration(card);queuePasses();},60);return out;};Object.assign(wrapped,original);wrapped.__db144=true;window.ucV1649EditIntegration=wrapped;}
  }
  function v144Restore(){
    for(const [unit,marker]of v144MovedControls){if(marker.isConnected)marker.replaceWith(unit);}v144MovedControls.clear();
    for(const [card,state]of v144IntegrationCards){card.classList.remove('db144-integration-open');if(card.isConnected)card.open=state.wasOpen;state.form.__db144FinalSource=null;state.form.classList.remove('db138-inline-form-open');}
    $$('form[data-db144-generated-api]').forEach(form=>{const launcher=form.previousElementSibling;if(launcher?.matches('.db138-open-form'))launcher.remove();const original=$('.collapsed-body',form);if(original)form.before(original);form.remove();});
    for(const [button,original]of v144Icons){if(!button.isConnected)continue;button.innerHTML=original.html;button.className=original.classes;for(const [attr,value]of [['aria-label',original.aria],['title',original.title]])if(value===null)button.removeAttribute(attr);else button.setAttribute(attr,value);}v144Icons.clear();
    for(const [wrap]of v144MenuInputs)wrap.remove();v144MenuInputs.clear();
    $$('.db144-integration-record').forEach(card=>{[...card.children].forEach(cell=>card.before(cell));card.remove();});
    $$('.db144-integration-more').forEach(button=>button.remove());$$('.db144-tab-overflow').forEach(button=>button.classList.remove('db144-tab-overflow'));
  }
  function prepareV144(root){v144PrepareIntegrations(root);}
  function enhanceV144(root){v144TeachingDays(root);v144Pages(root);v144Integrations(root);}


  const nativePageEditors=new Map(),nativeStoryActions=new Map(),nativePageActions=new Map(),removedNumbers=[];
  function socialFreeNavigation(form){return Boolean(form.dataset.db142Social);}
  function nativeUpload(input,label='Upload Image'){
    if(!input||input.closest('.db143-upload-area,.db142-upload-area'))return;
    const box=document.createElement('label');box.className='db143-upload-area';
    box.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18H5a4 4 0 0 1-.5-7.97A7 7 0 0 1 18 8a5 5 0 0 1 1 9.9h-2M12 20V10m-4 4 4-4 4 4"/></svg><strong></strong><span>Kickboxing to choose an image</span>';
    $('strong',box).textContent=label;input.before(box);box.appendChild(input);
    input.addEventListener('change',()=>{$('span',box).textContent=[...input.files].map(file=>file.name).join(', ')||'Kickboxing to choose an image';});
  }
  function contextHelp(owner,title,nodes){
    nodes=nodes.filter(Boolean);if(!owner||!nodes.length)return;
    const state=owner.__db143Help||(owner.__db143Help={title,nodes:[]});
    nodes.forEach(node=>{if(!state.nodes.includes(node))state.nodes.push(node);node.classList.add('db143-deep-instructions');});
    let head=$(':scope>.top,:scope>.db138-page-header,:scope>.block-head,:scope>.db138-dialog-header',owner);
    if(!head){const h=$(':scope>h2,:scope>h3',owner);if(h){head=document.createElement('header');head.className='db138-list-header';h.before(head);head.appendChild(h);}}
    if(!head)return;normalizeHeader(head);
    if($('[data-db143-context-help]',head))return;
    const button=document.createElement('button');button.type='button';button.className='db138-icon-button pill';button.dataset.db143ContextHelp='1';button.setAttribute('aria-label','Help & Instructions');button.innerHTML=icon('info');headerActions(head).prepend(button);
    button.onclick=()=>openChoiceSheet({title:state.title,trigger:button,done:true,render(host){
      const copy=document.createElement('article');copy.className='db138-help-copy';
      state.nodes.filter(node=>node.isConnected).forEach(node=>{const item=node.cloneNode(true);item.classList.remove('db143-deep-instructions');item.removeAttribute('id');$$('[id]',item).forEach(child=>child.removeAttribute('id'));if(item.matches('details'))item.open=true;$$('button,input,script,style',item).forEach(child=>child.remove());copy.appendChild(item);});host.appendChild(copy);
    }});
  }
  function nativeDetail(details){
    const summary=$(':scope>summary',details),form=$('form',details);if(!summary||!form)return;
    details.classList.add('db143-navigation-detail');summary.classList.add('db142-disclosure-summary');
    if(!$(':scope>[data-db-disclosure]',summary))summary.insertAdjacentHTML('beforeend',icon('chevron'));enhanceForm(form);
    if(summary.__db143Native)return;summary.__db143Native=true;
    summary.addEventListener('click',event=>{if(!PHONE.matches||event.target.closest('button,a'))return;event.preventDefault();event.stopImmediatePropagation();details.open=true;form.classList.add('db138-inline-form-open');syncWizard(form,0);updateModalLock();},true);
  }
  function nativePages(root){
    for(const [editor]of nativePageEditors)if(!editor.isConnected)nativePageEditors.delete(editor);
    $$('#pages .page-editor',root).forEach(editor=>{
      if(nativePageEditors.has(editor))return;
      const key=$('[data-page-field="page_key"]',editor)?.value,summary=$(':scope>summary',editor);if(!key||!summary)return;
      const host=$(':scope>.collapsed-body',editor)||editor,marker=document.createComment('Desktop page editor fields'),wasOpen=editor.open;summary.after(marker);
      const form=document.createElement('form');form.className='form db143-page-editor-form';form.dataset.db143PageEditor=key;form.onsubmit=event=>event.preventDefault();
      [...host.childNodes].filter(node=>node!==summary&&node!==marker).forEach(node=>form.appendChild(node));host.appendChild(form);
      const save=$$('button',form).find(button=>/savePage\(/.test(button.getAttribute('onclick')||''));if(save)save.dataset.db143SourceSubmit='1';
      nativePageEditors.set(editor,{form,marker,host,wasOpen});enhanceForm(form);editor.classList.add('db143-navigation-detail');summary.classList.add('db142-disclosure-summary');
      if(!$(':scope>[data-db-disclosure]',summary))summary.insertAdjacentHTML('beforeend',icon('chevron'));
      const remove=$('[data-v1634-delete-page]',form),head=$(':scope>.db138-page-header',form);
      if(remove&&head){normalizeHeader(head);const more=document.createElement('button');more.type='button';more.className='db138-icon-button pill';more.setAttribute('aria-label','Page actions');more.innerHTML=icon('more');more.onclick=()=>openActionSheet('Page Actions',[{source:remove,label:'Delete This Page'}],more);headerActions(head).prepend(more);}
      if(!summary.__db143Page){summary.__db143Page=true;summary.addEventListener('click',event=>{if(!PHONE.matches||event.target.closest('button,a'))return;const current=nativePageEditors.get(editor)?.form;if(!current)return;event.preventDefault();event.stopImmediatePropagation();v144PageActions(editor,summary);},true);}
    });
  }
  function trackingReview(form,state){
    state.review.replaceChildren();const section=document.createElement('section'),h=document.createElement('h3'),grid=document.createElement('dl');h.textContent='Tracking Settings';section.append(h,grid);
    const add=(label,value)=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;grid.append(dt,dd);};
    $$('input:not([type="checkbox"]):not([type="hidden"]),textarea,select',form).filter(control=>!control.closest('.db138-review')).forEach(control=>{
      const toggle=$('input[type="checkbox"]',control.closest('.field')),label=controlLabel(control).replace(/\s+Enable$/i,'');
      if(toggle&&!toggle.checked)add(label,'Disabled');else if(control.value)add(label,control.tagName==='SELECT'?control.selectedOptions[0]?.textContent:control.value);
      if(toggle?.checked)add(label.replace(/ Pixel ID| Partner ID| Tag ID/i,'')+' Tracking','Enabled');
    });state.review.appendChild(section);
  }
  function nativeSales(root){
    const payment=$('#customSubscription');
    if(payment&&!$(':scope>.db143-subscription-launch',payment)){const holder=document.createElement('div'),button=document.createElement('button');holder.className='db143-subscription-launch';button.type='button';disclosureRow(button,'Create Subscription');button.onclick=openPaymentPage;holder.appendChild(button);payment.appendChild(holder);}
    const media=$('#ucV1624MediaForm',root);if(media){nativeUpload($('[name="drive_image_file"]',media));$$('[data-db140-media-step="0"] .field>small,[data-db140-media-step="0"] .uc-v1624-cover-choice small',media).forEach(node=>node.classList.add('db143-deep-instructions'));}
    const placements=root.id==='placements'?root:$('#placements',root);
    if(placements){const card=$('.placement-section-card',placements),title=$$('h3',card).find(node=>/^What this page is used for$/i.test(clean(node.textContent)));
      contextHelp(placements,'Product Placements — Help & Instructions',[title,...$$(':scope>p,:scope>.notice',card)]);
      if(card){$$('.uc-info-btn',card).forEach(source=>{source.classList.add('db143-deep-instructions');source.__db138Proxy?.classList.add('db143-deep-instructions');});$$('.db138-list-header',card).filter(head=>$('h3.db143-deep-instructions',head)).forEach(head=>head.classList.add('db143-deep-instructions'));}
    }
  }
  function nativeSettings(root){
    nativePages(root);
    $$('#tracking>details,#pages details,#successStories details',root).filter(details=>details.closest('#tracking')||$('form',details)?.closest('#successStories')).forEach(nativeDetail);
    $$('#tracking>details form',root).forEach(form=>contextHelp(form,'Tracking — Help & Instructions',$$('details.setup-note',form)));
    $$('[data-db114-summary]',root).forEach(enhanceMetricCarousel);
    $$('.db114-tabs',root).forEach(tabs=>{tabs.classList.add('db143-approval-tabs');$$(':scope>.db137-more-nav',tabs).forEach(node=>node.remove());directButtons(tabs).forEach(button=>button.classList.remove('db137-nav-overflow'));});
    $$('#pages [data-create-page]',root).forEach(button=>{if(button.dataset.db143CreatePage)return;nativePageActions.set(button,{html:button.innerHTML,style:button.getAttribute('style'),classes:button.className});button.dataset.db143CreatePage='1';disclosureRow(button,'Create New Page');});
    $$('#storyTable table tbody tr',root).forEach(row=>{
      if($('.db143-story-actions',row))return;const cells=[...row.children],sort=cells.find(cell=>/sort/i.test(cell.dataset.db136Label||'')),actions=cells.find(cell=>/actions/i.test(cell.dataset.db136Label||''));if(!sort||!actions)return;
      const holder=document.createElement('div');holder.className='db143-story-actions';const positions=[...$$('button',sort),...$$('button',actions)].map(button=>{const marker=document.createComment('Desktop story action');button.before(marker);holder.appendChild(button);return{button,marker};});actions.appendChild(holder);sort.classList.add('db143-mobile-empty');nativeStoryActions.set(row,{holder,positions,sort});
    });
  }
  function nativeWebinars(root){
    $$('.db120-subtab-panel table tbody tr',root).forEach(row=>{[...row.children].forEach(cell=>{
      const label=cell.dataset.db136Label||'',source=$('button,a',cell);if(!source||!/Join Session|Manage Class/i.test(label)||cell.dataset.db143Navigation)return;cell.dataset.db143Navigation='1';source.classList.add('db143-source-action');
      const holder=document.createElement('div'),button=document.createElement('button');holder.className='db143-mobile-action';button.type='button';disclosureRow(button,/Manage/i.test(label)?'Manage Class':source.disabled?'Join Session · '+clean(source.textContent):'Join Session');button.disabled=source.disabled;button.onclick=()=>source.click();holder.appendChild(button);cell.appendChild(holder);cell.classList.add('db143-action-cell');
    });});
    $$('[data-db122-class-change-form] select[name="changeType"],[data-db122-class-change-form] select[name="newCoachId"]',root).forEach(select=>{
      enhanceSelect(select);const trigger=select.nextElementSibling;if(!trigger?.matches('.db137-select-trigger'))return;trigger.classList.add('db143-coach-choice');
      if(!$('[data-db-disclosure]',trigger)){const text=document.createElement('span');text.textContent=clean(trigger.textContent);trigger.replaceChildren(text);trigger.insertAdjacentHTML('beforeend',icon('chevron'));}
    });
  }
  function nativeMedia(root){
    $$('input[type="file"]',root).filter(input=>input.closest('#blogForm,#db140AdvertisementForm,.db143-page-editor-form')).forEach(input=>nativeUpload(input));
    $$('.uc56-carousel-slot>.uc56-slot-number',root).forEach(node=>{const marker=document.createComment('Desktop media number');node.before(marker);removedNumbers.push({node,marker});node.remove();});
    const blogs=root.id==='blogs'?root:$('#blogs',root);if(!blogs)return;
    $$('details.admin-collapsed-card',blogs).forEach(nativeDetail);
    const blog=$('#blogForm',blogs);if(blog)contextHelp(blog,'Fitness Tip — Help & Instructions',$$('.blogger-required-note,:scope>.notice',blog));
    const heading=$$('h2,h3',blogs).find(node=>/^Existing Fitness Tips$/i.test(clean(node.textContent))),card=heading?.closest('.card');contextHelp(card,'Fitness Tips — Help & Instructions',$$('.notice',card).filter(node=>/Fitness Tip publishing:|SEO connection required/i.test(node.textContent)));
    const load=$$('button',blogs).find(button=>/Load Fitness Tips/i.test(button.textContent));if(load){const head=$(':scope>.top',blogs);if(head)proxyIcon(load,headerActions(head),'refresh','Load Fitness Tips');}
  }
  function nativeHeat(root){
    const panel=root.id==='heatMaps'?root:$('#heatMaps',root);if(!panel)return;const button=$('.db139-engagement-open',panel);if(!button)return;
    if(!button.dataset.db143Row){button.dataset.db143Row='1';disclosureRow(button,'Top Engagement Elements');['width','min-height','padding','font-size'].forEach(name=>button.style.removeProperty(name));}
    button.classList.add('db143-engagement-action');let holder=$(':scope>.db143-heat-engagement-holder',panel);if(!holder){holder=document.createElement('div');holder.className='db143-heat-engagement-holder';panel.appendChild(holder);}if(button.parentElement!==holder)holder.appendChild(button);$('[data-uc92-engagement]',panel)?.closest('aside')?.classList.add('db143-empty-engagement');
  }
  const automationLayers=new Map();let automationOrder=0;
  function nativeAutomationLayers(){
    const nodes=$$('#uc64Workspace,#uc76LeadWorkspace,#uc1705Workspace,#uc1705EmailEditor,.uc1705-modal');for(const [node]of automationLayers)if(!nodes.includes(node))automationLayers.delete(node);
    nodes.forEach(node=>{if(!automationLayers.has(node))automationLayers.set(node,++automationOrder);node.classList.add('db143-automation-surface');node.style.setProperty('--db143-automation-layer',String(Math.min(56000,42000+automationLayers.get(node)*40)));$$('[data-uc1705-modal-x]',node).forEach(button=>iconify(button,'close','Close'));});
  }
  function nativeFlowBuilders(root){
    const workspace=root.matches?.('#uc64Workspace')?root:$('#uc64Workspace',root);
    if(workspace){const board=$('#uc64Board',workspace);if(board){board.classList.add('db143-vertical-flow');
      $$('.uc64-node',board).forEach(node=>{if($(':scope>.db143-add-flow-node',node))return;const add=document.createElement('button');add.type='button';add.className='db143-add-flow-node pill';add.textContent='+';add.setAttribute('aria-label','Add step after '+clean($('strong',node)?.textContent));add.onclick=()=>openChoiceSheet({title:'Content Blocks',trigger:add,render(content){
        $$('[data-add-node]',workspace).forEach(source=>{const button=document.createElement('button');button.type='button';button.className='db137-choice-option';button.textContent=clean($('span',source)?.textContent||source.textContent);button.onclick=()=>{closeChoiceSheet();window.DropBeatFlowPresentation?.addAfter(node.dataset.nodeId,source.dataset.addNode,Number(source.dataset.aiId||0));queuePasses();};content.appendChild(button);});
      }});node.appendChild(add);});
      $$('.uc64-output-row',board).forEach(row=>{const port=$('.uc64-port.output',row);if(!port||$('.db143-flow-link',row))return;const button=document.createElement('button');button.type='button';button.className='db143-flow-link pill';button.textContent='Choose next step';button.onclick=()=>{const data=window.DropBeatFlowPresentation?.snapshot();if(!data)return;openChoiceSheet({title:'Next Step',trigger:button,render(content){
        [{id:'',label:'End this path'},...data.nodes].filter(node=>node.id!==port.dataset.source).forEach(node=>{const option=document.createElement('button');option.type='button';option.className='db137-choice-option';option.textContent=node.label;option.classList.toggle('selected',window.DropBeatFlowPresentation.linkTarget(port.dataset.source,port.dataset.field)===node.id);option.onclick=()=>{closeChoiceSheet();window.DropBeatFlowPresentation.connect(port.dataset.source,port.dataset.field,node.id);queuePasses();};content.appendChild(option);});
      }});};row.appendChild(button);});
    }}
    const lead=root.matches?.('#uc76LeadWorkspace')?root:$('#uc76LeadWorkspace',root);
    if(lead){const settings=$('.uc76-lead-settings',lead),timeline=$('.uc78-lead-timeline',lead);if(settings&&timeline){
      if(!$(':scope>.db143-lead-settings',timeline)){const button=document.createElement('button');button.type='button';button.className='db143-lead-settings pill';disclosureRow(button,'Trigger & Rules');button.onclick=()=>openChoiceSheet({title:'Lead Trigger & Rules',trigger:button,done:true,render(content,sheet){const marker=document.createComment('Lead rules position');settings.before(marker);content.appendChild(settings);settings.classList.add('db143-sheet-settings');sheet.__db143Restore=()=>{if(marker.isConnected)marker.replaceWith(settings);settings.classList.remove('db143-sheet-settings');};}});timeline.prepend(button);}
      $$(':scope>.uc78-lead-trigger,:scope>[data-uc76-lead-step]',timeline).forEach(node=>{if($(':scope>.db143-lead-plus',node))return;const add=document.createElement('button');add.type='button';add.className='db143-lead-plus pill';add.textContent='+';add.setAttribute('aria-label','Add follow-up step');add.onclick=()=>openChoiceSheet({title:'Content Blocks',trigger:add,render(content){
        $$('[data-uc76-add-channel]',settings).forEach(source=>{const button=document.createElement('button');button.type='button';button.className='db137-choice-option';button.textContent=clean(source.textContent);button.onclick=()=>{closeChoiceSheet();window.DropBeatLeadPresentation?.addAfter(node.hasAttribute('data-uc76-lead-step')?Number(node.dataset.uc76LeadStep):-1,source.dataset.uc76AddChannel);queuePasses();};content.appendChild(button);});
      }});node.appendChild(add);});
    }}
    $$('.uc1705-activity-grid',root).forEach(grid=>{const heads=$$(':scope>b',grid),cells=$$(':scope>span',grid);if(!heads.length)return;const labels=heads.map(node=>clean(node.textContent));heads.forEach(node=>node.classList.add('db143-mobile-empty'));grid.classList.add('db143-activity-list');
      for(let i=0;i<cells.length;i+=labels.length){const card=document.createElement('article');card.className='db143-activity-card';cells[i].before(card);cells.slice(i,i+labels.length).forEach((cell,index)=>{cell.dataset.db136Label=labels[index];card.appendChild(cell);});}
    });nativeAutomationLayers();
  }
  function restoreNativeUI(){
    for(const [editor,{form,marker,host,wasOpen}]of nativePageEditors){if(!editor.isConnected)continue;const body=$(':scope>.db138-form-content',form);$('.db138-review',body)?.remove();if(body)[...body.childNodes].forEach(node=>host.insertBefore(node,form));form.previousElementSibling?.matches('.db138-open-form')&&form.previousElementSibling.remove();form.remove();marker.remove();editor.open=wasOpen;editor.classList.remove('db143-navigation-detail');}nativePageEditors.clear();
    for(const {holder,positions,sort}of nativeStoryActions.values()){positions.forEach(({button,marker})=>{if(marker.isConnected)marker.replaceWith(button);});holder.remove();sort.classList.remove('db143-mobile-empty');}nativeStoryActions.clear();
    for(const [button,original]of nativePageActions){if(!button.isConnected)continue;button.innerHTML=original.html;button.className=original.classes;if(original.style===null)button.removeAttribute('style');else button.setAttribute('style',original.style);delete button.dataset.db143CreatePage;}nativePageActions.clear();
    removedNumbers.splice(0).forEach(({node,marker})=>{if(marker.isConnected)marker.replaceWith(node);});
    $$('.db143-upload-area').forEach(box=>{const input=$('input[type="file"]',box);if(input)box.before(input);box.remove();});
    $$('.uc88-list-row').forEach(row=>{const original=row.__db143DateOriginal;if(original?.marker.isConnected)original.marker.after(original.net);});
    $$('[data-uc1705-template]').forEach(button=>button.classList.remove('pill'));$$('.db142-template-card').forEach(card=>{card.removeAttribute('tabindex');card.removeAttribute('role');card.removeAttribute('aria-label');});
  }
  function enhanceNativeUI(root){nativeSales(root);nativeSettings(root);nativeWebinars(root);nativeMedia(root);nativeHeat(root);nativeFlowBuilders(root);enhanceV144(root);}


  /* ---------- One event-driven controller for late data and all three dashboards ---------- */
  const observed=new Map();
  let running=false;
  function activeRoots(){
    const roots=[],active=$('#adminApp .panel.active');if(active)roots.push(active);
    $$('.portal-view:not([hidden]),#uc64Workspace,#uc76LeadWorkspace,#uc1705Workspace,#uc1705EmailEditor,'+MODALS).forEach(root=>roots.push(root));
    return [...new Set(roots)];
  }
  function enhance(root){
    if(!PHONE.matches||!isDashboard())return;
    prepareV145(root);prepareV144(root);enhanceRefundNavigation(root);enhanceSocialNavigation(root);
    prepareClientDocuments(root);enhanceGlobalFilters(root);enhanceDanceTipNavigation(root);
    classifySheets(root);enhanceCarousels(root);enhanceCompactCards(root);enhanceTabNavigation(root);enhanceSearch(root);
    $$('form',root).forEach(enhanceForm);enhanceSelectors(root);
    $$('.db107-calendar,.db119-calendar-card,.uc48-calendar-shell,.uc88-analytics-card',root).forEach(enhanceCalendar);
    enhanceCharts(root);enhanceClientModal();enhanceCustomSubscription();enhanceDashboardCopy();enhanceProducts();enhanceRefundHelp(root);enhanceHeaderIcons(root);enhanceCompactFilters(root);enhanceRecordHierarchy(root);enhanceCalendarList(root);
    enhanceOverviewLists(root);enhanceClientRefund();enhanceImageOrdering(root);enhanceNavigationHierarchy(root);
    enhanceDisclosureRows(root);enhanceBadgeTabs(root);enhanceHeatActions(root);enhanceRefundRecordActions(root);enhanceSocialCalendar(root);enhanceAutomations(root);enhanceNativeUI(root);enhanceV145(root);
  }
  function observeSurfaces(){
    if(typeof MutationObserver!=='function'||!PHONE.matches)return;
    const main=$('#adminApp .main,.portal-main'),roots=[document.body,main,...$$('#uc64Workspace,#uc76LeadWorkspace,#uc1705Workspace,#uc1705EmailEditor'),...$$(MODAL_NODES)].filter(Boolean);
    for(const [root,observer] of observed){if(!roots.includes(root)){observer.disconnect();observed.delete(root);}}
    roots.forEach(root=>{
      let observer=observed.get(root);
      if(!observer){
        observer=new MutationObserver(records=>{
          if(running)return;
          const relevant=records.some(record=>record.type==='attributes'?(record.target===root||record.target.matches?.('.panel,.portal-view,'+MODAL_NODES)):[...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1&&!String(node.className||'').includes('db138-')&&!String(node.className||'').includes('db137-carousel-dots')));
          if(relevant)queuePasses();
        });
        observed.set(root,observer);
      }
      observer.observe(root,{childList:true,subtree:root!==document.body,...(root!==document.body?{attributes:true,attributeFilter:['class','hidden','aria-hidden']}:{})});
    });
  }
  function runPass(){
    if(!PHONE.matches||running)return;
    running=true;observed.forEach(observer=>observer.disconnect());
    try{document.body.classList.add('db138-mobile');activeRoots().forEach(enhance);wrapPresentationRoutes();syncModalLayers();updateModalLock();}
    finally{running=false;observeSurfaces();}
  }
  function queuePasses(){
    if(!PHONE.matches||passQueued)return;passQueued=true;
    requestAnimationFrame(()=>{runPass();passQueued=false;});
  }
  function wrapPresentationRoutes(){
    const postUpload=window.ucV1648Upload;
    if(typeof postUpload==='function'&&!postUpload.__db142Draft){
      const wrapped=async function(kind){
        const form=$('#uc48'+titleCase(kind)+'Form'),poll=PHONE.matches&&form?window.ucV1676PollPayload?.(form):null,values=PHONE.matches&&form?$$('input:not([type="file"]),textarea,select',form).map(control=>({name:control.name,id:control.id,value:control.value,checked:control.checked,type:control.type})):[];
        const result=await postUpload.apply(this,arguments);
        if(PHONE.matches){const updated=$('#uc48'+titleCase(kind)+'Form');if(updated){prepareSocialForm(updated);values.forEach(item=>{const controls=item.id?[$('#'+CSS.escape(item.id),updated)].filter(Boolean):$$('[name="'+CSS.escape(item.name)+'"]',updated);controls.forEach(control=>{if(control.type==='checkbox'||control.type==='radio'){if(control.value===item.value)control.checked=item.checked;}else control.value=item.value;});});if(poll)window.ucV1676SetPoll?.(updated,poll);window.ucV1648TimingChanged?.(kind);window.ucV1648PlatformChanged?.(kind);}queuePasses();}
        return result;
      };Object.assign(wrapped,postUpload);wrapped.__db142Draft=true;window.ucV1648Upload=wrapped;
    }
    const mediaSave=window.uploadMedia;
    if(typeof mediaSave==='function'&&!mediaSave.__db140Order){
      const wrapped=async function(event){
        const form=$('#ucV1624MediaForm'),target=PHONE.matches?Number(form?.dataset.db140NewImageIndex??$$('#currentProductMedia .media-card').length):null,productId=Number($('#mediaProductId')?.value||0),previous=$$('#currentProductMedia .media-card').length;
        const result=await mediaSave.apply(this,arguments);
        if(target!==null&&result?.image_id&&target<previous){
          for(let position=previous;position>target;position--)await window.moveProductImage?.(Number(result.image_id),productId,-1);
        }
        queuePasses();return result;
      };
      Object.assign(wrapped,mediaSave);wrapped.__db140Order=true;window.uploadMedia=wrapped;
    }
    const names=['tab','editFaq','editStory','newProduct','editProduct','editProductById','renderProducts','renderUCClientDetails','load_dashboard','load_products','load_orders','load_refunds','load_leads','load_requests','load_subscribers','load_unsubscribed','load_oneTimeUsers','load_favorites','load_pages','loadUCSubscriptionOverview','db125OpenScheduleMeeting','openMedia','loadProductMedia','editBlog','addAuditionAdRow','openUCStatement','openUCInvoice','openUCRefundInvoice','ucV14SelectRefundRow','ucV14OpenRefunds','ucV14CloseRefundConfirm'];
    names.forEach(name=>{
      const original=window[name];if(typeof original!=='function'||original.__db138)return;
      const wrapped=function(){
        const args=[...arguments];
        if(PHONE.matches&&['openUCInvoice','openUCStatement','openUCRefundInvoice'].includes(name))retireDocumentView();
        if(PHONE.matches&&['ucV14SelectRefundRow','ucV14OpenRefunds','renderUCClientDetails'].includes(name))removeClientRefund();
        const result=original.apply(this,args);
        if(PHONE.matches){
          if(name==='tab'){
            if(args[0]==='customSubscription')openPaymentPage();else if(args[0]!=='salesHub')closePaymentPage();
            $$('.db137-scroll-chart,.db137-generic-chart-shell').forEach(shell=>{shell.scrollLeft=0;shell.scrollTop=0;});
          }
          if(name==='editFaq'){const form=$('#faqForm');if(form){form.closest('details').open=true;enhanceForm(form);form.classList.add('db138-inline-form-open');syncWizard(form,0);updateModalLock();}}
          if(name==='editStory'){const form=$('#successStories form');if(form){enhanceForm(form);form.classList.add('db138-inline-form-open');const state=formStates.get(form);if(state){state.furthest=0;syncWizard(form,0);}updateModalLock();}}
          if(['newProduct','editProduct','editProductById'].includes(name)){const form=$('#productForm');if(formStates.has(form)){formStates.get(form).furthest=0;syncWizard(form,0);}}
          if(name==='openMedia'){const form=$('#ucV1624MediaForm');if(form){delete form.dataset.db140NewImageIndex;const state=formStates.get(form);if(state){state.furthest=0;syncWizard(form,0);}}}
          if(name==='ucV14SelectRefundRow'){enhanceCompactCards($('#ucTabRefunds'));enhanceOverviewLists($('#ucTabRefunds'));enhanceClientRefund();openClientRefund();}
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
    // Capture before older document-level flip listeners, including heat maps.
    choiceSheet();window.addEventListener('click',mobileHelpClick,true);window.addEventListener('keydown',mobileEscape,true);
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
    document.addEventListener('input',event=>{const form=event.target.closest('#ucV1624MediaForm');if(form)syncMediaPreview(form);},true);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&PHONE.matches){if(!$('#db137ChoiceSheet')?.hidden)closeChoiceSheet();else{const state=[...filterStates.values()].find(state=>!state.overlay.hidden);if(state)closeFilterSheet(state);else if($('#customSubscription[data-db138-open="true"]'))closePaymentPage();}}
    });
    for(const name of ['dropbeat:portal-model','uc-products-rendered','uc:webinar-members-loaded','dropbeat:admin-ready','dropbeat:chart-rendered']){
      window.addEventListener(name,queuePasses);document.addEventListener(name,queuePasses);
    }
    window.addEventListener('popstate',queuePasses);
    window.addEventListener('resize',queuePasses,{passive:true});
    PHONE.addEventListener?.('change',event=>{
      document.body.classList.toggle('db138-mobile',event.matches);
      if(event.matches)queuePasses();else{observed.forEach(observer=>observer.disconnect());closeChoiceSheet();closePaymentPage();removeClientRefund();restoreRefundNavigation();restoreSocialForms();restoreNativeUI();restoreV145();v144Restore();for(const state of filterStates.values()){closeFilterSheet(state);state.marker.after(state.filters);state.overlay.remove();state.trigger.remove();}filterStates.clear();const sales=$('[data-uc84-sales="customSubscription"]');if(sales)mobileCopy(sales,'+ Subscription');enhanceDashboardCopy();}
    });
    runPass();
    // Existing workspace installers finish in bounded stages. Rebind presentation
    // only after those stages; never issue requests or schedule a recurring poll.
    [80,650,1900,5800,8600].forEach(delay=>setTimeout(runPass,delay));
    document.dispatchEvent(new CustomEvent('dropbeat:dashboard-mobile-v138-ready',{detail:{build:BUILD}}));
  }
  window.DropBeatMobileUI={build:BUILD,refresh:queuePasses,openPaymentPage,closePaymentPage,openHelp,disclosure:()=>window.DropBeatUI.disclosure(),openChoiceSheet,closeChoiceSheet};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
