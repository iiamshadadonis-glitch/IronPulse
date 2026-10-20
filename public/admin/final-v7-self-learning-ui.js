/* Final V7 additive self-learning UI, theme preview, About cover, and layout cleanup.
   Existing project logic remains authoritative; this file only enhances the requested surfaces. */
(function(){
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ORIGINAL={primary:'#4B55BE',accent:'#A469A8',palette:'custom'};
  const PREVIEW_KEY='uc_theme_preview_v7';
  let previewTimer=null;

  function toast(text,type='success'){
    if(window.ucAdminToast)return window.ucAdminToast(text,type);
    const e=document.createElement('div');e.className=type==='error'?'error':'notice success';e.textContent=text;
    document.body.appendChild(e);setTimeout(()=>e.remove(),3200);
  }
  function apiJson(path,options={}){
    if(window.api)return window.api(path,options);
    return fetch(path,{credentials:'same-origin',headers:{'content-type':'application/json',...(options.headers||{})},...options})
      .then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d;});
  }
  function validHex(v){return /^#[0-9a-f]{6}$/i.test(String(v||'').trim());}
  function normHex(v,f){v=String(v||'').trim();if(!v.startsWith('#'))v='#'+v;return validHex(v)?v.toUpperCase():f;}
  function hexToRgb(hex){hex=normHex(hex,'#000000').slice(1);return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)];}
  function rgbToHex(r,g,b){return '#'+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('').toUpperCase();}
  function rgbToHsl([r,g,b]){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;let h=0,s=0;if(d){s=l>.5?d/(2-max-min):d/(max+min);if(max===r)h=(g-b)/d+(g<b?6:0);else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;}return [h,s*100,l*100];}
  function hslToHex(h,s,l){h=((Number(h)%360)+360)%360;s=Math.max(0,Math.min(100,Number(s)))/100;l=Math.max(0,Math.min(100,Number(l)))/100;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}return rgbToHex((r+m)*255,(g+m)*255,(b+m)*255);}
  function selectArrowSvg(color){const c=encodeURIComponent(normHex(color,ORIGINAL.primary));return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Ccircle cx='14' cy='14' r='11.5' fill='none' stroke='${c}' stroke-width='1.8'/%3E%3Cpath d='M9.5 11.5 14 16l4.5-4.5' fill='none' stroke='${c}' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`; }

  function savedTheme(){
    const s=(window.A&&window.A.settings)||{};
    return {primary:normHex(s.primaryColor,ORIGINAL.primary),accent:normHex(s.accentColor,ORIGINAL.accent),palette:s.colorPaletteType||'custom'};
  }
  function applyAdminTheme(primary,accent){
    primary=normHex(primary,ORIGINAL.primary);accent=normHex(accent,ORIGINAL.accent);
    const root=document.documentElement.style,[h,s,l]=rgbToHsl(hexToRgb(primary));
    const original=primary===ORIGINAL.primary&&accent===ORIGINAL.accent;
    const dark=original?'#1A1A1A':hslToHex(h,Math.max(35,s),Math.max(10,Math.min(32,l*.42)));
    const mid=original?'#B11226':hslToHex(h,Math.max(38,Math.min(92,s)),Math.max(18,Math.min(48,l*1.38)));
    const highlight=original?'#A469A8':accent;
    root.setProperty('--blue',primary);root.setProperty('--blue-dark',dark);root.setProperty('--blue-mid',mid);
    root.setProperty('--gold',accent);root.setProperty('--sky',accent);root.setProperty('--pink',highlight);
    root.setProperty('--uc-v5-brand',primary);root.setProperty('--uc-admin-select-arrow',selectArrowSvg(primary));
  }
  function storePublicPreview(primary,accent,palette){
    const data={primary:normHex(primary,ORIGINAL.primary),accent:normHex(accent,ORIGINAL.accent),palette:palette||'custom',expiresAt:Date.now()+10*60*1000};
    try{localStorage.setItem(PREVIEW_KEY,JSON.stringify(data));}catch(_){}
  }
  function clearPublicPreview(){
    try{localStorage.removeItem(PREVIEW_KEY);}catch(_){}
  }
  function readThemeForm(){
    const form=$('#settings form');if(!form)return savedTheme();
    return {primary:normHex(form.elements.primaryColor?.value,ORIGINAL.primary),accent:normHex(form.elements.accentColor?.value,ORIGINAL.accent),palette:form.elements.colorPaletteType?.value||'custom'};
  }
  function previewThemeFromForm(){
    const t=readThemeForm();applyAdminTheme(t.primary,t.accent);storePublicPreview(t.primary,t.accent,t.palette);
    clearTimeout(previewTimer);previewTimer=setTimeout(()=>{clearPublicPreview();if($('#settings')?.classList.contains('active'))applyAdminTheme(...Object.values(savedTheme()).slice(0,2));},10*60*1000);
  }
  function restoreAdminSavedTheme(clearPublic=false){
    const t=savedTheme();applyAdminTheme(t.primary,t.accent);if(clearPublic)clearPublicPreview();
  }

  function updateHelpVisibility(){
    const enabled=(window.A?.settings?.adminHelpEnabled)!==false;
    document.body.classList.toggle('uc-admin-help-disabled',!enabled);
  }
  async function persistHelpSetting(enabled){
    try{
      const current={...(window.A?.settings||{})};current.adminHelpEnabled=!!enabled;
      const r=await apiJson('/api/admin/settings',{method:'POST',body:JSON.stringify(current)});
      if(window.A)window.A.settings=r.settings||current;
      updateHelpVisibility();
    }catch(e){toast(e.message||'Could not update information helper setting.','error');}
  }

  function infoBody(details,html){
    const body=details?.querySelector(':scope > .uc-info-back-panel .uc-info-back-body');
    if(body)body.innerHTML=html;
  }
  function makeInfoDetails(details,html){
    if(!details)return;
    if(details.dataset.ucInfoFlip){infoBody(details,html);return;}
    window.ucMakeInfoDetails?.(details,html);
  }
  function makeInfoCard(card,html){
    if(!card)return;
    if(card.dataset.ucInfoFlip){
      const body=card.querySelector(':scope > .uc-info-back-panel .uc-info-back-body');if(body)body.innerHTML=html;
      return;
    }
    window.ucMakeInfoCard?.(card,html);
  }
  const link=(url,label)=>`<a class="uc-help-link" href="${H(url)}" target="_blank" rel="noopener">${H(label)}</a>`;

  const HELP={
    maps:`<h3>Google Map — Contact Page</h3>
      <p class="uc-help-lead">Use this to show one or more office locations beneath the Contact form. The public map is hidden unless the main map toggle is on and at least one saved location is enabled.</p>
      <h4>Quick setup without an API key</h4><ol>
        <li>Open the business location in ${link('https://maps.google.com/','Google Maps')}.</li>
        <li>Choose <strong>Share → Embed a map</strong>, copy the iframe and paste it into <strong>Embed URL / iframe</strong>.</li>
        <li>Copy the normal public Maps/share link into <strong>Google Maps / Directions URL</strong>.</li>
        <li>Enter the branch name and full address.</li><li>Turn the location toggle on, then click <strong>Save Contact Map</strong>.</li></ol>
      <h4>Location controls</h4><ul><li><strong>Enabled:</strong> keeps the location saved and shows it publicly.</li><li><strong>Disabled:</strong> keeps the location saved but hides it from the website.</li><li><strong>Remove:</strong> removes that location from this configuration after you save.</li></ul>
      <h4>API-key method</h4><p>For an address/Place ID based embed, create a browser-restricted Maps Embed API key in ${link('https://console.cloud.google.com/google/maps-apis/','Google Cloud Maps Platform')}. Restrict it to your live domain.</p>
      <div class="uc-warning"><strong>Map missing?</strong> Check the main toggle, the individual location toggle, the embed URL/API key, and then save. A normal Google Maps share URL is for <em>Get Directions</em>; it is not the same as an embed URL.</div>`,
    reviews:`<h3>Google Reviews — Home Page</h3>
      <p class="uc-help-lead">Use this to show up to four high-rating Google review cards beneath Client Success Stories. The section stays hidden when disabled.</p>
      <h4>Places API — easiest</h4><ol><li>Open ${link('https://console.cloud.google.com/google/maps-apis/','Google Cloud Maps Platform')} and enable Places API (New).</li><li>Get the business Place ID and create a restricted API key.</li><li>Paste the Place ID, API key and public Google Maps/reviews URL.</li><li>Save and click <strong>Refresh Reviews Now</strong>.</li></ol>
      <h4>Business Profile — better newest-review control</h4><ol><li>Use a verified Google Business Profile.</li><li>Configure OAuth access for the Business Profile APIs.</li><li>Enter the OAuth Client ID, Client Secret, Refresh Token, Account ID and Location ID.</li><li>Save and test with <strong>Refresh Reviews Now</strong>.</li></ol>
      <h4>Display rules</h4><p>5-star reviews are preferred. If the 4-star fill option is enabled and fewer than four 5-star reviews are available in the fetched set, 4-star reviews may fill the remaining cards. Only four cards are shown; <strong>View All Reviews</strong> opens the Google Maps URL you saved.</p>
      <div class="uc-warning"><strong>Reviews not loading?</strong> A Google Maps URL alone cannot fetch review text. Verify the selected API connection, credentials and location/Place ID.</div>`,
    facebook:`<h3>Facebook Lead Forms — Setup</h3>
      <p class="uc-help-lead">This connection sends Facebook Lead Ads submissions into the existing Enquiries and Client Details CRM.</p>
      <ol><li>Open ${link('https://developers.facebook.com/apps/','Meta for Developers')} and create/select the app used for Lead Ads.</li>
      <li>Open the Facebook Page used by the ads and copy its numeric <strong>Page ID</strong>.</li>
      <li>Create a <strong>Page Access Token</strong> for a person/app that has the required Page and lead permissions. Meta recommends Page access tokens for Lead Ads syncing.</li>
      <li>In the app Webhooks setup, subscribe the Page to the <strong>leadgen</strong> field and paste the <strong>Lead Webhook URL</strong> shown in this card.</li>
      <li>Create your own private <strong>Webhook Verify Token</strong>; paste the same text here and in Meta's callback verification screen.</li>
      <li>Optional: enter comma-separated Lead Form IDs when you want to accept only specific forms. Leave blank to accept matching Page lead forms.</li>
      <li>Enable Facebook and save, then submit a Meta Lead Ads test lead and confirm it appears under Enquiries.</li></ol>
      <div class="uc-warning"><strong>No lead appears?</strong> Check Page permissions, Page access token, the app's lead access, Webhook <em>leadgen</em> subscription, verify token and whether the form ID is restricted here.</div>`,
    instagram:`<h3>Instagram Lead Forms — Setup</h3>
      <p class="uc-help-lead">Instagram Lead Ads use Meta lead infrastructure. Leads enter the same CRM; an Instagram username is stored only when the submitted form actually contains it.</p>
      <ol><li>Use an Instagram professional account linked to the Facebook/Meta Page used for the campaign.</li>
      <li>Open ${link('https://developers.facebook.com/apps/','Meta for Developers')} and use the same app/Page setup used for Lead Ads.</li>
      <li>Copy the <strong>Instagram Business Account ID</strong> and the <strong>Linked Meta Page ID</strong>.</li>
      <li>Use a valid Page Access Token and the same Meta lead webhook callback shown here.</li>
      <li>Create/use the same private verify-token value in Meta and this form.</li>
      <li>Optional: enter Instagram Lead Form IDs to label/filter the campaign source more precisely.</li>
      <li>Enable Instagram, save, and submit a test lead from the Instagram placement.</li></ol>
      <div class="uc-warning"><strong>Wrong source or missing Instagram ID?</strong> Confirm the Instagram professional account is linked to the correct Page. The website will never invent a username that Meta did not send.</div>`,
    whatsapp:`<h3>WhatsApp Webhook & Order OTP — Setup</h3>
      <p class="uc-help-lead">Use this for incoming WhatsApp activity and the existing order-tracking OTP sender.</p>
      <h4>WhatsApp Cloud API</h4><ol><li>Open ${link('https://developers.facebook.com/apps/','Meta for Developers')} and select the app with WhatsApp.</li><li>In WhatsApp API Setup, copy the <strong>Phone Number ID</strong>.</li><li>Create/use the access token for that WhatsApp business setup and paste it into <strong>WhatsApp Cloud Token</strong>.</li><li>Create a private <strong>Webhook Verify Token</strong> yourself and enter the same value in Meta's webhook setup.</li><li>Copy this card's Webhook URL into Meta, subscribe the needed WhatsApp webhook fields, save, then test an incoming message/OTP.</li></ol>
      <h4>GAPI</h4><p>If the existing OTP provider is GAPI, choose GAPI and enter the Instance ID and token supplied by that provider. Cloud API fields can remain unused.</p>
      <div class="uc-warning"><strong>OTP not sent?</strong> Confirm the selected OTP Provider matches the credentials entered, the token is active, the Phone Number ID is correct, and the webhook callback verifies successfully.</div>`,
    linkedin:`<h3>LinkedIn Lead Sync — Setup</h3>
      <p class="uc-help-lead">LinkedIn Lead Gen responses require LinkedIn Lead Sync access; normal Advertising API access alone is not enough.</p>
      <ol><li>Create/select the application in ${link('https://www.linkedin.com/developers/apps','LinkedIn Developers')}.</li><li>Request/confirm access to the <strong>Lead Sync API</strong> and the required lead-generation permissions.</li><li>Copy the application's <strong>Client ID</strong> and <strong>Client Secret</strong>.</li><li>Complete OAuth and paste an access token that has Lead Sync permission for the selected owner.</li><li>Select whether the form owner is a Sponsored Ad Account or Organization and enter its numeric ID.</li><li>Choose the Lead Type that matches the source.</li><li>Create a Lead Notification subscription through LinkedIn's Lead Sync API using the webhook URL shown here. Lead Sync webhook subscriptions are created through the API, not only the developer-portal UI.</li><li>Enable LinkedIn, save, and submit a test Lead Gen Form.</li></ol>
      <div class="uc-warning"><strong>No notifications?</strong> Confirm Lead Sync product approval, OAuth scopes/roles, owner ID, lead type, webhook validation and the notification subscription.</div>`,
    x:`<h3>X / Twitter Activity Webhook — Setup</h3>
      <p class="uc-help-lead">This card is for supported account activity/messages that can be turned into enquiries. It is not the same Lead Form workflow used by Meta or LinkedIn.</p>
      <ol><li>Open the ${link('https://developer.x.com/en/portal/dashboard','X Developer Portal')} and select/create your project/app.</li><li>Copy the bearer/API credentials required by your X access tier.</li><li>Enter the account User ID if the subscription is scoped to a specific account.</li><li>Use the Webhook URL shown in this card when configuring the supported account-activity/webhook subscription for your app.</li><li>Enable X / Twitter, save and test a supported message/mention event.</li></ol>
      <div class="uc-warning"><strong>Nothing arrives?</strong> Confirm that your X developer plan actually includes the webhook/account-activity feature you are configuring and that the app credentials and subscribed account match.</div>`,
    trackGoogle:`<h3>Google & Meta Tracking — Where to Get Each Value</h3>
      <h4>${link('https://analytics.google.com/','GA4 Measurement ID')}</h4><p>Google Analytics → Admin → Data streams → Web → open your website stream → copy the ID beginning with <strong>G-</strong>. Paste it here and enable GA4.</p>
      <h4>${link('https://tagmanager.google.com/','GTM Container ID')}</h4><p>Google Tag Manager → open your account/container → Workspace → copy the container ID beginning with <strong>GTM-</strong>. Paste it here and enable GTM.</p>
      <h4>${link('https://business.facebook.com/events_manager2/list','Meta Pixel ID')}</h4><p>Meta Events Manager → select/create the Web dataset/Pixel → copy its numeric dataset/Pixel ID. Paste it here and enable Meta Pixel.</p>
      <h4>${link('https://search.google.com/search-console','Search Console Verification')}</h4><p>Add the site as a Search Console property → choose the <strong>HTML tag</strong> verification method → copy the verification value/token and paste it here, then save and verify in Search Console.</p>
      <div class="uc-warning"><strong>No data after setup?</strong> Confirm the correct live domain/property, save the IDs, enable the relevant toggle, accept optional analytics cookies during testing, and use each platform's test/realtime tool.</div>`,
    trackOther:`<h3>Other Pixels & Search Verification — Setup</h3>
      <h4>${link('https://ads.snapchat.com/','Snapchat Pixel ID')}</h4><p>Snap Ads Manager → Pixels/Events → create or select the Snap Pixel → copy the Pixel ID → paste and enable it here.</p>
      <h4>${link('https://ads.x.com/','X / Twitter Pixel ID')}</h4><p>X Ads → Events/website conversion setup → create/select the website tag/pixel → copy the account's pixel/tag ID shown for that setup.</p>
      <h4>${link('https://www.linkedin.com/campaignmanager/','LinkedIn Partner ID')}</h4><p>Campaign Manager → Data → Signals Manager → Insight Tag → copy the <strong>Partner ID</strong> → paste and enable it here.</p>
      <h4>${link('https://ads.pinterest.com/','Pinterest Tag ID')}</h4><p>Pinterest Business → Conversions/Tag manager → create/open the Pinterest tag → copy the Tag ID → paste and enable it here.</p>
      <h4>${link('https://ads.reddit.com/','Reddit Pixel ID')}</h4><p>Reddit Ads → Events Manager → create/select the Reddit Pixel → copy the Pixel ID → paste and enable it here.</p>
      <h4>${link('https://www.bing.com/webmasters/','Bing Webmaster Verification')}</h4><p>Bing Webmaster Tools → add the site → choose the HTML meta-tag method → copy the verification content/value (often shown with <strong>msvalidate.01</strong>) and paste it here.</p>
      <h4>Yahoo / Other Search Verification</h4><p>Use this only when the search/service provider gives you a specific HTML meta verification value. If no separate token is provided, leave it blank.</p>
      <h4>${link('https://webmaster.yandex.com/','Yandex Verification')}</h4><p>Yandex Webmaster → add the site → choose the meta-tag verification method → copy the verification value and paste it here.</p>
      <div class="uc-warning"><strong>Verification fails?</strong> Save the exact token without extra quotes/HTML when this field expects only the value, then open the public homepage and confirm the generated verification meta tag is present before clicking Verify at the provider.</div>`,
    banners:`<h3>Add Home Banner — Complete Guide</h3>
      <ol><li><strong>Header:</strong> the main banner headline. Keep it short enough to remain readable over the image.</li>
      <li><strong>Text:</strong> supporting sentence beneath the headline.</li>
      <li><strong>Desktop banner image:</strong> full-width desktop background. Upload the recommended landscape image and use the crop editor when prompted.</li>
      <li><strong>Mobile banner image:</strong> separate portrait/mobile background so the subject is not cut off on phones.</li>
      <li><strong>Banner destination:</strong> handled automatically by the website. Use <strong>Sales → Product Display</strong> when you want to control where plans and offers appear.</li>
      <li><strong>Badge:</strong> small attention label shown with the banner, e.g. <em>Launch Offer</em>.</li>
      <li><strong>Status:</strong> Visible shows the banner; Hidden keeps it saved without displaying it.</li></ol>
      <div class="uc-example"><strong>Example:</strong> Create the banner with its headline, text and images. Use <strong>Sales → Product Display</strong> separately when you want to choose where membership plans appear.</div>
      <div class="uc-warning"><strong>Banner looks cropped incorrectly?</strong> Edit the banner and upload/crop separate desktop and mobile images instead of trying to use one image for both shapes.</div>`,
    dashboardBusiness:`<h3>Business Dashboard — What the Numbers Mean</h3>
      <ul><li><strong>Total Leads:</strong> active enquiry records that are still in the lead stage. A client with a matched successful subscription or one-time payment is excluded from the lead counts because that person has converted to a customer.</li><li><strong>Hot Leads:</strong> high-priority/interested leads are treated as Hot for a maximum of <strong>3 days</strong> from their latest lead update. If they do not convert within that window, they automatically stop appearing in Hot Leads, although the lead can remain in Total Leads until the admin records the next outcome.</li><li><strong>Active Subscribers:</strong> paid/active recurring-subscription customers. They should be handled as customers rather than sales leads.</li><li><strong>Recent Leads:</strong> active leads created during the latest <strong>7 days</strong>. Converted/closed leads and matched paid customers are excluded.</li><li><strong>Not Interested / closed outcomes:</strong> use Client Details to record the correct outcome instead of repeatedly following up. Archived client history stays available under Customers while the person is kept out of the active lead workflow according to the saved status.</li><li><strong>Requests:</strong> customer requests that are still <em>New</em> or <em>In Progress</em>. Resolved requests are not counted. Click the Requests card to open Orders & Leads → Requests directly on the <strong>In Progress</strong> work queue.</li><li><strong>Visitors:</strong> distinct website visitors tracked by the site's visitor system. Click the card to review the latest visitor journey, sources and pages.</li><li><strong>Repeat Visitors:</strong> visitors who returned more than once. Click the card to review repeat-only journeys.</li><li><strong>Top Source:</strong> the leading recorded referral/source; Direct/unknown means no reliable referral was available.</li></ul>
      <p><strong>Recommended workflow:</strong> work Hot Leads first, then Total/Recent Leads. Once payment succeeds, the matched phone/email record moves out of the lead workflow automatically. If a prospect is not proceeding, record the correct lead outcome so the admin does not waste time contacting the same person repeatedly.</p>
      <p>Click any clickable metric to open its client list. Use Client Details for the full profile, follow-up, order and payment actions.</p>
      <div class="uc-warning"><strong>Numbers look stale?</strong> Click Dashboard Refresh. Visitor/source totals depend on recorded visitor events, while lead/customer counts depend on CRM records and exact phone/email payment matching.</div>`,
    dashboardFollow:`<h3>Follow-ups Overview — Daily Workflow</h3>
      <ul><li><strong>Today's Follow-ups:</strong> clients whose next follow-up date is today.</li><li><strong>Tomorrow's Follow-ups:</strong> clients scheduled for tomorrow.</li><li><strong>Total Follow-ups Due:</strong> follow-ups that are due/pending and need attention.</li><li><strong>Inquiries:</strong> customer contact-form inquiries that are currently In Progress. Click this card to open only the inquiries that still need action; resolve an inquiry when the work is complete so it moves to the Resolved history instead of remaining in the working queue.</li></ul>
      <ol><li>Open the relevant card.</li><li>Click the client.</li><li>Contact them from Client Details using WhatsApp/Gmail.</li><li>Add the follow-up result and set the next action/date.</li></ol>
      <div class="uc-warning">If a completed follow-up still appears due, update the client with the new follow-up date/status rather than deleting the history.</div>`,
    dashboardSubs:`<h3>Subscriptions Overview — How to Read It</h3>
      <p><strong>Period</strong> controls which activity is counted: Daily = today, Monthly = current month, Yearly = current year to today. Choose a period and click <strong>Apply</strong> to refresh the enabled payment-gateway data.</p>
      <ul><li><strong>Total Subscriptions:</strong> recurring subscriptions in scope.</li><li><strong>Active:</strong> currently active recurring customers.</li><li><strong>Successful Charges:</strong> successful recurring charges, including initial or renewal charges where applicable.</li><li><strong>New:</strong> subscriptions created in the selected period.</li><li><strong>Renewals:</strong> repeat successful recurring charges after the initial charge.</li><li><strong>Upcoming:</strong> next recurring charges expected within the configured upcoming window.</li><li><strong>Failed:</strong> unsuccessful recurring payment/subscription events needing attention.</li><li><strong>Cancelled:</strong> subscriptions cancelled in the selected period.</li></ul>
      <p>Click a metric for the detailed grid. Gateway-source labels identify where each record came from. The grid also shows Payment Mode (such as UPI, Card or Net Banking) and the UPI ID when the enabled gateway returns that value.</p>
      <div class="uc-warning">If the gateway is disabled, live data cannot be fetched from it. Enable the correct gateway in Settings → Integrations → Payments, then Apply again.</div>`,
    dashboardPayments:`<h3>Payments Overview — Order & Payment Workflow</h3>
      <ul><li><strong>Total Received:</strong> money actually confirmed as collected.</li><li><strong>Paid Orders:</strong> newly paid Trial, Subscription or One-Time orders that are still waiting for admin processing.</li><li><strong>Today Received:</strong> money confirmed today; the smaller line shows today's payment count.</li><li><strong>Total Orders:</strong> every order record across paid, pending and cancelled states.</li><li><strong>Pending Orders:</strong> payment requests where no money has been confirmed yet. Unpaid requests older than one hour move to Cancelled Orders on refresh.</li><li><strong>Existing Orders:</strong> paid orders already moved out of the New Orders work queue, including continuing customer/subscription records.</li><li><strong>Cancelled Orders:</strong> unpaid, failed or abandoned payment requests.</li><li><strong>Cancelled Subscriptions:</strong> customers who had already paid/authenticated and later cancelled or ended the recurring subscription.</li></ul>
      <p>Click a card to open the matching Orders section. <strong>Total Orders</strong> opens the Orders page with every section collapsed; <strong>Paid Orders</strong> opens New Orders directly.</p>
      <p>Payment webhooks and gateway refreshes keep these records current. Use <strong>Refresh Payments</strong> after a recent gateway event when you need the latest status.</p>
      <div class="uc-warning">For any amount dispute, Client Details → Payments should show the amount actually received and the actual recurring amount expected from the payment gateway, including enabled charges where applicable.</div>`,
    plans:`<h3>Add / Edit Plan or Offer — Field Guide</h3>
      <ul><li><strong>SKU:</strong> your internal unique stock/plan code, e.g. <em>UC-STARTER-199</em>. Keep it stable after launch.</li><li><strong>Name:</strong> customer-facing plan/offer name.</li><li><strong>Slug:</strong> clean URL/reference text, e.g. <em>starter-access</em>. Use lowercase words and hyphens.</li><li><strong>Status:</strong> Active can be used/displayed; Draft is for preparation; Archived keeps historical data without selling it.</li><li><strong>Short Description:</strong> compact card summary.</li><li><strong>Description:</strong> fuller explanation of the offer.</li><li><strong>Regular Price:</strong> normal/reference price.</li><li><strong>Offer Price:</strong> amount currently offered.</li><li><strong>Badge:</strong> short label such as <em>Popular</em> or <em>Launch Offer</em>.</li><li><strong>Eligibility:</strong> any customer eligibility note/restriction.</li><li><strong>Features:</strong> enter one feature per line.</li></ul>
      <h4>Recommended workflow</h4><ol><li>Create and save the plan.</li><li>Use the Images button to add up to three scrolling images.</li><li>Open Sales → Product Display and choose where this plan appears.</li><li>Preview the public page and checkout before advertising it.</li></ol>
      <div class="uc-warning"><strong>Plan not visible?</strong> Check Status = Active and then check Product Display. Creating the plan does not automatically place it on every page.</div>`,
    adsense:`<h3>Google AdSense — Setup</h3>
      <ol><li>Open ${link('https://www.google.com/adsense/','Google AdSense')} and use the approved website/account.</li><li><strong>Publisher ID:</strong> copy the value beginning with <em>ca-pub-</em> from your AdSense account information or supplied AdSense code.</li><li><strong>Header Code:</strong> copy the AdSense site/loader script Google instructs you to place in the page head.</li><li><strong>Body / Auto Ads Code:</strong> paste only when AdSense supplies an additional body/Auto Ads snippet; otherwise leave blank.</li><li><strong>Internal Notes:</strong> optional admin-only reminder such as approval date/account name.</li><li>Enable Google AdSense and save. Then verify the site in AdSense and allow time for ad review/serving.</li></ol>
      <div class="uc-warning"><strong>Ads not showing?</strong> Confirm the AdSense account/site is approved, the code belongs to the correct publisher, the integration is enabled, and browser/ad-blocking or consent settings are not preventing the test.</div>`,
    otherAds:`<h3>Other Ad Networks — Setup</h3>
      <p>Use only code supplied by the selected advertising network.</p>
      <ol><li>Open the chosen ad network's publisher dashboard.</li><li>Copy its site-wide <strong>header/script code</strong> into the matching Header Code field.</li><li>If the network provides a separate widget/body snippet, paste it into the Body Code field; otherwise leave it blank.</li><li>Enable only the network you actually want active and save.</li><li>Preview a public page and check that the network code loads without covering website content.</li></ol>
      <div class="uc-warning"><strong>Never paste unknown code.</strong> Third-party ad scripts execute on the public website. Use only code copied from the official publisher account for that network.</div>`,
    securityPassword:`<h3>Change Local Admin Password</h3><ol><li>Enter the current password used for the local admin login.</li><li>Enter a new password of at least the required length; use a unique password not reused elsewhere.</li><li>Click <strong>Change Password</strong>.</li><li>Sign out and sign back in once to confirm the new password works.</li></ol><div class="uc-warning">If the current password is rejected, do not keep guessing. Confirm you are using the local-password login method and the correct admin account.</div>`,
    securityEmail:`<h3>Change Admin Email</h3><ol><li>Enter the new email address.</li><li>Click <strong>Send Confirmation Code</strong>.</li><li>Open the new inbox and copy the confirmation code.</li><li>Paste it into Confirmation Code and click <strong>Confirm Email Change</strong>.</li></ol><div class="uc-warning">Do not change to an inbox you cannot access. The new address becomes part of the admin-login/security flow after confirmation.</div>`,
    securityGoogle:`<h3>Google Account Login</h3><ol><li>Save a Google OAuth Web Client ID and Client Secret in <strong>Settings → Integrations → Webinars</strong>.</li><li>Add the exact callback URL shown in Admin Security to that OAuth application's Authorized redirect URIs.</li><li>Click <strong>Connect Google Account</strong> and choose the administrator's account on Google's secure consent screen.</li><li>Use <strong>Sign in with Google</strong> on the public Login page.</li></ol><div class="uc-warning">Google Meet and Google account login use Google services but perform different jobs. Meet setup does not send admin email confirmation codes.</div>`,
    theme:`<h3>Website Colors — Safe Preview & Save</h3>
      <ul><li><strong>Primary Color:</strong> controls the main brand color used for major navigation, buttons, headings and themed controls.</li><li><strong>Accent Color:</strong> supplies the supporting/highlight color.</li><li><strong>Palette Type:</strong> suggests a related accent color. Custom lets you control both independently.</li><li><strong>Hue / Saturation / Luminance:</strong> fine-tune the exact color without knowing HEX codes.</li><li><strong>Current Preview:</strong> shows the selected primary/accent pair.</li><li><strong>Pre-built Themes:</strong> quick starting points; they are only previews until saved.</li><li><strong>Reset Colors:</strong> previews the original designer colors. Click Save Settings only when you want that reset to become permanent.</li></ul>
      <h4>Preview safety</h4><p>Changing a color immediately previews it in this admin screen and stores a temporary public-site preview for up to <strong>10 minutes</strong>. Leaving Site Settings restores the admin panel to the last saved colors. Logging out or using Reset/clear preview removes the temporary public preview. Nothing becomes permanent until <strong>Save Settings</strong> succeeds.</p>
      <div class="uc-example"><strong>Safe way to explore:</strong> click Ocean → open the public home page in another tab → review the look → return here. Save only if you want to keep it.</div>`,
    homepage:`<h3>Business Dashboard — How to Use This Page</h3><p>This page is your daily control center. Start with leads and follow-ups, then check subscription/payment activity.</p><ol><li>Review new/hot leads and open Client Details for action.</li><li>Complete today's follow-ups and schedule the next step.</li><li>Apply the required Subscription period when checking recurring activity.</li><li>Refresh Payments when validating a recent payment.</li></ol><p>The four sections below each have their own help button for the meaning of every metric.</p>`
  };

  function formatDuration(ms){
    let sec=Math.max(0,Math.floor(Number(ms||0)/1000));
    const month=Math.floor(sec/(30*86400));sec%=30*86400;
    const day=Math.floor(sec/86400);sec%=86400;
    const hour=Math.floor(sec/3600);sec%=3600;
    const minute=Math.floor(sec/60);sec%=60;
    const parts=[];if(month)parts.push(`${month} mo`);if(day)parts.push(`${day} d`);if(hour)parts.push(`${hour} h`);if(minute)parts.push(`${minute} m`);if(sec||!parts.length)parts.push(`${sec} s`);return parts.join(' ');
  }

  /* Favorites: intentionally compact. Full information remains in Client Details. */
  window.load_favorites=async function(){
    const box=$('#ucFavoritesTable');if(!box)return;
    box.innerHTML='<div class="notice">Loading favorite clients…</div>';
    try{
      const q=$('#ucFavSearch')?.value||'',r=await apiJson('/api/admin/favorites'+(q?`?q=${encodeURIComponent(q)}`:'')),rows=r.rows||[];
      box.innerHTML=rows.length?`<table class="table fixed-table uc-favorites-table uc-favorites-table-v7"><thead><tr><th>Favorite Client</th><th>WhatsApp</th><th>Next Action</th></tr></thead><tbody>${rows.map(x=>`<tr><td><button class="link-button uc-fav-name uc-fav-name-v7" type="button" onclick="openClientDetails('lead:${Number(x.id)}')"><span class="uc-fav-badge">FAV</span><span>${H(x.name||'Client')}</span></button></td><td class="nowrap">${H(x.phone||'-')}</td><td>${H(x.next_action||'-')}</td></tr>`).join('')}</tbody></table>`:'<div class="notice">No favorite clients yet. Open Client Details and switch Favorite on.</div>';
    }catch(e){box.innerHTML=`<div class="error">${H(e.message||'Could not load Favorites.')}</div>`;}
  };

  function gmailUrl(address){
    const email=String(address||'').trim();
    return email?`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`:'';
  }
  function forceGmailLinks(scope=document){
    $$('a[href^="mailto:"]',scope).forEach(a=>{
      const raw=decodeURIComponent(String(a.getAttribute('href')||'').replace(/^mailto:/i,'').split('?')[0]||'').trim();
      if(!raw)return;a.href=gmailUrl(raw);a.target='_blank';a.rel='noopener';a.title='Compose in Gmail';
    });
  }

  function switchLocationCheckboxes(){
    $$('#ucMapLocations .uc-map-location').forEach(card=>{
      const head=card.querySelector('.uc-map-location-head>div');const input=head?.querySelector('[data-map-field="enabled"]');if(!head||!input||input.closest('.uc-v7-location-toggle'))return;
      const old=input.closest('label');const wrap=document.createElement('label');wrap.className='uc-v7-location-toggle';
      wrap.innerHTML='<span class="switch"><span class="slider"></span></span><strong>Enabled</strong>';
      const sw=wrap.querySelector('.switch');sw.insertBefore(input,sw.firstChild);
      old?.replaceWith(wrap);
    });
  }

  function enhanceMaps(){
    const a=$('#ucContactMapDetails'),b=$('#ucReviewsDetails');
    if(a)infoBody(a,HELP.maps);if(b)infoBody(b,HELP.reviews);
    switchLocationCheckboxes();
  }

  function enhanceSocialHelp(){
    const map={facebook:HELP.facebook,instagram:HELP.instagram,whatsapp:HELP.whatsapp,linkedin:HELP.linkedin,x:HELP.x};
    Object.entries(map).forEach(([key,help])=>makeInfoDetails($(`#socialMediaIntegrations [data-social-card="${key}"]`),help));
  }

  function wrapTrackingGroups(){
    const form=$('#tracking form');if(!form||form.dataset.ucV7TrackingHelp)return;
    form.dataset.ucV7TrackingHelp='1';
    const heads=$$('#tracking form > h3');
    const first=heads.find(h=>/Google and Meta Tracking/i.test(h.textContent||'')),second=heads.find(h=>/Other Ad Pixels/i.test(h.textContent||''));
    function wrap(head,stop,help,cls){
      if(!head||head.closest('.uc-v7-tracking-group'))return;
      const host=document.createElement('section');host.className='uc-v7-tracking-group '+cls;
      head.parentNode.insertBefore(host,head);
      let n=head;while(n&&n!==stop){const next=n.nextSibling;host.appendChild(n);n=next;}
      makeInfoCard(host,help);
    }
    wrap(first,second,HELP.trackGoogle,'uc-v7-track-google');
    const stop=$('#tracking .setup-note')||$('#tracking .form-actions');
    wrap(second,stop,HELP.trackOther,'uc-v7-track-other');
  }

  function enhanceBannerHelp(){
    const form=$('#bannerForm'),card=form?.closest('.card');makeInfoCard(card,HELP.banners);
  }

  function enhanceDashboardHelp(){
    const blocks=$$('#dashboard .dashboard-block');if(!blocks.length)return;
    const find=t=>blocks.find(b=>new RegExp(t,'i').test(b.querySelector('h2')?.textContent||''));
    makeInfoCard(find('Business Dashboard'),HELP.dashboardBusiness);
    makeInfoCard(find('Follow-ups Overview'),HELP.dashboardFollow);
    makeInfoCard(find('Subscriptions Overview'),HELP.dashboardSubs);
    makeInfoCard(find('Payments Overview'),HELP.dashboardPayments);
  }

  function enhancePlanModal(){
    makeInfoCard($('#productModal .modal-card'),HELP.plans);
  }

  function enhanceAdsHelp(){
    makeInfoDetails($('#adsenseCard')||[...$$('#adIntegrations details')].find(d=>/Google AdSense/i.test(d.querySelector('summary')?.textContent||'')),HELP.adsense);
    makeInfoDetails($('#otherAdNetworksCard')||[...$$('#adIntegrations details')].find(d=>/Other Ad Networks/i.test(d.querySelector('summary')?.textContent||'')),HELP.otherAds);
  }

  function enhanceSecurityHelp(){
    const cards=$$('#security .card');
    const find=t=>cards.find(c=>new RegExp(t,'i').test(c.querySelector('h3')?.textContent||''));
    makeInfoCard(find('Change Local Admin Password'),HELP.securityPassword);
    makeInfoCard(find('Change Admin Email'),HELP.securityEmail);
    makeInfoCard(find('Google Login'),HELP.securityGoogle);
  }

  function enhanceAuditionHelp(){
    const details=$$('#blogs details.admin-collapsed-card');
    const post=details.find(d=>/Post New Audition Update/i.test(d.querySelector('summary')?.textContent||''));
    if(post){
      infoBody(post,`<h3>Post New Audition Update — Field Guide</h3>
      <ul><li><strong>Audition Title:</strong> main article heading. Write the casting opportunity clearly.</li>
      <li><strong>Link Extension (Optional):</strong> use lowercase words separated by hyphens, such as <strong>casting-call-big-banner-movie</strong>. Do not type slashes. If left blank, the Audition Title is automatically converted into the link extension.</li>
      <li><strong>Tags:</strong> comma-separated keywords used to organize/filter the article.</li>
      <li><strong>Short Summary:</strong> one useful preview sentence for article listings and fallback search/share description.</li>
      <li><strong>Audition Details:</strong> full article: role, age range, city, requirements, dates, contact instructions and any safety note.</li>
      <li><strong>Cover Image URL:</strong> large public image shown below the article title and above its content. Use a direct image/CDN URL that opens without login.</li>
      <li><strong>Status:</strong> Draft keeps it unpublished; Published makes it available according to the current publishing rules.</li>
      <li><strong>Automatic Ads:</strong> lets enabled website ad integrations place ads automatically. Turn it off for an ad-free article or when placing controlled manual/custom ads.</li></ul>
      <div class="uc-example"><strong>Link example:</strong> title “Hyderabad Web Series Casting” → optional link extension <strong>hyderabad-web-series-casting</strong>. Leaving the field blank creates the link extension from the title automatically.</div>
      <div class="uc-warning"><strong>Before publishing:</strong> preview the title, cover image and article details. If the image is blank, confirm the URL is a direct public image rather than a private share page.</div>`);
    }
  }

  function enhanceCheckoutExisting(){
    /* Deliberately do not add another helper. Only re-apply the user's global helper visibility. */
    updateHelpVisibility();
  }

  function enhanceHomeInfo(){
    /* The four large dashboard sections carry the guidance to keep the metric grid clean. */
    enhanceDashboardHelp();
  }

  function aboutMediaMarkup(page){
    return `<div class="uc-v7-about-media">
      <div class="uc-v7-about-media-head"><div><strong>About Us Cover Image Optional</strong><small>Shown after the first paragraph on the public About Us page.</small></div></div>
      <div class="row"><div class="field"><label>Cover Image URL Optional</label><input data-page-field="cover_image_url" value="${H(page?.cover_image_url||'')}" placeholder="https://cdn.example.com/about-team.webp"><small class="hint">Paste a public direct image/CDN URL, or upload an image in the next field.</small></div>
      <div class="field"><label>Upload Cover Image Optional</label><input data-about-cover-file type="file" accept="image/webp,image/jpeg,image/png,image/svg+xml"><small class="hint">When saved, the crop editor opens so you can zoom, move or fit the image. Recommended frame: 1200 × 800 px. Max 900 KB after crop.</small></div></div>
      <div class="field"><label>Image Alt Text Optional</label><input data-page-field="cover_image_alt" value="${H(page?.cover_image_alt||'')}" placeholder="DropBeat Dance Studio team / office"><small class="hint">Short description for accessibility. If blank, the About Us page title is used.</small></div>
      <div class="uc-v7-about-preview">${page?.cover_image_url?`<img src="${H(page.cover_image_url)}" alt="${H(page.cover_image_alt||page.title||'About Us')}">`:'<small>No About Us cover image saved yet.</small>'}</div>
    </div>`;
  }

  function enhancePages(){
    const about=[...$$('#pages .page-editor')].find(d=>d.querySelector('[data-page-field="page_key"]')?.value==='about');
    if(about&&!about.querySelector('.uc-v7-about-media')){
      const page=(window.A?.pages||[]).find(p=>p.page_key==='about')||{};
      const titleField=about.querySelector('[data-page-field="title"]')?.closest('.field');
      titleField?.insertAdjacentHTML('afterend',aboutMediaMarkup(page));
      const url=about.querySelector('[data-page-field="cover_image_url"]');
      url?.addEventListener('input',()=>{const pv=about.querySelector('.uc-v7-about-preview'),v=url.value.trim();pv.innerHTML=v?`<img src="${H(v)}" alt="About Us cover preview">`:'<small>No About Us cover image selected.</small>';});
    }
  }

  async function prepareAboutUpload(){
    const about=[...$$('#pages .page-editor')].find(d=>d.querySelector('[data-page-field="page_key"]')?.value==='about');
    const input=about?.querySelector('[data-about-cover-file]');const file=input?.files?.[0];if(!file)return true;
    if(!/^image\//.test(file.type||'')){toast('Choose a valid image file for the About Us cover.','error');return false;}
    let out=file;
    if(file.type!=='image/svg+xml'){
      if(!window.ucOpenCropper){toast('Image editor is still loading. Refresh once and try again.','error');return false;}
      out=await window.ucOpenCropper(file,1200,800,'About Us cover image',900*1024);
      if(!out)return false;
    }else if(file.size>900*1024){toast('About Us SVG must be 900 KB or smaller.','error');return false;}
    const fd=new FormData();fd.set('file',out);fd.set('purpose','about-cover');
    const res=await fetch('/api/admin/page-media',{method:'POST',body:fd,credentials:'same-origin'});const data=await res.json().catch(()=>({}));
    if(!res.ok){toast(data.error||'About Us cover image could not be uploaded.','error');return false;}
    const url=about.querySelector('[data-page-field="cover_image_url"]');if(url)url.value=data.url||'';
    input.value='';
    const pv=about.querySelector('.uc-v7-about-preview');if(pv&&data.url)pv.innerHTML=`<img src="${H(data.url)}" alt="About Us cover preview">`;
    return true;
  }

  function enhanceThemeBuilder(){
    const builder=$('#settings .uc-theme-builder');if(!builder)return;
    let details=builder.closest('details.uc-v7-theme-details');
    if(!details){
      details=document.createElement('details');details.className='uc-v7-theme-details card admin-collapsed-card';details.open=false;
      const summary=document.createElement('summary');summary.textContent='Website Colors';
      builder.parentNode.insertBefore(details,builder);details.append(summary,builder);
      const head=builder.querySelector('.uc-theme-builder-head h3');if(head)head.textContent='Website Colors';
      makeInfoDetails(details,HELP.theme);
    } else infoBody(details,HELP.theme);

    /* Replace V5 Reset button to remove its old immediate-save handler. Reset now previews only. */
    const oldReset=builder.querySelector('.uc-theme-reset');
    if(oldReset&&!oldReset.dataset.ucV7Reset){
      const b=oldReset.cloneNode(true);b.dataset.ucV7Reset='1';oldReset.replaceWith(b);
      b.addEventListener('click',()=>{
        const form=$('#settings form');if(!form)return;
        form.elements.primaryColor.value=ORIGINAL.primary;form.elements.accentColor.value=ORIGINAL.accent;
        if(form.elements.colorPaletteType)form.elements.colorPaletteType.value=ORIGINAL.palette;
        form.querySelectorAll('.uc-color-editor').forEach(f=>f.ucSyncColor?.());
        previewThemeFromForm();toast('Original designer colors are previewing. Click Save Settings only if you want to keep them.','success');
      });
    }

    if(!builder.dataset.ucV7Preview){
      builder.dataset.ucV7Preview='1';
      builder.addEventListener('input',e=>{if(e.target.matches('input[name="primaryColor"],input[name="accentColor"],input[type="range"]'))setTimeout(previewThemeFromForm,0);});
      builder.addEventListener('change',e=>{if(e.target.matches('select[name="colorPaletteType"],input[name="primaryColor"],input[name="accentColor"]'))setTimeout(previewThemeFromForm,0);});
      builder.addEventListener('click',e=>{if(e.target.closest('.uc-theme-preset'))setTimeout(previewThemeFromForm,30);});
    }

    const form=$('#settings form');
    if(form&&!form.querySelector('.uc-v7-help-master')){
      const row=document.createElement('div');row.className='uc-v7-help-master';
      row.innerHTML=`<div><strong>Admin Information Help</strong><small>Show the themed information buttons throughout the admin panel. This is enabled by default.</small></div><label class="switch"><input id="ucAdminHelpEnabled" type="checkbox"><span class="slider"></span></label>`;
      const actions=form.querySelector('.form-actions');actions?.parentNode.insertBefore(row,actions);
      const input=row.querySelector('input');input.checked=(window.A?.settings?.adminHelpEnabled)!==false;
      input.addEventListener('change',()=>persistHelpSetting(input.checked));
    }
    updateHelpVisibility();
  }

  function enhanceAll(){
    forceGmailLinks();
    enhanceMaps();enhanceSocialHelp();wrapTrackingGroups();enhanceBannerHelp();enhanceHomeInfo();enhancePlanModal();enhanceAdsHelp();enhanceSecurityHelp();enhanceAuditionHelp();enhancePages();enhanceThemeBuilder();enhanceCheckoutExisting();
    updateHelpVisibility();
  }

  /* Wrap dynamic functions so enhancements survive refresh/re-render. */
  const oldOpenClient=window.openClientDetails;
  if(typeof oldOpenClient==='function')window.openClientDetails=async function(){const r=await oldOpenClient.apply(this,arguments);setTimeout(()=>forceGmailLinks($('#ucClientModal')||document),0);return r;};

  const oldLoadMaps=window.load_mapsReviews;
  if(typeof oldLoadMaps==='function')window.load_mapsReviews=async function(){const r=await oldLoadMaps.apply(this,arguments);setTimeout(enhanceMaps,0);return r;};
  const oldAddLocation=window.addUCMapLocation;
  if(typeof oldAddLocation==='function')window.addUCMapLocation=function(){const r=oldAddLocation.apply(this,arguments);setTimeout(switchLocationCheckboxes,0);return r;};

  const oldSocial=window.load_socialMediaIntegrations;
  if(typeof oldSocial==='function')window.load_socialMediaIntegrations=async function(){const r=await oldSocial.apply(this,arguments);setTimeout(enhanceSocialHelp,0);return r;};

  const oldAds=window.load_adIntegrations;
  if(typeof oldAds==='function')window.load_adIntegrations=async function(){const r=await oldAds.apply(this,arguments);setTimeout(enhanceAdsHelp,0);return r;};

  const oldPages=window.load_pages;
  if(typeof oldPages==='function')window.load_pages=async function(){const r=await oldPages.apply(this,arguments);setTimeout(enhancePages,0);return r;};

  const oldPayload=window.pagePayload;
  if(typeof oldPayload==='function')window.pagePayload=function(key){
    const p=oldPayload.apply(this,arguments);if(!p||key!=='about')return p;
    const ed=[...$$('#pages .page-editor')].find(d=>d.querySelector('[data-page-field="page_key"]')?.value==='about');
    p.cover_image_url=ed?.querySelector('[data-page-field="cover_image_url"]')?.value?.trim()||'';
    p.cover_image_alt=ed?.querySelector('[data-page-field="cover_image_alt"]')?.value?.trim()||'';
    return p;
  };
  const oldSavePage=window.savePage;
  if(typeof oldSavePage==='function')window.savePage=async function(key){
    if(key==='about'){const ok=await prepareAboutUpload();if(!ok)return;}
    return oldSavePage.apply(this,arguments);
  };
  const oldSaveAll=window.saveAllPages;
  if(typeof oldSaveAll==='function')window.saveAllPages=async function(){
    const ok=await prepareAboutUpload();if(!ok)return;
    return oldSaveAll.apply(this,arguments);
  };

  const oldSaveSettings=window.saveSettings;
  if(typeof oldSaveSettings==='function')window.saveSettings=async function(){
    const r=await oldSaveSettings.apply(this,arguments);
    clearPublicPreview();
    if(window.A?.settings){window.A.settings.colorPaletteType=$('#settings form [name="colorPaletteType"]')?.value||window.A.settings.colorPaletteType||'custom';}
    restoreAdminSavedTheme(false);return r;
  };

  const oldLogout=window.logoutAdmin;
  if(typeof oldLogout==='function')window.logoutAdmin=function(){clearPublicPreview();restoreAdminSavedTheme(false);return oldLogout.apply(this,arguments);};

  const oldNewProduct=window.newProduct;
  if(typeof oldNewProduct==='function')window.newProduct=function(){const r=oldNewProduct.apply(this,arguments);setTimeout(enhancePlanModal,0);return r;};
  const oldEditProduct=window.editProduct;
  if(typeof oldEditProduct==='function')window.editProduct=function(){const r=oldEditProduct.apply(this,arguments);setTimeout(enhancePlanModal,0);return r;};

  const oldTab=window.tab;
  if(typeof oldTab==='function')window.tab=function(id){
    if(id!=='settings')restoreAdminSavedTheme(false);
    const r=oldTab.apply(this,arguments);
    setTimeout(()=>{enhanceAll();if(id==='favorites')window.load_favorites?.();if(id==='settings')enhanceThemeBuilder();},80);
    return r;
  };

  /* Mutation observer also catches Client Details tab changes and dynamically rebuilt panels. */
  let moTimer=null;
  const observer=new MutationObserver(()=>{clearTimeout(moTimer);moTimer=setTimeout(enhanceAll,120);});
  function init(){
    enhanceAll();observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(enhanceAll,900);setTimeout(enhanceAll,2400);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,300));else setTimeout(init,300);
})();
