/* V16.82 — platform-aware automation help cards. Existing flow and theme logic remain unchanged. */
(()=>{
  'use strict';
  const H=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const PLATFORM={facebook:'Facebook',instagram:'Instagram',whatsapp:'WhatsApp',threads:'Threads',youtube:'YouTube',x:'X / Twitter',linkedin:'LinkedIn',pinterest:'Pinterest',snapchat:'Snapchat',all:'All connected sources'};
  const CHANNEL={dm:'Chatbot DM',comment:'Chatbot Comments',lead_nurture:'Lead Nurturing',comment_dm:'Comment Triggers DM'};
  const platformNote={
    facebook:'Use the connected Facebook Page. Replies, buttons and comment events are limited by the permissions and messaging window granted to that Page.',
    instagram:'Use the connected Instagram professional account. Quick replies and comment events are delivered through the linked Meta account and its granted permissions.',
    whatsapp:'Use the connected WhatsApp provider. Approved templates may be needed outside the customer-service window; WhatsApp Pay appears only when its payment configuration is ready.',
    threads:'Use the connected Threads profile. The builder shows only blocks supported by the current Threads connection and official API capability.',
    youtube:'Use the connected YouTube channel. Comment actions run only on comments and videos the authorized channel can manage.',
    x:'Use the connected X / Twitter account. The builder keeps unsupported rich controls out of the delivery and can use a numbered list where native buttons are unavailable.',
    linkedin:'Use the connected LinkedIn organization/profile capability shown in Integrations. Only currently enabled automation actions are delivered.',
    pinterest:'Use the connected Pinterest business account. Only automation actions exposed by the current official integration are available.',
    snapchat:'Use the connected Snapchat business integration. Only actions supported by its current messaging capability are available.',
    all:'A lead may enter from any enabled source selected in Lead Trigger & Rules. New identifiers continue through the existing lead-matching and profile-merge pipeline.'
  };
  const item=(name,purpose,example='')=>`<article class="uc82-help-item"><h5>${H(name)}</h5><p>${H(purpose)}</p>${example?`<small><strong>Example:</strong> ${H(example)}</small>`:''}</article>`;
  const steps=rows=>`<ol class="uc82-help-steps">${rows.map(x=>`<li>${H(x)}</li>`).join('')}</ol>`;
  function dmItems(platform){
    const rows=[
      ['Flow Start','Choose an exact keyword, contained phrase, starting phrase, regular expression or any message. Connect Start to the first block.','Keyword “LINK” starts the information journey.'],
      ['Message','Send text, Image + Message, Buttons / Quick Replies, Interactive Buttons, or Image + Interactive Buttons. Upload media through Google Drive when the selected type requires it.','Send a product image, then add “View Details” as a website button and “Call Us” as a telephone button.'],
      ['Buttons / Quick Replies','Use reply buttons to continue to another connected block. Use URL or telephone actions only where the selected platform supports them.','“Pricing” saves the reply and connects to the pricing-information block.'],
      ['Interactive Buttons','Create branded-looking actions with a reply, website/WhatsApp URL, or call destination. The destination remains behind the button label.','“View Offer” opens checkout; “WhatsApp” opens a wa.me link.'],
      ['Question','Ask for a value, validate its format, choose the retry count, and save the accepted answer to an attribute.','Ask for an email and save it as Email.'],
      ['Condition','Route the conversation using a saved attribute, the last message, a number, date/time, or another configured comparison. Connect both True and False paths.','If CustomerType equals Business, show the business options; otherwise show the personal options.'],
      ['Set Attribute','Save a known value on the conversation/lead profile. Contact identifiers continue through the existing lead-match and duplicate-merge logic.','Save ProductInterest = Premium Plan before showing checkout.'],
      ['API Request','Call an HTTPS endpoint, pass headers/body, capture a response field, and branch by HTTP status or fallback. Never paste secrets into a message.','Check an availability API, capture remainingSpots, then choose the success path.'],
      ['AI Bot (when available)','Appears only for an enabled, ready AI integration. Choose its model, instructions and fallback message; connect a Human Handoff for uncertain cases.','Answer product and service FAQs from approved instructions and hand off payment disputes.'],
      ['Human Handoff','Stop automatic replies and leave the conversation ready for an admin in Inbox.','Hand off after the customer asks for a custom quotation.'],
      ['End Flow','Finish the branch, optionally with a final message.','“Thank you—our team will contact you shortly.”']
    ];
    if(platform==='whatsapp')rows.splice(rows.length-2,0,
      ['WhatsApp Template','Send an approved WhatsApp template by its exact name and language when template messaging is required.','Use the approved welcome template for a lead outside the open service window.'],
      ['WhatsApp Pay','Send a native Review and Pay order-details request through the configured WhatsApp payment setup. Confirm the item, amount, tax and payment configuration before activation.','Send a ₹199 service-booking payment request, then continue after the request is sent.']
    );
    return rows.map(x=>item(...x)).join('');
  }
  function commentItems(){return [
    ['Flow Start','Choose the comment word or phrase that starts this comment flow and connect it to the first block.','A comment containing “details” starts the response.'],
    ['Comment Reply','Write the public reply that should appear under the matching comment. Keep it suitable for public viewing.','“Thanks for your interest—our team will share the next step.”'],
    ['Condition','Branch using the comment text or a saved attribute so different comments can receive different responses.','If the comment contains “price”, route to the pricing response.'],
    ['Set Attribute','Save useful intent or source information on the matching lead profile for later Inbox and nurturing use.','Save LeadInterest = Product Updates.'],
    ['API Request','Call an HTTPS service and branch using returned status/values when a live check is needed.','Confirm that the requested product is still available before posting the reply.'],
    ['End Flow','Finish the public-comment branch, optionally with a final response.','End after the answer has been posted.']
  ].map(x=>item(...x)).join('');}
  function commentDmItems(platform){return [
    ['Flow Start','Enter the exact keyword or phrase requested in the post caption. Connect Start to the first block.','Ask people to comment “LINK”.'],
    ['Public Comment Reply','Add up to ten reply variations. They rotate in order for new commenters and restart from variation 1, making the public responses feel natural.','“Thank you—please check your DM” and “Sent! Your details are in DM.”'],
    ['Delay','Choose 5, 10, 15, 20, 25 or 30 seconds between connected actions.','Wait 5 seconds before the public reply and 15 seconds before the private reply.'],
    ['Private DM','Send the one initial private reply allowed by the connected Meta comment-private-reply capability. It may be text, image, quick replies, interactive buttons, or image + buttons.','Send the requested product guide with a “View Details” action.'],
    ['PDF / Document','Upload the file to Google Drive and use its saved link in the initial private reply. The flow stores link/metadata, not document bytes in D1.','Send the current product guide PDF.'],
    ['Plan / Offer','Attach an active plan. Price, checkout link and remaining availability are resolved again at delivery time.','Send the Premium Plan with the current live availability and personalized checkout.'],
    ['Condition','Route using a saved value when the first private response depends on known lead data.','Send different language links based on LanguagePreference.'],
    ['Set Attribute','Record the keyword, campaign or interest on the matching lead so later Inbox/lead nurturing steps can use it.','Save Campaign = ProductLaunchLink.'],
    ['API Request','Use an HTTPS check before the single initial private reply when external data is required.','Verify the resource is still active before sending its link.'],
    ['End Flow','Finish this comment-to-DM entry. Once the recipient replies in DM, continue through the normal Chatbot DM automation.','End after the initial private reply is sent.']
  ].map(x=>item(...x)).join('')+`<div class="uc82-help-rule"><strong>${H(PLATFORM[platform]||platform)} delivery rule:</strong> Facebook and Instagram permit one initial private reply to a comment. Keep one private DM/document/offer delivery block in this flow; continue only after the person responds.</div>`;}
  function nurtureItems(){return [
    ['Lead sources','Select All enabled sources or specific connected sources. New phone, email and social identifiers continue through the existing matching and lead-profile merge rules.','Start the journey for website forms, WhatsApp, Facebook, Instagram and every currently connected source.'],
    ['Step timing','Each Wait begins after the previous connected step. Use 0 minutes for immediate delivery or choose minutes, hours or days for later follow-ups.','WhatsApp immediately, email after 6 hours, SMS after 1 day.'],
    ['WhatsApp follow-up','Choose text, image, document, link, interactive buttons, image + buttons, or a live plan/offer. Upload required files to Google Drive.','Send an introduction now and a product guide six hours later.'],
    ['Branded email','Compose the subject, badge, title and message while the recipient preview updates live. Images/documents appear from uploaded Drive links; action URLs stay behind branded buttons.','Send a branded plan email with “View Offer”.'],
    ['SMS follow-up','Write a concise message and include only content supported by the configured SMS delivery channel.','Send a payment reminder with the approved short checkout link.'],
    ['Attachments and buttons','Required uploads show an attached file chip and may be removed from the flow with ×. Email can include multiple attachments; WhatsApp uses the selected media attachment.','Attach two guides to email, or one product image to WhatsApp.'],
    ['Plan / Offer with live availability','Choose an active plan. Trial/offer price, live availability and personalized checkout are refreshed immediately before delivery.','Show “Try for just ₹1” and the current remaining spots.'],
    ['Stop After Purchase','Keep this enabled to check for a paid/completed order before every delivery and remove converted customers from remaining reminders.','Stop the day-3 urgency email after checkout succeeds on day 2.'],
    ['Continue Until Purchase','Repeat the final connected step at the selected day interval until purchase; disconnect a wire with its central × when a step should not continue.','Repeat the final reminder every 2 days.'],
    ['Validation and activation','Drafts may be saved unfinished. Activation requires flow name, source, step name, message and every channel/content-specific field; yellow highlights identify exactly what is missing.','Upload the selected image and complete the email subject before activating.']
  ].map(x=>item(...x)).join('');}
  function guide(channel,platform){
    const type=CHANNEL[channel]||'Automation',name=PLATFORM[platform]||platform||'Platform';
    const intro=channel==='lead_nurture'?'Build a connected follow-up timeline that begins when a lead is captured and stops after purchase.':channel==='comment_dm'?'Turn a public keyword comment into a professional public reply and one permitted initial private response.':channel==='comment'?'Build public comment responses for this connected platform.':'Build a connected private-message journey for this platform.';
    const quick=channel==='lead_nurture'?['Select lead sources and purchase rules.','Add channel steps and set each relative wait.','Complete required content, preview email, connect the timeline and save as a draft.','Turn on Active only after every yellow validation warning is cleared.']:channel==='comment_dm'?['Set the caption keyword in Flow Start.','Connect a Public Comment Reply, optional Delay, and one private delivery block.','Complete uploads/offer selection, connect every wire and save as a draft.','Activate after the builder reports no missing or extra private reply blocks.']:['Set the Flow Start trigger.','Add blocks and fill every required field.','Connect each output to the intended next block; use the × at the middle of a wire to disconnect it.','Save unfinished work as a draft, then activate only after validation passes.'];
    const blocks=channel==='lead_nurture'?nurtureItems():channel==='comment_dm'?commentDmItems(platform):channel==='comment'?commentItems():dmItems(platform);
    return `<section class="uc82-help-back" aria-label="${H(type)} help and instructions"><header><div><span>Help &amp; Instructions</span><h3>${H(name)} · ${H(type)}</h3><p>${H(intro)}</p></div><button class="uc-info-back-btn uc82-help-back-button" type="button" data-uc82-help-back aria-label="Back to automation flows" title="Back to flows"><svg class="uc-back-svg" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14.3 10.8 9.6 15.5l4.7 4.7M10.3 15.5h7.1c3.3 0 5.1 1.7 5.1 4.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></header><div class="uc82-help-platform-note"><strong>Before activation:</strong> ${H(platformNote[platform]||platformNote.all)}</div><section><h4>Create a working flow</h4>${steps(quick)}</section><section><h4>${channel==='lead_nurture'?'Rules, channels and content':'Content blocks'}</h4><div class="uc82-help-grid">${blocks}</div></section><div class="uc82-help-finish"><strong>Safe workflow:</strong> save incomplete work with Active off. Turn Active on only after all required fields are complete and every intended path is connected.</div></section>`;
  }
  function openHelp(button){const card=button.closest('.uc64-library-card');if(!card||card.classList.contains('uc82-help-open'))return;const channel=button.dataset.uc82AutomationHelp||'dm',platform=button.dataset.uc82Platform||'all';card.insertAdjacentHTML('beforeend',guide(channel,platform));card.classList.add('uc82-help-open');card.querySelector('[data-uc82-help-back]')?.focus({preventScroll:true});}
  function closeHelp(button){const card=button.closest('.uc64-library-card');if(!card)return;card.classList.add('uc82-help-returning');card.classList.remove('uc82-help-open');card.querySelector('.uc82-help-back')?.remove();setTimeout(()=>card.classList.remove('uc82-help-returning'),360);card.querySelector('[data-uc82-automation-help]')?.focus({preventScroll:true});}
  document.addEventListener('click',event=>{const open=event.target.closest?.('[data-uc82-automation-help]');if(open){event.preventDefault();openHelp(open);return;}const back=event.target.closest?.('[data-uc82-help-back]');if(back){event.preventDefault();closeHelp(back);}},true);
})();
