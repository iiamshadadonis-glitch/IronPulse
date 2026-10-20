/* IronPulse Gym V1.42 — shared native mobile dashboard components.
   This file changes presentation and navigation only. Existing form controls,
   click handlers, validation, API calls and saved data remain authoritative. */
(()=>{
  'use strict';
  if(window.__DROPBEAT_DASHBOARD_MOBILE_V142__)return;

  const BUILD='dropbeat-1.42-20261015';
  const PHONE=window.matchMedia('(max-width:760px)');
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const $$=(selector,root=document)=>[...(root?.querySelectorAll?.(selector)||[])];
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  const titleCase=value=>clean(value).replace(/(^|\s)\S/g,char=>char.toUpperCase());
  let passQueued=false;
  document.documentElement.dataset.dropbeatMobileController='v142';
  document.body.classList.toggle('db138-mobile',PHONE.matches);

  window.__DROPBEAT_DASHBOARD_MOBILE_V142__={build:BUILD,mode:'presentation-only'};
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
    const field=control.closest('.field,.portal-field,fieldset,.uc48-field-shell,.uc48-platform-block');
    const label=control.labels?.[0]||control.closest('label')||$('label,legend',field);
    if(label){const copy=label.cloneNode(true);$$('input,select,textarea,small,.hint,.switch',copy).forEach(node=>node.remove());const text=clean(copy.textContent);if(text)return text;}
    return clean(control.getAttribute('aria-label')||titleCase((control.name||'').replaceAll('_',' '))||'Choose an option');
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
  const FIELD_SELECTOR='.field,.portal-field,fieldset,.check,.toggle-row,.db107-toggle,.db108-switch-row,.uc94-enable-row,.uc-social-toggle-capsule,.uc-pay-toggle-capsule,.uc1705-switch-row,.db121-remuneration-toggle,.uc48-field-shell,.uc-v1624-control-card,.uc-v153-featured-control,.uc-auto-ad-row,.uc-v157-schedule-control';
  const ATOMIC_SELECTOR='[data-db108-manual-class],[data-db107-plan-class],#ucSubscriptionOptions,.db121-availability-editor,[data-db121-availability],.db121-availability,.db122-coach-pay,[data-db140-media-step],[data-db140-ad-row],#ucV157ScheduleControl,[data-db142-post-step]';
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
    const reviewed=steps=>[...steps,{label:'Review',items:[]}];
    if(form.matches('#uc48TextForm,#uc48ImageForm,#uc48VideoForm,#uc48StoryForm,form[id^="uc56CarouselForm_"]')){
      const carousel=form.id.startsWith('uc56'),labels=carousel?['Media Assembly','Content & Settings']:['Content & Settings'];
      if(!carousel&&form.matches('#uc48ImageForm,#uc48VideoForm'))labels[0]='Media, Content & Settings';
      return [...labels.map((label,index)=>({label,items:units.filter(unit=>Number(unit.dataset.db142PostStep)===index)})),{label:'Review & Publish',items:[]}];
    }
    if(form.matches('#ucV9InvoiceForm,#ucV10InvoiceForm,#ucV14RefundInvoiceForm'))return reviewed(['Customer Details','Billing & Plans','Terms & Notes'].map((label,index)=>({label,items:units.filter(unit=>{
      const names=unitNames(unit);
      const step=/\b(?:invoiceNo|invoiceDate|refundDate|billTo|phone|email|address)\b/.test(names)?0:/\b(?:terms|notes|legalName|legalAddress|description)\b/.test(names)?2:1;
      return step===index;
    })})));
    if(form.id==='db141ClientRefundForm')return reviewed(['Customer Details','Payment Details','Refund Details'].map((label,index)=>({label,items:units.filter((unit,position)=>{
      const step=position<3?0:unit.querySelector('#ucV14RefundAmount,#ucV14RefundReason')?2:1;return step===index;
    })})));
    if(form.id==='ucV1624MediaForm')return reviewed(['Upload','Social Status','Scrolling Images'].map((label,index)=>({label,items:units.filter(unit=>Number(unit.dataset.db140MediaStep)===index)})));
    if(form.id==='blogForm')return reviewed(['Fitness Tip','Image & Publishing','Social & Schedule'].map((label,index)=>({label,items:units.filter(unit=>blogStep(unit)===index)})).filter(step=>step.items.length));
    if(form.id==='db140AdvertisementForm')return reviewed([{label:'Advertisements',items:units}]);
    if(form.matches('[data-coach-form]'))return reviewed(['Coach Details','Schedule & Availability','Approved Remuneration','Social Profiles'].map((label,index)=>({label,items:units.filter(unit=>specializedStep(form,unit)===index)})).filter(step=>step.items.length));
    if(form.id==='subscriptionBox'||form.id==='oneTimeBox')return ['Customer Details','Class Details','Payment Details','Review & Create'].map((label,index)=>({label,items:units.filter(unit=>specializedStep(form,unit)===index)}));
    if(form.id==='productForm')return reviewed(['Plan Basics','Pricing & Billing','Class & Schedule','Plan Features'].map((label,index)=>({label,items:units.filter(unit=>specializedStep(form,unit)===index)})));
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
    if(form.dataset.db142Social){reviewSocialForm(form,state);return;}
    state.steps.slice(0,-1).forEach(step=>{
      const section=document.createElement('section'),heading=document.createElement('h3'),grid=document.createElement('dl');
      heading.textContent=step.label;section.append(heading,grid);
      const seen=new Set();
      step.items.forEach(unit=>formControls(unit).forEach(control=>{
        const structured=control.type==='hidden'&&/features_json|dance_styles_json|class_days_json|reminder_channels_json|availability_json|class_types_json/.test(control.name);
        if((control.type==='hidden'&&!structured)||(control.disabled&&form.id!=='db141ClientRefundForm')||control.type==='password'||control.closest('#currentProductMedia')||conditionallyHidden(control,form))return;
        const label=structured?titleCase(control.name.replace(/_json$/,'').replaceAll('_',' ')):controlLabel(control);
        let value=control.type==='checkbox'?(control.checked?'Enabled':'Disabled'):control.type==='file'?[...control.files].map(file=>file.name).join(', '):control.tagName==='SELECT'?[...control.selectedOptions].map(option=>clean(option.textContent)).join(', '):control.value;
        if(structured){try{const data=JSON.parse(value);if(Array.isArray(data))value=data.map(item=>typeof item==='object'?Object.values(item).join(' · '):item).join(', ');}catch{}}
        if(!value)return;
        const key=label+':'+value;if(seen.has(key))return;seen.add(key);
        const term=document.createElement('dt'),definition=document.createElement('dd');term.textContent=label;definition.textContent=value;grid.append(term,definition);
      }));
      if(grid.children.length)state.review.appendChild(section);
    });
    if(form.id==='ucV1624MediaForm')reviewMedia(form,state.review);
    if(form.dataset.db142Social)reviewSocialMedia(form,state.review);
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
    $$('[data-db137-finish]',state.nav).forEach(button=>{button.hidden=current!==state.steps.length-1;button.disabled=Boolean(button.__source?.disabled);});
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
    if(form.matches('#loginForm,[role="search"],.search-form,.filter-form,[class*="filter"],[data-statement-filters]')||form.closest('#db137ChoiceSheet,.db140-filter-overlay'))return;
    prepareMediaWizard(form);prepareSocialForm(form);
    const controls=formControls(form),submit=$('button[type="submit"],input[type="submit"],button:not([type]),.blog-buttons button,.uc-v9-doc-actions button,#ucV14RefundButton',form);
    if(!controls.some(control=>control.type!=='hidden')||!submit)return;
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
    const actions=submit.closest('.form-actions,.uc-form-actions,.uc93-email-actions,.uc-v9-doc-actions,.blog-buttons,.uc-v14-refund-actions')||submit;
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
    $('[data-db137-next]',nav).onclick=()=>{if(validateWizardStep(form,state.current)){state.furthest=Math.max(state.furthest,state.current+1);syncWizard(form,state.current+1,true);}};
    $$('.db137-wizard-step',progress).forEach(button=>button.onclick=()=>{const target=Number(button.dataset.db137Jump);if(target<=state.furthest)syncWizard(form,target,true);});
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
      if(card&&$('form:not([data-statement-filters]):not(.filter-form):not([data-attendance-filters])',card))card.classList.add('db138-form-dialog');
      if(card){
        const head=$(':scope>.top,:scope>.modal-head,:scope>.modal-header,:scope>#ucV1624MediaFront>.top',card);
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
    const paths={
      search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
      refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 2M18 17a7 7 0 0 1-12 1l-2-2"/>',
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
    if(!source||!actions)return null;
    let proxy=source.__db138Proxy;
    if(!proxy||!proxy.isConnected){
      proxy=document.createElement('button');proxy.type='button';proxy.className='db138-icon-button db138-proxy-icon';proxy.innerHTML=icon(kind);proxy.setAttribute('aria-label',label||clean(source.textContent));proxy.title=label||clean(source.textContent);
      proxy.onclick=()=>source.click();proxy.__db138Source=source;actions.insertBefore(proxy,$(':scope>.db141-header-close',actions));source.__db138Proxy=proxy;source.classList.add('db138-proxied');
    }else if(proxy.parentElement!==actions)actions.insertBefore(proxy,$(':scope>.db141-header-close',actions));
    proxy.dataset.db139Action=kind;proxy.dataset.db139Source=source.className;
    proxy.disabled=source.disabled;return proxy;
  }
  const HELP_BUTTONS='.uc-info-btn,.uc-plan-help-btn,[data-uc-info-open],.uc-info-toggle,.portal-info-btn,.db123-info-button,[data-db123-show-help],.uc48-info-btn,.uc49-info-btn,.uc93-info-btn,.uc88-help-toggle,.uc89-mode-help,.uc82-automation-info,.uc1700-info,[data-uc88-help-open],[data-uc90-mode-help],[data-uc92-help-open],[data-uc93-help],[data-uc97-webinar-help],[data-template-help],[data-uc82-automation-help],[data-create-info],[data-leave-info],[data-provider-help],[data-ai-help],[data-order-help],[data-uc84-tg-help]';
  const HELP_CONTENT='.uc-info-back-body,#ucPlanHelp,.uc-v163-order-help-inner,.uc88-help,.uc92-help,.uc49-help,.uc49-info-help,.uc93-help,.uc84-tg-help,.uc-v1624-media-help,.uc-v1635-create-help,.uc-v11-doc-help-panel,.db123-coach-settings-back,.db123-flip-back,.uc48-help,.uc48-info-back,.uc56-carousel-help,.uc82-help-back,[data-db123-coach-help],[data-uc88-help],[data-uc92-help],[data-template-help-panel],[data-uc97-webinar-help-panel],[data-uc93-help-panel],[data-uc93-back]';
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
      if(source.matches('.db138-proxy-icon,.db138-open-form,.db138-search-toggle,.db138-product-fab,.db140-filter-trigger')||source.closest('#db137ChoiceSheet,.uc-info-back-panel,.db140-refund-help,.db140-filter-overlay'))return;
      const text=clean(source.textContent);
      const help=source.matches(HELP_BUTTONS+',.db137-subscription-info');
      const kind=source.dataset.db138Icon==='close'?'close':help?'info':/^Refresh(?:\s+(?:Payments|Data|List|Calendar|Status|Sessions|Contacts|Records|Overview))?$/i.test(text)?'refresh':/^Download\s+(?:Sample CSV|Excel|CSV|Sheet|Excel Sheet)$/i.test(text)?'download':null;
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
    if(form.id!=='ucV1624MediaForm')return;
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
      if(net.parentElement===wrap)row.appendChild(net);
      net.classList.add('db140-date-net');
      if(!$('.db140-date-chevron',row)){const chevron=document.createElement('span');chevron.className='db140-date-chevron';chevron.innerHTML=icon('chevron');chevron.setAttribute('aria-hidden','true');row.appendChild(chevron);}
      if(row.dataset.db140Day==='1')return;row.dataset.db140Day='1';
      if(!row.matches('button,a')){row.tabIndex=0;row.setAttribute('role','button');row.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();row.click();}});}
      row.addEventListener('click',()=>{
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
        form=document.createElement('form');form.id='db140AdvertisementForm';form.className='form';form.onsubmit=event=>{event.preventDefault();window.saveBlogAudition?.(event,'published');};
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
        if(event.target.closest('button,a'))return;event.preventDefault();details.open=true;
        if(form.id==='db140AdvertisementForm'&&!$('input,select,textarea',form))window.addAuditionAdRow?.();
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
  function socialKey(form){return form.id.startsWith('uc56')?'carousel_'+form.id.replace('uc56CarouselForm_',''):form.id.replace('uc48','').replace('Form','').toLowerCase();}
  function prepareSocialForm(form){
    if(!form.matches(SOCIAL_FORMS))return;
    form.dataset.db142Social=socialKey(form);form.classList.add('db142-social-form');
    const body=$(':scope>.db138-form-content',form)||form;
    if(form.id==='uc48StoryForm'&&!$('[name="tags"]',form)){
      const tags=document.createElement('div');tags.className='uc48-field-shell db142-story-addon';tags.innerHTML='<label>Tags / Hashtags Optional</label><input name="tags" maxlength="2000" placeholder="fitness, classes"><small class="uc48-helper">Separate tags with commas. Publishing uses the supported platform fields.</small>';
      const caption=$('[name="caption"]',form)?.closest('.uc48-field-shell'),media=$('.uc48-media-box',form);(caption||media)?.after(tags);
      if(window.ucV1676PollMarkup&&!$('[data-uc75-poll]',form)){const wrap=document.createElement('div');wrap.innerHTML=window.ucV1676PollMarkup('story');const poll=wrap.firstElementChild;poll.classList.add('db142-story-addon');$('.uc48-schedule-box',form)?.after(poll);}
    }
    if(!$(':scope>[data-db142-post-step]',body)){
      const carousel=form.id.startsWith('uc56'),groups=Array.from({length:carousel?2:1},(_,index)=>{const group=document.createElement('section');group.dataset.db142PostStep=String(index);group.className='db142-post-field-group';return group;});
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
    const carousel=form.id.startsWith('uc56'),key=socialKey(form),kind=key.replace('carousel_','');
    let error='';
    if(carousel&&index===0){const media=window.UCV1656?.carousel?.uploads?.[kind]||[];if(media.filter(Boolean).length<2)error='Upload at least two carousel media items before continuing.';}
    if(!carousel&&kind!=='text'&&!window.UCV1648Posts?.uploads?.[kind])error='Choose your media and upload it to Google Drive before continuing.';
    if(index===(carousel?1:0)&&!error){
      const targets=$$('input[data-uc48-scope],input[data-uc56-carousel-target]',form).filter(control=>!control.disabled&&!conditionallyHidden(control,form));
      if(!targets.some(control=>control.checked))error='Select at least one eligible connected platform before continuing.';
      const scheduled=$('input[name="scheduleLater"]:checked,[data-uc56-schedule-toggle]:checked',form),date=$('input[name="scheduledAt"],input[type="datetime-local"]',form);
      if(scheduled&&(!date?.value||new Date(date.value).getTime()<=Date.now()))error='Choose a future date and time for this scheduled post.';
      const poll=window.ucV1676PollPayload?.(form);if(poll?.enabled&&(!poll.question||poll.options.length<2))error='Enter a poll question and at least two options before continuing.';
    }
    if(error){let note=$(':scope>.db142-validation',form);if(!note){note=document.createElement('p');note.className='db142-validation error';note.setAttribute('role','alert');$('.db137-wizard-nav',form)?.before(note);}note.textContent=error;return false;}
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
    if(form.id.startsWith('uc56'))(window.UCV1656?.carousel?.uploads?.[kind]||[]).filter(Boolean).forEach(upload=>media.push({url:upload.url,video:String(upload.mimeType||'').startsWith('video/')}));
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
      const source=$('[data-uc1705-template]',card);if(!source||card.dataset.db142Template)return;
      card.dataset.db142Template='1';card.classList.add('db142-template-card');card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','Use '+clean($('h3',card)?.textContent));source.classList.add('db142-mobile-hidden');
      const chevron=document.createElement('span');chevron.className='db142-template-chevron';chevron.innerHTML=icon('chevron');card.appendChild(chevron);
      const use=event=>{if(event.target.closest('button,a,input,select'))return;source.click();};card.addEventListener('click',use);card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();source.click();}});
    });
  }

  /* ---------- One event-driven controller for late data and all three dashboards ---------- */
  const observed=new Map();
  let running=false;
  function activeRoots(){
    const roots=[],active=$('#adminApp .panel.active');if(active)roots.push(active);
    $$('.portal-view:not([hidden]),#uc1705Workspace,'+MODALS).forEach(root=>roots.push(root));
    return [...new Set(roots)];
  }
  function enhance(root){
    if(!PHONE.matches||!isDashboard())return;
    enhanceRefundNavigation(root);enhanceSocialNavigation(root);
    prepareClientDocuments(root);enhanceGlobalFilters(root);enhanceDanceTipNavigation(root);
    classifySheets(root);enhanceCarousels(root);enhanceCompactCards(root);enhanceTabNavigation(root);enhanceSearch(root);
    $$('form',root).forEach(enhanceForm);enhanceSelectors(root);
    $$('.db107-calendar,.db119-calendar-card,.uc48-calendar-shell,.uc88-analytics-card',root).forEach(enhanceCalendar);
    enhanceCharts(root);enhanceClientModal();enhanceCustomSubscription();enhanceDashboardCopy();enhanceProducts();enhanceRefundHelp(root);enhanceHeaderIcons(root);enhanceCompactFilters(root);enhanceRecordHierarchy(root);enhanceCalendarList(root);
    enhanceOverviewLists(root);enhanceClientRefund();enhanceImageOrdering(root);enhanceNavigationHierarchy(root);
    enhanceDisclosureRows(root);enhanceBadgeTabs(root);enhanceHeatActions(root);enhanceRefundRecordActions(root);enhanceSocialCalendar(root);enhanceAutomations(root);
  }
  function observeSurfaces(){
    if(typeof MutationObserver!=='function'||!PHONE.matches)return;
    const main=$('#adminApp .main,.portal-main'),roots=[document.body,main,$('#uc1705Workspace'),...$$(MODAL_NODES)].filter(Boolean);
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
    const names=['tab','newProduct','editProduct','editProductById','renderProducts','renderUCClientDetails','load_dashboard','load_products','load_orders','load_refunds','load_leads','load_requests','load_subscribers','load_unsubscribed','load_oneTimeUsers','load_favorites','load_pages','loadUCSubscriptionOverview','db125OpenScheduleMeeting','openMedia','loadProductMedia','editBlog','addAuditionAdRow','openUCStatement','openUCInvoice','openUCRefundInvoice','ucV14SelectRefundRow','ucV14OpenRefunds','ucV14CloseRefundConfirm'];
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
      if(event.matches)queuePasses();else{observed.forEach(observer=>observer.disconnect());closeChoiceSheet();closePaymentPage();removeClientRefund();restoreRefundNavigation();restoreSocialForms();for(const state of filterStates.values()){closeFilterSheet(state);state.marker.after(state.filters);state.overlay.remove();state.trigger.remove();}filterStates.clear();const sales=$('[data-uc84-sales="customSubscription"]');if(sales)mobileCopy(sales,'+ Subscription');enhanceDashboardCopy();}
    });
    runPass();
    // Existing workspace installers finish in bounded stages. Rebind presentation
    // only after those stages; never issue requests or schedule a recurring poll.
    [80,650,1900,5800,8600].forEach(delay=>setTimeout(runPass,delay));
    document.dispatchEvent(new CustomEvent('dropbeat:dashboard-mobile-v138-ready',{detail:{build:BUILD}}));
  }
  window.DropBeatMobileUI={build:BUILD,refresh:queuePasses,openPaymentPage,closePaymentPage,openHelp,disclosure:()=>window.DropBeatUI.disclosure()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
