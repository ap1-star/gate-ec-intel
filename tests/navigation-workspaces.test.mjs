import test from 'node:test';
import assert from 'node:assert/strict';
import {createResearchHost} from '../scripts/research-render-fixture.mjs';

const sidebar=(host,route)=>host.run(`view=${JSON.stringify(route)};ui.Sidebar()`);
const openGroups=html=>[...html.matchAll(/<details\b[^>]*data-nav-section="([^"]+)"[^>]*>/g)].filter(match=>/\sopen(?:\s|>)/.test(match[0])).map(match=>match[1]);
function toggle(host,id,open){
 const section={dataset:{navSection:id},open};
 const action={dataset:{uiAction:'nav-section'},closest:selector=>selector==='[data-nav-section]'?section:null};
 const target={closest:selector=>selector==='[data-ui-action]'?action:null,matches:()=>false};
 let prevented=false;
 for(const handler of host.handlers.get('click')||[])handler({target,preventDefault(){prevented=true},stopPropagation(){}});
 return prevented;
}

test('five task groups retain every route while nested navigation uses labels instead of repeated icons',()=>{
 const host=createResearchHost(),catalog=host.window.TerminalRoutes,html=sidebar(host,'monitor');
 assert.equal(catalog.visibleGroups(false).length,5);
 assert.deepEqual(Array.from(catalog.visibleGroups(false),group=>group.id),['research','career','personal','community','system']);
 assert.equal(new Set(Array.from(catalog.visibleGroups(false),group=>group.icon)).size,5);
 assert.equal((html.match(/class="nav-workspace-group/g)||[]).length,5);
 for(const match of html.matchAll(/<nav\b[^>]*class="primary-nav nav-workspace-children"[^>]*>([\s\S]*?)<\/nav>/g))assert.ok(!match[1].includes('ui-icon'));
 const searchable=Array.from(catalog.commandEntries(false)).flatMap(entry=>Array.from(entry.routes));
 assert.equal(searchable.length,40);assert.equal(new Set(searchable).size,40);
 for(const route of ['opportunities','placements','companies','gate-reports','psu-evidence','bits-offers','career-sources'])assert(searchable.includes(route));
 for(const route of searchable){assert.ok(catalog.sectionFor(route));assert.equal(catalog.resolve(route).status,'available');}
 assert.equal(catalog.sectionFor('rank-predictor').id,'career');assert.equal(catalog.sectionFor('profile').id,'personal');
 assert.ok(!html.includes('data-nav-section="owner"'));
 host.window.TerminalFeatureSession={status:'authenticated',user:{isOwner:true,displayName:'Owner'}};
 assert.ok(sidebar(host,'admin').includes('data-nav-section="owner" open'));
});

test('the current task group opens automatically and the previous automatic group closes',()=>{
 const host=createResearchHost();
 assert.deepEqual(openGroups(sidebar(host,'monitor')),['research']);
 assert.deepEqual(openGroups(sidebar(host,'rank')),['career']);
 const detail=sidebar(host,'recruitment-detail');assert.deepEqual(openGroups(detail),['career']);
 assert.match(detail,/<a href="#recruitment" class="selected" aria-current="page"/);
 assert.deepEqual(openGroups(sidebar(host,'planner')),['personal']);
 assert.deepEqual(openGroups(sidebar(host,'evidence')),['system']);
});

test('manual expansion is remembered only in session storage and closed active groups stay closed until another task is selected',()=>{
 const host=createResearchHost(),memory=new Map();host.window.sessionStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
 sidebar(host,'monitor');toggle(host,'career',false);
 assert.deepEqual(openGroups(sidebar(host,'monitor')),['research','career']);
 assert.equal(memory.get('gate-navigation-expanded'),'["career"]');assert.ok(!host.storage.has('gate-ui-nav-sections'));
 sidebar(host,'rank');toggle(host,'career',true);
 assert.deepEqual(openGroups(sidebar(host,'rank')),[]);
 assert.deepEqual(openGroups(sidebar(host,'admissions')),[]);
 assert.deepEqual(openGroups(sidebar(host,'planner')),['personal']);
 assert.deepEqual(openGroups(sidebar(host,'rank')),['career']);
});

test('a group selected from the collapsed rail expands the sidebar and keeps all tools accessible',()=>{
 const host=createResearchHost();host.render('monitor');host.run('ui.state.collapsed=true');
 assert.equal(toggle(host,'career',false),true);
 assert.equal(host.run('ui.state.collapsed'),false);
 const html=sidebar(host,'monitor');assert.deepEqual(openGroups(html),['research','career']);
 assert.ok(html.includes('aria-controls="nav-children-career"'));assert.ok(html.includes('href="#admissions"'));
});

test('account actions clearly expose sign in and preserve an accessible name when mobile hides text',()=>{
 const host=createResearchHost();host.render('settings');
 let header=host.element('header').innerHTML;
 assert.match(header,/<a class="workspace-account" href="#dashboard" title="Sign in or create an account" aria-label="Sign in or create an account"/);
 assert.match(header,/<span>Sign in<\/span>/);assert.ok(host.element('#content').innerHTML.includes('Sign in or create account'));
 host.window.TerminalFeatureSession={status:'authenticated',user:{displayName:'Candidate'}};
 host.render('settings');header=host.element('header').innerHTML;
 assert.ok(header.includes('aria-label="Open your workspace: Candidate"'));assert.ok(host.element('#content').innerHTML.includes('>My workspace</a>'));
});
