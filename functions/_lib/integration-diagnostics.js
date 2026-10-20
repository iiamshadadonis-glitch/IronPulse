const clean=(v,n=1800)=>String(v??'').trim().replace(/\s+/g,' ').slice(0,n);

const NAMES={
  facebook:'Facebook',instagram:'Instagram',threads:'Threads',x:'X / Twitter',twitter:'X / Twitter',linkedin:'LinkedIn',pinterest:'Pinterest',
  youtube:'YouTube',snapchat:'Snapchat',tiktok:'TikTok',telegram:'Telegram',
  search_console:'Google Search Console',google_search_console:'Google Search Console',google_indexing:'Google Indexing API',google_business:'Google Business Profile',google_drive:'Google Drive API',
  indexnow:'Bing / IndexNow',bing:'Bing / IndexNow',seo:'Blogger / SEO',blogger:'Blogger / SEO',gmail:'Gmail / Email',email:'Gmail / Email',whatsapp:'WhatsApp Webhook & Order OTP',meta:'Meta',
  razorpay:'Razorpay',phonepe:'PhonePe',stripe:'Stripe',payments:'Payment Gateway',google_adsense:'Google AdSense',adsterra:'Adsterra',ai:'AI Integrations',api:'External API'
};
export function platformName(platform){return NAMES[String(platform||'').toLowerCase()]||clean(platform,100)||'Integration';}

const RECOVERY={
  facebook:['social','facebook'],instagram:['social','instagram'],meta:['social','facebook'],threads:['social','threads'],x:['social','x'],twitter:['social','x'],linkedin:['social','linkedin'],pinterest:['social','pinterest'],youtube:['social','youtube'],snapchat:['social','snapchat'],tiktok:['social','tiktok'],telegram:['social','telegram'],
  search_console:['seo','searchConsole'],google_search_console:['seo','searchConsole'],google_indexing:['seo','googleIndexing'],google_business:['seo','googleBusiness'],indexnow:['seo','indexNow'],bing:['seo','indexNow'],seo:['seo','seo'],blogger:['seo','seo'],
  google_drive:['storage','googleDrive'],gmail:['email','gmail'],email:['email','gmail'],whatsapp:['email','whatsapp'],
  razorpay:['payments','razorpay'],phonepe:['payments','phonepe'],stripe:['payments','stripe'],payments:['payments','razorpay'],
  google_adsense:['ads','googleAdsense'],adsterra:['ads','adsterra'],ai:['ai',''],api:['api','apiAccess']
};
export function integrationRecovery(platform){
  const key=String(platform||'').toLowerCase(),target=RECOVERY[key];if(!target)return null;
  const name=platformName(key),category=target[0],card=target[1];
  const query=new URLSearchParams({integration_category:category,...(card?{integration:card}:{})}).toString();
  return {category,card,label:`Open ${name} Integration`,url:`/admin/?${query}`};
}

function rawMessage(error){
  return clean(error?.upstreamMessage||error?.message||error?.error?.message||error,1800);
}
function statusOf(error){return Number(error?.httpStatus||error?.status||error?.upstreamStatus||0)||0;}
function codeOf(error){return clean(error?.upstreamCode||error?.code||error?.errorCode||error?.error?.code||'',120);}
function subcodeOf(error){return clean(error?.upstreamSubcode||error?.errorSubcode||error?.error?.error_subcode||'',120);}

export function isAuthenticationFailure(error){
  const m=rawMessage(error).toLowerCase(),s=statusOf(error),c=codeOf(error);
  return s===401||c==='190'||c==='102'||/invalid oauth|invalid access token|access token.*expired|token.*expired|oauth.*expired|invalid_grant|unauthenticated|invalid credentials/.test(m);
}

export function diagnoseIntegrationError(platform,error,{action='request'}={}){
  const key=String(platform||'').toLowerCase(),name=platformName(key),raw=rawMessage(error),lower=raw.toLowerCase(),status=statusOf(error),code=codeOf(error),subcode=subcodeOf(error);
  const technical=[status?`HTTP ${status}`:'',code?`code ${code}`:'',subcode?`subcode ${subcode}`:''].filter(Boolean).join(', ');
  let problem=raw||`${name} did not accept the ${action}.`,solution='Review the saved integration settings and try again.';

  if(/fetch failed|network|connection reset|timed out|timeout|dns/.test(lower)){
    problem=`The website could not reach ${name} while performing the ${action}.`;
    solution='Try again once. If it continues, check Cloudflare Functions logs and the platform status page; your saved credentials were not automatically cleared.';
  }else if(key==='facebook'||key==='instagram'||key==='meta'){
    if(isAuthenticationFailure(error)){
      problem=`${name} authentication failed because the saved access token is invalid, expired, revoked, or does not belong to the configured account/Page.`;
      solution='Create or refresh the correct Page/user access token in Meta, save it again, then click Test Connection. The website marks the integration disconnected only for an actual authentication failure.';
    }else if(code==='210'||/page access token is required|subject must be a page/.test(lower)){
      problem=`${name} reached Meta, but Meta says this operation requires a Facebook Page Access Token for the exact Page instead of the token currently saved.`;
      solution='Do not use a User Access Token or App Access Token. Generate/retrieve the Page Access Token for the configured Page. In this website you can save the Meta App ID, App Secret and Facebook Login for Business Configuration ID, then use Connect Facebook so the website obtains the correct Page token from Meta.';
    }else if(status===403||code==='200'||code==='10'||/permission|permissions|insufficient|not authorized|does not have permission|(#200)/.test(lower)){
      problem=`${name} authentication reached Meta, but Meta refused the ${action} because the token/app does not have the required permission or Page task.`;
      if(key==='instagram')solution='Confirm the Instagram professional account is linked to the Facebook Page and the token/app has the permissions required for Instagram content publishing and comment/messaging features. Then run Test Connection again.';
      else if(/automatic publishing|page post|publish|feed/.test(String(action).toLowerCase())||/pages_manage_posts|create_content/.test(lower))solution='For Facebook Page publishing, the Page token must include pages_manage_posts and the Facebook account that created it must have CREATE_CONTENT or MANAGE access to the Page. Update the Facebook Login for Business configuration, reconnect Facebook to issue a new Page token, then run Test Connection again.';
      else if(/webhook|subscribed_apps/.test(String(action).toLowerCase())||/pages_manage_metadata/.test(lower))solution='For Page webhook subscriptions, the Page token must include pages_manage_metadata and the person who created it must have MODERATE/MANAGE Page access. Messenger fields additionally require pages_messaging; Lead Ads require leads_retrieval. Update those permissions, reconnect Facebook, then configure webhook events again.';
      else solution='Confirm the Page token belongs to the correct Facebook Page and has the exact permission required by this operation. Use Test Connection after reconnecting so the website can show each capability separately.';
    }else if(/unsupported post request|object.*does not exist|cannot be loaded/.test(lower)){
      problem=`${name} could not access the configured Page/account or target object.`;
      solution='Re-check the Page ID / Instagram Business Account ID and make sure the saved token was issued for that same Page/account.';
    }else if(/image|media.*url|download|could not fetch|invalid url/.test(lower)){
      problem=`${name} could not use the Fitness Class cover image or media URL.`;
      solution='Open the cover image URL in an incognito window and confirm it is public HTTPS, returns the image directly, and does not require cookies/login. Then retry publishing.';
    }else if(/container|media_publish|not ready|in_progress/.test(lower)){
      problem='Instagram accepted the media container but it was not ready to publish yet.';
      solution='The website now checks the container status before publishing. Retry the Fitness Class distribution after a short delay if Meta continues processing the image.';
    }else if(/webhook|subscribed_apps|callback/.test(lower)){
      problem=`Meta could not complete the ${action} for the configured webhook/Page subscription.`;
      solution='Verify the callback URL and verify token in Meta, then subscribe the Page/app to the required fields (for example feed/leadgen/messages where applicable). A verified callback alone does not mean the Page is subscribed to every event field.';
    }
  }else if(key==='google_indexing'){
    if(/private key|pkcs8|pem|importkey|key data|could not be processed|base64/.test(lower)){
      problem='Google Indexing API authentication failed because the saved service-account private key could not be processed.';
      solution='Re-enter the complete private_key value from the Google service-account JSON file, including the BEGIN/END PRIVATE KEY lines, then save and test again.';
    }else if(status===403||/permission denied|ownership|verify.*ownership|not.*owner/.test(lower)){
      problem='Google Indexing API authentication reached Google, but Google rejected the URL because ownership/permission could not be verified.';
      solution='Add the service-account email as an Owner of the matching Google Search Console property, confirm the submitted URL belongs to that property, then test again.';
    }else if(/api.*disabled|has not been used|accessnotconfigured|indexing api.*not enabled/.test(lower)){
      problem='Google Indexing API is not enabled for the Google Cloud project used by this service account.';
      solution='Enable the Web Search Indexing API in Google Cloud for the same project, wait a few minutes, then retry.';
    }else if(status===401||/invalid_grant|unauthenticated/.test(lower)){
      problem='Google rejected the service-account authentication request.';
      solution='Verify that the service-account email and private key come from the same active Google Cloud service account and that the key has not been deleted/revoked.';
    }
  }else if(key==='search_console'||key==='google_search_console'){
    if(status===401||/invalid_grant|invalid credentials|unauthenticated/.test(lower)){
      problem='Google Search Console authorization is no longer valid.';
      solution='Disconnect Google Search Console, reconnect the Google account that owns/has access to the property, approve the requested scope, then test again.';
    }else if(status===403||/insufficient.*scope|permission/.test(lower)){
      problem='Google Search Console accepted the OAuth token but refused this operation because the connected account/scope does not have enough permission.';
      solution='Reconnect Search Console with the read/write webmasters scope and verify that the connected Google account has access to the exact configured property.';
    }else if(status===404){
      problem='Google Search Console could not find the configured property or sitemap target.';
      solution='Check the exact Search Console property value. Domain properties should use sc-domain:example.com; URL-prefix properties must match the exact protocol/host.';
    }
  }else if(key==='google_business'){
    if(status===401||/invalid_grant|unauthenticated|invalid credentials/.test(lower)){
      problem='Google Business Profile OAuth authorization is invalid or expired.';
      solution='Disconnect and reconnect the Google account that owns or manages the Business Profile, approve the business.manage permission, then load accounts/locations again.';
    }else if(status===429||/resource_exhausted|quota.*0|quota.*exhausted/.test(lower)){
      problem='Google Business Profile OAuth is connected, but this Google Cloud project cannot use the Business Profile APIs yet (HTTP 429 / project quota unavailable).';
      solution='This is normally a project-access issue, not a Client ID or login problem. In Google Cloud, check the Business Profile API quotas. If the quota is 0, submit the Google Business Profile “Application for Basic API Access”; after Google approves the same Cloud project, enable the Business Profile APIs and retry Load Accounts & Locations. If the quota is already above 0, wait for the rate-limit window and retry.';
    }else if(status===403||/permission|access denied|permission denied/.test(lower)){
      problem='Google Business Profile accepted the OAuth account but refused this operation because API project access or account/location permission is missing.';
      solution='Confirm the Google Cloud project has approved Business Profile API access, the required Business Profile APIs are enabled in that same project, and the connected Google account is an owner or manager of the target verified location.';
    }else if(/api.*disabled|has not been used|accessnotconfigured|service.*disabled/.test(lower)){
      problem='A required Google Business Profile API is not enabled in the Google Cloud project used by this OAuth Client ID.';
      solution='Enable the Business Profile APIs in the same Google Cloud project as the OAuth Client ID. For account/location discovery this includes My Business Account Management API and My Business Business Information API; posts/reviews also use Google My Business API.';
    }else if(status===404||/location.*not found|account.*not found/.test(lower)){
      problem='The saved Google Business Profile account/location could not be found.';
      solution='Click Load Accounts & Locations again, choose the current business location, and save settings.';
    }
  }else if(key==='google_drive'){
    if(isAuthenticationFailure(error)||/authorization.*not connected|refresh token|oauth.*revoked|oauth.*disconnected/.test(lower)){
      problem='Google Drive upload authorization is disconnected, expired, or has been revoked.';
      solution='Open Settings → Integrations → Storage → Google Drive API, click Connect Google Drive, approve access, then run Test Connection.';
    }else if(/google drive.*disabled|drive is disabled/.test(lower)){
      problem='Google Drive is currently disabled for uploads.';
      solution='Open Settings → Integrations → Storage → Google Drive API, enable Google Drive, save settings, then run Test Connection.';
    }else if(/destination root folder/.test(lower)){
      problem='Google Drive does not have a destination root folder configured for this upload.';
      solution='Open the Google Drive API integration, add the Destination Root Folder URL, save settings, then run Test Connection.';
    }else if(/api key.*invalid|api_key_invalid|invalid key/.test(lower)){
      problem='Google Drive rejected the saved API key.';
      solution='Create or copy an API key from the same Google Cloud project where Google Drive API is enabled, save it again, then run Test Connection.';
    }else if(status===403||/api.*disabled|accessnotconfigured|forbidden|permission/.test(lower)){
      problem='Google received the Drive API request but the project/key is not allowed to use it or the test file is not publicly readable.';
      solution='Enable Google Drive API for the key project, restrict the key to Google Drive API if desired, and make the test image public to anyone with the link. Then test again.';
    }else if(status===404||/file not found/.test(lower)){
      problem='Google Drive could not find the test file or the file is not publicly visible to this API-key request.';
      solution='Paste a public Google Drive file URL shared as Anyone with the link, save settings, then run Test Connection again.';
    }
  }else if(key==='pinterest'){
    if(status===401||/invalid token|unauthorized/.test(lower)){problem='Pinterest rejected the saved OAuth access token.';solution='Reconnect Pinterest and approve access again, then choose/save the Board ID.';}
    else if(status===403||/scope|permission/.test(lower)){problem='Pinterest authentication worked, but the app/token does not have permission for this Pin/board operation.';solution='Reconnect with the required Pin/board scopes and make sure the selected Board belongs to the authenticated account.';}
    else if(/board/.test(lower)&&(/not found|invalid/.test(lower))){problem='Pinterest could not use the saved Board ID.';solution='Load/verify your Pinterest boards and save a valid Board ID before enabling automatic Pins.';}
  }else if(key==='linkedin'){
    if(status===401||/invalid token|expired token|unauthorized/.test(lower)){problem='LinkedIn rejected or expired the connected OAuth access token.';solution='Click Connect LinkedIn again. IronPulse Gym will obtain a new access token through the registered OAuth callback; you do not need to paste an access token manually.';}
    else if(/redirect_uri|redirect uri|redirect_uri_mismatch/.test(lower)){problem='LinkedIn rejected the OAuth redirect URL.';solution='Copy the LinkedIn OAuth Callback / Redirect URL from Social Media API and add that exact HTTPS URL under LinkedIn Developers → Auth → Authorized redirect URLs, then reconnect.';}
    else if(status===403||/permission|not enough permissions|scope|invalid_scope/.test(lower)){problem='LinkedIn authentication reached the API, but the developer app/token is not approved for the requested capability.';solution='Open LinkedIn Developers → Products, obtain the Product/API approval that grants the required scope, then reconnect LinkedIn so the new scope is included. Community Management, Lead Sync and Advertising are separate approvals.';}
  }else if(key==='x'||key==='twitter'){
    const payload=error?.upstreamPayload||{},ptype=clean(error?.upstreamType||payload?.type||'',500).toLowerCase(),reason=clean(error?.upstreamReason||payload?.reason||'',300).toLowerCase();
    if(status===401||/unauthorized|invalid.*token/.test(lower)){problem='X rejected the saved user-context access token.';solution='Reconnect X / Twitter so the website receives a fresh OAuth 2.0 user access token, then run Test Connection again.';}
    else if(reason==='client-not-enrolled'||/client-not-enrolled|client forbidden|client-forbidden/.test(`${lower} ${ptype}`)){problem='X accepted the user login, but this developer App is not enrolled for the requested write endpoint.';solution='In X Developer Console, confirm this exact App is attached to the Pay Per Use project/package shown under Project Access. If you changed the project/package after connecting, reconnect X / Twitter and test again.';}
    else if(/usage-capped/.test(ptype)||/usage cap|credits? exhausted|insufficient credits|billing|payment required/.test(lower)||status===402){problem='X authentication is valid, but the developer project cannot create this post because its pay-per-use credits/billing allowance is unavailable or exhausted.';solution='Open X Developer Console → Credits / Payments, add enough API credits and confirm the App is using the Pay Per Use project. Then publish a new Fitness Tip again (or intentionally use Test Posting). Test Connection only verifies OAuth/profile access and does not spend credits; you do not need to change the Client ID or Client Secret.';}
    else if(status===429||/rate-limit-exceeded/.test(ptype)){problem='X temporarily rate-limited the write request.';solution='Wait until the X rate-limit window resets, then publish again. The website keeps the failed publication eligible for a later retry.';}
    else if(status===403||/forbidden|permission|write|tweet.write/.test(lower)){problem='X profile authentication works, but X refused the post-writing operation.';solution='Confirm the connected OAuth grant includes tweet.write and that App permissions remain Read and write (or Read and write and Direct message). If permissions were changed in X Developer Console, reconnect X / Twitter so a new user token is issued.';}
    else if(status===400||/invalid request|invalid-request/.test(`${lower} ${ptype}`)){problem='X reached the post-writing endpoint but rejected the request payload.';solution='The website will keep the Fitness Class fitness tip published and record the X error. Retry after refreshing; if it repeats, use the saved X publishing diagnostic shown in the capability check.';}
  }else if(key==='gmail'||key==='email'){
    if(/invalid_grant|unauthorized|invalid credentials|token/.test(lower)){problem='Gmail authorization is invalid or has been revoked.';solution='Disconnect Gmail, reconnect the sender Google account, approve Gmail sending access, and test/send again.';}
    else if(/redirect_uri_mismatch/.test(lower)){problem='Google rejected Gmail OAuth because the redirect URI does not match.';solution='Copy the OAuth Redirect URL shown in this admin card into the Google Cloud OAuth client Authorized redirect URIs exactly, save it, then reconnect.';}
    else if(status===403||/insufficient.*scope|permission.*denied|gmail.*scope/.test(lower)){problem='Google authenticated the account but the saved authorization does not include Gmail sending permission.';solution='Enable Gmail API in the same Google Cloud project, disconnect this Gmail connection, reconnect the correct Google account, approve the Gmail send permission, then run Test Connection again.';}
  }else if(key==='whatsapp'){
    if(status===401||/invalid.*token|unauthorized/.test(lower)){problem='WhatsApp provider authentication failed because the saved token is invalid or expired.';solution='Re-enter the current WhatsApp Cloud token (or GreenAPI token/instance ID), save it, and test again.';}
    else if(status===403||/permission/.test(lower)){problem='The WhatsApp provider authenticated the request but refused the operation due to permission/account configuration.';solution='Check the WhatsApp Business phone number/account permissions and confirm the configured Phone Number ID belongs to the saved token.';}
  }else if(key==='indexnow'||key==='bing'){
    if(status===403||/key.*invalid|forbidden/.test(lower)){problem='IndexNow rejected the request because the dedicated IndexNow verification key could not be validated.';solution='Use a dedicated IndexNow key (not Bing Webmaster Tools → API Access), save it, confirm the Key Verification URL opens publicly and shows that same key, then run Test Connection.';}
    else if(status===422){problem='IndexNow rejected the URL because its host does not match the host that owns the verification key.';solution='Submit the public IronPulse Gym URL on the same hostname shown in Key Verification URL.';}
    else if(status===429||/too many requests/.test(lower)){problem='IndexNow rate-limited the URL submission because too many requests were received recently.';solution='Do not keep pressing Submit Test URL. IronPulse Gym now applies an automatic safety cooldown after HTTP 429 and deduplicates recently submitted URLs before trying IndexNow again.';}
  }

  const prefix=`${name} ${action} failed${technical?` (${technical})`:''}.`;
  const message=`${prefix} ${problem}${solution?` Solution: ${solution}`:''}`;
  const recovery=integrationRecovery(key);
  return {message:clean(message,3200),problem:clean(problem,1800),solution:clean(solution,1800),technical:clean(technical,300),httpStatus:status||null,code:code||null,subcode:subcode||null,authenticationInvalid:isAuthenticationFailure(error),integration:key,recovery,reconnectRequired:!!(recovery&&(isAuthenticationFailure(error)||/disconnect|not connected|revoked|expired|authorization|credential|token/.test(lower)))};
}

export function successMessage(platform,action,details={}){
  const name=platformName(platform),a=String(action||'').toLowerCase();
  if(a==='save')return `${name} settings were saved successfully. No credentials were cleared. Run Test Connection to verify the live API before enabling automatic actions.`;
  if(a==='disconnect')return `${name} was disconnected successfully. Automatic actions for this connection are disabled until you reconnect.`;
  if(a==='connect'||a==='test')return `${name} authentication and API access are working for the saved configuration.${details.account?` Connected account: ${details.account}.`:''}`;
  if(a==='publish')return `${name} accepted the Fitness Tips publication successfully.${details.externalId?` Remote post ID: ${details.externalId}.`:''}`;
  if(a==='submit')return `${name} accepted the URL submission successfully.`;
  if(a==='discover')return `${name} account/location information loaded successfully.`;
  return `${name} ${a||'action'} completed successfully.`;
}
