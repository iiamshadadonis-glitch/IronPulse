import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,resolve,sep} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
try{
 const delivery=JSON.parse(readFileSync(join(root,'verification/ironpulse-v1.06/asset-delivery-fixes.json'),'utf8'));
 const checkInherited=(name,expected)=>{const actual=createHash('sha256').update(readFileSync(join(root,name))).digest('hex');if(name===delivery.middleware.path){if(expected!==delivery.middleware.beforeSha256||actual!==delivery.middleware.afterSha256)throw Error('Unrecognized middleware delivery change: '+name);}else if(actual!==expected)throw Error('Inherited backend, migration or theme file changed: '+name);};
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
 if(!existsSync(join(root,'public/assets/gym-fitness-tips-v1-05.css')))throw Error('Missing public Fitness Tips layout stylesheet.');
 const count=dir=>readdirSync(dir,{withFileTypes:true}).reduce((n,item)=>n+(item.isDirectory()?count(join(dir,item.name)):item.isFile()?1:0),0);
 console.log('Original V1.00 archive: all 1829 files verified byte-for-byte.');
 console.log('Active application: '+count(join(root,'public'))+' frontend files, '+count(join(root,'functions'))+' backend files, '+count(join(root,'migrations'))+' migrations.');
 console.log('All '+manifest.activeApplicationFiles.length+' expected application files are present. The archived source is outside the live public/functions folders.');
 console.log('All 2814 V1.03, 2869 V1.04 and 2926 V1.05 input paths are retained.');
 console.log('Inherited frontend JS, CSS, migrations and business backend files are byte-identical. Middleware changes are limited to the audited HTML/asset delivery addon.');
}catch(error){console.error(error.message);process.exitCode=1;}
