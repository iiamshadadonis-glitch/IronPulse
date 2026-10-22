import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,resolve,sep} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
try{
 const delivery=JSON.parse(readFileSync(join(root,'verification/ironpulse-v1.06/asset-delivery-fixes.json'),'utf8'));
 const layoutAudit=JSON.parse(readFileSync(join(root,'verification/ironpulse-v1.07/layout-theme-fixes.json'),'utf8'));
 const bulkAudit=JSON.parse(readFileSync(join(root,'verification/ironpulse-v1.08/bulk-import-fixes.json'),'utf8'));
 const history=[...layoutAudit.frontendFiles,...layoutAudit.backendFiles,...bulkAudit.frontendFiles,...bulkAudit.backendFiles];
 const layoutChanges=new Map(history.map(fix=>[fix.path,fix]));
 const checkInherited=(name,expected)=>{const actual=createHash('sha256').update(readFileSync(join(root,name))).digest('hex');if(layoutChanges.has(name)){const fix=layoutChanges.get(name);const inherited=new Set(history.filter(row=>row.path===name).flatMap(row=>[row.beforeSha256,row.afterSha256]));if(name===delivery.middleware.path)inherited.add(delivery.middleware.beforeSha256);if(!inherited.has(expected)||actual!==fix.afterSha256)throw Error('Unrecognized layout/theme safeguard change: '+name);}else if(name===delivery.middleware.path){if(expected!==delivery.middleware.beforeSha256||actual!==delivery.middleware.afterSha256)throw Error('Unrecognized middleware delivery change: '+name);}else if(actual!==expected)throw Error('Inherited backend, migration or theme file changed: '+name);};
 const release=JSON.parse(readFileSync(join(root,'public/release.json'),'utf8'));
 const manifest=JSON.parse(readFileSync(join(root,'verification','ironpulse-'+release.version.toLowerCase(),'v100-original-files.json'),'utf8'));
 if(manifest.fileCount!==1829||Object.keys(manifest.files).length!==1829||manifest.sourceZipSha256!=='51b840852d0d3c3e2b5fa30c719754c834b948f669ac7603635fe5e55a3b927d')throw Error('The original-source index does not match the supplied complete V1.00 project.');
 const archive=resolve(root,'archive/V1.00');
 for(const [name,expected]of Object.entries(manifest.files)){
  const path=resolve(archive,name);
  if(!path.startsWith(archive+sep)||!existsSync(path))throw Error('Missing preserved original file: '+name+'. Copy the complete V1.05 project, including archive/.');
  const actual=createHash('sha256').update(readFileSync(path)).digest('hex');
  if(actual!==expected)throw Error('Preserved original file was changed: '+name);
 }
 if(!Array.isArray(manifest.activeApplicationFiles)||manifest.activeApplicationFiles.length!==815)throw Error('The active application file inventory is incomplete.');
 for(const name of manifest.activeApplicationFiles){
  const path=resolve(root,name);
  if(!path.startsWith(resolve(root)+sep)||!existsSync(path))throw Error('Missing active application file: '+name+'. Copy every project folder.');
 }
 const supplied=JSON.parse(readFileSync(join(root,'verification/ironpulse-v1.04/v103-input-files.json'),'utf8'));
 if(supplied.fileCount!==2814||Object.keys(supplied.files).length!==2814||supplied.sourceZipSha256!=='75f12988aefe2aa2b62e538c7c24e76075c2242ad34debf406aaad20c3214fd3')throw Error('The complete supplied V1.03 source inventory is invalid.');
 for(const [name,expected]of Object.entries(supplied.files)){
  const path=resolve(root,name);if(!path.startsWith(resolve(root)+sep)||!existsSync(path))throw Error('Missing supplied V1.03 file: '+name);
  if(name.startsWith('functions/')||name.startsWith('migrations/')||name.endsWith('.css'))checkInherited(name,expected);
 }
 const latest=JSON.parse(readFileSync(join(root,'verification/ironpulse-v1.05/v104-input-files.json'),'utf8'));
 if(latest.fileCount!==2869||Object.keys(latest.files).length!==2869||latest.sourceZipSha256!=='ef227bb10326aa6f70e7a458a406bc73175696fe46d04174f19b703c6ee13502')throw Error('The complete supplied V1.04 source inventory is invalid.');
 for(const [name,expected]of Object.entries(latest.files)){
  const path=resolve(root,name);if(!path.startsWith(resolve(root)+sep)||!existsSync(path))throw Error('Missing supplied V1.04 file: '+name);
  if(name.startsWith('functions/')||name.startsWith('migrations/')||name.endsWith('.css'))checkInherited(name,expected);
 }
 const current=JSON.parse(readFileSync(join(root,'verification/ironpulse-v1.06/v105-input-files.json'),'utf8'));
 if(current.fileCount!==2926||Object.keys(current.files).length!==2926||current.sourceZipSha256!=='bc152888a606f0d6f8f9222cd0493f4448d6384a4743b6d9ac9fe196116b8927')throw Error('The complete supplied V1.05 source inventory is invalid.');
 for(const [name,expected]of Object.entries(current.files)){const path=resolve(root,name);if(!path.startsWith(resolve(root)+sep)||!existsSync(path))throw Error('Missing supplied V1.05 file: '+name);if(name.startsWith('functions/')||name.startsWith('migrations/')||name.endsWith('.css')||(name.startsWith('public/')&&name.endsWith('.js')))checkInherited(name,expected);}
 const suppliedV106=JSON.parse(readFileSync(join(root,'verification/ironpulse-v1.07/v106-input-files.json'),'utf8'));if(suppliedV106.fileCount!==2992||Object.keys(suppliedV106.files).length!==2992||suppliedV106.sourceZipSha256!=='72508b7cc867579f49b566aeff8e760f61bca6b4b8560f0755037d02e43fbb0b')throw Error('Invalid complete supplied V1.06 inventory.');
 for(const[name,expected]of Object.entries(suppliedV106.files)){if(!existsSync(join(root,name)))throw Error('Missing supplied V1.06 file: '+name);if(name.startsWith('functions/')||name.startsWith('migrations/')||name.endsWith('.css')||(name.startsWith('public/')&&name.endsWith('.js')))checkInherited(name,expected);}
 const suppliedV107=JSON.parse(readFileSync(join(root,'verification/ironpulse-v1.08/v107-input-files.json'),'utf8'));if(suppliedV107.fileCount!==3059||Object.keys(suppliedV107.files).length!==3059||suppliedV107.sourceZipSha256!=='4c90f41b26f38bdc09304921cfb76b4bf6c90618f4f4c5be74a468d3c66f91f0')throw Error('Invalid complete supplied V1.07 inventory.');
 for(const[name,expected]of Object.entries(suppliedV107.files)){if(!existsSync(join(root,name)))throw Error('Missing supplied V1.07 file: '+name);if(name.startsWith('functions/')||name.startsWith('migrations/')||name.endsWith('.css')||(name.startsWith('public/')&&name.endsWith('.js')))checkInherited(name,expected);}
 if(!existsSync(join(root,'public/assets/gym-fitness-tips-v1-05.css')))throw Error('Missing public Fitness Tips layout stylesheet.');
 const count=dir=>readdirSync(dir,{withFileTypes:true}).reduce((n,item)=>n+(item.isDirectory()?count(join(dir,item.name)):item.isFile()?1:0),0);
 console.log('Original V1.00 archive: all 1829 files verified byte-for-byte.');
 console.log('Active application: '+count(join(root,'public'))+' frontend files, '+count(join(root,'functions'))+' backend files, '+count(join(root,'migrations'))+' migrations.');
 console.log('All '+manifest.activeApplicationFiles.length+' expected application files are present. The archived source is outside the live public/functions folders.');
 console.log('All 2814 V1.03, 2869 V1.04, 2926 V1.05 2992 V1.06 and 3059 V1.07 input paths are retained.');
 console.log('All inherited CSS, migrations and application files outside the explicit V1.07/V1.08 presentation safeguards remain byte-identical.');
}catch(error){console.error(error.message);process.exitCode=1;}
