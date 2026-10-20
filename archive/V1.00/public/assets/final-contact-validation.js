/* Final contact-form validation and clean country-code phone entry. */
(function(){
  const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function result(text,type='error'){
    const box=document.getElementById('contactResult');
    if(box)box.innerHTML=`<div class="notice ${type==='error'?'error':''}">${esc(text)}</div>`;
  }
  function getFields(){
    const form=document.getElementById('contactForm');
    return {form,phone:form?.querySelector('[name="phone"]'),country:form?.querySelector('[name="country_code"]'),email:form?.querySelector('[name="email"]'),message:form?.querySelector('[name="message"]')};
  }
  function validate(){
    const {form,phone,country,email,message}=getFields(); if(!form)return {ok:false};
    const digits=String(phone?.value||'').replace(/\D/g,'').slice(0,10);
    if(phone)phone.value=digits;
    const cc=String(country?.value||'91').replace(/\D/g,'')||'91';
    if(cc==='91' && digits.length!==10){phone?.focus();return {ok:false,error:'Please enter exactly 10 digits for the WhatsApp number after +91.'};}
    if(cc!=='91' && (digits.length<6||digits.length>10)){phone?.focus();return {ok:false,error:'Please enter a valid WhatsApp number using 6 to 10 digits.'};}
    const mail=String(email?.value||'').trim();
    if(!mail){email?.focus();return {ok:false,error:'Please enter your email address in the format name@domain.com.'};}
    if(!EMAIL_RE.test(mail)){email?.focus();return {ok:false,error:'Please enter a valid email address in the format name@domain.com, for example name@gmail.com.'};}
    if(String(message?.value||'').trim().length<3){message?.focus();return {ok:false,error:'Please enter a short message so our team can understand your enquiry.'};}
    return {ok:true,cc,digits};
  }
  async function submitContactFinal(){
    const v=validate(); if(!v.ok){if(v.error)result(v.error);return;}
    const {form}=getFields();
    const btn=form?.querySelector('button[type="submit"]'); const old=btn?.textContent||'Send Message';
    if(btn){btn.disabled=true;btn.textContent='Sending…';}
    try{
      try{
        const started=Number(window.__ucContactPageStartedAt||Date.now());
        const body=JSON.stringify({visitor_id:window.getVisitorId?getVisitorId():'',path:location.pathname,referrer:document.referrer,source:window.detectTrafficSource?detectTrafficSource():'Direct / unknown',duration_ms:Math.max(0,Date.now()-started),event:'duration',analytics_consent:window.UCConsent?.allows?.('analytics')===true,ads_consent:window.UCConsent?.allows?.('ads')===true});
        await fetch('/api/track/visit',{method:'POST',headers:{'Content-Type':'application/json'},body});
      }catch(_){ }
      const fd=new FormData(form); const payload=Object.fromEntries(fd.entries());
      payload.phone=v.digits; payload.country_code=v.cc;
      payload.visitor_id=window.getVisitorId?getVisitorId():''; payload.source_detail=location.pathname;
      payload.analytics_consent=window.UCConsent?.allows?.('analytics')===true;
      payload.ads_consent=window.UCConsent?.allows?.('ads')===true;
      const res=await (window.api?api('/api/public/contact',{method:'POST',body:JSON.stringify(payload)}):fetch('/api/public/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');return d;}));
      form.reset(); if(form.country_code)form.country_code.value='91';
      result(res.duplicate?'This enquiry was already received recently. Please wait for our team to respond.':`Thank you. Your message has been received. Reference: ${res.lead_id}`,'success');
      if(!res.duplicate)document.dispatchEvent(new CustomEvent('uc-confirmed-lead',{detail:{leadId:res.lead_id}}));
    }catch(e){result(e.message||'Your message could not be submitted. Please correct the details and try again.');}
    finally{if(btn){btn.disabled=false;btn.textContent=old;}}
  }
  function init(){
    const {form,phone}=getFields(); if(!form)return;
    window.__ucContactPageStartedAt=Date.now();
    if(phone){phone.addEventListener('input',()=>{phone.value=phone.value.replace(/\D/g,'').slice(0,10);});phone.addEventListener('paste',()=>setTimeout(()=>{phone.value=phone.value.replace(/\D/g,'').slice(0,10);},0));}
    if(window.UC)window.UC.submitContact=submitContactFinal;
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
