/** Static actual-source references. This script does not launch a browser or create PNGs. */
import {mkdir,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createResearchHost,readSource} from './research-render-fixture.mjs';
import {filterProgrammes} from '../src/domains/career/index.mjs';

const root=resolve(import.meta.dirname,'..'),output=resolve(root,'../CAREER_PREVIEWS');
const archive=resolve(root,'vendor/career-aurora14-presentation.tar.gz');
const baseline=JSON.parse(readFileSync(resolve(root,'vendor/career-baseline-manifest.json'),'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
if(digest(readFileSync(archive))!==baseline.archiveSha256)throw Error('Aurora14 career presentation archive checksum failed.');
for(const file of baseline.protectedFiles)if(digest(readFileSync(resolve(root,file.path),'utf8').replace(/\r\n/g,'\n'))!==file.sha256_normalized_lf)throw Error('Career domain changed from the before checkpoint: '+file.path);
const archived=path=>{
 const entry=baseline.files.find(file=>file.path===path);if(!entry)throw Error('Unlisted before presentation asset: '+path);
 const bytes=execFileSync('tar',['-xOf',archive,path],{cwd:root,maxBuffer:20*1024*1024});
 if(digest(bytes)!==entry.sha256)throw Error('Before presentation checksum failed: '+path);
 return bytes.toString('utf8');
};
const beforeSource=archived('src/features/career.mjs').replace("'../domains/career/index.mjs'",JSON.stringify(new URL('../src/domains/career/index.mjs',import.meta.url).href));
const beforeCareer=(await import('data:text/javascript;base64,'+Buffer.from(beforeSource).toString('base64'))).createCareerFeature;
await mkdir(resolve(output,'assets'),{recursive:true});
await writeFile(resolve(output,'assets/interface.css'),readSource('dist/interface.css'));
await writeFile(resolve(output,'assets/features.css'),readSource('dist/features.css'));
await writeFile(resolve(output,'assets/before-features.css'),archived('dist/features.css'));

const sourceRows=filterProgrammes({year:2025,category:'GEN',ecOnly:true});
const records=[sourceRows.find(row=>row.institute==='iisc'&&row.programme==='Electronics and Communication Engineering'),sourceRows.find(row=>row.institute==='iisc'&&row.programme==='Microelectronics and VLSI Design'),sourceRows.find(row=>row.institute==='iitm'&&row.programme==='Communications and Signal Processing'&&row.cutoff!==null)];
if(records.some(row=>!row)||new Set(records.map(row=>row.id)).size!==3)throw Error('Expected three distinct actual programme references for comparison.');
const cases=[
 {name:'rank-empty',label:'Rank / empty candidate',route:'rank',params:{}},
 {name:'rank-55',label:'Rank / 55 marks, 2025',route:'rank',params:{marks:'55',year:'2025',category:'GEN'}},
 {name:'rank-comparison',label:'Rank / 45, 55 and 65 marks',route:'rank',params:{marks:'45',scenarioB:'55',scenarioC:'65',year:'2025',category:'GEN'}},
 {name:'admissions-score',label:'Admissions / score 702',route:'admissions',params:{score:'702',year:'2025',category:'GEN',metric:'gate_score'}},
 {name:'admissions-air',label:'Admissions / unsupported AIR comparison',route:'admissions',params:{rank:'550',year:'2025',category:'GEN',metric:'air'}},
 {name:'institute-comparison',label:'Institutes / three actual source records',route:'institutes',params:{score:'702',year:'2025',category:'GEN',metric:'gate_score',record:records[0].id,compared:JSON.stringify(records.map(row=>row.id))}}
];
const themes=['obsidian','porcelain','glacier','volt'];
const manifest={generatedAt:new Date().toISOString(),kind:'static-actual-source-html-not-browser-screenshots',browserInspection:'Not performed by this generator. Browser control was stopped; these files are supplemental manual references, not native visual QA evidence.',baselineCheckpoint:baseline.checkpoint,baselineVerified:true,protectedCareerFiles:baseline.protectedFiles,scenarios:{rank:{year:2025,category:'GEN',marks:[45,55,65]},admissions:{year:2025,category:'GEN',score:702,selectedRecordIds:records.map(row=>row.id)}},themes,pages:[],beforePages:[]};
function html(host,theme,title,before=false){
 const bodyClass=host.document.body.className||'ui-ready research-app';
 return '<!doctype html><html lang="en" data-theme="'+theme+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+' — actual-source career reference</title><link rel="stylesheet" href="assets/interface.css"><link rel="stylesheet" href="assets/'+(before?'before-':'')+'features.css"></head><body class="'+bodyClass+'">'+host.markup()+'</body></html>';
}
for(const theme of themes)for(const item of cases){
 const host=createResearchHost({theme}),content=host.render(item.route,item.params);
 if(!content||content.includes('NaN')||content.includes('undefined'))throw Error('Invalid actual-source reference: '+item.name+' '+theme);
 const file=item.name+'-'+theme+'.html';
 await writeFile(resolve(output,file),html(host,theme,item.label));manifest.pages.push({file,theme,route:item.route,params:item.params,sha256:digest(readFileSync(resolve(output,file)))});
}
for(const name of ['rank-55','admissions-score','institute-comparison']){
 const item=cases.find(entry=>entry.name===name),host=createResearchHost({theme:'obsidian',features:false}),base=host.window.TerminalResearchBridge;
 const session={status:'unavailable',user:null,csrfToken:null,capabilities:{}};
 const bridge={...base,params:()=>new URLSearchParams(host.context.location.hash.split('?')[1]||''),session:()=>session,api:async()=>{throw Error('Before reference does not activate account services.');},render:()=>host.run('render()'),navigate(){}};
 base.register(beforeCareer(bridge));const content=host.render(item.route,item.params);
 if(!content||content.includes('NaN'))throw Error('Invalid Aurora14 before reference: '+name);
 const file='before-'+name+'.html';await writeFile(resolve(output,file),html(host,'obsidian','Aurora14 before / '+item.label,true));manifest.beforePages.push({file,theme:'obsidian',route:item.route,params:item.params,checkpoint:baseline.checkpoint,sha256:digest(readFileSync(resolve(output,file))),note:name==='institute-comparison'?'Previous version has programme records; it has no three-record comparison or exact detail-route selection.':'Same candidate inputs as the corresponding current reference.'});
}
const index=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Career Intelligence — actual-source references</title><style>
body{margin:0;background:#101216;color:#f5f2eb;font:14px/1.7 system-ui,sans-serif}header,nav{padding:24px 30px;border-bottom:1px solid #353a43}h1{font-size:28px;margin:0 0 10px}p{max-width:1040px;color:#b8bec8;margin:8px 0}a{color:#e0be80}nav{display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding-block:17px}label{display:inline-flex;align-items:center;gap:10px}select{font:inherit;max-width:90vw;padding:8px;background:#22262d;color:#f5f2eb;border:1px solid #686d76;border-radius:6px}.references{display:grid;grid-template-columns:1fr 1fr;gap:26px;padding:0 30px 30px}.reference{min-width:0}h2{font-size:19px;font-weight:550}.frame-scroll{max-width:100%;overflow:auto;border:1px solid #353a43;border-radius:8px}iframe{display:block;border:0;width:1440px;height:1000px;max-width:none;background:#171a1f}small{color:#b8bec8}.before{padding:24px 30px;border-top:1px solid #353a43}.before-list{display:flex;gap:20px;flex-wrap:wrap}@media(max-width:900px){.references{grid-template-columns:1fr}header,nav,.before{padding-inline:18px}.references{padding-inline:18px}}
</style></head><body><header><h1>Career Intelligence reference gallery</h1><p>These are static HTML references generated from the real application renderers and unchanged numerical engines. They are <strong>not screenshots</strong>, browser-rendered acceptance evidence or a substitute for visual inspection. Product controls inside the references are inert. Use the live application to test interaction.</p><p>Rank scenarios use the actual 2025 predictor at 45, 55 and 65 marks. Admissions compares an entered score of 702 with actual 2025 GEN source rows; AIR 550 deliberately demonstrates unsupported programme comparison. No candidate performance, cutoffs or admission probabilities are invented.</p><p><a href="manifest.json">Manifest, scope and checksum evidence</a> · <a href="https://gate-ec-research-terminal.precioussky4.chatgpt.site/#rank" target="_blank" rel="noopener">Open the working published application</a></p></header><nav><label>State <select id="page">${cases.map(item=>'<option value="'+item.name+'" '+(item.name==='rank-55'?'selected':'')+'>'+item.label+'</option>').join('')}</select></label><label>CSS width <select id="width">${[1440,1024,768,390,360].map(width=>'<option>'+width+'</option>').join('')}</select></label><label>CSS height <select id="height"><option>1000</option><option>844</option><option>900</option></select></label></nav><div class="references">${themes.map(theme=>'<section class="reference"><h2>'+theme[0].toUpperCase()+theme.slice(1)+'</h2><div class="frame-scroll"><iframe title="'+theme+' actual-source career reference" src="rank-55-'+theme+'.html" data-theme="'+theme+'"></iframe></div><small><a data-full="'+theme+'" href="rank-55-'+theme+'.html" target="_blank" rel="noopener">Open complete reference</a></small></section>').join('')}</div><section class="before"><h2>Aurora14 / previous presentation</h2><p>Checksum-verified presentation inputs from checkpoint ${baseline.checkpoint}. The rank and admissions references use the same candidate values as the corresponding current pages. The previous Institute screen has no three-record comparison; its source rows are retained for comparison with the new workflow.</p><div class="before-list">${manifest.beforePages.map(item=>'<a href="'+item.file+'" target="_blank" rel="noopener">'+item.file.replace('before-','').replace('.html','')+'</a>').join('')}</div><p>Before references retain the same shared Aurora shell and Obsidian appearance. These HTML pages do not claim that native screenshot review occurred.</p></section><script>const page=document.getElementById('page'),width=document.getElementById('width'),height=document.getElementById('height');function update(){document.querySelectorAll('iframe').forEach(frame=>{frame.src=page.value+'-'+frame.dataset.theme+'.html';frame.style.width=width.value+'px';frame.style.height=height.value+'px'});document.querySelectorAll('[data-full]').forEach(link=>link.href=page.value+'-'+link.dataset.full+'.html')}[page,width,height].forEach(control=>control.addEventListener('change',update));</script></body></html>`;
await writeFile(resolve(output,'index.html'),index);
await writeFile(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Generated '+manifest.pages.length+' current Career HTML references and '+manifest.beforePages.length+' checksum-verified Aurora14 before references in '+output+'. These are not native screenshots.');
