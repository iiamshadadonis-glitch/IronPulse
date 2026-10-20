/* DropBeat Dance Studio V8 — additive help/layout fixes + anonymous journey cleanup UI integration.
   Existing business logic remains authoritative. This file only repairs helper placement,
   restores missing helpers on dynamic panels, and adds solution-oriented payment help. */
(function(){
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const link=(url,label)=>`<a class="uc-help-link" href="${H(url)}" target="_blank" rel="noopener">${H(label)}</a>`;

  const HELP={
    trackingGoogle:`<h3>Google & Meta Tracking — Setup Guide</h3>
      <p class="uc-help-lead">Use this card to connect the main analytics, tag-management, Meta and Google Search verification tools. Save only the IDs that belong to this website.</p>
      <h4>${link('https://analytics.google.com/','GA4 Measurement ID')}</h4>
      <ol><li>Open Google Analytics and choose/create the GA4 property for this website.</li><li>Go to <strong>Admin → Data streams → Web</strong> and open the website stream.</li><li>Copy the Measurement ID beginning with <strong>G-</strong>.</li><li>Paste it into GA4 Measurement ID, switch Enable on, then Save.</li></ol>
      <h4>${link('https://tagmanager.google.com/','GTM Container ID')}</h4>
      <ol><li>Open Google Tag Manager and choose the website container.</li><li>Copy the container ID beginning with <strong>GTM-</strong>.</li><li>Paste it here, enable GTM and Save.</li></ol>
      <h4>${link('https://business.facebook.com/events_manager2/list','Meta Pixel ID')}</h4>
      <ol><li>Open Meta Events Manager and select the website dataset/Pixel.</li><li>Copy its numeric Pixel/Dataset ID.</li><li>Paste it here, enable Meta Pixel and Save.</li></ol>
      <h4>${link('https://search.google.com/search-console','Search Console Verification')}</h4>
      <ol><li>Add the live website as a Search Console property.</li><li>Choose the <strong>HTML tag</strong> verification method.</li><li>Copy the verification token/value requested by this field and paste it here.</li><li>Save this page first, then return to Search Console and click Verify.</li></ol>
      <div class="uc-example"><strong>Examples:</strong> GA4 = G-XXXXXXXXXX • GTM = GTM-XXXXXXX • Meta Pixel = numeric ID.</div>
      <div class="uc-warning"><strong>No tracking data?</strong> Confirm the correct live domain/property, save the value, enable its toggle, allow analytics consent during your test, then use the provider's Realtime/Test Events screen.</div>`,

    trackingOther:`<h3>Other Ad Pixels & Search Verification — Setup Guide</h3>
      <p class="uc-help-lead">These fields are optional. Fill only the platforms you actually use. If a platform is installed through GTM instead, do not duplicate the same pixel here.</p>
      <h4>${link('https://ads.snapchat.com/','Snapchat Pixel ID')}</h4><p>Snap Ads Manager → Events/Pixels → create or open the website Pixel → copy its Pixel ID → paste it here → enable → Save.</p>
      <h4>${link('https://ads.x.com/','X / Twitter Pixel ID')}</h4><p>X Ads → website conversion/events setup → open the website tag/pixel configuration → copy the ID supplied for the site → paste → enable → Save.</p>
      <h4>${link('https://www.linkedin.com/campaignmanager/','LinkedIn Partner ID')}</h4><p>Campaign Manager → Data / Signals Manager → Insight Tag → copy the Partner ID → paste → enable → Save.</p>
      <h4>${link('https://ads.pinterest.com/','Pinterest Tag ID')}</h4><p>Pinterest Business → Conversions/Tag setup → open the Pinterest Tag → copy the Tag ID → paste → enable → Save.</p>
      <h4>${link('https://ads.reddit.com/','Reddit Pixel ID')}</h4><p>Reddit Ads → Events Manager → select/create the Reddit Pixel → copy the Pixel ID → paste → enable → Save.</p>
      <h4>${link('https://www.bing.com/webmasters/','Bing Webmaster Verification')}</h4><p>Bing Webmaster Tools → add site → HTML meta-tag verification → copy the verification value (often <strong>msvalidate.01</strong>) → paste → Save → Verify in Bing.</p>
      <h4>Yahoo / Other Search Verification</h4><p>Use only when the service gives you a specific meta-verification value. Leave blank when no separate token is provided.</p>
      <h4>${link('https://webmaster.yandex.com/','Yandex Verification')}</h4><p>Yandex Webmaster → add site → meta-tag verification → copy the verification value → paste → Save → Verify.</p>
      <div class="uc-warning"><strong>Verification rejected?</strong> Paste only the value expected by the field—do not add extra quotation marks or the whole HTML tag unless the provider specifically requires it.</div>`,

    banners:`<h3>Add Home Banner — Complete Guide</h3>
      <ol><li><strong>Header:</strong> the main banner headline. Keep it short enough to stay readable on desktop and mobile.</li><li><strong>Text:</strong> the supporting sentence shown with the banner.</li><li><strong>Desktop banner image:</strong> use the recommended wide image. This becomes the desktop background.</li><li><strong>Mobile banner image:</strong> upload a separate portrait image so important subjects are not cropped on phones.</li><li><strong>Banner destination:</strong> handled automatically by the website. Product placement is controlled separately from <strong>Sales → Product Display</strong>.</li><li><strong>Badge:</strong> short attention label such as <em>Launch Offer</em>.</li><li><strong>Status:</strong> Visible publishes the banner; Hidden keeps it saved without showing it.</li></ol>
      <div class="uc-example"><strong>Example:</strong> Create the banner with its headline, text and images. Use <strong>Sales → Product Display</strong> separately when you want to choose where membership plans appear.</div>
      <div class="uc-warning"><strong>Banner looks wrong?</strong> Use separate desktop/mobile images and the crop editor rather than forcing one image into both shapes.</div>`,

    productDisplay:`<h3>Product Display — Exact Workflow</h3>
      <p class="uc-help-lead">This page does not create a new plan. It controls where an already-created plan or offer appears on the public website.</p>
      <ol><li>First go to <strong>Sales → Plans & Offers</strong> and create/save the plan.</li><li>Return to <strong>Sales → Product Display</strong>.</li><li>Tick the required plan(s) under <strong>Select Plans / Offers</strong>.</li><li>Tick the public page(s) where the plan should appear.</li><li>Use the correct <strong>Section key</strong>: <strong>featured</strong> for the Home Page featured area, <strong>memberships</strong> for the Membership Page, or <strong>festival</strong> for Festival Offers.</li><li>Click <strong>Add Selected Products to Pages</strong>.</li><li>Confirm the placement under <strong>Current Product Display</strong> and preview the page.</li></ol>
      <div class="uc-example"><strong>Example:</strong> Starter Access → Home Page → section key <strong>featured</strong> → Add Selected Products to Pages.</div>
      <div class="uc-warning"><strong>Plan not visible?</strong> Confirm the plan Status is Active, the placement row is Active, the correct section key is used, then refresh the public page. Removing a placement does not delete the plan itself.</div>`,

    razorpay:`<h3>Razorpay — Integration Guide</h3>
      <p class="uc-help-lead">Use the live Razorpay credentials only when the account is approved and you are ready to accept real payments.</p>
      <ol><li>Sign in to ${link('https://dashboard.razorpay.com/','Razorpay Dashboard')} and switch to the required Test/Live mode.</li><li>Open <strong>Account & Settings → API Keys</strong> and generate/copy the <strong>Key ID</strong> and <strong>Key Secret</strong>.</li><li>Paste Key ID here. Paste Key Secret only when setting/changing it; afterwards the saved secret stays masked.</li><li>Open <strong>Account & Settings → Webhooks</strong>, create/edit a webhook, and paste the <strong>Webhook URL</strong> shown in this card.</li><li>Create a separate webhook secret in Razorpay and paste exactly the same value into <strong>Razorpay Webhook Secret</strong>. Do not reuse the API Key Secret.</li><li>For recurring subscriptions, enable these events: <strong>subscription.authenticated</strong>, <strong>subscription.activated</strong>, <strong>subscription.charged</strong>, <strong>subscription.updated</strong>, <strong>subscription.pending</strong>, <strong>subscription.halted</strong>, <strong>subscription.paused</strong>, <strong>subscription.resumed</strong>, <strong>subscription.cancelled</strong> and <strong>subscription.completed</strong>. Also enable <strong>payment.captured</strong> and <strong>payment.failed</strong> so payment outcomes are recorded promptly.</li><li>Enable Razorpay if it should be Primary, then click <strong>Save Razorpay</strong>.</li></ol>
      <div class="uc-example"><strong>Key format:</strong> Key ID commonly begins with <strong>rzp_test_</strong> or <strong>rzp_live_</strong>. The secret is private and should never be shared publicly.</div>
      <div class="uc-example"><strong>Why the webhook matters:</strong> API refresh can fetch current data on demand, while webhooks keep subscription/payment status, renewals and customer records updated automatically after Razorpay sends an event.</div>
      <div class="uc-warning"><strong>Payment/link fails?</strong> Check that the selected mode matches the keys, the account is enabled for Subscriptions, the saved secret is correct, the webhook URL is reachable, and the required events are selected.</div>`,

    phonepe:`<h3>PhonePe — Integration Guide</h3>
      <p class="uc-help-lead">PhonePe Standard Checkout uses the API credentials issued for your merchant integration. Keep Production selected only when you have the live credentials.</p>
      <ol><li>Use the PhonePe merchant/business onboarding credentials and the official ${link('https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-integration-website','PhonePe Standard Checkout documentation')}.</li><li><strong>Client ID:</strong> copy the Client ID supplied for the merchant/API integration.</li><li><strong>Client Version:</strong> copy the version supplied with those credentials. Keep the existing value only when it matches your PhonePe credential set.</li><li><strong>Client Secret:</strong> paste the private Client Secret supplied for the same Client ID.</li><li><strong>Merchant ID:</strong> fill it only when PhonePe supplied/requests it for your account or partner setup.</li><li><strong>Webhook Authentication:</strong> select the same authentication method configured for your PhonePe callback/webhook.</li><li>For HMAC, copy the corresponding webhook secret and Key/Webhook ID from the PhonePe webhook configuration. For SHA Username + Password, enter the matching webhook username/password configured for that callback.</li><li>Copy this website's <strong>Webhook URL</strong> into the PhonePe webhook/callback configuration.</li><li>Enable PhonePe as Primary or as the allowed Razorpay fallback, then click <strong>Save PhonePe</strong>.</li></ol>
      <div class="uc-warning"><strong>Do not guess credentials.</strong> Client ID, Client Secret, Client Version and any merchant/webhook credentials must match the values assigned/configured for your PhonePe account. If a field is not part of your approved setup, leave it blank unless PhonePe requires it.</div>`,

    stripe:`<h3>Stripe — Integration Guide</h3>
      <p class="uc-help-lead">Use Stripe keys from the same mode—Test with Test, Live with Live—and never expose the Secret Key publicly.</p>
      <ol><li>Open ${link('https://dashboard.stripe.com/apikeys','Stripe Dashboard → API keys')}.</li><li>Copy the <strong>Publishable Key</strong> and paste it into Stripe Publishable Key.</li><li>Reveal/copy the matching <strong>Secret Key</strong> and paste it into Stripe Secret Key.</li><li>Open ${link('https://dashboard.stripe.com/webhooks','Stripe Webhooks')} and create/select the endpoint for this website.</li><li>Paste the <strong>Webhook URL</strong> shown in this card into Stripe.</li><li>Open that endpoint's signing secret and paste the <strong>Webhook Signing Secret</strong> (normally begins with <strong>whsec_</strong>) into Stripe Webhook Secret.</li><li>Enable Stripe as Primary or permitted fallback, then click <strong>Save Stripe</strong>.</li></ol>
      <div class="uc-example"><strong>Typical prefixes:</strong> pk_test_/pk_live_ for publishable keys, sk_test_/sk_live_ for secret keys, whsec_ for webhook signing secrets.</div>
      <div class="uc-warning"><strong>Webhook signature error?</strong> Confirm you copied the signing secret for this exact endpoint and mode. A Stripe API Secret Key is not the webhook signing secret.</div>`
  };

  function direct(el,selector){return el?.querySelector(`:scope > ${selector}`)||null;}
  function updateInfoBody(host,html){const body=direct(host,'.uc-info-back-panel')?.querySelector('.uc-info-back-body');if(body)body.innerHTML=html;}
  function ensureInfoDetails(details,html){
    if(!details)return;
    if(details.dataset.ucInfoFlip){updateInfoBody(details,html);return;}
    window.ucMakeInfoDetails?.(details,html);
  }
  function ensureInfoCard(card,html){
    if(!card)return;
    if(card.dataset.ucInfoFlip){updateInfoBody(card,html);return;}
    window.ucMakeInfoCard?.(card,html);
  }

  function repairWrongCardHelperOnDetails(details,html){
    if(!details)return;
    if(details.classList.contains('uc-info-host')&&!details.classList.contains('uc-info-detail')){
      direct(details,'.uc-info-toolbar')?.remove();
      direct(details,'.uc-info-back-panel')?.remove();
      delete details.dataset.ucInfoFlip;
      details.classList.remove('uc-info-host','uc-info-open');
    }
    ensureInfoDetails(details,html);
  }

  function fixThemeHelpPlacement(){
    const d=$('#settings details.uc-v7-theme-details');if(!d)return;
    const toolbar=direct(d,'.uc-detail-info-toolbar');
    if(toolbar)toolbar.classList.add('uc-v8-theme-help-toolbar');
  }

  function fixBannerHelp(){
    const d=$('#banners details.admin-collapsed-card');
    repairWrongCardHelperOnDetails(d,HELP.banners);
  }

  function fixTrackingHelp(){
    const details=$$('#tracking > details.pay-detail, #tracking details.pay-detail');
    details.forEach(d=>{
      const title=d.querySelector(':scope > summary')?.textContent||'';
      if(/Google and Meta Tracking/i.test(title))ensureInfoDetails(d,HELP.trackingGoogle);
      if(/Other Ad Pixels/i.test(title))ensureInfoDetails(d,HELP.trackingOther);
    });
  }

  function fixProductDisplayHelp(){
    const card=$('#placements .placement-section-card')||$('#placements .card');
    ensureInfoCard(card,HELP.productDisplay);
  }

  function fixPlanModalHelpPlacement(){
    const card=$('#productModal .modal-card');if(!card)return;
    const toolbar=direct(card,'.uc-info-toolbar'),top=direct(card,'.top');
    if(toolbar&&top&&!toolbar.closest('.top')){
      const close=top.querySelector('button');
      toolbar.classList.add('uc-v8-inline-info-toolbar','uc-v8-plan-info-toolbar');
      if(close)top.insertBefore(toolbar,close);else top.appendChild(toolbar);
    }
  }

  function fixDashboardHelpPlacement(){
    $$('#dashboard .dashboard-block').forEach(block=>{
      const title=block.querySelector('h2')?.textContent?.trim()||'';
      const toolbar=direct(block,'.uc-info-toolbar');if(!toolbar)return;
      if(/Subscriptions Overview/i.test(title)){
        const controls=block.querySelector('.uc-sub-overview-controls');
        if(controls&&!toolbar.closest('.uc-sub-overview-controls')){
          toolbar.classList.add('uc-v8-inline-info-toolbar','uc-v8-dashboard-inline-info');controls.appendChild(toolbar);
        }
      }else if(/Payments Overview/i.test(title)){
        const head=block.querySelector('.block-head');
        if(head&&!head.querySelector('.uc-v8-payment-head-actions')){
          const actions=document.createElement('div');actions.className='uc-v8-payment-head-actions';
          const refresh=[...head.children].find(x=>x.matches?.('button'));
          if(refresh)actions.appendChild(refresh);
          toolbar.classList.add('uc-v8-inline-info-toolbar','uc-v8-dashboard-inline-info');actions.appendChild(toolbar);head.appendChild(actions);
        }else if(head){const actions=head.querySelector('.uc-v8-payment-head-actions');if(actions&&!toolbar.closest('.uc-v8-payment-head-actions'))actions.appendChild(toolbar);}
      }
    });
  }

  function fixPaymentHelp(){
    const map={razorpay:HELP.razorpay,phonepe:HELP.phonepe,stripe:HELP.stripe};
    Object.entries(map).forEach(([key,html])=>ensureInfoDetails($(`#payments details[data-pay-detail="${key}"]`),html));
  }

  function enhanceAll(){
    fixThemeHelpPlacement();fixBannerHelp();fixTrackingHelp();fixProductDisplayHelp();fixPlanModalHelpPlacement();fixDashboardHelpPlacement();fixPaymentHelp();
  }

  /* Re-run after the dynamic panels rebuild themselves. */
  const wrapAsync=(name,after)=>{
    const old=window[name];if(typeof old!=='function'||old.__ucV8Wrapped)return;
    const fn=async function(){const r=await old.apply(this,arguments);setTimeout(after,30);return r;};fn.__ucV8Wrapped=true;window[name]=fn;
  };
  const wrapSync=(name,after)=>{
    const old=window[name];if(typeof old!=='function'||old.__ucV8Wrapped)return;
    const fn=function(){const r=old.apply(this,arguments);setTimeout(after,30);return r;};fn.__ucV8Wrapped=true;window[name]=fn;
  };

  wrapAsync('load_tracking',fixTrackingHelp);
  wrapAsync('load_placements',fixProductDisplayHelp);
  wrapAsync('load_payments',fixPaymentHelp);
  wrapSync('newProduct',()=>{fixPlanModalHelpPlacement();});
  wrapSync('editProduct',()=>{fixPlanModalHelpPlacement();});

  let timer=null;
  const mo=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(enhanceAll,90);});
  function init(){enhanceAll();mo.observe(document.body,{childList:true,subtree:true});setTimeout(enhanceAll,700);setTimeout(enhanceAll,1800);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,260));else setTimeout(init,260);
})();
