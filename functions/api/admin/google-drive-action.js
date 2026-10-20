import { json, readJson, requireAdmin, getSocialIntegrationSettings, setSetting } from '../../_lib/utils.js';
import { diagnoseIntegrationError } from '../../_lib/integration-diagnostics.js';
import { parseDriveReference, ensurePlansOffersFolder, ensureStoryStatusFolder } from '../../_lib/google-drive-upload.js';

const clean=(v,n=3000)=>String(v??'').trim().slice(0,n);
async function latestDriveProductUrl(env){try{const row=await env.DB.prepare("SELECT source_url FROM product_images WHERE lower(source_url) LIKE '%drive.google.com%' ORDER BY id DESC LIMIT 1").first();return clean(row?.source_url,2400);}catch{return '';}}
async function verifyPublicDriveFile(apiKey,fileUrl){
  const ref=parseDriveReference(fileUrl);if(!ref.id)throw new Error('The Test Public File URL does not contain a recognizable Google Drive file ID. Use a normal Drive share link such as https://drive.google.com/file/d/FILE_ID/view?usp=sharing.');
  const q=new URLSearchParams({fields:'id,name,mimeType,size,modifiedTime,webContentLink,thumbnailLink',supportsAllDrives:'true',key:apiKey});if(ref.resourceKey)q.set('resourceKey',ref.resourceKey);
  const res=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(ref.id)}?${q}`,{headers:{accept:'application/json'}}),data=await res.json().catch(()=>({}));
  if(!res.ok){const err=data?.error||{};const e=new Error(err.message||`Google Drive API returned HTTP ${res.status}.`);e.httpStatus=res.status;e.upstreamStatus=res.status;e.upstreamCode=err.status||err.code||'';e.upstreamMessage=err.message||'';throw e;}
  return {id:clean(data.id,500),name:clean(data.name,500),mimeType:clean(data.mimeType,200),size:Number(data.size||0)||0};
}
export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const body=await readJson(request).catch(()=>({})),action=clean(body.action,40).toLowerCase(),social=await getSocialIntegrationSettings(env),c={...(social.googleDrive||{})};
  if(action==='disconnect'){
    c.enabled=false;c.connectionState='disconnected';c.refreshToken='';c.connectedEmail='';c.grantedScopes='';c.oauthState='';c.oauthStateExpiresAt='';c.uploadReady=false;c.plansFolderId='';c.plansFolderName='';c.storyFolderId='';c.storyFolderName='';c.connectedAt='';c.lastError='';c.lastTestMessage='';social.googleDrive=c;await setSetting(env,'social_integration_settings',social);
    return json({ok:true,message:'Google Drive disconnected successfully. The API key, OAuth app details and destination folder URL were kept so you can reconnect later.'});
  }
  if(!['connect','test'].includes(action))return json({error:'Choose Connect, Test Connection or Disconnect for Google Drive.'},400);
  const messages=[],now=new Date().toISOString();let file=null,folder=null;
  try{
    const testFileUrl=clean(body.testFileUrl,2400)||clean(c.testFileUrl,2400)||await latestDriveProductUrl(env);
    if(c.apiKey&&testFileUrl){file=await verifyPublicDriveFile(clean(c.apiKey,5000),testFileUrl);messages.push(`Public-file API test passed (${file.name||file.id}).`);c.lastTestFileId=file.id;c.lastTestFileName=file.name;}
    else if(c.apiKey)messages.push('API key is saved. Add a public Test File URL if you want a read-only API-key file check.');
    if(c.refreshToken){
      if(c.rootFolderUrl){const x=await ensurePlansOffersFolder(env,{persist:false});const y=await ensureStoryStatusFolder(env,{persist:false});folder={root:{id:x.root.id,name:x.root.name},plans:{id:x.folder.id,name:x.folder.name},story:{id:y.folder.id,name:y.folder.name}};messages.push(`Upload authorization passed (${x.root.name} → ${x.folder.name} + ${y.folder.name}).`);c.rootFolderId=x.root.id;c.rootFolderName=x.root.name;c.plansFolderId=x.folder.id;c.plansFolderName=x.folder.name;c.storyFolderId=y.folder.id;c.storyFolderName=y.folder.name;c.uploadReady=true;c.lastUploadTestedAt=now;}
      else{c.uploadReady=false;messages.push('Google account is connected for Drive uploads. Add Destination Root Folder URL to finish upload setup.');}
    }else{c.uploadReady=false;messages.push('Public Drive reading may work, but image uploads require Google OAuth. Click Connect Google Drive and approve Drive access.');}
    if(!c.apiKey&&!c.refreshToken)throw new Error('Neither a Google Drive API key nor Google OAuth upload authorization is configured. Save settings, then connect Google Drive.');
    c.connectionState='connected';c.connectedAt=c.connectedAt||now;c.lastTestedAt=now;c.lastError='';c.lastTestMessage=messages.join(' ');social.googleDrive=c;await setSetting(env,'social_integration_settings',social);
    return json({ok:true,message:`Google Drive check completed. ${messages.join(' ')}`,file,folder,uploadReady:!!c.uploadReady});
  }catch(error){
    const d=diagnoseIntegrationError('google_drive',error,{action:'Google Drive connection test'});c.connectionState=c.refreshToken||c.apiKey?'error':'disconnected';c.uploadReady=false;c.lastTestedAt=now;c.lastError=d.message;c.lastTestMessage='';social.googleDrive=c;await setSetting(env,'social_integration_settings',social);return json({error:d.message,diagnostic:d},d.httpStatus&&d.httpStatus>=400&&d.httpStatus<600?d.httpStatus:400);
  }
}
