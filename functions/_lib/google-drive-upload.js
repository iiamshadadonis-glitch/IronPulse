import { getSocialIntegrationSettings, setSetting } from './utils.js';

const clean=(v,n=4000)=>String(v??'').trim().slice(0,n);
const DRIVE_SCOPE='https://www.googleapis.com/auth/drive';

export function parseDriveReference(value=''){
  const raw=clean(value,2600);if(!raw)return {id:'',resourceKey:''};
  if(/^[A-Za-z0-9_-]{10,}$/.test(raw))return {id:raw,resourceKey:''};
  try{
    const u=new URL(raw);let id='';
    const matches=[u.pathname.match(/\/folders\/([^/]+)/i),u.pathname.match(/\/file\/d\/([^/]+)/i),u.pathname.match(/\/d\/([^/]+)/i)].filter(Boolean);
    id=clean(matches[0]?.[1]||u.searchParams.get('id')||'',600);
    return {id,resourceKey:clean(u.searchParams.get('resourcekey')||u.searchParams.get('resourceKey')||'',600)};
  }catch{return {id:'',resourceKey:''};}
}

// Google Drive's `uc?export=download` response is intentionally an attachment.
// That URL downloads correctly when opened in a tab, but it is not a dependable
// image source in browsers, email clients or PDF previews.  Keep the same Drive
// file and sharing model while using Google's inline thumbnail endpoint for
// images.  This helper also repairs already-saved Drive URLs at read time.
export function googleDriveInlineImageUrl(value='',size='w2000'){
  const raw=clean(value,2600);if(!raw)return'';
  const {id,resourceKey}=parseDriveReference(raw);if(!id)return raw;
  const safeSize=/^[whs]\d{2,5}$/i.test(String(size||''))?String(size):'w2000';
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=${encodeURIComponent(safeSize)}${resourceKey?`&resourcekey=${encodeURIComponent(resourceKey)}`:''}`;
}

function uploadedMediaUrl(id,mimeType=''){
  return String(mimeType||'').toLowerCase().startsWith('image/')
    ?googleDriveInlineImageUrl(id)
    :`https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
}

function oauthCredentials(social,c){
  const sc=social.searchConsole||{},gm=social.gmail||{};
  return {
    clientId:clean(c.oauthClientId||sc.clientId||gm.clientId,1200),
    clientSecret:clean(c.oauthClientSecret||sc.clientSecret||gm.clientSecret,5000),
    source:c.oauthClientId&&c.oauthClientSecret?'Google Drive card':(sc.clientId&&sc.clientSecret?'Google Search Console OAuth app':(gm.clientId&&gm.clientSecret?'Gmail OAuth app':''))
  };
}

export function googleDriveOAuthCredentials(social){return oauthCredentials(social,social.googleDrive||{});}

export async function getGoogleDriveAccessToken(env){
  const social=await getSocialIntegrationSettings(env),c=social.googleDrive||{},cred=oauthCredentials(social,c);
  if(!c.refreshToken)throw new Error('Google Drive upload authorization is not connected. Open Settings → Integrations → Storage → Google Drive API and click Connect Google Drive.');
  if(!cred.clientId||!cred.clientSecret)throw new Error('Google OAuth Client ID/Secret are unavailable. Enter them on the Google Drive card, or keep a working Search Console/Gmail OAuth client saved for reuse.');
  const body=new URLSearchParams({client_id:cred.clientId,client_secret:cred.clientSecret,refresh_token:c.refreshToken,grant_type:'refresh_token'});
  const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.access_token)throw new Error(data.error_description||data.error||`Google OAuth token refresh failed (HTTP ${res.status}). Disconnect Google Drive and connect it again.`);
  return {accessToken:data.access_token,social,c,credentials:cred};
}

async function driveJson(url,{token,method='GET',body=null,headers={}}={}){
  const res=await fetch(url,{method,headers:{authorization:`Bearer ${token}`,accept:'application/json',...(body&&!headers['content-type']?{'content-type':'application/json'}:{}),...headers},body:body==null?undefined:(typeof body==='string'||body instanceof Blob?body:JSON.stringify(body))});
  const text=await res.text().catch(()=>'');let data={};try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
  if(!res.ok){const e=data?.error||{};const msg=e.message||data.error_description||text||`Google Drive API returned HTTP ${res.status}.`;const err=new Error(msg);err.httpStatus=res.status;err.googleStatus=e.status||'';err.googleReason=e.errors?.[0]?.reason||'';throw err;}
  return data;
}

function qEscape(v){return String(v||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");}

export async function ensurePlansOffersFolder(env,{persist=true}={}){
  const auth=await getGoogleDriveAccessToken(env),{social,c}=auth,token=auth.accessToken;
  const rootRef=parseDriveReference(c.rootFolderUrl||c.rootFolderId||'');
  if(!rootRef.id)throw new Error('Destination Root Folder URL is missing or invalid. Paste the Google Drive folder URL that should contain the Plans and Offers subfolder, save settings, then test again.');
  const rootQ=new URLSearchParams({fields:'id,name,mimeType,driveId,capabilities(canAddChildren)',supportsAllDrives:'true'});if(rootRef.resourceKey)rootQ.set('resourceKey',rootRef.resourceKey);
  const root=await driveJson(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(rootRef.id)}?${rootQ}`,{token});
  if(root.mimeType!=='application/vnd.google-apps.folder')throw new Error(`The configured Drive destination “${root.name||rootRef.id}” is not a folder. Paste a normal Google Drive folder link.`);
  if(root.capabilities&&root.capabilities.canAddChildren===false)throw new Error(`The connected Google account cannot add files to “${root.name||'the selected Drive folder'}”. Give this account Editor access or choose another folder.`);
  const q=`'${qEscape(root.id)}' in parents and name = 'Plans and Offers' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const lp=new URLSearchParams({q,fields:'files(id,name,mimeType,driveId)',pageSize:'10',spaces:'drive',supportsAllDrives:'true',includeItemsFromAllDrives:'true'});
  const listed=await driveJson(`https://www.googleapis.com/drive/v3/files?${lp}`,{token});let folder=(listed.files||[])[0]||null;
  if(!folder){
    const cp=new URLSearchParams({fields:'id,name,mimeType,driveId',supportsAllDrives:'true'});
    folder=await driveJson(`https://www.googleapis.com/drive/v3/files?${cp}`,{token,method:'POST',body:{name:'Plans and Offers',mimeType:'application/vnd.google-apps.folder',parents:[root.id]}});
  }
  if(persist){
    const latest=await getSocialIntegrationSettings(env),g={...(latest.googleDrive||{})};
    g.rootFolderId=root.id;g.rootFolderName=clean(root.name,500);g.plansFolderId=folder.id;g.plansFolderName=clean(folder.name||'Plans and Offers',500);g.uploadReady=true;g.lastUploadTestedAt=new Date().toISOString();g.lastError='';latest.googleDrive=g;await setSetting(env,'social_integration_settings',latest);
  }
  return {token,root,folder,connectedEmail:c.connectedEmail||'',oauthSource:auth.credentials.source};
}


export async function ensureStoryStatusFolder(env,{persist=true}={}){
  const auth=await getGoogleDriveAccessToken(env),{c}=auth,token=auth.accessToken;
  const rootRef=parseDriveReference(c.rootFolderUrl||c.rootFolderId||'');
  if(!rootRef.id)throw new Error('Destination Root Folder URL is missing or invalid. Paste the Google Drive folder URL that should contain the Story or Status Images subfolder, save settings, then test again.');
  const rootQ=new URLSearchParams({fields:'id,name,mimeType,driveId,capabilities(canAddChildren)',supportsAllDrives:'true'});if(rootRef.resourceKey)rootQ.set('resourceKey',rootRef.resourceKey);
  const root=await driveJson(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(rootRef.id)}?${rootQ}`,{token});
  if(root.mimeType!=='application/vnd.google-apps.folder')throw new Error(`The configured Drive destination “${root.name||rootRef.id}” is not a folder. Paste a normal Google Drive folder link.`);
  if(root.capabilities&&root.capabilities.canAddChildren===false)throw new Error(`The connected Google account cannot add files to “${root.name||'the selected Drive folder'}”. Give this account Editor access or choose another folder.`);
  const folderName='Story or Status Images';
  const q=`'${qEscape(root.id)}' in parents and name = '${qEscape(folderName)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const lp=new URLSearchParams({q,fields:'files(id,name,mimeType,driveId)',pageSize:'10',spaces:'drive',supportsAllDrives:'true',includeItemsFromAllDrives:'true'});
  const listed=await driveJson(`https://www.googleapis.com/drive/v3/files?${lp}`,{token});let folder=(listed.files||[])[0]||null;
  if(!folder){
    const cp=new URLSearchParams({fields:'id,name,mimeType,driveId',supportsAllDrives:'true'});
    folder=await driveJson(`https://www.googleapis.com/drive/v3/files?${cp}`,{token,method:'POST',body:{name:folderName,mimeType:'application/vnd.google-apps.folder',parents:[root.id]}});
  }
  if(persist){
    const latest=await getSocialIntegrationSettings(env),g={...(latest.googleDrive||{})};
    g.rootFolderId=root.id;g.rootFolderName=clean(root.name,500);g.storyFolderId=folder.id;g.storyFolderName=clean(folder.name||folderName,500);g.uploadReady=true;g.lastUploadTestedAt=new Date().toISOString();g.lastError='';latest.googleDrive=g;await setSetting(env,'social_integration_settings',latest);
  }
  return {token,root,folder,connectedEmail:c.connectedEmail||'',oauthSource:auth.credentials.source};
}


export async function ensurePostsFolder(env,{persist=true}={}){
  const auth=await getGoogleDriveAccessToken(env),{c}=auth,token=auth.accessToken;
  const rootRef=parseDriveReference(c.rootFolderUrl||c.rootFolderId||'');
  if(!rootRef.id)throw new Error('Destination Root Folder URL is missing or invalid. Paste the Google Drive folder URL that should contain the Posts subfolder, save Google Drive settings, then try the upload again.');
  const rootQ=new URLSearchParams({fields:'id,name,mimeType,driveId,capabilities(canAddChildren)',supportsAllDrives:'true'});if(rootRef.resourceKey)rootQ.set('resourceKey',rootRef.resourceKey);
  const root=await driveJson(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(rootRef.id)}?${rootQ}`,{token});
  if(root.mimeType!=='application/vnd.google-apps.folder')throw new Error(`The configured Drive destination “${root.name||rootRef.id}” is not a folder. Paste a normal Google Drive folder link.`);
  if(root.capabilities&&root.capabilities.canAddChildren===false)throw new Error(`The connected Google account cannot add files to “${root.name||'the selected Drive folder'}”. Give this account Editor access or choose another folder.`);
  const folderName='Posts';
  const q=`'${qEscape(root.id)}' in parents and name = '${qEscape(folderName)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const lp=new URLSearchParams({q,fields:'files(id,name,mimeType,driveId)',pageSize:'10',spaces:'drive',supportsAllDrives:'true',includeItemsFromAllDrives:'true'});
  const listed=await driveJson(`https://www.googleapis.com/drive/v3/files?${lp}`,{token});let folder=(listed.files||[])[0]||null;
  if(!folder){
    const cp=new URLSearchParams({fields:'id,name,mimeType,driveId',supportsAllDrives:'true'});
    folder=await driveJson(`https://www.googleapis.com/drive/v3/files?${cp}`,{token,method:'POST',body:{name:folderName,mimeType:'application/vnd.google-apps.folder',parents:[root.id]}});
  }
  if(persist){
    const latest=await getSocialIntegrationSettings(env),g={...(latest.googleDrive||{})};
    g.rootFolderId=root.id;g.rootFolderName=clean(root.name,500);g.postFolderId=folder.id;g.postFolderName=clean(folder.name||folderName,500);g.uploadReady=true;g.lastUploadTestedAt=new Date().toISOString();g.lastError='';latest.googleDrive=g;await setSetting(env,'social_integration_settings',latest);
  }
  return {token,root,folder,connectedEmail:c.connectedEmail||'',oauthSource:auth.credentials.source};
}



export async function ensureArticleImagesFolder(env,{persist=true}={}){
  const auth=await getGoogleDriveAccessToken(env),{c}=auth,token=auth.accessToken;
  const rootRef=parseDriveReference(c.rootFolderUrl||c.rootFolderId||'');
  if(!rootRef.id)throw new Error('Destination Root Folder URL is missing or invalid. Paste the Google Drive folder URL that should contain the Fitness Tips Images subfolder, save Google Drive settings, then try the upload again.');
  const rootQ=new URLSearchParams({fields:'id,name,mimeType,driveId,capabilities(canAddChildren)',supportsAllDrives:'true'});if(rootRef.resourceKey)rootQ.set('resourceKey',rootRef.resourceKey);
  const root=await driveJson(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(rootRef.id)}?${rootQ}`,{token});
  if(root.mimeType!=='application/vnd.google-apps.folder')throw new Error(`The configured Drive destination “${root.name||rootRef.id}” is not a folder. Paste a normal Google Drive folder link.`);
  if(root.capabilities&&root.capabilities.canAddChildren===false)throw new Error(`The connected Google account cannot add files to “${root.name||'the selected Drive folder'}”. Give this account Editor access or choose another folder.`);
  const folderName='Fitness Tips Images';
  const q=`'${qEscape(root.id)}' in parents and name = '${qEscape(folderName)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const lp=new URLSearchParams({q,fields:'files(id,name,mimeType,driveId)',pageSize:'10',spaces:'drive',supportsAllDrives:'true',includeItemsFromAllDrives:'true'});
  const listed=await driveJson(`https://www.googleapis.com/drive/v3/files?${lp}`,{token});let folder=(listed.files||[])[0]||null;
  if(!folder){
    const cp=new URLSearchParams({fields:'id,name,mimeType,driveId',supportsAllDrives:'true'});
    folder=await driveJson(`https://www.googleapis.com/drive/v3/files?${cp}`,{token,method:'POST',body:{name:folderName,mimeType:'application/vnd.google-apps.folder',parents:[root.id]}});
  }
  if(persist){
    const latest=await getSocialIntegrationSettings(env),g={...(latest.googleDrive||{})};
    g.rootFolderId=root.id;g.rootFolderName=clean(root.name,500);g.articleImagesFolderId=folder.id;g.articleImagesFolderName=clean(folder.name||folderName,500);g.uploadReady=true;g.lastUploadTestedAt=new Date().toISOString();g.lastError='';latest.googleDrive=g;await setSetting(env,'social_integration_settings',latest);
  }
  return {token,root,folder,connectedEmail:c.connectedEmail||'',oauthSource:auth.credentials.source};
}

function safeFileName(name='image.jpg',mime='image/jpeg'){
  const extFromMime=mime.includes('png')?'png':mime.includes('webp')?'webp':mime.includes('gif')?'gif':mime.includes('avif')?'avif':mime.includes('jpeg')||mime.includes('jpg')?'jpg':'';
  let base=clean(name,180).replace(/[\\/:*?"<>|\u0000-\u001F]/g,'-').replace(/\s+/g,' ').trim()||`plan-image-${Date.now()}.${extFromMime||'jpg'}`;
  if(extFromMime&&!/\.[a-z0-9]{2,5}$/i.test(base))base+=`.${extFromMime}`;
  return base;
}


function safeMediaFileName(name='post-media',mime='application/octet-stream'){
  const map={
    'image/jpeg':'jpg','image/jpg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif',
    'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov','video/x-m4v':'m4v','video/mpeg':'mpeg'
  };
  const ext=map[String(mime||'').toLowerCase()]||'';
  let base=clean(name,180).replace(/[\\/:*?"<>|\u0000-\u001F]/g,'-').replace(/\s+/g,' ').trim()||`post-media-${Date.now()}`;
  if(ext&&!/\.[a-z0-9]{2,6}$/i.test(base))base+=`.${ext}`;
  return base;
}

async function makePublic(token,fileId){
  const q=new URLSearchParams({supportsAllDrives:'true',fields:'id,type,role'});
  try{return await driveJson(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?${q}`,{token,method:'POST',body:{type:'anyone',role:'reader',allowFileDiscovery:false}});}catch(e){
    // A public permission inherited from the parent can make a second explicit permission unnecessary.
    if(Number(e.httpStatus||0)===400&&/already|inherited|permission/i.test(e.message||''))return {inherited:true};
    throw new Error(`The file was uploaded to Google Drive, but Google would not make it publicly readable: ${e.message}. Allow link sharing on the destination folder/file, then retry.`);
  }
}

export async function uploadPlanImageToGoogleDrive(env,file){
  if(!file||typeof file==='string'||typeof file.arrayBuffer!=='function')throw new Error('Choose an image file to upload.');
  const mime=clean(file.type,120).toLowerCase();if(mime&&!mime.startsWith('image/'))throw new Error('Choose an image file (JPG, PNG, WebP, GIF, AVIF, or another browser-supported image format).');
  const {token,folder}=await ensurePlansOffersFolder(env,{persist:true}),name=safeFileName(file.name,mime||'image/jpeg');
  const boundary=`uc_drive_${crypto.randomUUID().replace(/-/g,'')}`;
  const metadata=JSON.stringify({name,parents:[folder.id]});
  const body=new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${mime||'application/octet-stream'}\r\n\r\n`,file,`\r\n--${boundary}--\r\n`
  ]);
  const qp=new URLSearchParams({uploadType:'multipart',supportsAllDrives:'true',fields:'id,name,mimeType,size,webViewLink,webContentLink'});
  const uploaded=await driveJson(`https://www.googleapis.com/upload/drive/v3/files?${qp}`,{token,method:'POST',body,headers:{'content-type':`multipart/related; boundary=${boundary}`}});
  await makePublic(token,uploaded.id);
  const publicUrl=uploadedMediaUrl(uploaded.id,uploaded.mimeType||mime);
  const latest=await getSocialIntegrationSettings(env),g={...(latest.googleDrive||{})};g.lastUploadedAt=new Date().toISOString();g.lastUploadedFileId=uploaded.id;g.lastUploadedFileName=uploaded.name||name;g.lastError='';g.uploadReady=true;latest.googleDrive=g;await setSetting(env,'social_integration_settings',latest);
  return {id:uploaded.id,name:uploaded.name||name,mimeType:uploaded.mimeType||mime,size:Number(uploaded.size||file.size||0),url:publicUrl,viewUrl:uploaded.webViewLink||`https://drive.google.com/file/d/${uploaded.id}/view`,folderId:folder.id,folderName:folder.name||'Plans and Offers'};
}

export async function uploadStoryStatusImageToGoogleDrive(env,file){
  if(!file||typeof file==='string'||typeof file.arrayBuffer!=='function')throw new Error('Choose a Story / Status image file to upload.');
  const mime=clean(file.type,120).toLowerCase();if(mime&&!mime.startsWith('image/'))throw new Error('Choose an image file for the Story / Status image.');
  const {token,folder}=await ensureStoryStatusFolder(env,{persist:true}),name=safeFileName(file.name||`story-status-${Date.now()}.jpg`,mime||'image/jpeg');
  const boundary=`uc_drive_${crypto.randomUUID().replace(/-/g,'')}`;
  const metadata=JSON.stringify({name,parents:[folder.id]});
  const body=new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${mime||'application/octet-stream'}\r\n\r\n`,file,`\r\n--${boundary}--\r\n`
  ]);
  const qp=new URLSearchParams({uploadType:'multipart',supportsAllDrives:'true',fields:'id,name,mimeType,size,webViewLink,webContentLink'});
  const uploaded=await driveJson(`https://www.googleapis.com/upload/drive/v3/files?${qp}`,{token,method:'POST',body,headers:{'content-type':`multipart/related; boundary=${boundary}`}});
  await makePublic(token,uploaded.id);
  const publicUrl=uploadedMediaUrl(uploaded.id,uploaded.mimeType||mime);
  const latest=await getSocialIntegrationSettings(env),g={...(latest.googleDrive||{})};g.lastStoryUploadedAt=new Date().toISOString();g.lastStoryUploadedFileId=uploaded.id;g.lastStoryUploadedFileName=uploaded.name||name;g.storyFolderId=folder.id;g.storyFolderName=folder.name||'Story or Status Images';g.lastError='';g.uploadReady=true;latest.googleDrive=g;await setSetting(env,'social_integration_settings',latest);
  return {id:uploaded.id,name:uploaded.name||name,mimeType:uploaded.mimeType||mime,size:Number(uploaded.size||file.size||0),url:publicUrl,viewUrl:uploaded.webViewLink||`https://drive.google.com/file/d/${uploaded.id}/view`,folderId:folder.id,folderName:folder.name||'Story or Status Images'};
}



export async function uploadArticleImageToGoogleDrive(env,file){
  if(!file||typeof file==='string'||typeof file.arrayBuffer!=='function')throw new Error('Choose an Fitness Tips image file to upload.');
  const mime=clean(file.type,120).toLowerCase();if(mime&&!mime.startsWith('image/'))throw new Error('Choose an image file for the Fitness Tips cover image.');
  const {token,folder}=await ensureArticleImagesFolder(env,{persist:true}),name=safeFileName(file.name||`article-image-${Date.now()}.jpg`,mime||'image/jpeg');
  const boundary=`uc_drive_${crypto.randomUUID().replace(/-/g,'')}`;
  const metadata=JSON.stringify({name,parents:[folder.id]});
  const body=new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${mime||'application/octet-stream'}\r\n\r\n`,file,`\r\n--${boundary}--\r\n`
  ]);
  const qp=new URLSearchParams({uploadType:'multipart',supportsAllDrives:'true',fields:'id,name,mimeType,size,webViewLink,webContentLink'});
  const uploaded=await driveJson(`https://www.googleapis.com/upload/drive/v3/files?${qp}`,{token,method:'POST',body,headers:{'content-type':`multipart/related; boundary=${boundary}`}});
  await makePublic(token,uploaded.id);
  const publicUrl=uploadedMediaUrl(uploaded.id,uploaded.mimeType||mime);
  const latest=await getSocialIntegrationSettings(env),g={...(latest.googleDrive||{})};
  g.lastArticleImageUploadedAt=new Date().toISOString();g.lastArticleImageFileId=uploaded.id;g.lastArticleImageFileName=uploaded.name||name;g.articleImagesFolderId=folder.id;g.articleImagesFolderName=folder.name||'Fitness Tips Images';g.lastError='';g.uploadReady=true;latest.googleDrive=g;await setSetting(env,'social_integration_settings',latest);
  return {id:uploaded.id,name:uploaded.name||name,mimeType:uploaded.mimeType||mime,size:Number(uploaded.size||file.size||0),url:publicUrl,viewUrl:uploaded.webViewLink||`https://drive.google.com/file/d/${uploaded.id}/view`,folderId:folder.id,folderName:folder.name||'Fitness Tips Images'};
}


export async function uploadPostMediaToGoogleDrive(env,file){
  if(!file||typeof file==='string'||typeof file.arrayBuffer!=='function')throw new Error('Choose an image or video file to upload for the post.');
  const mime=clean(file.type,120).toLowerCase();
  if(mime&&!mime.startsWith('image/')&&!mime.startsWith('video/'))throw new Error('Posts accepts image or video files only. Choose an image or video and try again.');
  const {token,folder}=await ensurePostsFolder(env,{persist:true}),name=safeMediaFileName(file.name||`post-media-${Date.now()}`,mime||'application/octet-stream');
  const boundary=`uc_drive_${crypto.randomUUID().replace(/-/g,'')}`;
  const metadata=JSON.stringify({name,parents:[folder.id]});
  const body=new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${mime||'application/octet-stream'}\r\n\r\n`,file,`\r\n--${boundary}--\r\n`
  ]);
  const qp=new URLSearchParams({uploadType:'multipart',supportsAllDrives:'true',fields:'id,name,mimeType,size,webViewLink,webContentLink'});
  const uploaded=await driveJson(`https://www.googleapis.com/upload/drive/v3/files?${qp}`,{token,method:'POST',body,headers:{'content-type':`multipart/related; boundary=${boundary}`}});
  await makePublic(token,uploaded.id);
  const publicUrl=uploadedMediaUrl(uploaded.id,uploaded.mimeType||mime);
  const latest=await getSocialIntegrationSettings(env),g={...(latest.googleDrive||{})};
  g.lastPostUploadedAt=new Date().toISOString();g.lastPostUploadedFileId=uploaded.id;g.lastPostUploadedFileName=uploaded.name||name;g.postFolderId=folder.id;g.postFolderName=folder.name||'Posts';g.lastError='';g.uploadReady=true;latest.googleDrive=g;await setSetting(env,'social_integration_settings',latest);
  return {id:uploaded.id,name:uploaded.name||name,mimeType:uploaded.mimeType||mime,size:Number(uploaded.size||file.size||0),url:publicUrl,viewUrl:uploaded.webViewLink||`https://drive.google.com/file/d/${uploaded.id}/view`,folderId:folder.id,folderName:folder.name||'Posts'};
}


async function ensureNamedMediaFolder(env,folderName,settingsPrefix,{persist=true}={}){
  const auth=await getGoogleDriveAccessToken(env),{c}=auth,token=auth.accessToken;
  const rootRef=parseDriveReference(c.rootFolderUrl||c.rootFolderId||'');
  if(!rootRef.id)throw new Error(`Destination Root Folder URL is missing or invalid. Paste the Google Drive folder URL that should contain the ${folderName} subfolder, save Google Drive settings, then try again.`);
  const rootQ=new URLSearchParams({fields:'id,name,mimeType,driveId,capabilities(canAddChildren)',supportsAllDrives:'true'});if(rootRef.resourceKey)rootQ.set('resourceKey',rootRef.resourceKey);
  const root=await driveJson(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(rootRef.id)}?${rootQ}`,{token});
  if(root.mimeType!=='application/vnd.google-apps.folder')throw new Error(`The configured Drive destination “${root.name||rootRef.id}” is not a folder.`);
  if(root.capabilities&&root.capabilities.canAddChildren===false)throw new Error(`The connected Google account cannot add files to “${root.name||'the selected Drive folder'}”. Give this account Editor access or choose another folder.`);
  const q=`'${qEscape(root.id)}' in parents and name = '${qEscape(folderName)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const lp=new URLSearchParams({q,fields:'files(id,name,mimeType,driveId)',pageSize:'10',spaces:'drive',supportsAllDrives:'true',includeItemsFromAllDrives:'true'});
  const listed=await driveJson(`https://www.googleapis.com/drive/v3/files?${lp}`,{token});let folder=(listed.files||[])[0]||null;
  if(!folder){const cp=new URLSearchParams({fields:'id,name,mimeType,driveId',supportsAllDrives:'true'});folder=await driveJson(`https://www.googleapis.com/drive/v3/files?${cp}`,{token,method:'POST',body:{name:folderName,mimeType:'application/vnd.google-apps.folder',parents:[root.id]}});}
  if(persist){const latest=await getSocialIntegrationSettings(env),g={...(latest.googleDrive||{})};g.rootFolderId=root.id;g.rootFolderName=clean(root.name,500);g[`${settingsPrefix}FolderId`]=folder.id;g[`${settingsPrefix}FolderName`]=clean(folder.name||folderName,500);g.uploadReady=true;g.lastUploadTestedAt=new Date().toISOString();g.lastError='';latest.googleDrive=g;await setSetting(env,'social_integration_settings',latest);}
  return {token,root,folder,connectedEmail:c.connectedEmail||'',oauthSource:auth.credentials.source};
}
export async function ensureCarouselFolder(env,opts={}){return ensureNamedMediaFolder(env,'Carousel','carousel',opts);}
export async function ensureDmAttachmentsFolder(env,opts={}){return ensureNamedMediaFolder(env,'DM Attachments','dmAttachments',opts);}
export async function ensureLeadNurtureEmailFolder(env,opts={}){return ensureNamedMediaFolder(env,'Lead Nurturing Automation Email','leadNurtureEmail',opts);}
export async function ensureAutomationAttachmentsFolder(env,opts={}){return ensureNamedMediaFolder(env,'Automation Attachments','automationAttachments',opts);}

export async function ensurePortalProfileImagesFolder(env,opts={}){return ensureNamedMediaFolder(env,'Portal Profile Images','portalProfiles',opts);}
export async function ensureWebsiteImagesFolder(env,folderName='Website Images',settingsPrefix='websiteImages',opts={}){return ensureNamedMediaFolder(env,folderName,settingsPrefix,opts);}

async function uploadMediaToNamedFolder(env,file,{folderName,settingsPrefix,ensureFolder,allowed='both'}={}){
  if(!file||typeof file==='string'||typeof file.arrayBuffer!=='function')throw new Error('Choose a media file to upload.');
  const mime=clean(file.type,120).toLowerCase(),isImage=mime.startsWith('image/'),isVideo=mime.startsWith('video/');
  if(allowed==='image'&&!isImage)throw new Error(`${folderName} accepts image files only.`);
  if(allowed==='both'&&!isImage&&!isVideo)throw new Error(`${folderName} accepts image or video files only.`);
  const {token,folder}=await ensureFolder(env,{persist:true}),name=safeMediaFileName(file.name||`${settingsPrefix}-media-${Date.now()}`,mime||'application/octet-stream');
  const boundary=`uc_drive_${crypto.randomUUID().replace(/-/g,'')}`,metadata=JSON.stringify({name,parents:[folder.id]});
  const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,`--${boundary}\r\nContent-Type: ${mime||'application/octet-stream'}\r\n\r\n`,file,`\r\n--${boundary}--\r\n`]);
  const qp=new URLSearchParams({uploadType:'multipart',supportsAllDrives:'true',fields:'id,name,mimeType,size,webViewLink,webContentLink'});
  const uploaded=await driveJson(`https://www.googleapis.com/upload/drive/v3/files?${qp}`,{token,method:'POST',body,headers:{'content-type':`multipart/related; boundary=${boundary}`}});await makePublic(token,uploaded.id);
  const publicUrl=uploadedMediaUrl(uploaded.id,uploaded.mimeType||mime),latest=await getSocialIntegrationSettings(env),g={...(latest.googleDrive||{})};g[`last${settingsPrefix[0].toUpperCase()+settingsPrefix.slice(1)}UploadedAt`]=new Date().toISOString();g[`${settingsPrefix}FolderId`]=folder.id;g[`${settingsPrefix}FolderName`]=folder.name||folderName;g.lastError='';g.uploadReady=true;latest.googleDrive=g;await setSetting(env,'social_integration_settings',latest);
  return {id:uploaded.id,name:uploaded.name||name,mimeType:uploaded.mimeType||mime,size:Number(uploaded.size||file.size||0),url:publicUrl,viewUrl:uploaded.webViewLink||`https://drive.google.com/file/d/${uploaded.id}/view`,folderId:folder.id,folderName:folder.name||folderName};
}
export async function uploadCarouselMediaToGoogleDrive(env,file){return uploadMediaToNamedFolder(env,file,{folderName:'Carousel',settingsPrefix:'carousel',ensureFolder:ensureCarouselFolder,allowed:'both'});}
export async function uploadDmAttachmentToGoogleDrive(env,file){return uploadMediaToNamedFolder(env,file,{folderName:'DM Attachments',settingsPrefix:'dmAttachments',ensureFolder:ensureDmAttachmentsFolder,allowed:'image'});}
export async function uploadPortalProfileImageToGoogleDrive(env,file){
  if(Number(file?.size||0)>15*1024*1024)throw new Error('Choose a profile image no larger than 15 MB.');
  return uploadMediaToNamedFolder(env,file,{folderName:'Portal Profile Images',settingsPrefix:'portalProfiles',ensureFolder:ensurePortalProfileImagesFolder,allowed:'image'});
}
export async function uploadWebsiteImageToGoogleDrive(env,file,{folderName='Website Images',settingsPrefix='websiteImages',maxBytes=15*1024*1024}={}){
  if(Number(file?.size||0)>Number(maxBytes))throw new Error(`Choose an image no larger than ${Math.round(Number(maxBytes)/(1024*1024))} MB.`);
  const ensureFolder=(targetEnv,opts={})=>ensureNamedMediaFolder(targetEnv,folderName,settingsPrefix,opts);
  return uploadMediaToNamedFolder(env,file,{folderName,settingsPrefix,ensureFolder,allowed:'image'});
}

export async function deleteGoogleDriveFile(env,reference){
  const id=clean(String(reference||'').replace(/^drive:/,''),600);if(!/^[A-Za-z0-9_-]{10,}$/.test(id))return false;
  const {accessToken}=await getGoogleDriveAccessToken(env);const q=new URLSearchParams({supportsAllDrives:'true'});
  const response=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?${q}`,{method:'DELETE',headers:{authorization:`Bearer ${accessToken}`}});
  if(response.status===404)return true;if(!response.ok)throw new Error(`Google Drive could not remove the old image (HTTP ${response.status}).`);return true;
}
export async function uploadLeadNurtureEmailAssetToGoogleDrive(env,file){
  if(!file||typeof file==='string'||typeof file.arrayBuffer!=='function')throw new Error('Choose an image, PDF or document to upload.');
  const mime=clean(file.type,120).toLowerCase(),allowed=new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','text/csv']);
  if(!mime.startsWith('image/')&&!allowed.has(mime))throw new Error('Lead nurturing email uploads accept images, PDF, Word, Excel, PowerPoint, text and CSV documents.');
  if(Number(file.size||0)>25*1024*1024)throw new Error('Choose a file smaller than 25 MB.');
  return uploadMediaToNamedFolder(env,file,{folderName:'Lead Nurturing Automation Email',settingsPrefix:'leadNurtureEmail',ensureFolder:ensureLeadNurtureEmailFolder,allowed:'all'});
}

export async function uploadAutomationAttachmentToGoogleDrive(env,file){
  if(!file||typeof file==='string'||typeof file.arrayBuffer!=='function')throw new Error('Choose an image, PDF or document to upload.');
  const mime=clean(file.type,120).toLowerCase(),allowed=new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','text/csv']),knownExtension=/\.(?:pdf|docx?|xlsx?|pptx?|txt|csv)$/i.test(clean(file.name,260));
  if(!mime.startsWith('image/')&&!allowed.has(mime)&&!knownExtension)throw new Error('Automation attachments accept images, PDF, Word, Excel, PowerPoint, text and CSV documents.');
  if(Number(file.size||0)>25*1024*1024)throw new Error('Choose a file smaller than 25 MB.');
  return uploadMediaToNamedFolder(env,file,{folderName:'Automation Attachments',settingsPrefix:'automationAttachments',ensureFolder:ensureAutomationAttachmentsFolder,allowed:'all'});
}

export { DRIVE_SCOPE };
