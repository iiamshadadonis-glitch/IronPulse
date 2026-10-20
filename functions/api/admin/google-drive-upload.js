import { json, requireAdmin, getSocialIntegrationSettings } from '../../_lib/utils.js';
import { uploadPlanImageToGoogleDrive, uploadStoryStatusImageToGoogleDrive, uploadPostMediaToGoogleDrive, uploadArticleImageToGoogleDrive, uploadCarouselMediaToGoogleDrive, uploadDmAttachmentToGoogleDrive, uploadLeadNurtureEmailAssetToGoogleDrive, uploadAutomationAttachmentToGoogleDrive, uploadWebsiteImageToGoogleDrive } from '../../_lib/google-drive-upload.js';
import { diagnoseIntegrationError } from '../../_lib/integration-diagnostics.js';
function driveFailure(error,status=400){const diagnostic=diagnoseIntegrationError('google_drive',typeof error==='string'?{message:error,httpStatus:status}:error,{action:'upload'});return json({error:diagnostic.message,diagnostic,recovery:diagnostic.recovery},status);}
export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  try{
    const social=await getSocialIntegrationSettings(env),g=social.googleDrive||{};
    if(!g.enabled)return driveFailure('Google Drive is disabled. Enable it in Settings → Integrations → Storage before uploading.',409);
    if(!g.refreshToken)return driveFailure('Google Drive upload authorization is not connected. Open Settings → Integrations → Storage → Google Drive API and click Connect Google Drive.',409);
    if(!g.rootFolderUrl&&!g.rootFolderId)return driveFailure('Destination Root Folder URL is missing. Add it on the Google Drive API card, then Test Connection.',409);
    const form=await request.formData(),file=form.get('file'),purpose=String(form.get('purpose')||'product').trim().toLowerCase();
    if(!file||typeof file==='string')return json({error:purpose==='story-status'?'Choose a Story / Status image before clicking Save Image.':purpose==='social-post'?'Choose an image or video before clicking Upload to Google Drive.':purpose==='article-image'?'Choose an Article image before clicking Upload Image.':purpose==='carousel'?'Choose an image or video for the Carousel.':purpose==='dm-attachment'?'Choose an image to send in the DM.':purpose==='lead-nurture-email'||purpose==='automation-attachment'?'Choose an image, PDF or document to upload.':'Choose a product image file before clicking Save Image.'},400);
    const out=purpose==='story-status'?await uploadStoryStatusImageToGoogleDrive(env,file):purpose==='social-post'?await uploadPostMediaToGoogleDrive(env,file):purpose==='article-image'?await uploadArticleImageToGoogleDrive(env,file):purpose==='carousel'?await uploadCarouselMediaToGoogleDrive(env,file):purpose==='dm-attachment'?await uploadDmAttachmentToGoogleDrive(env,file):purpose==='lead-nurture-email'?await uploadLeadNurtureEmailAssetToGoogleDrive(env,file):purpose==='automation-attachment'?await uploadAutomationAttachmentToGoogleDrive(env,file):purpose==='holiday-image'?await uploadWebsiteImageToGoogleDrive(env,file,{folderName:'Holiday Images',settingsPrefix:'holidayImages',maxBytes:15*1024*1024}):await uploadPlanImageToGoogleDrive(env,file);
    return json({ok:true,...out,purpose,message:`Uploaded ${out.name} to Google Drive → ${out.folderName}.`});
  }catch(e){return driveFailure(e,Number(e?.httpStatus||e?.status||400)||400);}
}
