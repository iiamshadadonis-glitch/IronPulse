import {
  json, readJson, requireAdmin, getSocialIntegrationSettings, getPaymentSettings,
  setSetting, maskSecret, preferredPublicOrigin, DEFAULT_SOCIAL_INTEGRATION_SETTINGS
} from '../../_lib/utils.js';
import { successMessage, diagnoseIntegrationError } from '../../_lib/integration-diagnostics.js';
import { testTelegramConnection, connectTelegram, disconnectTelegram } from '../../_lib/telegram.js';

const clean=(v,n=2000)=>String(v??'').trim().slice(0,n);
const bool=v=>v===true||v==='true'||v==='on'||v===1||v==='1';

function urls(request,env){
  const origin=preferredPublicOrigin(request,env);
  return {
    publicOrigin:origin,
    searchConsolePropertyUrl:`${origin}/`,
    sitemapUrl:`${origin}/sitemap.xml`,
    metaWebhookUrl:`${origin}/api/webhooks/meta-leads`,
    whatsappWebhookUrl:`${origin}/api/webhooks/whatsapp`,
    linkedinWebhookUrl:`${origin}/api/webhooks/linkedin-leads`,linkedinRedirectUrl:`${origin}/api/admin/linkedin-oauth/callback`,
    telegramWebhookUrl:`${origin}/api/webhooks/telegram`,
    xWebhookUrl:`${origin}/api/webhooks/x-activity`,xRedirectUrl:`${origin}/api/admin/x-oauth/callback`,
    gmailRedirectUrl:`${origin}/api/admin/gmail-oauth/callback`,
    searchConsoleRedirectUrl:`${origin}/api/admin/search-console-oauth/callback`,
    googleBusinessRedirectUrl:`${origin}/api/admin/google-business-oauth/callback`,
    googleDriveRedirectUrl:`${origin}/api/admin/google-drive-oauth/callback`,
    youtubeRedirectUrl:`${origin}/api/admin/youtube-oauth/callback`,
    snapchatRedirectUrl:`${origin}/api/admin/snapchat-oauth/callback`,
    threadsRedirectUrl:`${origin}/api/admin/threads-oauth/callback`,
    pinterestRedirectUrl:`${origin}/api/admin/pinterest-oauth/callback`,
    facebookRedirectUrl:`${origin}/api/admin/facebook-oauth/callback`,
    googleIndexingEndpoint:`${origin}/api/admin/social-platform-action`,
    indexNowKeyUrl:`${origin}/indexnow-key.txt`
  };
}

function runtimeSearchConsoleUrl(value,origin,kind){
  const raw=clean(value,1000),fallback=kind==='sitemap'?`${origin}/sitemap.xml`:`${origin}/`;if(!raw||kind==='sitemap')return fallback;
  try{
    const current=new URL(origin),currentHost=current.hostname.toLowerCase().replace(/^www\./,'');
    if(/^sc-domain:/i.test(raw)){
      const savedHost=raw.replace(/^sc-domain:/i,'').trim().toLowerCase().replace(/^www\./,'');
      return savedHost===currentHost?raw:fallback;
    }
    const parsed=new URL(raw),savedHost=parsed.hostname.toLowerCase().replace(/^www\./,'');
    return savedHost===currentHost?raw:fallback;
  }catch{return fallback;}
}


async function testWhatsappProvider(provider,payment){
  if(provider==='green_api'){
    const instance=clean(payment.greenApiInstanceId,500),token=clean(payment.greenApiToken,8000);
    if(!instance||!token)throw new Error('GreenAPI connection test cannot start because the Instance ID or API Token is missing. Enter both values and try Connect GreenAPI again.');
    const res=await fetch(`https://api.green-api.com/waInstance${encodeURIComponent(instance)}/getStateInstance/${encodeURIComponent(token)}`);
    const data=await res.json().catch(()=>({}));
    if(!res.ok){const e=new Error(data?.message||data?.error||`GreenAPI returned HTTP ${res.status}.`);e.httpStatus=res.status;throw e;}
    const state=clean(data?.stateInstance,80);
    if(state!=='authorized'){
      const e=new Error(state==='notAuthorized'?'GreenAPI instance exists, but WhatsApp is not authorized on this instance. Scan the QR code / complete GreenAPI authorization, then test again.':state==='blocked'?'GreenAPI reports that this instance is blocked. Open the GreenAPI console and resolve the blocked instance before using OTP.':state==='sleepMode'?'GreenAPI reports sleepMode. Re-open/restart the instance in GreenAPI and verify that WhatsApp is online, then test again.':`GreenAPI returned instance state: ${state||'unknown'}. The connection is not ready for sending.`);
      e.httpStatus=409;throw e;
    }
    return {ok:true,label:`GreenAPI instance ${instance}`,details:data};
  }
  if(provider==='instautomate'){
    const base=clean(payment.instautomateApiBaseUrl||'https://client.instautomate.com/api',1200).replace(/\/+$/,'');
    const vendor=clean(payment.instautomateVendorUid,600),token=clean(payment.instautomateToken,8000);
    if(!base||!vendor||!token)throw new Error('Instautomate connection test cannot start because API Base URL, Vendor UID or API Access Token is missing. Enter all three values and try Connect Instautomate again.');
    const res=await fetch(`${base}/${encodeURIComponent(vendor)}/contacts`,{headers:{authorization:`Bearer ${token}`,accept:'application/json'}});
    const text=await res.text().catch(()=>'');let data={};try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
    if(!res.ok){const e=new Error(data?.message||data?.error||`Instautomate returned HTTP ${res.status}. Confirm the Vendor UID, API Access Token and account API access.`);e.httpStatus=res.status;throw e;}
    return {ok:true,label:`Instautomate vendor ${vendor}`,details:data};
  }
  const id=clean(payment.whatsappPhoneNumberId,500),token=clean(payment.whatsappCloudToken,8000);
  if(!id||!token)throw new Error('WhatsApp Cloud API connection test cannot start because the Phone Number ID or Cloud Token is missing. Enter both values and try Connect WhatsApp Cloud API again.');
  const res=await fetch(`https://graph.facebook.com/v26.0/${encodeURIComponent(id)}?fields=id,display_phone_number,verified_name,quality_rating`,{headers:{authorization:`Bearer ${token}`}});
  const data=await res.json().catch(()=>({}));
  if(!res.ok){const err=data?.error||{};const e=new Error(err.message||`Meta WhatsApp Cloud API returned HTTP ${res.status}.`);e.httpStatus=res.status;e.upstreamCode=err.code;e.upstreamSubcode=err.error_subcode;e.upstreamMessage=err.message;throw e;}
  return {ok:true,label:data.display_phone_number||data.verified_name||`Phone Number ID ${id}`,details:data};
}

function publicView(s,payment,request,env){
  const runtime=urls(request,env),origin=runtime.publicOrigin;
  const gmailVerified=!!(s.gmail.refreshToken&&s.gmail.connectedEmail&&s.gmail.scopeStatus==='verified_send'&&s.gmail.connectionState==='connected');
  return {
    facebook:{
      enabled:!!s.facebook.enabled,autoPublish:!!s.facebook.autoPublish,connected:s.facebook.connectionState==='connected',connectionState:s.facebook.connectionState||'',connectedAt:s.facebook.connectedAt||'',lastError:s.facebook.lastError||'',lastTestedAt:s.facebook.lastTestedAt||'',lastTestMessage:s.facebook.lastTestMessage||'',lastPublishStatus:s.facebook.lastPublishStatus||'',lastPublishAt:s.facebook.lastPublishAt||'',lastPublishError:s.facebook.lastPublishError||'',lastPublishedUrl:s.facebook.lastPublishedUrl||'',lastWebhookConfiguredAt:s.facebook.lastWebhookConfiguredAt||'',lastWebhookMessage:s.facebook.lastWebhookMessage||'',lastWebhookFields:s.facebook.lastWebhookFields||[],pageId:s.facebook.pageId||'',pageName:s.facebook.pageName||'',pageTasks:Array.isArray(s.facebook.pageTasks)?s.facebook.pageTasks:[],tokenType:s.facebook.tokenType||'',tokenAppId:s.facebook.tokenAppId||'',grantedScopes:Array.isArray(s.facebook.grantedScopes)?s.facebook.grantedScopes:[],publishingReady:s.facebook.publishingReady??null,webhookReady:s.facebook.webhookReady??null,messagingReady:s.facebook.messagingReady??null,leadReady:s.facebook.leadReady??null,engagementReady:s.facebook.engagementReady??null,formIds:s.facebook.formIds||'',graphVersion:s.facebook.graphVersion||'v26.0',appId:s.facebook.appId||'',loginConfigId:s.facebook.loginConfigId||'',
      appSecretMasked:maskSecret(s.facebook.appSecret),pageAccessTokenMasked:maskSecret(s.facebook.pageAccessToken),verifyTokenMasked:maskSecret(s.facebook.verifyToken)
    },
    instagram:{
      enabled:!!s.instagram.enabled,autoPublish:!!s.instagram.autoPublish,connected:s.instagram.connectionState==='connected',connectionState:s.instagram.connectionState||'',connectedAt:s.instagram.connectedAt||'',lastError:s.instagram.lastError||'',lastTestedAt:s.instagram.lastTestedAt||'',lastTestMessage:s.instagram.lastTestMessage||'',lastPublishStatus:s.instagram.lastPublishStatus||'',lastPublishAt:s.instagram.lastPublishAt||'',lastPublishError:s.instagram.lastPublishError||'',lastPublishedUrl:s.instagram.lastPublishedUrl||'',lastPublishImageUrl:s.instagram.lastPublishImageUrl||'',lastPublishedMediaId:s.instagram.lastPublishedMediaId||'',lastWebhookConfiguredAt:s.instagram.lastWebhookConfiguredAt||'',lastWebhookMessage:s.instagram.lastWebhookMessage||'',lastWebhookFields:Array.isArray(s.instagram.lastWebhookFields)?s.instagram.lastWebhookFields:[],instagramBusinessId:s.instagram.instagramBusinessId||'',username:s.instagram.username||'',accountName:s.instagram.accountName||'',accountType:s.instagram.accountType||'',pageId:s.instagram.pageId||'',pageName:s.instagram.pageName||'',pageTasks:Array.isArray(s.instagram.pageTasks)?s.instagram.pageTasks:[],tokenType:s.instagram.tokenType||'',tokenAppId:s.instagram.tokenAppId||'',grantedScopes:Array.isArray(s.instagram.grantedScopes)?s.instagram.grantedScopes:[],identityReady:s.instagram.identityReady??null,publishingReady:s.instagram.publishingReady??null,commentReady:s.instagram.commentReady??null,privateReplyReady:s.instagram.privateReplyReady??null,messagingReady:s.instagram.messagingReady??null,leadReady:s.instagram.leadReady??null,webhookReady:s.instagram.webhookReady??null,commentReadVerified:s.instagram.commentReadVerified??null,webhookSubscriptionMode:s.instagram.webhookSubscriptionMode||'',formIds:s.instagram.formIds||'',graphVersion:s.instagram.graphVersion||'v26.0',appId:s.instagram.appId||'',
      appSecretMasked:maskSecret(s.instagram.appSecret),pageAccessTokenMasked:maskSecret(s.instagram.pageAccessToken),instagramLoginTokenMasked:maskSecret(s.instagram.instagramLoginToken),instagramLoginReady:s.instagram.instagramLoginReady??null,instagramLoginUsername:s.instagram.instagramLoginUsername||'',instagramLoginLastError:s.instagram.instagramLoginLastError||'',verifyTokenMasked:maskSecret(s.instagram.verifyToken)
    },
    whatsapp:{
      enabled:payment.whatsappOtpEnabled!==false,connected:payment.whatsappConnectionState==='connected'&&payment.whatsappConnectedProvider===(payment.otpProvider||'whatsapp_cloud'),connectionState:payment.whatsappConnectionState||'',connectedProvider:payment.whatsappConnectedProvider||'',connectedLabel:payment.whatsappConnectedLabel||'',lastTestedAt:payment.whatsappLastTestedAt||'',lastError:payment.whatsappLastError||'',webhookVerifyTokenMasked:maskSecret(payment.whatsappWebhookVerifyToken),otpProvider:payment.otpProvider||'whatsapp_cloud',phoneNumberId:payment.whatsappPhoneNumberId||'',cloudTokenMasked:maskSecret(payment.whatsappCloudToken),greenApiInstanceId:payment.greenApiInstanceId||'',greenApiTokenMasked:maskSecret(payment.greenApiToken),instautomateApiBaseUrl:payment.instautomateApiBaseUrl||'https://client.instautomate.com/api',instautomateVendorUid:payment.instautomateVendorUid||'',instautomateFromPhoneNumberId:payment.instautomateFromPhoneNumberId||'',instautomateTokenMasked:maskSecret(payment.instautomateToken)
    },
    snapchat:{enabled:!!s.snapchat.enabled,autoPublishStory:!!s.snapchat.autoPublishStory,connected:s.snapchat.connectionState==='connected'&&!!s.snapchat.refreshToken,connectionState:s.snapchat.connectionState||'',connectedAt:s.snapchat.connectedAt||'',oauthClientId:s.snapchat.oauthClientId||'',oauthClientSecretMasked:maskSecret(s.snapchat.oauthClientSecret),accessTokenMasked:maskSecret(s.snapchat.accessToken),refreshTokenMasked:maskSecret(s.snapchat.refreshToken),grantedScopes:s.snapchat.grantedScopes||'',publicProfileQuery:s.snapchat.publicProfileQuery||'',publicProfileId:s.snapchat.publicProfileId||'',publicProfileName:s.snapchat.publicProfileName||'',publicProfileUsername:s.snapchat.publicProfileUsername||'',snapKitClientId:s.snapchat.snapKitClientId||s.snapchat.clientId||'',clientId:s.snapchat.snapKitClientId||s.snapchat.clientId||'',lastTestedAt:s.snapchat.lastTestedAt||'',lastTestMessage:s.snapchat.lastTestMessage||'',lastError:s.snapchat.lastError||'',publishingReady:s.snapchat.publishingReady===true,commentsReady:false,lastPublishStatus:s.snapchat.lastPublishStatus||'',lastPublishAt:s.snapchat.lastPublishAt||'',lastPublishError:s.snapchat.lastPublishError||'',lastPublishedUrl:s.snapchat.lastPublishedUrl||''},
    youtube:{enabled:!!s.youtube.enabled,autoPublish:!!s.youtube.autoPublish,connected:s.youtube.connectionState==='connected'&&!!s.youtube.refreshToken,connectionState:s.youtube.connectionState||'',channelId:s.youtube.channelId||'',channelName:s.youtube.channelName||'',clientId:s.youtube.clientId||'',clientSecretMasked:maskSecret(s.youtube.clientSecret),accessTokenMasked:maskSecret(s.youtube.accessToken),refreshTokenMasked:maskSecret(s.youtube.refreshToken),grantedScopes:s.youtube.grantedScopes||'',privacyStatus:s.youtube.privacyStatus||'public',lastTestedAt:s.youtube.lastTestedAt||'',lastTestMessage:s.youtube.lastTestMessage||'',lastError:s.youtube.lastError||'',lastPublishStatus:s.youtube.lastPublishStatus||'',lastPublishAt:s.youtube.lastPublishAt||'',lastPublishError:s.youtube.lastPublishError||'',lastPublishedUrl:s.youtube.lastPublishedUrl||''},
    linkedin:{
      enabled:!!s.linkedin.enabled,autoPublish:!!s.linkedin.autoPublish,connected:s.linkedin.connectionState==='connected',connectionState:s.linkedin.connectionState||'',connectedAt:s.linkedin.connectedAt||'',lastError:s.linkedin.lastError||'',lastTestedAt:s.linkedin.lastTestedAt||'',lastTestMessage:s.linkedin.lastTestMessage||'',lastPublishStatus:s.linkedin.lastPublishStatus||'',lastPublishAt:s.linkedin.lastPublishAt||'',lastPublishError:s.linkedin.lastPublishError||'',lastPublishedUrl:s.linkedin.lastPublishedUrl||'',clientId:s.linkedin.clientId||'',memberId:s.linkedin.memberId||'',memberName:s.linkedin.memberName||'',memberEmail:s.linkedin.memberEmail||'',publishingIdentity:s.linkedin.publishingIdentity||((s.linkedin.ownerType==='organization')?'organization':'member'),organizationId:s.linkedin.organizationId||(s.linkedin.ownerType==='organization'?s.linkedin.ownerId:'')||'',organizationName:s.linkedin.organizationName||'',communityEnabled:!!s.linkedin.communityEnabled,leadSyncEnabled:!!s.linkedin.leadSyncEnabled,adsEnabled:!!s.linkedin.adsEnabled,leadOwnerType:s.linkedin.leadOwnerType||s.linkedin.ownerType||'sponsoredAccount',leadOwnerId:s.linkedin.leadOwnerId||s.linkedin.ownerId||'',leadType:s.linkedin.leadType||'SPONSORED',ownerType:s.linkedin.ownerType||'sponsoredAccount',ownerId:s.linkedin.ownerId||'',apiVersion:'202608',grantedScopes:s.linkedin.grantedScopes||'',identityReady:s.linkedin.identityReady??null,publishingReady:s.linkedin.publishingReady??null,commentReadReady:s.linkedin.commentReadReady??null,commentWriteReady:s.linkedin.commentWriteReady??null,leadSyncReady:s.linkedin.leadSyncReady??null,adsReady:s.linkedin.adsReady??null,
      clientSecretMasked:maskSecret(s.linkedin.clientSecret),accessTokenMasked:maskSecret(s.linkedin.accessToken),refreshTokenMasked:maskSecret(s.linkedin.refreshToken)
    },
    telegram:{enabled:!!s.telegram.enabled,autoPublish:!!s.telegram.autoPublish,connected:s.telegram.connectionState==='connected'&&!!s.telegram.botToken,connectionState:s.telegram.connectionState||'',connectedAt:s.telegram.connectedAt||'',botId:s.telegram.botId||'',botUsername:s.telegram.botUsername||'',botName:s.telegram.botName||'',targetChatId:s.telegram.targetChatId||'',targetChatTitle:s.telegram.targetChatTitle||'',webhookReady:!!s.telegram.webhookReady,lastTestedAt:s.telegram.lastTestedAt||'',lastTestMessage:s.telegram.lastTestMessage||'',lastError:s.telegram.lastError||'',lastPublishAt:s.telegram.lastPublishAt||'',lastPublishError:s.telegram.lastPublishError||'',botTokenMasked:maskSecret(s.telegram.botToken),webhookSecretMasked:maskSecret(s.telegram.webhookSecret)},
    x:{enabled:!!s.x.enabled,autoPublish:!!s.x.autoPublish,connected:s.x.connectionState==='connected',connectionState:s.x.connectionState||'',connectedAt:s.x.connectedAt||'',lastError:s.x.lastError||'',lastPublishStatus:s.x.lastPublishStatus||'',lastPublishAt:s.x.lastPublishAt||'',lastPublishError:s.x.lastPublishError||'',lastPublishedUrl:s.x.lastPublishedUrl||'',publishingReady:s.x.publishingReady??null,publishingProbeStatus:s.x.publishingProbeStatus||'',publishingProbeAt:s.x.publishingProbeAt||'',publishingProbeMessage:s.x.publishingProbeMessage||'',userId:s.x.userId||'',username:s.x.username||'',clientId:s.x.clientId||'',clientSecretMasked:maskSecret(s.x.clientSecret),accessTokenMasked:maskSecret(s.x.accessToken),refreshTokenMasked:maskSecret(s.x.refreshToken),tokenExpiresAt:s.x.tokenExpiresAt||'',grantedScopes:s.x.grantedScopes||'',lastTestedAt:s.x.lastTestedAt||'',lastTestMessage:s.x.lastTestMessage||'',bearerTokenMasked:maskSecret(s.x.bearerToken),apiSecretMasked:maskSecret(s.x.apiSecret)},
    searchConsole:{enabled:!!s.searchConsole.enabled,autoSubmitAuditions:s.searchConsole.autoSubmitAuditions!==false,clientId:s.searchConsole.clientId||'',connectedEmail:s.searchConsole.connectedEmail||'',propertyUrl:runtimeSearchConsoleUrl(s.searchConsole.propertyUrl,origin,'property'),sitemapUrl:runtimeSearchConsoleUrl(s.searchConsole.sitemapUrl,origin,'sitemap'),connected:!!s.searchConsole.refreshToken,clientSecretMasked:maskSecret(s.searchConsole.clientSecret),refreshTokenMasked:maskSecret(s.searchConsole.refreshToken),grantedScopes:s.searchConsole.grantedScopes||'',permissionLevel:s.searchConsole.permissionLevel||'',scopeStatus:s.searchConsole.scopeStatus||'',lastTestedAt:s.searchConsole.lastTestedAt||'',lastSubmittedAt:s.searchConsole.lastSubmittedAt||'',lastError:s.searchConsole.lastError||''},
    threads:{enabled:!!s.threads.enabled,appId:s.threads.appId||'',userId:s.threads.userId||'',username:s.threads.username||'',connected:!!s.threads.accessToken,appSecretMasked:maskSecret(s.threads.appSecret),accessTokenMasked:maskSecret(s.threads.accessToken),tokenExpiresAt:s.threads.tokenExpiresAt||'',autoPublish:s.threads.autoPublish!==false,lastError:s.threads.lastError||'',lastTestedAt:s.threads.lastTestedAt||'',lastTestMessage:s.threads.lastTestMessage||'',lastPublishStatus:s.threads.lastPublishStatus||'',lastPublishAt:s.threads.lastPublishAt||'',lastPublishError:s.threads.lastPublishError||'',lastPublishedUrl:s.threads.lastPublishedUrl||'',lastPublishedArticleUrl:s.threads.lastPublishedArticleUrl||'',latestPermalink:s.threads.latestPermalink||'',identityReady:s.threads.identityReady??null,publishingReady:s.threads.publishingReady??null,replyReadReady:s.threads.replyReadReady??null,replyManagementReady:s.threads.replyManagementReady??null,requestedPermissions:Array.isArray(s.threads.requestedPermissions)?s.threads.requestedPermissions:[]},
    pinterest:{enabled:!!s.pinterest.enabled,appId:s.pinterest.appId||'',username:s.pinterest.username||'',boardId:s.pinterest.boardId||'',boardName:s.pinterest.boardName||'',connected:!!s.pinterest.accessToken,appSecretMasked:maskSecret(s.pinterest.appSecret),accessTokenMasked:maskSecret(s.pinterest.accessToken),refreshTokenMasked:maskSecret(s.pinterest.refreshToken),tokenExpiresAt:s.pinterest.tokenExpiresAt||'',refreshTokenExpiresAt:s.pinterest.refreshTokenExpiresAt||'',grantedScopes:Array.isArray(s.pinterest.grantedScopes)?s.pinterest.grantedScopes:[],autoPublish:s.pinterest.autoPublish!==false,lastError:s.pinterest.lastError||'',lastTestedAt:s.pinterest.lastTestedAt||'',lastTestMessage:s.pinterest.lastTestMessage||'',lastPublishStatus:s.pinterest.lastPublishStatus||'',lastPublishAt:s.pinterest.lastPublishAt||'',lastPublishError:s.pinterest.lastPublishError||'',lastPublishedUrl:s.pinterest.lastPublishedUrl||'',accountReadReady:s.pinterest.accountReadReady??null,boardsReadReady:s.pinterest.boardsReadReady??null,pinsReadReady:s.pinterest.pinsReadReady??null,pinPublishingReady:s.pinterest.pinPublishingReady??null,commentModerationReady:false,boardWarning:s.pinterest.boardWarning||'',pinsWarning:s.pinterest.pinsWarning||''},
    googleIndexing:{enabled:!!s.googleIndexing.enabled,autoPublish:!!s.googleIndexing.autoPublish,eligibilityConfirmed:!!s.googleIndexing.eligibilityConfirmed,serviceAccountEmail:s.googleIndexing.serviceAccountEmail||'',privateKeyMasked:maskSecret(s.googleIndexing.privateKey),testUrl:s.googleIndexing.testUrl||'',connected:!!(s.googleIndexing.serviceAccountEmail&&s.googleIndexing.privateKey),lastSubmittedAt:s.googleIndexing.lastSubmittedAt||'',lastError:s.googleIndexing.lastError||''},
    googleBusiness:{enabled:!!s.googleBusiness.enabled,autoPublish:!!s.googleBusiness.autoPublish,clientId:s.googleBusiness.clientId||'',connected:!!s.googleBusiness.refreshToken,connectedEmail:s.googleBusiness.connectedEmail||'',accountId:s.googleBusiness.accountId||'',accountName:s.googleBusiness.accountName||'',locationId:s.googleBusiness.locationId||'',locationName:s.googleBusiness.locationName||'',clientSecretMasked:maskSecret(s.googleBusiness.clientSecret),refreshTokenMasked:maskSecret(s.googleBusiness.refreshToken),lastTestedAt:s.googleBusiness.lastTestedAt||'',lastPublishedAt:s.googleBusiness.lastPublishedAt||'',lastReviewsSyncAt:s.googleBusiness.lastReviewsSyncAt||'',lastDiscoveryAt:s.googleBusiness.lastDiscoveryAt||'',apiAccessStatus:s.googleBusiness.apiAccessStatus||'',accountManagementReady:s.googleBusiness.accountManagementReady??null,businessInformationReady:s.googleBusiness.businessInformationReady??null,postsReviewsReady:s.googleBusiness.postsReviewsReady??null,lastApiAccessMessage:s.googleBusiness.lastApiAccessMessage||'',lastError:s.googleBusiness.lastError||''},
    googleDrive:{enabled:!!s.googleDrive.enabled,connected:s.googleDrive.connectionState==='connected',connectionState:s.googleDrive.connectionState||'',connectedAt:s.googleDrive.connectedAt||'',testFileUrl:s.googleDrive.testFileUrl||'',apiKeyMasked:maskSecret(s.googleDrive.apiKey),oauthClientId:s.googleDrive.oauthClientId||'',oauthClientSecretMasked:maskSecret(s.googleDrive.oauthClientSecret),oauthConnected:!!s.googleDrive.refreshToken,connectedEmail:s.googleDrive.connectedEmail||'',grantedScopes:s.googleDrive.grantedScopes||'',rootFolderUrl:s.googleDrive.rootFolderUrl||'',rootFolderId:s.googleDrive.rootFolderId||'',rootFolderName:s.googleDrive.rootFolderName||'',plansFolderId:s.googleDrive.plansFolderId||'',plansFolderName:s.googleDrive.plansFolderName||'',storyFolderId:s.googleDrive.storyFolderId||'',storyFolderName:s.googleDrive.storyFolderName||'',postFolderId:s.googleDrive.postFolderId||'',postFolderName:s.googleDrive.postFolderName||'',uploadReady:!!s.googleDrive.uploadReady,lastUploadTestedAt:s.googleDrive.lastUploadTestedAt||'',lastUploadedAt:s.googleDrive.lastUploadedAt||'',lastUploadedFileName:s.googleDrive.lastUploadedFileName||'',lastStoryUploadedAt:s.googleDrive.lastStoryUploadedAt||'',lastStoryUploadedFileName:s.googleDrive.lastStoryUploadedFileName||'',lastPostUploadedAt:s.googleDrive.lastPostUploadedAt||'',lastPostUploadedFileName:s.googleDrive.lastPostUploadedFileName||'',lastTestedAt:s.googleDrive.lastTestedAt||'',lastTestMessage:s.googleDrive.lastTestMessage||'',lastTestFileId:s.googleDrive.lastTestFileId||'',lastTestFileName:s.googleDrive.lastTestFileName||'',lastError:s.googleDrive.lastError||''},
    indexNow:{enabled:!!s.indexNow.enabled,autoPublish:s.indexNow.autoPublish!==false,keyMasked:maskSecret(s.indexNow.key),connected:!!s.indexNow.key,lastSubmittedAt:s.indexNow.lastSubmittedAt||'',lastSubmittedUrl:s.indexNow.lastSubmittedUrl||'',lastSubmitStatus:Number(s.indexNow.lastSubmitStatus||0)||0,lastSubmitError:s.indexNow.lastSubmitError||'',cooldownUntil:s.indexNow.cooldownUntil||'',lastTestedAt:s.indexNow.lastTestedAt||'',lastTestMessage:s.indexNow.lastTestMessage||'',lastError:s.indexNow.lastError||''},
    gmail:{enabled:!!s.gmail.enabled,otpEnabled:!!s.gmail.otpEnabled,senderName:s.gmail.senderName||'DropBeat Dance Studio',senderEmail:s.gmail.senderEmail||'',adminCopyEmail:s.gmail.adminCopyEmail||'',clientId:s.gmail.clientId||'',connectedEmail:gmailVerified?s.gmail.connectedEmail||'':'',clientSecretMasked:maskSecret(s.gmail.clientSecret),refreshTokenMasked:gmailVerified?maskSecret(s.gmail.refreshToken):'',connected:gmailVerified,connectionState:s.gmail.connectionState||'',grantedScopes:gmailVerified?s.gmail.grantedScopes||'':'',scopeStatus:s.gmail.scopeStatus||'',lastTestedAt:s.gmail.lastTestedAt||'',lastError:s.gmail.lastError||''},
    deletedAt:{
      facebook:s.facebook.deletedAt||'',instagram:s.instagram.deletedAt||'',threads:s.threads.deletedAt||'',pinterest:s.pinterest.deletedAt||'',youtube:s.youtube.deletedAt||'',x:s.x.deletedAt||'',snapchat:s.snapchat.deletedAt||'',linkedin:s.linkedin.deletedAt||'',telegram:s.telegram.deletedAt||'',searchConsole:s.searchConsole.deletedAt||'',googleIndexing:s.googleIndexing.deletedAt||'',googleBusiness:s.googleBusiness.deletedAt||'',googleDrive:s.googleDrive.deletedAt||'',indexNow:s.indexNow.deletedAt||'',gmail:s.gmail.deletedAt||'',whatsapp:payment.whatsappIntegrationDeletedAt||''
    },
    ...runtime
  };
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const [social,payment]=await Promise.all([getSocialIntegrationSettings(env),getPaymentSettings(env)]);
  return json({settings:publicView(social,payment,request,env)});
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const b=await readJson(request),platform=clean(b.platform,40).toLowerCase();
  const social=await getSocialIntegrationSettings(env),payment=await getPaymentSettings(env);

  const action=clean(b.action,40).toLowerCase();
  if(action==='delete_integration'){
    const now=new Date().toISOString();
    const map={
      facebook:'facebook',instagram:'instagram',threads:'threads',pinterest:'pinterest',youtube:'youtube',x:'x',twitter:'x',snapchat:'snapchat',linkedin:'linkedin',telegram:'telegram',
      search_console:'searchConsole',searchconsole:'searchConsole',google_search_console:'searchConsole',google_indexing:'googleIndexing',googleindexing:'googleIndexing',indexing_api:'googleIndexing',
      google_business:'googleBusiness',googlebusiness:'googleBusiness',business_profile:'googleBusiness',google_drive:'googleDrive',googledrive:'googleDrive',drive:'googleDrive',indexnow:'indexNow',bing_indexnow:'indexNow',bing:'indexNow',gmail:'gmail',email:'gmail'
    };
    if(platform==='whatsapp'){
      const next={...payment,
        whatsappWebhookVerifyToken:'',whatsappOtpEnabled:false,whatsappPhoneNumberId:'',whatsappCloudToken:'',greenApiInstanceId:'',greenApiToken:'',
        instautomateVendorUid:'',instautomateToken:'',instautomateFromPhoneNumberId:'',whatsappConnectedProvider:'',whatsappConnectedLabel:'',whatsappConnectedAt:'',
        whatsappConnectionState:'disconnected',whatsappLastTestedAt:'',whatsappLastError:'',whatsappIntegrationDeletedAt:now,updatedAt:now
      };
      await setSetting(env,'payment_settings',next);
    }else{
      const key=map[platform];
      if(!key||!DEFAULT_SOCIAL_INTEGRATION_SETTINGS[key])return json({error:'This integration cannot be deleted from this endpoint.'},400);
      social[key]={...DEFAULT_SOCIAL_INTEGRATION_SETTINGS[key],deletedAt:now};
      await setSetting(env,'social_integration_settings',social);
    }
    const [savedSocial,savedPayment]=await Promise.all([getSocialIntegrationSettings(env),getPaymentSettings(env)]);
    return json({ok:true,message:'Integration deleted. Saved credentials and connection data were cleared.',settings:publicView(savedSocial,savedPayment,request,env)});
  }

  // Any later save/reconfiguration means the integration is no longer in the deleted state.
  const normalMap={facebook:'facebook',instagram:'instagram',threads:'threads',pinterest:'pinterest',youtube:'youtube',x:'x',twitter:'x',snapchat:'snapchat',linkedin:'linkedin',telegram:'telegram',search_console:'searchConsole',searchconsole:'searchConsole',google_search_console:'searchConsole',google_indexing:'googleIndexing',googleindexing:'googleIndexing',indexing_api:'googleIndexing',google_business:'googleBusiness',googlebusiness:'googleBusiness',business_profile:'googleBusiness',google_drive:'googleDrive',googledrive:'googleDrive',drive:'googleDrive',indexnow:'indexNow',bing_indexnow:'indexNow',bing:'indexNow',gmail:'gmail',email:'gmail'};
  if(normalMap[platform]&&social[normalMap[platform]])delete social[normalMap[platform]].deletedAt;
  if(platform==='whatsapp')payment.whatsappIntegrationDeletedAt='';

  if(platform==='facebook'){
    const c={...social.facebook,enabled:bool(b.enabled),autoPublish:Object.prototype.hasOwnProperty.call(b,'autoPublish')?bool(b.autoPublish):!!social.facebook.autoPublish,pageId:clean(b.pageId,120),formIds:clean(b.formIds,1200),graphVersion:clean(b.graphVersion,20)||'v26.0',appId:clean(b.appId,300),loginConfigId:clean(b.loginConfigId,300)};
    if(clean(b.appSecret,5000))c.appSecret=clean(b.appSecret,5000);
    if(clean(b.pageAccessToken,8000))c.pageAccessToken=clean(b.pageAccessToken,8000);
    if(clean(b.verifyToken,1000))c.verifyToken=clean(b.verifyToken,1000);
    social.facebook=c;
    await setSetting(env,'social_integration_settings',social);
  }else if(platform==='instagram'){
    const c={...social.instagram,enabled:bool(b.enabled),autoPublish:Object.prototype.hasOwnProperty.call(b,'autoPublish')?bool(b.autoPublish):!!social.instagram.autoPublish,instagramBusinessId:clean(b.instagramBusinessId,120),pageId:clean(b.pageId,120),formIds:clean(b.formIds,1200),graphVersion:clean(b.graphVersion,20)||'v26.0',appId:clean(b.appId,300)||social.instagram.appId||''};
    if(clean(b.appSecret,5000))c.appSecret=clean(b.appSecret,5000);
    if(clean(b.pageAccessToken,8000))c.pageAccessToken=clean(b.pageAccessToken,8000);
    if(clean(b.instagramLoginToken,8000)){c.instagramLoginToken=clean(b.instagramLoginToken,8000);c.instagramLoginReady=null;c.instagramLoginLastError='';}
    if(clean(b.verifyToken,1000))c.verifyToken=clean(b.verifyToken,1000);
    social.instagram=c;
    await setSetting(env,'social_integration_settings',social);
  }else if(platform==='snapchat'){
    const oldSnap=social.snapchat||{},c={...oldSnap,enabled:bool(b.enabled),autoPublishStory:Object.prototype.hasOwnProperty.call(b,'autoPublishStory')?bool(b.autoPublishStory):!!oldSnap.autoPublishStory,oauthClientId:clean(b.oauthClientId,800)||oldSnap.oauthClientId||'',publicProfileQuery:clean(b.publicProfileQuery,300),publicProfileId:clean(b.publicProfileId,300)||oldSnap.publicProfileId||'',snapKitClientId:clean(b.snapKitClientId,800)||oldSnap.snapKitClientId||oldSnap.clientId||''};
    c.clientId=c.snapKitClientId;
    if(clean(b.oauthClientSecret,5000))c.oauthClientSecret=clean(b.oauthClientSecret,5000);
    if(c.enabled&&(!c.oauthClientId||!c.oauthClientSecret))return json({error:'Enter the Snapchat Business OAuth Client ID and Client Secret before enabling Snapchat. Create these credentials in Snapchat Business Settings → Business Details → Create OAuth App.'},400);
    if(c.autoPublishStory&&(!c.refreshToken||!c.publicProfileId||c.publishingReady!==true))return json({error:'Connect Snapchat Business OAuth and run Test Connection until Public Profile Story publishing is Ready before enabling automatic Snapchat Stories.'},400);
    social.snapchat=c;await setSetting(env,'social_integration_settings',social);
  }else if(platform==='youtube'){
    const c={...social.youtube,enabled:bool(b.enabled),autoPublish:Object.prototype.hasOwnProperty.call(b,'autoPublish')?bool(b.autoPublish):!!social.youtube.autoPublish,clientId:clean(b.clientId,800)||social.youtube.clientId||'',privacyStatus:['public','unlisted','private'].includes(clean(b.privacyStatus,40))?clean(b.privacyStatus,40):(social.youtube.privacyStatus||'public')};
    if(clean(b.clientSecret,5000))c.clientSecret=clean(b.clientSecret,5000);
    if(c.enabled&&(!c.clientId||!c.clientSecret))return json({error:'Enter the YouTube OAuth Client ID and Client Secret before enabling YouTube.'},400);
    if(c.autoPublish&&!c.refreshToken)return json({error:'Connect YouTube with OAuth first, then enable automatic YouTube publishing.'},400);
    social.youtube=c;await setSetting(env,'social_integration_settings',social);
  }else if(platform==='linkedin'){
    const publishingIdentity=['member','organization'].includes(clean(b.publishingIdentity,40))?clean(b.publishingIdentity,40):(social.linkedin.publishingIdentity||'member');
    const leadOwnerType=['sponsoredAccount','organization'].includes(clean(b.leadOwnerType||b.ownerType,40))?clean(b.leadOwnerType||b.ownerType,40):(social.linkedin.leadOwnerType||social.linkedin.ownerType||'sponsoredAccount');
    const leadType=['SPONSORED','EVENT','COMPANY','ORGANIZATION_PRODUCT'].includes(clean(b.leadType,40).toUpperCase())?clean(b.leadType,40).toUpperCase():(social.linkedin.leadType||'SPONSORED');
    const organizationId=clean(b.organizationId,240)||social.linkedin.organizationId||(publishingIdentity==='organization'&&social.linkedin.ownerType==='organization'?social.linkedin.ownerId:'');
    const leadOwnerId=clean(b.leadOwnerId||b.ownerId,240)||social.linkedin.leadOwnerId||social.linkedin.ownerId||'';
    const c={...social.linkedin,enabled:bool(b.enabled),autoPublish:Object.prototype.hasOwnProperty.call(b,'autoPublish')?bool(b.autoPublish):!!social.linkedin.autoPublish,clientId:clean(b.clientId,500)||social.linkedin.clientId||'',publishingIdentity,organizationId,communityEnabled:bool(b.communityEnabled),leadSyncEnabled:bool(b.leadSyncEnabled),adsEnabled:bool(b.adsEnabled),leadOwnerType,leadOwnerId,leadType,apiVersion:'202608',ownerType:leadOwnerType,ownerId:leadOwnerId};
    if(clean(b.clientSecret,5000))c.clientSecret=clean(b.clientSecret,5000);
    // Legacy manual token is still accepted for backward compatibility, but OAuth Connect is the normal path.
    if(clean(b.accessToken,8000))c.accessToken=clean(b.accessToken,8000);
    social.linkedin=c;
    await setSetting(env,'social_integration_settings',social);
  }else if(platform==='telegram'){
    const action=clean(b.action,40).toLowerCase(),old=social.telegram||{},c={...old,enabled:Object.prototype.hasOwnProperty.call(b,'enabled')?bool(b.enabled):!!old.enabled,autoPublish:Object.prototype.hasOwnProperty.call(b,'autoPublish')?bool(b.autoPublish):!!old.autoPublish,targetChatId:Object.prototype.hasOwnProperty.call(b,'targetChatId')?clean(b.targetChatId,300):old.targetChatId||''};
    if(clean(b.botToken,9000))c.botToken=clean(b.botToken,9000);
    if(!c.webhookSecret)c.webhookSecret=crypto.randomUUID().replace(/-/g,'');
    const webhookUrl=urls(request,env).telegramWebhookUrl;
    if(action==='disconnect'){
      await disconnectTelegram(c).catch(()=>{});Object.assign(c,{enabled:false,connectionState:'disconnected',webhookReady:false,lastError:'',lastTestMessage:'Telegram webhook disconnected.'});
    }else if(action==='connect'||action==='test'){
      if(!c.botToken)return json({error:'Enter the Telegram Bot Token from BotFather first.'},400);
      try{const t=action==='connect'?await connectTelegram(c,webhookUrl):await testTelegramConnection(c);Object.assign(c,{connectionState:'connected',connectedAt:c.connectedAt||new Date().toISOString(),botId:String(t.me?.id||''),botUsername:t.me?.username||'',botName:t.me?.first_name||'',targetChatTitle:t.chat?.title||t.chat?.username||'',webhookReady:action==='connect'?true:!!t.webhook?.url,lastTestedAt:new Date().toISOString(),lastTestMessage:t.message,lastError:''});}
      catch(error){Object.assign(c,{connectionState:'error',webhookReady:false,lastTestedAt:new Date().toISOString(),lastError:error.message});social.telegram=c;await setSetting(env,'social_integration_settings',social);return json({error:error.message},400);}
    }
    if(c.enabled&&c.connectionState!=='connected')return json({error:'Connect and test the Telegram bot before enabling it.'},400);
    if(c.autoPublish&&!c.targetChatId)return json({error:'Enter a Telegram target group, channel or chat ID before enabling automatic publishing.'},400);
    social.telegram=c;await setSetting(env,'social_integration_settings',social);
  }else if(platform==='x'||platform==='twitter'){
    const c={...social.x,enabled:bool(b.enabled),autoPublish:Object.prototype.hasOwnProperty.call(b,'autoPublish')?bool(b.autoPublish):!!social.x.autoPublish,userId:clean(b.userId,200)||social.x.userId||'',clientId:clean(b.clientId,1000)||social.x.clientId||''};
    if(clean(b.clientSecret,5000))c.clientSecret=clean(b.clientSecret,5000);
    // Legacy fields are intentionally still accepted so existing deployments are not broken.
    if(clean(b.bearerToken,8000))c.bearerToken=clean(b.bearerToken,8000);
    if(clean(b.apiSecret,5000))c.apiSecret=clean(b.apiSecret,5000);
    // V16.43: disabling X (or its automatic publishing switch) clears stale publish diagnostics.
    // Authentication remains saved so re-enabling X never forces an unnecessary reconnect.
    if(!c.enabled||!c.autoPublish){c.lastError='';c.lastTestMessage='';c.lastPublishError='';c.lastPublishStatus='';c.publishingReady=null;c.publishingProbeStatus='';c.publishingProbeAt='';c.publishingProbeMessage='';}
    social.x=c;
    await setSetting(env,'social_integration_settings',social);
  }else if(platform==='search_console'||platform==='searchconsole'||platform==='google_search_console'){
    const origin=preferredPublicOrigin(request,env),c={...social.searchConsole,enabled:bool(b.enabled),autoSubmitAuditions:Object.prototype.hasOwnProperty.call(b,'autoSubmitAuditions')?bool(b.autoSubmitAuditions):social.searchConsole.autoSubmitAuditions!==false,clientId:clean(b.clientId,600),propertyUrl:runtimeSearchConsoleUrl(b.propertyUrl,origin,'property'),sitemapUrl:runtimeSearchConsoleUrl(b.sitemapUrl,origin,'sitemap')};
    if(clean(b.clientSecret,5000))c.clientSecret=clean(b.clientSecret,5000);
    if(c.enabled&&!c.refreshToken)return json({error:'Connect Google Search Console first, then enable automatic sitemap submission.'},400);
    social.searchConsole=c;await setSetting(env,'social_integration_settings',social);
  }else if(platform==='threads'){
    const c={...social.threads,enabled:bool(b.enabled),appId:clean(b.appId,600),autoPublish:Object.prototype.hasOwnProperty.call(b,'autoPublish')?bool(b.autoPublish):social.threads.autoPublish!==false};
    if(clean(b.appSecret,5000))c.appSecret=clean(b.appSecret,5000);
    if(c.enabled&&!c.accessToken)return json({error:'Connect Threads first, then enable automatic article publishing.'},400);
    social.threads=c;await setSetting(env,'social_integration_settings',social);
  }else if(platform==='pinterest'){
    const c={...social.pinterest,enabled:bool(b.enabled),appId:clean(b.appId,600),boardId:clean(b.boardId,300),autoPublish:Object.prototype.hasOwnProperty.call(b,'autoPublish')?bool(b.autoPublish):social.pinterest.autoPublish!==false};
    if(clean(b.appSecret,5000))c.appSecret=clean(b.appSecret,5000);
    if(c.enabled&&!c.accessToken)return json({error:'Connect Pinterest first, then enable automatic article Pins.'},400);
    if(c.enabled&&!c.boardId)return json({error:'Enter the Pinterest Board ID that should receive new dance class Pins before enabling Pinterest.'},400);
    social.pinterest=c;await setSetting(env,'social_integration_settings',social);
  }else if(platform==='google_indexing'||platform==='googleindexing'||platform==='indexing_api'){
    const c={...social.googleIndexing,enabled:bool(b.enabled),autoPublish:Object.prototype.hasOwnProperty.call(b,'autoPublish')?bool(b.autoPublish):!!social.googleIndexing.autoPublish,eligibilityConfirmed:bool(b.eligibilityConfirmed),serviceAccountEmail:clean(b.serviceAccountEmail,600),testUrl:clean(b.testUrl,1500)};
    if(clean(b.privateKey,12000))c.privateKey=clean(b.privateKey,12000);
    if(c.enabled&&(!c.serviceAccountEmail||!c.privateKey))return json({error:'Enter the Google service-account email and private key before enabling the Indexing API.'},400);
    if(c.enabled&&!c.eligibilityConfirmed)return json({error:'Google allows the Indexing API only for eligible JobPosting or livestream BroadcastEvent pages. Confirm eligibility before enabling automatic submissions.'},400);
    social.googleIndexing=c;await setSetting(env,'social_integration_settings',social);
  }else if(platform==='google_business'||platform==='googlebusiness'||platform==='business_profile'){
    const c={...social.googleBusiness,enabled:bool(b.enabled),autoPublish:Object.prototype.hasOwnProperty.call(b,'autoPublish')?bool(b.autoPublish):!!social.googleBusiness.autoPublish,clientId:clean(b.clientId,600),accountId:clean(b.accountId,300).replace(/^accounts\//i,''),accountName:clean(b.accountName,300),locationId:clean(b.locationId,300).replace(/^locations\//i,''),locationName:clean(b.locationName,300)};
    if(clean(b.clientSecret,5000))c.clientSecret=clean(b.clientSecret,5000);
    if(c.enabled&&!c.refreshToken)return json({error:'Connect Google Business Profile first, then enable the integration.'},400);
    if(c.enabled&&(!c.accountId||!c.locationId))return json({error:'Choose the Google Business Profile account and business location before enabling the integration.'},400);
    social.googleBusiness=c;await setSetting(env,'social_integration_settings',social);
  }else if(platform==='google_drive'||platform==='googledrive'||platform==='drive'){
    const oldDrive=social.googleDrive||{},rootFolderUrl=clean(b.rootFolderUrl,2400),oauthClientId=clean(b.oauthClientId,1200);
    const c={...oldDrive,enabled:bool(b.enabled),testFileUrl:clean(b.testFileUrl,2400),rootFolderUrl,oauthClientId};
    if(clean(b.apiKey,5000)){c.apiKey=clean(b.apiKey,5000);c.lastError='';c.lastTestMessage='';}
    if(clean(b.oauthClientSecret,5000))c.oauthClientSecret=clean(b.oauthClientSecret,5000);
    if(rootFolderUrl!==clean(oldDrive.rootFolderUrl,2400)){c.rootFolderId='';c.rootFolderName='';c.plansFolderId='';c.plansFolderName='';c.storyFolderId='';c.storyFolderName='';c.postFolderId='';c.postFolderName='';c.uploadReady=false;}
    if(oauthClientId&&oauthClientId!==clean(oldDrive.oauthClientId,1200)){c.refreshToken='';c.connectedEmail='';c.grantedScopes='';c.uploadReady=false;c.plansFolderId='';c.plansFolderName='';c.storyFolderId='';c.storyFolderName='';c.postFolderId='';c.postFolderName='';}
    if(c.enabled&&!c.apiKey&&!c.refreshToken)return json({error:'Connect Google Drive with OAuth for uploads or save an API key for public-file diagnostics before enabling Google Drive.'},400);
    social.googleDrive=c;await setSetting(env,'social_integration_settings',social);
  }else if(platform==='indexnow'||platform==='bing_indexnow'||platform==='bing'){
    const old= social.indexNow||{},c={...old,enabled:bool(b.enabled),autoPublish:Object.prototype.hasOwnProperty.call(b,'autoPublish')?bool(b.autoPublish):old.autoPublish!==false};
    const incomingKey=clean(b.key,200);
    if(incomingKey){
      if(!/^[A-Za-z0-9-]{8,128}$/.test(incomingKey))return json({error:'IndexNow keys must contain 8–128 letters, numbers or hyphens. Use a dedicated IndexNow verification key, not the Bing Webmaster Tools API Access key.'},400);
      c.key=incomingKey;
      if(incomingKey!==clean(old.key,200)){c.lastSubmittedAt='';c.lastSubmittedUrl='';c.lastSubmitStatus=0;c.lastSubmitError='';c.cooldownUntil='';c.recentSubmissions=[];c.lastTestedAt='';c.lastTestMessage='';c.lastError='';}
    }
    if(c.enabled&&!c.key)return json({error:'Generate and save a dedicated IndexNow verification key before enabling Bing / IndexNow submissions. Do not paste the Bing Webmaster Tools API Access key here.'},400);
    social.indexNow=c;await setSetting(env,'social_integration_settings',social);
  }else if(platform==='whatsapp'){
    const provider=['whatsapp_cloud','green_api','instautomate'].includes(clean(b.otpProvider,40))?clean(b.otpProvider,40):(payment.otpProvider||'whatsapp_cloud');
    const action=clean(b.action,40).toLowerCase();
    const next={...payment,otpProvider:provider,updatedAt:new Date().toISOString()};
    if(Object.prototype.hasOwnProperty.call(b,'otpEnabled'))next.whatsappOtpEnabled=bool(b.otpEnabled);
    if(clean(b.webhookVerifyToken,2000))next.whatsappWebhookVerifyToken=clean(b.webhookVerifyToken,2000);
    if(Object.prototype.hasOwnProperty.call(b,'phoneNumberId'))next.whatsappPhoneNumberId=clean(b.phoneNumberId,500);
    if(Object.prototype.hasOwnProperty.call(b,'greenApiInstanceId'))next.greenApiInstanceId=clean(b.greenApiInstanceId,500);
    if(Object.prototype.hasOwnProperty.call(b,'instautomateApiBaseUrl'))next.instautomateApiBaseUrl=clean(b.instautomateApiBaseUrl,1200)||'https://client.instautomate.com/api';
    if(Object.prototype.hasOwnProperty.call(b,'instautomateVendorUid'))next.instautomateVendorUid=clean(b.instautomateVendorUid,600);
    if(Object.prototype.hasOwnProperty.call(b,'instautomateFromPhoneNumberId'))next.instautomateFromPhoneNumberId=clean(b.instautomateFromPhoneNumberId,600);
    if(clean(b.cloudToken,8000))next.whatsappCloudToken=clean(b.cloudToken,8000);
    if(clean(b.greenApiToken,8000))next.greenApiToken=clean(b.greenApiToken,8000);
    if(clean(b.instautomateToken,8000))next.instautomateToken=clean(b.instautomateToken,8000);
    if(action==='disconnect'){
      if(provider==='green_api'){next.greenApiInstanceId='';next.greenApiToken='';}
      else if(provider==='instautomate'){next.instautomateVendorUid='';next.instautomateToken='';next.instautomateFromPhoneNumberId='';}
      else{next.whatsappPhoneNumberId='';next.whatsappCloudToken='';}
      next.whatsappOtpEnabled=false;
      if(next.whatsappConnectedProvider===provider){next.whatsappConnectionState='disconnected';next.whatsappConnectedProvider='';next.whatsappConnectedLabel='';next.whatsappLastError='';}
    }
    if(action==='connect'||action==='test'){
      try{
        const tested=await testWhatsappProvider(provider,next);
        next.whatsappConnectionState='connected';next.whatsappConnectedProvider=provider;next.whatsappConnectedLabel=tested.label;next.whatsappLastTestedAt=new Date().toISOString();next.whatsappLastError='';
      }catch(error){
        const d=diagnoseIntegrationError('whatsapp',error,{action:provider==='green_api'?'GreenAPI connection test':provider==='instautomate'?'Instautomate connection test':'WhatsApp Cloud API connection test'});
        next.whatsappConnectionState='error';next.whatsappConnectedProvider='';next.whatsappConnectedLabel='';next.whatsappLastTestedAt=new Date().toISOString();next.whatsappLastError=d.message;
        await setSetting(env,'payment_settings',next);
        return json({error:d.message,diagnostic:d},d.httpStatus&&d.httpStatus>=400&&d.httpStatus<600?d.httpStatus:400);
      }
    }
    if(next.whatsappOtpEnabled){
      if(provider==='green_api'&&(!next.greenApiInstanceId||!next.greenApiToken))return json({error:'Enter the GreenAPI Instance ID and GreenAPI Token, then connect GreenAPI before enabling WhatsApp OTP.'},400);
      if(provider==='whatsapp_cloud'&&(!next.whatsappPhoneNumberId||!next.whatsappCloudToken))return json({error:'Enter the WhatsApp Phone Number ID and Cloud Token, then connect WhatsApp Cloud API before enabling WhatsApp OTP.'},400);
      if(provider==='instautomate'&&(!next.instautomateApiBaseUrl||!next.instautomateVendorUid||!next.instautomateToken))return json({error:'Enter the Instautomate API Base URL, Vendor UID and API Access Token, then connect Instautomate before enabling WhatsApp OTP.'},400);
      if(next.whatsappConnectionState!=='connected'||next.whatsappConnectedProvider!==provider)return json({error:`${provider==='green_api'?'GreenAPI':provider==='instautomate'?'Instautomate':'WhatsApp Cloud API'} credentials are saved but the live API has not passed Test Connection. Click Connect ${provider==='green_api'?'GreenAPI':provider==='instautomate'?'Instautomate':'WhatsApp Cloud API'} first; after it reports that authentication is working, enable WhatsApp OTP.`},400);
      social.gmail={...social.gmail,otpEnabled:false};
      await setSetting(env,'social_integration_settings',social);
    }
    await setSetting(env,'payment_settings',next);
  }else if(platform==='gmail'||platform==='email'){
    const action=clean(b.action,40).toLowerCase();
    const nextClientId=clean(b.clientId,600),nextSecret=clean(b.clientSecret,5000),credentialsChanged=nextClientId!==clean(social.gmail.clientId,600)||!!(nextSecret&&nextSecret!==social.gmail.clientSecret),c={...social.gmail,enabled:bool(b.enabled),otpEnabled:Object.prototype.hasOwnProperty.call(b,'otpEnabled')?bool(b.otpEnabled):!!social.gmail.otpEnabled,senderName:clean(b.senderName,160)||'DropBeat Dance Studio',senderEmail:clean(b.senderEmail,240).toLowerCase(),adminCopyEmail:clean(b.adminCopyEmail,240).toLowerCase(),clientId:nextClientId};
    if(nextSecret)c.clientSecret=nextSecret;
    if(credentialsChanged||bool(b.clearConnection)||action==='disconnect'){c.refreshToken='';c.connectedEmail='';c.oauthState='';c.oauthStateExpiresAt='';c.otpEnabled=false;c.connectionState='disconnected';c.scopeStatus='';c.grantedScopes='';}
    if(c.otpEnabled&&!(c.refreshToken&&c.connectedEmail&&c.connectionState==='connected'&&c.scopeStatus==='verified_send'))return json({error:'Reconnect Gmail, approve Gmail sending permission, and pass Test Connection before enabling Gmail OTP.'},400);
    social.gmail=c;
    await setSetting(env,'social_integration_settings',social);
    if(c.otpEnabled){payment.whatsappOtpEnabled=false;payment.updatedAt=new Date().toISOString();await setSetting(env,'payment_settings',payment);}
  }else{
    return json({error:'Choose Facebook, Instagram, WhatsApp, LinkedIn, Telegram, X / Twitter, Google Search Console, Google Indexing API, Google Business Profile, Google Drive API, Bing / IndexNow, Threads, Snapchat, YouTube, Pinterest or Gmail.'},400);
  }

  const [savedSocial,savedPayment]=await Promise.all([getSocialIntegrationSettings(env),getPaymentSettings(env)]);
  return json({ok:true,message:successMessage(platform,'save'),settings:publicView(savedSocial,savedPayment,request,env)});
}
