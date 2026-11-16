import {readFile,writeFile,mkdir,stat,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {build as bundle} from 'esbuild';
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
await write('dist/features.css',(await read('src/features/pyq.css'))+'\n'+(await read('src/features/career.css'))+'\n'+(await read('src/features/rank.css'))+'\n'+(await read('src/features/admissions.css'))+'\n'+(await read('src/features/personal.css'))+'\n'+(await read('src/features/shell.css'))+'\n'+(await read('src/features/recruitment.css')));
await write('dist/recruitment-sw.js',await read('src/app/recruitment-sw.js'));
const html=await read('dist/index.html');
for(const match of html.matchAll(/(?:src|href)=["']([^"']+)/g)){
 if(!match[1].startsWith('#')&&!match[1].includes('://'))await stat(resolve(root,'dist',match[1]));
}
const hosting=JSON.parse(await read('.openai/hosting.json'));
if(hosting.d1!=='DB'||hosting.static)throw new Error('Expected the persistent Worker deployment with logical D1 binding DB.');
// Embed compressed public assets so the Worker artifact does not rely on an implicit ASSETS binding.
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json; charset=utf-8',svg:'image/svg+xml',csv:'text/csv; charset=utf-8',md:'text/plain; charset=utf-8',txt:'text/plain; charset=utf-8'};
const assets={};for(const item of await readdir(resolve(root,'dist'),{withFileTypes:true})){
 if(!item.isFile())continue;const bytes=await readFile(resolve(root,'dist',item.name)),extension=item.name.split('.').at(-1);
 assets['/'+item.name]={type:types[extension]||'application/octet-stream',hash:createHash('sha256').update(bytes).digest('hex').slice(0,24),data:gzipSync(bytes,{level:9}).toString('base64')};
}
await mkdir(resolve(root,'.openai/cache'),{recursive:true});
await write('.openai/cache/worker-assets.mjs','export default '+JSON.stringify(assets)+';\n');
await mkdir(resolve(root,'dist/server'),{recursive:true});
await bundle({entryPoints:[resolve(root,'server/entry.mjs')],outfile:resolve(root,'dist/server/index.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',alias:{'terminal-static-assets':resolve(root,'.openai/cache/worker-assets.mjs')},legalComments:'none',logLevel:'warning'});
// Sites stages Drizzle metadata and schema-only migrations before starting the Worker.
await mkdir(resolve(root,'drizzle/meta'),{recursive:true});
const migrations=(await readdir(resolve(root,'migrations'))).filter(name=>/^\d+.*\.sql$/.test(name)).sort();
for(const name of migrations)await write('drizzle/'+name,(await read('migrations/'+name)).replace(/;\r?\n/g,';\n--> statement-breakpoint\n'));
await write('drizzle/meta/_journal.json',JSON.stringify({version:'7',dialect:'sqlite',entries:migrations.map((name,idx)=>({idx,version:'6',when:1794787200000+idx,tag:name.slice(0,-4),breakpoints:true}))},null,2));
console.log('Built public research, technical careers, authenticated API and persistent D1 Worker. '+Object.keys(assets).length+' compressed public assets included. Scheduler/provider availability is reported from actual deployment configuration.');
