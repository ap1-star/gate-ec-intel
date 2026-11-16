import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createResearchHost,themeTokens} from '../scripts/research-render-fixture.mjs';

test('appearance is loaded before styles and Settings presents four actual dashboard miniatures plus System',()=>{
 const html=readFileSync(new URL('../src/ui/index.html',import.meta.url),'utf8');assert.ok(html.indexOf('src="appearance.js"')<html.indexOf('href="interface.css"'));
 const host=createResearchHost();const settings=host.render('settings');
 for(const theme of ['obsidian','porcelain','glacier','volt']){assert.ok(settings.includes('data-ui-theme="'+theme+'"'));assert.ok(settings.includes('data-preview-theme="'+theme+'"'));}
 assert.ok(settings.includes('data-ui-theme="system"'));assert.equal((settings.match(/class="appearance-miniature"/g)||[]).length,4);
 assert.ok(settings.includes('class="mini-chart"'));assert.ok(host.element('header').innerHTML.includes('appearanceMenu'));
});

test('live appearance subscriber preserves research scope, in-progress form identity, focus, open drawer and route',()=>{
 const host=createResearchHost();host.element('#from').value='2020';host.element('#to').value='2024';host.element('#subject').value='Networks';
 host.run("query='circuit';researchState.tab='bootstrap';ui.state.hiddenSeries.add('Networks')");host.render('lab');
 const input={value:'unsaved notes',selectionStart:3,selectionEnd:7};host.document.activeElement=input;host.element('#inspector').open=true;
 const before=host.run('JSON.stringify({scope:[$("#from").value,$("#to").value,$("#subject").value],query,researchState,hidden:[...ui.state.hiddenSeries],ids:R.questions.map(q=>q.id)})');const writes=host.element('#content').writes;
 for(const theme of ['porcelain','glacier','volt','obsidian']){
  assert.equal(host.window.TerminalAppearance.setPreference(theme).ok,true);assert.equal(host.run('theme'),theme);assert.equal(host.context.location.hash,'#lab');assert.equal(host.element('#content').writes,writes);assert.equal(host.document.activeElement,input);assert.equal(host.element('#inspector').open,true);assert.equal(input.value,'unsaved notes');
  assert.equal(host.run('JSON.stringify({scope:[$("#from").value,$("#to").value,$("#subject").value],query,researchState,hidden:[...ui.state.hiddenSeries],ids:R.questions.map(q=>q.id)})'),before);
 }
});

test('delegated theme-choice clicks update pressed state and persistence without rerendering the workspace',()=>{
 const host=createResearchHost();host.render('settings');
 const choices=['obsidian','porcelain','glacier','volt','system'].map(id=>{const attrs=new Map();return {dataset:{uiTheme:id},setAttribute:(key,value)=>attrs.set(key,String(value)),getAttribute:key=>attrs.get(key),closest:selector=>selector==='[data-ui-theme]'?choices.find(choice=>choice.dataset.uiTheme===id):null,matches:()=>false}});
 host.document.querySelectorAll=selector=>selector==='[data-ui-theme]'?choices:[];
 const writes=host.element('#content').writes,event={target:choices[3],preventDefault(){},stopPropagation(){}};
 for(const handler of host.handlers.get('click')||[])handler(event);
 assert.equal(host.window.TerminalAppearance.getPreference(),'volt');assert.equal(host.storage.get('gate-aurora-appearance'),'volt');assert.equal(choices[3].getAttribute('aria-pressed'),'true');assert.equal(choices[0].getAttribute('aria-pressed'),'false');assert.equal(host.element('#content').writes,writes);assert.equal(host.context.location.hash,'#settings');
 host.element('#appearanceMenu').hidden=false;for(const handler of host.handlers.get('keydown')||[])handler({key:'Escape'});
 assert.equal(host.element('#appearanceMenu').hidden,true);assert.equal(host.document.activeElement,host.element('.theme-toggle'));
});

test('all public and gated module renderers share the Aurora host without invalid numeric output',async()=>{
 const host=createResearchHost();for(const module of host.modules)if(module.renderers.forum)await module.load('forum');
 const routes=host.window.TerminalRoutes;
 for(const route of routes.working.flatMap(entry=>entry.routes)){
  const html=host.render(route);assert.ok(html.length>100,route);assert.ok(!html.includes('NaN'),route);assert.equal(host.document.body.dataset.route,route);
 }
 const rank=host.render('rank',{marks:'55',year:'2025',category:'GEN'});assert.ok(rank.includes('550'));assert.ok(rank.includes('702'));
 const denied=host.render('admin');assert.ok(denied.includes('Account services are not connected here'));assert.ok(!denied.includes('Registered accounts'));
});

test('actual central CSS tokens meet text, focus and chart contrast across all four environments',()=>{
 const host=createResearchHost(),viz=host.window.TerminalVisualization;
 for(const theme of ['obsidian','porcelain','glacier','volt']){
  const tokens=themeTokens(theme),get=key=>{assert.ok(tokens.has(key),theme+' '+key);return tokens.get(key)};
  for(const surface of ['--color-canvas','--color-sidebar','--color-surface','--color-surface-raised','--color-surface-hover'])for(const text of ['--color-text','--color-text-secondary','--color-text-muted'])assert.ok(viz.contrast(get(text),get(surface))>=4.5,theme+' '+text+' / '+surface);
  assert.ok(viz.contrast(get('--color-focus'),get('--color-surface'))>=3,theme+' focus');assert.ok(viz.contrast(get('--color-accent-ink'),get('--color-accent'))>=4.5,theme+' primary action');
  assert.ok(viz.contrast(get('--color-control-border'),get('--color-control'))>=3,theme+' input boundary');
  for(let index=1;index<=10;index++)assert.ok(viz.contrast(get('--chart-series-'+index),get('--color-surface'))>=3,theme+' series '+index);
 }
});

test('heat endpoints retain their sequential scale when they share a categorical color',()=>{
 const host=createResearchHost(),viz=host.window.TerminalVisualization,attrs=new Map([['data-ui-heat','1']]),styles=new Map();
 const cell={getAttribute:key=>attrs.get(key)??null,setAttribute:(key,value)=>attrs.set(key,String(value)),hasAttribute:key=>attrs.has(key),style:{getPropertyValue:key=>styles.get(key)||'',setProperty:(key,value)=>styles.set(key,value)}};
 const root={querySelectorAll:selector=>selector==='[style],[data-ui-heat]'?[cell]:[]};
 for(const theme of ['obsidian','porcelain','glacier','volt','obsidian']){host.window.TerminalAppearance.setPreference(theme);viz.apply(root,theme);assert.equal(styles.get('background'),viz.heatColor(1,theme));assert.ok(viz.contrast(styles.get('background'),styles.get('color'))>=4.5);}
});
