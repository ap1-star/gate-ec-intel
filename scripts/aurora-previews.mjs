/** Actual-data HTML references; this script does not run a browser or produce screenshots. */
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createResearchHost,readSource,PART2_CHECKPOINT} from './research-render-fixture.mjs';
const output=resolve(import.meta.dirname,'../../AURORA_PREVIEWS');
const protectedResearch=JSON.parse(readFileSync(new URL('../docs/integration/research-baseline.json',import.meta.url),'utf8'));
for(const asset of protectedResearch.assets){const text=readSource(asset.path).replace(/\r\n/g,'\n');if(createHash('sha256').update(text).digest('hex')!==asset.sha256_normalized_lf)throw Error('Research baseline changed: '+asset.path);}
await mkdir(resolve(output,'assets'),{recursive:true});
for(const file of ['interface.css','features.css']){
 await writeFile(resolve(output,'assets',file),readSource('dist/'+file));
 await writeFile(resolve(output,'assets','before-'+file),readSource('dist/'+file,true));
}
const themes=['obsidian','porcelain','glacier','volt'];
const pages=[['overview','monitor',{}],['rank','rank',{marks:'55',year:'2025',category:'GEN'}],['questions','questions',{}],['lab','lab',{}],['admissions','admissions',{}],['settings','settings',{}],['account-unavailable','profile',{}],['community-unavailable','forum',{}]];
const manifest={generatedAt:new Date().toISOString(),kind:'static-actual-data-html-not-browser-screenshots',baselineCheckpoint:PART2_CHECKPOINT,recordCount:520,themes,pages:[],browserInspection:'Tracked separately in docs/aurora/VISUAL_QA.md and sibling AURORA_VISUAL_QA/capture-manifest.json'};
function html(host,theme,title,before=false){
 return '<!doctype html><html lang="en" data-theme="'+theme+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+title+' — Aurora reference</title><link rel="stylesheet" href="assets/'+(before?'before-':'')+'interface.css"><link rel="stylesheet" href="assets/'+(before?'before-':'')+'features.css"></head><body class="'+host.document.body.className+'">'+host.markup()+'</body></html>';
}
const baseline=createResearchHost({baseline:true,features:false});baseline.render('monitor');
await writeFile(resolve(output,'before-overview.html'),html(baseline,'obsidian','Part 2 overview',true));
for(const theme of themes){
 const host=createResearchHost({theme});
 if(host.run('R.questions.length')!==520)throw Error('Research count changed.');
 for(const feature of host.modules)if(feature.renderers.forum)await feature.load('forum');
 for(const [name,route,params] of pages){
  const content=host.render(route,params);if(!content||content.includes('NaN'))throw Error('Invalid reference: '+name+' '+theme);
  const file=name+'-'+theme+'.html';await writeFile(resolve(output,file),html(host,theme,name));manifest.pages.push({file,route,theme,params});
 }
}
const index=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aurora — actual-data theme references</title><style>
body{margin:0;background:#101216;color:#f5f2eb;font:14px/1.7 system-ui,sans-serif}header{padding:28px 32px;border-bottom:1px solid #353a43}h1{font-size:28px;margin:0 0 8px}p{max-width:980px;color:#b8bec8;margin:8px 0}label{margin-right:20px}select,button,a{font:inherit}select,button{background:#22262d;color:#f5f2eb;border:1px solid #686d76;border-radius:6px;padding:8px}a{color:#e0be80}nav{display:flex;gap:18px;flex-wrap:wrap;padding:18px 32px}.references{display:grid;grid-template-columns:1fr 1fr;gap:28px;padding:0 32px 32px}.reference{min-width:0}h2{font-size:18px} .frame-scroll{overflow:auto;border:1px solid #353a43}iframe{display:block;border:0;width:1440px;height:1024px;max-width:none;background:#171a1f}small{color:#b8bec8}@media(max-width:900px){.references{grid-template-columns:1fr}}
</style></head><body><header><h1>Aurora appearance review</h1><p>These are static HTML references generated from the application’s actual renderers and unchanged research data. They are not screenshots or evidence of completed browser inspection. Buttons inside the references are inert; use the working application for interactions.</p><p>Same 520-question corpus, same scope, same viewport dimensions. Rank examples use the actual 2025 model at 55 marks. Private workspaces retain genuine service-unavailable states.</p><p><a href="http://127.0.0.1:8803/#monitor" target="_blank" rel="noopener">Open the working local application</a> · <a href="before-overview.html" target="_blank" rel="noopener">Part 2 before reference</a></p></header><nav><label>Page <select id="page">${pages.map(([name])=>'<option value="'+name+'">'+name+'</option>').join('')}</select></label><label>Viewport width <select id="width">${[1920,1440,1280,1024,768,390,360].map(n=>'<option '+(n===1440?'selected':'')+'>'+n+'</option>').join('')}</select></label><label>Viewport height <select id="height"><option>1024</option><option>900</option><option>844</option></select></label></nav><div class="references">${themes.map(theme=>'<section class="reference"><h2>'+theme[0].toUpperCase()+theme.slice(1)+'</h2><div class="frame-scroll"><iframe title="'+theme+' actual-data reference" src="overview-'+theme+'.html" data-theme-frame="'+theme+'"></iframe></div><small><a data-full="'+theme+'" href="overview-'+theme+'.html" target="_blank" rel="noopener">Open full reference</a></small></section>').join('')}</div><script>const page=document.getElementById('page'),width=document.getElementById('width'),height=document.getElementById('height');function update(){document.querySelectorAll('iframe').forEach(frame=>{frame.src=page.value+'-'+frame.dataset.themeFrame+'.html';frame.style.width=width.value+'px';frame.style.height=height.value+'px'});document.querySelectorAll('[data-full]').forEach(link=>link.href=page.value+'-'+link.dataset.full+'.html')}[page,width,height].forEach(control=>control.addEventListener('change',update));</script></body></html>`;
await writeFile(resolve(output,'index.html'),index);await writeFile(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Generated '+manifest.pages.length+' Aurora actual-data HTML references plus the Part 2 before view in '+output+'. Native screenshot evidence is tracked separately in AURORA_VISUAL_QA.');
