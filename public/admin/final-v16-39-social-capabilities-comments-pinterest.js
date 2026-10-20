/* V16.39 — transient API capability checks + Threads/Pinterest admin clarity.
   Additive only: existing connection, publishing and comment workflows remain authoritative. */
(function(){
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initialQuery=new URLSearchParams(location.search);
  const timers=new Map(),pending=new Map(),lastMessages=new Map();
  const aliases={facebook:'facebook',instagram:'instagram',threads:'threads',x:'x',twitter:'x',linkedin:'linkedin',pinterest:'pinterest',search_console:'searchConsole',searchconsole:'searchConsole',googleindexing:'googleIndexing',google_indexing:'googleIndexing',googlebusiness:'googleBusiness',google_business:'googleBusiness',googledrive:'googleDrive',google_drive:'googleDrive',indexnow:'indexNow',bing:'indexNow',gmail:'gmail',email:'gmail',whatsapp:'whatsapp',youtube:'youtube',snapchat:'snapchat'};
  const labels={facebook:'Facebook',instagram:'Instagram',threads:'Threads',x:'X / Twitter',linkedin:'LinkedIn',pinterest:'Pinterest',searchConsole:'Google Search Console',googleIndexing:'Google Indexing API',googleBusiness:'Google Business Profile',googleDrive:'Google Drive',indexNow:'Bing / IndexNow',gmail:'Gmail / Email',whatsapp:'WhatsApp',youtube:'YouTube',snapchat:'Snapchat'};
  const norm=p=>aliases[String(p||'').replace(/[\s/-]/g,'').toLowerCase()]||aliases[String(p||'').toLowerCase()]||String(p||'');
  const bool=(v,unknown='Not live-tested')=>v===true?'Ready':v===false?'Needs attention':unknown;
  const line=(name,value,detail='')=>`<div><b>${H(name)}:</b> ${H(value||'—')}${detail?` <span class="muted">— ${H(detail)}</span>`:''}</div>`;
  const scopes=v=>Array.isArray(v)?v.filter(Boolean):(String(v||'').split(/[\s,]+/).filter(Boolean));
  function state(){return window.UCSocialIntegrations?.settings||{};}
  function legacyHide(){ $$('[data-v1614-facebook-capabilities],[data-v1619-instagram-capabilities],[data-v1634-capability]').forEach(x=>x.hidden=true); }
  function card(key){return $(`#socialMediaIntegrations [data-social-card="${key}"]`);}
  function capabilityBox(key){
    const d=card(key);if(!d)return null;let box=d.querySelector('[data-v1639-capability]');if(box)return box;
    box=document.createElement('div');box.dataset.v1639Capability='1';box.className='uc-social-info uc-v1639-capability';box.hidden=true;
    const f=d.querySelector('form'),actions=f?.querySelector('.form-actions,.uc-v167-actions,.uc-v1611-business-actions,.uc-v1633-drive-actions,.uc-v165-provider-actions');
    if(actions)actions.before(box);else if(f)f.appendChild(box);else d.appendChild(box);return box;
  }
  function linesFor(key,c={}){
    const out=[],connected=!!(c.connected||c.connectionState==='connected'||c.oauthConnected||c.refreshTokenMasked||c.accessTokenMasked);
    if(key==='facebook'){
      out.push(line('Authenticated Page',connected?(c.pageName?`${c.pageName}${c.pageId?` (${c.pageId})`:''}`:(c.pageId||'Connected')):'Not connected'));
      out.push(line('Token',c.tokenType?`${c.tokenType} token`:(connected?'Connected token':'Not verified'),c.tokenAppId?`Meta App ${c.tokenAppId}`:''));
      out.push(line('Automatic Page publishing',bool(c.publishingReady)));out.push(line('Webhook management',bool(c.webhookReady)));out.push(line('Messenger',bool(c.messagingReady)));out.push(line('Lead Ads',bool(c.leadReady)));out.push(line('Comment management',bool(c.engagementReady)));
      const p=scopes(c.grantedScopes);if(p.length)out.push(line('Granted permissions',p.join(', ')));if(Array.isArray(c.pageTasks)&&c.pageTasks.length)out.push(line('Page tasks',c.pageTasks.join(', ')));
    }else if(key==='instagram'){
      out.push(line('Authenticated profile',connected?(c.username?`@${c.username}${c.instagramBusinessId?` (${c.instagramBusinessId})`:''}`:(c.instagramBusinessId||'Connected')):'Not connected'));
      out.push(line('Linked Meta Page',c.pageName?(c.pageId?`${c.pageName} (${c.pageId})`:c.pageName):(c.pageId||'Not verified')));out.push(line('Automatic image publishing',bool(c.publishingReady)));out.push(line('Comment reading / management',bool(c.commentReady===true&&c.commentReadVerified!==false?true:(c.commentReady===false||c.commentReadVerified===false?false:null))));out.push(line('Comment-triggered DM',bool(c.privateReplyReady)));out.push(line('Normal DM conversations',bool(c.messagingReady)));out.push(line('Lead Ads',bool(c.leadReady)));out.push(line('Webhook delivery',c.webhookReady===true?'Ready':'Awaiting live event'));
      const p=scopes(c.grantedScopes);if(p.length)out.push(line('Granted permissions',p.join(', ')));
    }else if(key==='threads'){
      out.push(line('Authenticated Threads account',connected?(c.username?`@${c.username}${c.userId?` (${c.userId})`:''}`:(c.userId||'Connected')):'Not connected'));
      out.push(line('Profile read',bool(c.identityReady,connected?'Connected — run Test Connection for live verification':'Not connected')));out.push(line('Automatic publishing',bool(c.publishingReady,c.autoPublish!==false?'Authorized setting is ON; no test post is created by Test Connection':'Automatic publishing is OFF')));out.push(line('Reply reading',bool(c.replyReadReady)));out.push(line('Reply hide / unhide',bool(c.replyManagementReady)));out.push(line('Native Like on visitor reply','Not available through current Threads Reply Moderation API'));out.push(line('Delete another user’s reply','Not available; hide/unhide is the supported moderation action'));
      const p=scopes(c.requestedPermissions);if(p.length)out.push(line('Requested permissions',p.join(', ')));if(c.latestPermalink)out.push(line('Latest verified Threads post','Permalink available'));
    }else if(key==='pinterest'){
      out.push(line('Authenticated Pinterest account',connected?(c.username?`@${c.username}`:'Connected'):'Not connected'));out.push(line('Account read',bool(c.accountReadReady,connected?'Connected — run Test Connection':'Not connected')));out.push(line('Board read',bool(c.boardsReadReady),c.boardName||c.boardId||'Board ID is used for automatic Pins'));out.push(line('Pin read',bool(c.pinsReadReady)));out.push(line('Automatic Pin publishing',bool(c.pinPublishingReady,c.autoPublish!==false?'Run Test Connection after reconnecting once':'Automatic publishing is OFF')));out.push(line('Pin comment moderation','Not exposed by Pinterest API v5 for this dashboard'));
      const p=scopes(c.grantedScopes);out.push(line('Granted OAuth scopes',p.length?p.join(', '):'Reconnect Pinterest once to record the returned scopes'));if(c.refreshTokenExpiresAt)out.push(line('Continuous refresh token',`Saved; refresh by ${c.refreshTokenExpiresAt}`));if(c.boardWarning)out.push(line('Board check warning',c.boardWarning));if(c.pinsWarning)out.push(line('Pins check warning',c.pinsWarning));
    }else if(key==='searchConsole'){
      out.push(line('Authenticated Google account',connected?(c.connectedEmail||'Connected'):'Not connected'));out.push(line('Property',c.propertyUrl||'Not configured'));out.push(line('Property permission',c.permissionLevel||'Not live-tested'));out.push(line('OAuth access',c.scopeStatus||'Not confirmed'));const p=scopes(c.grantedScopes);if(p.length)out.push(line('Granted scopes',p.join(', ')));out.push(line('Automatic sitemap submission',c.enabled?'Enabled':'Disabled'));
    }else if(key==='googleIndexing'){
      out.push(line('Service-account authentication',connected?`Configured${c.serviceAccountEmail?` (${c.serviceAccountEmail})`:''}`:'Not configured'));out.push(line('Eligibility confirmation',c.eligibilityConfirmed?'Confirmed':'Not confirmed'));out.push(line('Automatic eligible-page submission',c.enabled&&c.autoPublish?'Enabled':'Disabled'));out.push(line('API limitation','Google Indexing API is only for eligible JobPosting / livestream pages'));
    }else if(key==='googleBusiness'){
      const access=c.apiAccessStatus==='ready'?'Ready':c.apiAccessStatus==='approval_required'?'Needs Google Basic API Access / non-zero project quota':c.apiAccessStatus==='account_discovery_ready'?'Account discovery ready; select/save a location':c.apiAccessStatus==='oauth_connected'?'OAuth connected; API project access not checked yet':'Not checked';
      out.push(line('Authenticated Google account',connected?(c.connectedEmail||'Connected'):'Not connected'));out.push(line('Business Profile API project access',access));out.push(line('My Business Account Management API',c.accountManagementReady===true?'Ready':c.accountManagementReady===false?'Needs attention':'Not tested'));out.push(line('My Business Business Information API',c.businessInformationReady===true?'Ready':c.businessInformationReady===false?'Needs attention':'Not tested'));out.push(line('Google My Business API — Posts / Reviews',c.postsReviewsReady===true?'Ready':c.postsReviewsReady===false?'Needs attention':'Not tested'));out.push(line('Business Profile account',c.accountName||c.accountId||'Not selected'));out.push(line('Business location',c.locationName||c.locationId||'Not selected'));out.push(line('Automatic local-post publishing',c.enabled&&c.autoPublish?'Enabled':'Disabled'));out.push(line('Google Maps review reading / replies',connected&&c.locationId?'Configured — Test Connection verifies live access':'Select a location and Test Connection'));if(c.lastApiAccessMessage)out.push(line('Latest API access check',c.lastApiAccessMessage));
    }else if(key==='googleDrive'){
      out.push(line('Google OAuth upload authorization',c.oauthConnected?(c.connectedEmail?`Connected as ${c.connectedEmail}`:'Connected'):'Not connected'));out.push(line('Public-file API key',c.apiKeyMasked?'Saved':'Not configured'));out.push(line('Destination root folder',c.rootFolderName||c.rootFolderId||'Not configured'));out.push(line('Plans & Offers folder',c.plansFolderName||c.plansFolderId||'Not verified'));out.push(line('Story / Status folder',c.storyFolderName||c.storyFolderId||'Not verified'));out.push(line('Image upload capability',c.uploadReady?'Ready':'Needs connection/folder test'));const p=scopes(c.grantedScopes);if(p.length)out.push(line('Granted OAuth scopes',p.join(', ')));
    }else if(key==='gmail'){
      out.push(line('Authenticated Gmail account',connected?(c.connectedEmail||c.senderEmail||'Connected'):'Not connected'));out.push(line('Invoice / statement email sending',c.enabled&&connected?'Ready when live Test Connection passes':c.enabled?'Enabled but not connected':'Disabled'));out.push(line('Gmail OTP',c.otpEnabled&&connected?'Enabled':'Disabled'));out.push(line('Sender identity',c.senderEmail||c.connectedEmail||'Not configured'));
    }else if(key==='whatsapp'){
      out.push(line('Selected OTP provider',c.otpProvider==='green_api'?'GreenAPI':c.otpProvider==='instautomate'?'Instautomate':'WhatsApp Cloud API'));out.push(line('Live provider authentication',c.connected?(c.connectedLabel||'Connected'):'Not connected'));out.push(line('WhatsApp OTP sending',c.enabled&&c.connected?'Ready':'Not ready'));out.push(line('Webhook receiver',c.webhookVerifyTokenMasked?'Verify token saved':'Verify token not saved'));
    }else if(key==='youtube'){
      const p=scopes(c.grantedScopes);out.push(line('Authenticated YouTube channel',connected?(c.channelName||c.channelId||'Connected'):'Not connected'));out.push(line('Channel read',connected?'Ready':'Connect YouTube'));out.push(line('Video upload',p.includes('https://www.googleapis.com/auth/youtube.upload')?'Ready':'Needs youtube.upload'));out.push(line('Comment read / reply / moderation',p.includes('https://www.googleapis.com/auth/youtube.force-ssl')?'Ready':'Needs youtube.force-ssl'));out.push(line('Automatic video Fitness Tips',c.enabled&&c.autoPublish?'Enabled — only records with a public video URL':'Disabled'));out.push(line('Text-only Community posting','Not exposed by YouTube Data API'));if(p.length)out.push(line('Granted OAuth scopes',p.join(', ')));
    }else if(key==='snapchat'){
      const p=scopes(c.grantedScopes),profile=[c.publicProfileName,c.publicProfileUsername?`@${c.publicProfileUsername}`:''].filter(Boolean).join(' — ');
      out.push(line('Snapchat Business OAuth',connected?'Connected':'Not connected'));out.push(line('Business OAuth Client ID',c.oauthClientId?'Saved':'Not configured'));out.push(line('Public Profile',profile||c.publicProfileId||'Not verified'));out.push(line('Public Profile read',c.publicProfileId?'Ready after successful Test Connection':'Needs profile discovery'));out.push(line('Story read / publishing',c.publishingReady?'Ready':'Needs Public Profile API allowlisting + Test Connection'));out.push(line('Automatic Fitness Tip Stories',c.enabled&&c.autoPublishStory?'Enabled':'Disabled'));out.push(line('Optional Snap Kit Client ID',c.snapKitClientId||c.clientId?'Configured':'Not configured'));out.push(line('Creative Kit sharing','Optional user-confirmed share flow; separate from Business OAuth'));out.push(line('Visitor comment moderation','Not enabled by this Snapchat integration'));if(p.length)out.push(line('Granted OAuth scopes',p.join(', ')));
    }else if(key==='linkedin'){
      const p=scopes(c.grantedScopes),identity=c.publishingIdentity==='organization'?'Organization / Company Page':'Member Profile';
      out.push(line('Authenticated LinkedIn member',connected?(c.memberName||c.memberEmail||c.memberId||'Connected'):'Not connected'));out.push(line('Publishing identity',identity,c.publishingIdentity==='organization'?(c.organizationName||c.organizationId||'Organization ID required'):'Uses the connected member'));out.push(line('Profile authentication',bool(c.identityReady,connected?'Connected — run Test Connection':'Not connected')));out.push(line('Automatic publishing',c.publishingReady===true?'Ready':c.publishingReady===false?'Needs approved publishing scope':'Run Test Connection'));out.push(line('Comment reading',c.communityEnabled?bool(c.commentReadReady):'Not requested'));out.push(line('Comment / reaction management',c.communityEnabled?bool(c.commentWriteReady):'Not requested'));out.push(line('Lead Sync',c.leadSyncEnabled?bool(c.leadSyncReady):'Not requested'));out.push(line('Advertising API',c.adsEnabled?bool(c.adsReady):'Not requested'));out.push(line('LinkedIn API version',c.apiVersion||'202608'));if(p.length)out.push(line('Granted OAuth scopes',p.join(', ')));
    }else if(key==='x'){
      const p=scopes(c.grantedScopes),scopeWrite=p.includes('tweet.write')||(!p.length&&connected),publishState=c.publishingReady===true?'Ready — a real create-post operation was verified':scopeWrite?'OAuth permission is ready; actual posting also requires available X API credits':'Needs tweet.write';out.push(line('Authenticated X user',connected?(c.username?`@${c.username}`:(c.userId?`User ID ${c.userId}`:'Connected')):'Not connected'));out.push(line('OAuth 2.0 Client ID',c.clientId?'Saved':'Not configured'));out.push(line('User-context access token',c.accessTokenMasked?'Saved':'Not connected'));out.push(line('Profile read',connected?'Ready':'Connect X / Twitter'));out.push(line('Automatic posting',publishState));out.push(line('Reply publishing permission',scopeWrite?'Ready':'Needs tweet.write'));out.push(line('Like actions permission',p.includes('like.write')||(!p.length&&connected)?'Ready':'Needs like.write'));out.push(line('Continuous authorization',c.refreshTokenMasked?'Ready — refresh token saved':'Needs offline.access / reconnect'));if(c.lastPublishedUrl)out.push(line('Last successful X post',c.lastPublishedUrl));if(p.length)out.push(line('Granted OAuth scopes',p.join(', ')));out.push(line('Billing note','Test Connection does not make a paid write request. X create/read activity may require Developer API credits. Test Posting is an optional real write test.'));out.push(line('Authentication method','OAuth 2.0 Authorization Code + PKCE user context.'));
    }else if(key==='indexNow'){
      out.push(line('IndexNow key',c.connected||c.keyMasked?'Configured':'Not configured'));out.push(line('Automatic URL submission',c.enabled&&c.autoPublish!==false?'Enabled':'Disabled'));out.push(line('Purpose','Notify Bing/IndexNow participants when public URLs change'));
    }
    return out.join('');
  }
  function render(key,trigger='API action',message='',type='success'){
    key=norm(key);const box=capabilityBox(key);if(!box)return;const c=state()[key]||{},label=labels[key]||key;
    box.innerHTML=`<strong>${H(label)} capability check</strong><div class="muted">Shown only because you just used Connect, Test Connection or Configure Webhook Events. It automatically hides after 60 seconds or when you leave Integrations.</div><div class="uc-v1634-cap-lines">${line('Triggered by',trigger)}${message?line(type==='error'?'Action result — needs attention':'Action result',message):''}${linesFor(key,c)}${c.lastError?line('Saved diagnostic',c.lastError):''}</div>`;
    box.hidden=false;clearTimeout(timers.get(key));timers.set(key,setTimeout(()=>{box.hidden=true;},60000));
  }
  function hideAll(){timers.forEach(clearTimeout);timers.clear();pending.clear();$$('[data-v1639-capability]').forEach(x=>x.hidden=true);legacyHide();}
  async function refreshSettings(){try{const r=await window.apiJson?.('/api/admin/social-integrations');if(r?.settings){window.UCSocialIntegrations=window.UCSocialIntegrations||{};window.UCSocialIntegrations.settings=r.settings;return r.settings;}}catch(_){}return state();}

  // Only these explicit admin actions arm a capability check. Save/Refresh/Disconnect do not.
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#socialMediaIntegrations button');if(!b)return;const d=b.closest?.('[data-social-card]');if(!d)return;const t=(b.textContent||'').trim();if(!/^(Connect\b|Test Connection\b|Test Posting\b|Configure Webhook Events\b)/i.test(t))return;const key=norm(d.dataset.socialCard);pending.set(key,{action:t,at:Date.now()});legacyHide();
  },true);

  const oldResult=window.ucSocialIntegrationResult;
  if(typeof oldResult==='function')window.ucSocialIntegrationResult=function(platform,text,type='notice'){
    const r=oldResult.apply(this,arguments),key=norm(platform),p=pending.get(key);lastMessages.set(key,{text:String(text||''),type:String(type||'notice')});
    if(p&&Date.now()-p.at<120000){setTimeout(async()=>{await refreshSettings();render(key,p.action,String(text||''),String(type||'notice'));pending.delete(key);},180);}return r;
  };

  const oldTab=window.tab;if(typeof oldTab==='function'&&!oldTab.__v1639caps){const w=function(id){if(id!=='socialMediaIntegrations')hideAll();else hideAll();return oldTab.apply(this,arguments);};w.__v1639caps=true;window.tab=w;}
  window.addEventListener('pagehide',hideAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)hideAll();});

  async function oauthCapabilityReturn(){
    let raw='',key='',oauthParam='';for(const [param,k] of [['facebook','facebook'],['instagram','instagram'],['threads','threads'],['pinterest','pinterest'],['search_console','searchConsole'],['google_business','googleBusiness'],['google_drive','googleDrive'],['gmail','gmail'],['youtube','youtube'],['linkedin','linkedin'],['x','x']])if(initialQuery.has(param)){raw=initialQuery.get(param)||'';key=k;oauthParam=param;break;}if(!key)return;
    // OAuth return parameters are one-time UI triggers. Remove them immediately so a normal
    // refresh/login does not replay the capability check or an old provider message.
    try{const cleanUrl=new URL(location.href);[oauthParam,'social_message','gmail_message'].forEach(k=>k&&cleanUrl.searchParams.delete(k));history.replaceState({},'',`${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);}catch(_){}
    const callbackMessage=initialQuery.get('social_message')||initialQuery.get('gmail_message')||`${labels[key]} connection updated.`;if(/error|fail/i.test(raw)){pending.set(key,{action:`Connect ${labels[key]}`,at:Date.now()});await refreshSettings();render(key,`Connect ${labels[key]}`,callbackMessage,'error');return;}
    pending.set(key,{action:`Connect ${labels[key]} + live capability check`,at:Date.now()});
    try{
      let r=null;
      if(key==='threads')r=await window.apiJson('/api/admin/threads-auth',{method:'POST',body:JSON.stringify({action:'test'})});
      else if(key==='pinterest')r=await window.apiJson('/api/admin/pinterest-auth',{method:'POST',body:JSON.stringify({action:'test'})});
      else if(key==='searchConsole')r=await window.apiJson('/api/admin/search-console-auth',{method:'POST',body:JSON.stringify({action:'test'})});
      else if(key==='googleBusiness'){r=await window.apiJson('/api/admin/google-business-auth',{method:'POST',body:JSON.stringify({action:'discover'})});window.__ucV1611GbpDiscovery=r;}
      else if(key==='googleDrive')r=await window.apiJson('/api/admin/google-drive-action',{method:'POST',body:JSON.stringify({action:'test'})});
      else if(key==='gmail')r=await window.apiJson('/api/admin/gmail-auth',{method:'POST',body:JSON.stringify({action:'test'})});
      else if(key==='youtube')r=await window.apiJson('/api/admin/youtube-auth',{method:'POST',body:JSON.stringify({action:'test'})});
      else if(key==='linkedin')r=await window.apiJson('/api/admin/linkedin-auth',{method:'POST',body:JSON.stringify({action:'test'})});
      else if(key==='x')r=await window.apiJson('/api/admin/x-auth',{method:'POST',body:JSON.stringify({action:'test'})});
      else if(key==='facebook'||key==='instagram')r=await window.apiJson('/api/admin/social-platform-action',{method:'POST',body:JSON.stringify({platform:key,action:'test'})});
      await refreshSettings();render(key,`Connect ${labels[key]} + live capability check`,r?.message||callbackMessage,'success');pending.delete(key);
    }catch(e){await refreshSettings();render(key,`Connect ${labels[key]} + live capability check`,e.message||callbackMessage,'error');pending.delete(key);}
  }
  function init(){legacyHide();$$('[data-v1639-capability]').forEach(x=>x.hidden=true);if(initialQuery.toString())setTimeout(oauthCapabilityReturn,1250);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1000));else setTimeout(init,1000);
})();
