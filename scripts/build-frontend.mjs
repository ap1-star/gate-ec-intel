import {readFile,writeFile,mkdir,stat,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {build as bundle} from 'esbuild';
await import('./build-combined-atlas.mjs');
const root=resolve(import.meta.dirname,'..');
const read=path=>readFile(resolve(root,path),'utf8');
const write=(path,text)=>writeFile(resolve(root,path),text.replace(/\r\n/g,'\n'),'utf8');
await mkdir(resolve(root,'dist'),{recursive:true});
await write('dist/appearance.js',await read('src/app/appearance.js'));
await write('dist/index.html',await read('src/ui/index.html'));
const foundation=await Promise.all(['src/ui/components.js','src/ui/visualization.js','src/app/routes.js','src/app/preferences.js','src/app/bootstrap.js'].map(read));
await write('dist/foundation.js',foundation.join('\n\n'));
await write('dist/interface.js',await read('src/ui/research-workspace.js'));
await write('dist/interface.css',(await read('src/ui/workspace.css'))+'\n'+(await read('src/ui/tokens.css'))+'\n'+(await read('src/ui/part1.css')));
await bundle({entryPoints:[resolve(root,'src/features/index.mjs')],outfile:resolve(root,'dist/features.js'),bundle:true,format:'iife',platform:'browser',target:'es2022',legalComments:'none',logLevel:'warning'});
await write('dist/features.css',(await read('src/features/pyq.css'))+'\n'+(await read('src/features/career.css'))+'\n'+(await read('src/features/rank.css'))+'\n'+(await read('src/features/admissions.css'))+'\n'+(await read('src/features/personal.css'))+'\n'+(await read('src/features/shell.css'))+'\n'+(await read('src/features/recruitment.css'))+'\n'+(await read('src/features/atlas.css')));
await write('dist/recruitment-sw.js',await read('src/app/recruitment-sw.js'));
const html=await read('dist/index.html');
for(const match of html.matchAll(/(?:src|href)=["']([^"']+)/g)){
 if(!match[1].startsWith('#')&&!match[1].includes('://'))await stat(resolve(root,'dist',match[1]));
}

const publicDir=resolve(root,'public');
await mkdir(publicDir,{recursive:true});
for(const entry of await readdir(resolve(root,'dist'),{withFileTypes:true})){
 if(!entry.isFile())continue;
 await writeFile(resolve(publicDir,entry.name),await readFile(resolve(root,'dist',entry.name)));
}
const {publicHostingSnapshot}=await import('../server/hosting-proxy.mjs');
const snapshot=publicHostingSnapshot(),hostingDir=resolve(publicDir,'_hosting');
await mkdir(resolve(hostingDir,'notices'),{recursive:true});
const outputJson=(file,data)=>writeFile(resolve(hostingDir,file),JSON.stringify({status:'ok',data}),'utf8');
await outputJson('catalog.json',snapshot);
await outputJson('notices.json',{items:snapshot.notices,total:snapshot.notices.length});
await outputJson('session.json',{status:'unavailable',user:null,csrfToken:null,authMode:'unavailable',capabilities:{database:false,platformAuth:false,credentialAuth:false,scheduler:false}});
await outputJson('capabilities.json',{database:false,platformAuth:false,credentialAuth:false,scheduler:false,authMode:'unavailable'});
await outputJson('push.json',{configured:false,publicKey:null});
for(const notice of snapshot.notices)await outputJson('notices/'+notice.id+'.json',notice);
console.log('Built portable public/ assets. Railway runs the persistent Node backend; Netlify/Vercel functions optionally proxy BACKEND_ORIGIN.');

