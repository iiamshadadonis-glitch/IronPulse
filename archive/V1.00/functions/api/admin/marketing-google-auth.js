import { json, preferredPublicOrigin, readJson, requireAdmin } from '../../_lib/utils.js';
import { getMarketingSettings, saveMarketingSettings } from '../../_lib/marketing-suite.js';

const OPTIONS={
  google_ads:{group:'googleAds',scope:'https://www.googleapis.com/auth/adwords'},
  gtm_api:{group:'googleTagManagerApi',scope:'https://www.googleapis.com/auth/tagmanager.readonly'},
  ga4_api:{group:'googleAnalyticsApi',scope:'https://www.googleapis.com/auth/analytics.readonly'}
};
export async function onRequestPost({request,env}){try{await requireAdmin(request,env);const body=await readJson(request),option=OPTIONS[String(body.integration||'')];if(!option)throw new Error('Choose Google Ads, Tag Manager API or Analytics API.');const settings=await getMarketingSettings(env),current={...(settings[option.group]||{})};if(!current.clientId||!current.clientSecret)throw new Error('Save the Google OAuth Client ID and Client Secret first.');const state=crypto.randomUUID(),origin=preferredPublicOrigin(request,env),redirectUri=`${origin}/api/admin/marketing-google-oauth/callback`;current.oauthState=state;current.oauthStateExpiresAt=new Date(Date.now()+10*60000).toISOString();await saveMarketingSettings(env,{[option.group]:current});const q=new URLSearchParams({client_id:current.clientId,redirect_uri:redirectUri,response_type:'code',access_type:'offline',prompt:'consent',include_granted_scopes:'true',scope:`openid email ${option.scope}`,state});return json({ok:true,authUrl:`https://accounts.google.com/o/oauth2/v2/auth?${q}`,redirectUri});}catch(error){return json({error:error.message||'Google marketing authorization could not start.'},400);}}
