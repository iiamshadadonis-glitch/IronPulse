(()=>{
  'use strict';

  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const $$=(selector,root=document)=>root?.querySelectorAll?[...root.querySelectorAll(selector)]:[];
  const DAYS=[['sun','Sunday'],['mon','Monday'],['tue','Tuesday'],['wed','Wednesday'],['thu','Thursday'],['fri','Friday'],['sat','Saturday']];
  const CLASS_TYPES=[['online_class','Online Class'],['offline_class','Gym / Offline Class'],['demo','Demo Class'],['webinar','Webinar'],['trial','Trial Session']];
  const SPECIALTIES=["Weightlifting","Cardio","Functional Training","Strength Training","CrossFit","HIIT","Personal Training","Mobility","Pilates","Yoga","Powerlifting","Calisthenics","Endurance Training","Circuit Training","Core Training","Boxing","Kickboxing","Indoor Cycling"];
  let scheduleIndex=0;

  class PortalError extends Error{
    constructor(message,contactUrl=''){super(message);this.contactUrl=contactUrl;}
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function showResult(message,type='',contactUrl=''){
    const box=$('#portalAuthResult');
    if(!box)return;
    box.replaceChildren(document.createTextNode(String(message||'')));
    if(contactUrl){
      box.append(document.createTextNode(' '));
      const link=document.createElement('a');
      link.href=contactUrl;
      link.textContent='Contact Us';
      link.className='portal-result-link';
      box.append(link);
    }
    box.className=`portal-result show ${type}`;
    box.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  async function api(url,options={}){
    const response=await fetch(url,{credentials:'same-origin',...options,headers:{...(options.body instanceof FormData?{}:{'content-type':'application/json'}),...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new PortalError(data.error||'This request could not be completed. Please try again.',data.contactUrl||'');
    return data;
  }

  async function loadBrand(){
    try{
      const data=await api('/api/public/site?dropbeat=1.16'),settings=data.settings||{};
      $$('[data-site-name]').forEach(node=>node.textContent=settings.siteName||'IronPulse Gym');
      $$('[data-site-logo]').forEach(node=>{node.src=settings.logoUrl||'/assets/ironpulse-logo.svg';node.alt=settings.siteName||'IronPulse Gym';});
      if(/^#[0-9a-f]{6}$/i.test(settings.primaryColor||''))document.documentElement.style.setProperty('--portal-primary',settings.primaryColor);
      if(/^#[0-9a-f]{6}$/i.test(settings.accentColor||''))document.documentElement.style.setProperty('--portal-accent',settings.accentColor);
    }catch(_){/* The login remains usable with bundled brand defaults. */}
  }

  function setMode(mode='login'){
    const selected=['login','student','coach'].includes(mode)?mode:'login';
    $$('[data-auth-mode]').forEach(button=>{
      const active=button.dataset.authMode===selected;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',String(active));
      button.tabIndex=active?0:-1;
    });
    $$('[data-auth-panel]').forEach(panel=>{panel.hidden=panel.dataset.authPanel!==selected;});
    history.replaceState(null,'',selected==='login'?location.pathname:`${location.pathname}?signup=${selected}`);
  }

  function timeSelect(name,label,value=''){
    return `<div class="schedule-time portal-field" data-time-group="${name}"><label>${escapeHtml(label)}</label><input type="time" lang="en-IN" step="300" value="${escapeHtml(value||'09:00')}" aria-label="${escapeHtml(label)} time" data-time-value></div>`;
  }

  function multiPicker(name,label,items){
    return `<details class="schedule-picker" data-picker="${name}"><summary>${escapeHtml(label)}</summary><div class="schedule-picker-menu">${items.map(([value,text])=>`<label><input type="checkbox" value="${escapeHtml(value)}"><span>${escapeHtml(text)}</span></label>`).join('')}</div></details>`;
  }

  function singlePicker(name,label,items,value=''){
    return `<select class="schedule-single-select" data-picker="${name}" aria-label="${escapeHtml(label)}"><option value="">${escapeHtml(label)}</option>${items.map(([option,text])=>`<option value="${escapeHtml(option)}"${option===value?' selected':''}>${escapeHtml(text)}</option>`).join('')}</select>`;
  }

  function updatePickerSummary(picker){
    const chosen=$$('input:checked',picker).map(input=>input.nextElementSibling?.textContent||input.value);
    const summary=$('summary',picker),fallback=picker.dataset.picker==='types'?'Choose class types':'Choose Fitness Specialties';
    if(summary)summary.textContent=chosen.length?(chosen.length<=2?chosen.join(', '):`${chosen.length} selected`):fallback;
  }

  function addAvailability(slot={}){
    const host=$('#coachScheduleRows');
    if(!host)return;
    const row=document.createElement('article');
    row.className='coach-schedule-row';
    row.dataset.scheduleRow=String(++scheduleIndex);
    const initialType=Array.isArray(slot.classTypes)?slot.classTypes[0]||'':slot.classType||'';
    row.innerHTML=`<div class="schedule-row-number" aria-hidden="true">${scheduleIndex}</div><div class="portal-field"><label>Available Day</label><select data-slot-day>${DAYS.map(([value,text])=>`<option value="${value}"${slot.day===value?' selected':''}>${text}</option>`).join('')}</select></div>${timeSelect('start','From',slot.start||'09:00')}${timeSelect('end','Until',slot.end||'10:00')}<div class="portal-field"><label>Class Type</label>${singlePicker('types','Choose one class type',CLASS_TYPES,initialType)}</div><div class="portal-field schedule-style-field"><label>Fitness Specialties for This Session</label>${multiPicker('styles','Choose Fitness Specialties',SPECIALTIES.map(item=>[item,item]))}</div><button class="schedule-remove" type="button" aria-label="Remove this session">×</button>`;
    host.append(row);
    const preselectedStyles=Array.isArray(slot.danceStyles)?slot.danceStyles:[];
    $$('[data-picker="styles"] input',row).forEach(input=>{input.checked=preselectedStyles.includes(input.value);});
    $$('.schedule-picker',row).forEach(picker=>{updatePickerSummary(picker);picker.addEventListener('change',()=>updatePickerSummary(picker));});
    $('.schedule-remove',row)?.addEventListener('click',()=>{
      if($$('[data-schedule-row]',host).length===1){showResult('Keep at least one teaching availability row.','error');return;}
      row.remove();
    });
  }

  function timeValue(group){
    return $('[data-time-value]',group)?.value||'';
  }

  function collectAvailability(){
    const slots=$$('[data-schedule-row]',$('#coachScheduleRows')).map((row,index)=>{
      const day=$('[data-slot-day]',row)?.value||'',start=timeValue($('[data-time-group="start"]',row)),end=timeValue($('[data-time-group="end"]',row));
      const classType=$('[data-picker="types"]',row)?.value||'',classTypes=classType?[classType]:[],danceStyles=$$('[data-picker="styles"] input:checked',row).map(input=>input.value);
      if(end<=start)throw new PortalError(`Availability ${index+1}: the Until time must be later than the From time.`);
      if(!classTypes.length)throw new PortalError(`Availability ${index+1}: choose one class type.`);
      if(!danceStyles.length)throw new PortalError(`Availability ${index+1}: choose at least one Fitness Specialty.`);
      return {day,start,end,classTypes,danceStyles};
    });
    if(!slots.length)throw new PortalError('Add at least one teaching availability.');
    return slots;
  }

  function validatePhoto(form){
    const input=$('input[type="file"][name="profilePhoto"]',form),file=input?.files?.[0],maximum=Number(input?.dataset.maxBytes||15728640);
    if(file&&file.size>maximum)throw new PortalError('Choose a profile image no larger than 15 MB.');
  }

  function signupPayload(form,role){
    if(form.password.value!==form.confirmPassword.value)throw new PortalError('The password confirmation does not match.');
    validatePhoto(form);
    const data=new FormData(form);data.set('role',role);
    if(role==='coach'){
      const slots=collectAvailability();
      data.set('availabilitySlots',JSON.stringify(slots));
      data.set('availableDays',JSON.stringify([...new Set(slots.map(slot=>slot.day))]));
      data.set('classTypes',JSON.stringify([...new Set(slots.flatMap(slot=>slot.classTypes))]));
      data.set('specialties',JSON.stringify([...new Set(slots.flatMap(slot=>slot.danceStyles))]));
    }else{
      data.set('availabilitySlots','[]');data.set('availableDays','[]');data.set('classTypes','[]');data.set('specialties','[]');
    }
    return data;
  }

  async function login(event){
    event.preventDefault();const form=event.currentTarget,button=event.submitter||$('button[type="submit"]',form),old=button?.textContent||'Login';
    if(button){button.disabled=true;button.textContent='Signing in…';}
    try{const data=await api('/api/portal/auth/login',{method:'POST',body:JSON.stringify({email:form.email.value,password:form.password.value,remember:form.remember.checked})});showResult('Login successful. Opening your dashboard…','success');location.href=data.route||'/';}
    catch(error){showResult(error.message,'error',error.contactUrl);if(button){button.disabled=false;button.textContent=old;}}
  }

  async function signup(event){
    event.preventDefault();const form=event.currentTarget,role=form.elements.role.value==='coach'?'coach':'student',button=event.submitter||$('button[type="submit"]',form),old=button?.textContent||'Create Account';
    if(button){button.disabled=true;button.textContent='Creating account…';}
    try{const response=await api('/api/portal/auth/register',{method:'POST',body:signupPayload(form,role)});showResult(response.message||'Your account was created.','success');setTimeout(()=>{location.href=response.route||'/login';},500);}
    catch(error){showResult(error.message,'error',error.contactUrl);if(button){button.disabled=false;button.textContent=old;}}
  }

  async function googleLogin(event){
    const button=event.currentTarget,old=button.textContent;button.disabled=true;button.textContent='Opening Google…';
    try{const data=await api('/api/portal/google/start?intent=login');location.href=data.authUrl;}
    catch(error){showResult(error.message,'error',error.contactUrl||'/contact');button.disabled=false;button.textContent=old;}
  }

  async function googleSignup(event){
    const button=event.currentTarget,role=button.dataset.googleSignup,form=$(`#${role}SignupForm`),old=button.textContent;if(!form)return;
    button.disabled=true;button.textContent='Opening Google…';
    try{if(!form.reportValidity())throw new PortalError('Complete the required sign-up details first.');const response=await api('/api/portal/google/start',{method:'POST',body:signupPayload(form,role)});location.href=response.authUrl;}
    catch(error){showResult(error.message,'error',error.contactUrl||'/contact');button.disabled=false;button.textContent=old;}
  }

  async function redirectExisting(){
    try{const me=await api('/api/portal/auth/me');if(me.account?.role==='student')location.replace('/member-dashboard');else if(me.account?.role==='coach')location.replace('/coach-dashboard');}
    catch(_){/* No portal session is the normal login-page state. */}
  }

  function init(){
    loadBrand();redirectExisting();
    $$('[data-auth-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.authMode)));
    $('#portalLoginForm')?.addEventListener('submit',login);$('#studentSignupForm')?.addEventListener('submit',signup);$('#coachSignupForm')?.addEventListener('submit',signup);
    $('[data-google-login]')?.addEventListener('click',googleLogin);$$('[data-google-signup]').forEach(button=>button.addEventListener('click',googleSignup));
    $('[data-add-availability]')?.addEventListener('click',()=>addAvailability());addAvailability({day:'sun',start:'09:00',end:'10:00'});
    const query=new URLSearchParams(location.search),requested=query.get('signup');setMode(requested==='student'||requested==='coach'?requested:'login');
    if(query.get('google_error'))showResult('Google sign-in could not be completed. Please try again or contact the gym for help.','error','/contact');
  }

  document.addEventListener('DOMContentLoaded',init);
})();
