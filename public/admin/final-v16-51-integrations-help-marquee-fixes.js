/* V16.51 — targeted Integrations UI fixes.
   Additive only: no credentials, connection records, payment logic, publishing
   logic, color variables or existing integration enablement are changed. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>[...(r?.querySelectorAll?.(s)||[])];
  let observer=null, patchTimer=0, wrapped=false;

  const AUTOMATION_HELP=`<div class="uc51-automation-help">
    <h3>Automation Endpoints — How to Connect n8n, Make, Zapier or Another Server</h3>
    <p class="uc-help-lead">These endpoints let an external automation tool read or update selected IronPulse Gym data without giving that tool your admin password. Every request is authenticated with the Bearer API token shown in the API Settings form.</p>
    <div class="uc-warning"><strong>Before using any endpoint:</strong> generate/save the API token in this section and keep it private. In the external tool add the HTTP header <code>Authorization: Bearer YOUR_API_TOKEN</code>. For POST requests also send <code>Content-Type: application/json</code>. Never put the Bearer token in a public browser script, public Google Sheet or public GitHub repository.</div>
    <h4>Basic n8n / automation setup</h4>
    <ol>
      <li>Create an <strong>HTTP Request</strong> step/node in n8n, Make, Zapier or your preferred automation software.</li>
      <li>Copy the exact endpoint URL from the front of this card and choose the matching <strong>GET</strong> or <strong>POST</strong> method.</li>
      <li>Add header <code>Authorization</code> with value <code>Bearer YOUR_API_TOKEN</code>.</li>
      <li>For POST requests choose JSON and add only the fields you want to send.</li>
      <li>Run one manual test. A successful request returns JSON. HTTP 401 means the Bearer token is missing/incorrect; HTTP 400 normally means required input is missing; HTTP 5xx means the website or upstream service could not complete the operation.</li>
      <li>After the manual test works, add your schedule/trigger in the external automation software.</li>
    </ol>

    <h4>GET /api/automation/site — Read website settings</h4>
    <p><strong>Use it for:</strong> retrieving the current site/brand/tracking configuration before an automation decides what to update. It is read-only and does not change the website.</p>
    <div class="uc-example"><strong>Example:</strong> an n8n workflow can read the current GA4 Measurement ID or website settings, compare them with a master configuration, and only call the POST endpoint when a value really needs changing.</div>

    <h4>POST /api/automation/site — Update site, tracking and SEO-related values</h4>
    <p><strong>Use it for:</strong> updating supported site settings with a JSON body. The backend merges the supplied fields into the current site settings rather than requiring every field each time.</p>
    <pre class="uc51-code">{
  "googleAnalyticsMeasurementId": "G-XXXXXXXXXX",
  "googleTagManagerId": "GTM-XXXXXXX",
  "metaPixelId": "1234567890"
}</pre>
    <div class="uc-warning"><strong>Safe-use rule:</strong> send only the fields you intentionally want to change. Do not send blank values for credentials/settings you want to preserve.</div>

    <h4>GET /api/automation/blogs — List Fitness Tip Updates</h4>
    <p><strong>Use it for:</strong> reading the current live/draft Fitness Tip fitness tips from the connected SEO/Blogger source. This endpoint requires the SEO connection to remain authorized.</p>
    <div class="uc-example"><strong>Example:</strong> fetch current Fitness Tips first, then let an external workflow check whether a slug already exists before creating a new fitness tip.</div>

    <h4>POST /api/automation/blogs — Create or update an Fitness Tip</h4>
    <p><strong>Use it for:</strong> creating a new Fitness Tip or updating the fitness tip with the same slug. <code>title</code> plus <code>body_text</code> or <code>body_html</code> are required. Use status <code>draft</code> to save without publishing or <code>published</code> to publish. A published fitness tip continues through the website's existing social-distribution logic.</p>
    <pre class="uc51-code">{
  "title": "Female Member – Hyderabad Ad Film",
  "slug": "female-actor-hyderabad-ad-film",
  "excerpt": "Casting update for a Hyderabad ad film.",
  "body_text": "Role: Female Member\nAge: 20-30\nCity: Hyderabad",
  "cover_image_url": "https://example.com/casting.jpg",
  "tags": "casting,hyderabad,actor",
  "status": "draft"
}</pre>
    <div class="uc-warning"><strong>Publishing caution:</strong> set <code>status</code> to <code>published</code> only when the content is ready, because the existing automatic publishing integrations may run after publication.</div>

    <h4>POST /api/automation/social-posts — Run due scheduled social posts</h4>
    <p><strong>Use it for:</strong> an exact scheduler/cron call that asks IronPulse Gym to process posts whose scheduled time is due. No post content is required in the request body; the post content/platform targets were already saved from Social Media → Posts.</p>
    <div class="uc-example"><strong>Recommended schedule:</strong> call this periodically from n8n/Cloudflare Cron when you want scheduled posts to publish even when nobody is actively using the admin panel.</div>

    <h4>POST /api/automation/products — Create/update plans, offers and services</h4>
    <p><strong>Use it for:</strong> creating or updating products by SKU. A single object or a <code>products</code> array can be sent. Existing SKU values are updated instead of creating duplicates.</p>
    <pre class="uc51-code">{
  "sku": "UC-FESTIVAL",
  "name": "Festival Offer",
  "regular_price": 799,
  "offer_price": 399,
  "badge": "Festival Offer",
  "status": "active",
  "page_keys": "home,offers",
  "features": "WhatsApp fitness updates | Priority onboarding"
}</pre>

    <h4>GET /api/automation/leads-summary — Read the recent lead/order summary</h4>
    <p><strong>Use it for:</strong> obtaining aggregated Contact Leads and Orders from the last 30 days, grouped by their current statuses. It is useful for daily reporting, dashboards or a morning n8n summary. It does not edit a lead/order.</p>

    <h4>GET /api/automation/phonepe-redemptions?dry_run=1 — Preview due PhonePe AutoPay renewals</h4>
    <p><strong>Use it for:</strong> checking what PhonePe AutoPay redemption notifications would be due <em>without sending them</em>. This is the safer endpoint to test first.</p>
    <div class="uc-example"><strong>Example:</strong> schedule a preview in n8n, inspect the JSON result, then enable the POST step only after the PhonePe subscription records are correct.</div>

    <h4>POST /api/automation/phonepe-redemptions — Process due PhonePe AutoPay renewal notifications</h4>
    <p><strong>Use it for:</strong> notifying PhonePe about due AutoPay redemptions. It can be scheduled daily. Optional JSON fields include <code>order_id</code> to restrict one order, <code>dry_run</code> to preview and <code>force</code> for an intentional forced run.</p>
    <pre class="uc51-code">{
  "order_id": "UC-ORDER-123",
  "dry_run": true,
  "force": false
}</pre>
    <div class="uc-warning"><strong>Payment safety:</strong> test with <code>dry_run:true</code> first. Do not use <code>force:true</code> as a normal scheduler setting.</div>

    <h4>What is intentionally not shown here</h4>
    <p>The Razorpay, PhonePe, Stripe and WhatsApp <strong>incoming webhook URLs</strong> are managed inside their own integration cards, so V16.51 removes their duplicate display from API Settings. Their backend routes remain unchanged; only the duplicate UI list is hidden.</p>
  </div>`;

  function ensureHiddenLegacySeoSentinel(){
    const summary=$('#ucV152Blogger > summary');if(!summary)return;
    let sentinel=$('#uc48SeoBadge',summary);
    if(!sentinel){sentinel=document.createElement('span');sentinel.id='uc48SeoBadge';sentinel.setAttribute('aria-hidden','true');summary.appendChild(sentinel);}
    if(!sentinel.hidden)sentinel.hidden=true;if(sentinel.style.display!=='none')sentinel.style.display='none';
    let title=$('.uc50-seo-summary-title',summary);
    if(!title){title=document.createElement('span');title.className='uc50-seo-summary-title';summary.prepend(title);}
    if(title.textContent!=='SEO Connection')title.textContent='SEO Connection';
    // Remove only inline/legacy status copies; the unified status badge at the extreme right stays.
    summary.querySelectorAll(':scope > .uc-v168-status-badge').forEach(x=>x.remove());
    summary.querySelectorAll(':scope > .uc48-seo-summary-left').forEach(x=>x.remove());
    [...summary.childNodes].forEach(n=>{if(n.nodeType===Node.TEXT_NODE&&String(n.nodeValue||'').trim())n.remove();});
  }

  function hideDuplicateSeoInlineStatus(){
    const gi=$('#socialMediaIntegrations [data-social-card="googleIndexing"] > summary');
    if(gi)gi.querySelectorAll(':scope > .uc-v168-limited-label').forEach(x=>{if(!x.hidden)x.hidden=true;if(x.getAttribute('aria-hidden')!=='true')x.setAttribute('aria-hidden','true');});
    ensureHiddenLegacySeoSentinel();
  }

  function hideDuplicateWebhookUi(){
    const list=$('#webhookList');if(!list)return;
    if(!list.hidden)list.hidden=true;if(list.getAttribute('aria-hidden')!=='true')list.setAttribute('aria-hidden','true');
    let h=list.previousElementSibling;
    while(h&&!(h.matches('h1,h2,h3,h4'))){h=h.previousElementSibling;}
    if(h&&/Webhook Endpoints/i.test(h.textContent||'')){if(!h.hidden)h.hidden=true;if(h.getAttribute('aria-hidden')!=='true')h.setAttribute('aria-hidden','true');if(h.dataset.uc51WebhookHeading!=='1')h.dataset.uc51WebhookHeading='1';}
  }

  function ensureAutomationHelp(){
    const list=$('#apiEndpointList');const card=list?.closest('.card');if(!card)return;
    if(!card.classList.contains('uc51-api-automation-card'))card.classList.add('uc51-api-automation-card');
    hideDuplicateWebhookUi();
    if(!card.dataset.ucInfoFlip&&typeof window.ucMakeInfoCard==='function')window.ucMakeInfoCard(card,AUTOMATION_HELP);
    else{
      const body=card.querySelector(':scope > .uc-info-back-panel .uc-info-back-body');
      if(body&&body.dataset.uc51AutomationHelp!=='1'){body.innerHTML=AUTOMATION_HELP;body.dataset.uc51AutomationHelp='1';}
    }
    const body=card.querySelector(':scope > .uc-info-back-panel .uc-info-back-body');if(body)body.dataset.uc51AutomationHelp='1';
  }

  function patchMetaHelpPersistence(){
    /* Facebook/Instagram solution help is now defined directly in the V16.8 HELP source,
       which is the renderer that rebuilds these cards. Do not trigger any unrelated
       connection refresh here; that would cause needless network activity and UI flicker. */
    ['facebook','instagram'].forEach(key=>{
      const card=$(`#socialMediaIntegrations [data-social-card="${key}"]`);
      if(card&&!card.classList.contains('uc51-meta-help-ready'))card.classList.add('uc51-meta-help-ready');
    });
  }

  function patchAll(){hideDuplicateSeoInlineStatus();hideDuplicateWebhookUi();ensureAutomationHelp();patchMetaHelpPersistence();}

  function wrapLoad(){
    if(wrapped)return;wrapped=true;
    const old=window.load_apiSettings;
    if(typeof old==='function'&&!old.__uc51){
      const fn=async function(){const r=await old.apply(this,arguments);setTimeout(patchAll,0);setTimeout(patchAll,120);return r;};fn.__uc51=true;window.load_apiSettings=fn;
    }
    const oldSocial=window.load_socialMediaIntegrations;
    if(typeof oldSocial==='function'&&!oldSocial.__uc51){
      const fn=async function(){const r=await oldSocial.apply(this,arguments);setTimeout(patchAll,80);setTimeout(patchAll,420);return r;};fn.__uc51=true;window.load_socialMediaIntegrations=fn;
    }
  }

  function observe(){
    if(window.__ucV1654StableIntegrations)return;
    if(observer)return;const root=$('#socialMediaIntegrations');if(!root)return;
    observer=new MutationObserver(m=>{
      // Ignore pure text/attribute updates; only patch when an older renderer adds/replaces UI nodes.
      if(!m.some(x=>x.addedNodes&&x.addedNodes.length))return;
      clearTimeout(patchTimer);patchTimer=setTimeout(patchAll,90);
    });
    observer.observe(root,{childList:true,subtree:true});
  }

  function init(){wrapLoad();patchAll();observe();setTimeout(patchAll,500);setTimeout(patchAll,1600);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,2800),{once:true});else setTimeout(init,2800);
})();
