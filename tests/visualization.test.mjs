import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context=vm.createContext({window:{}});
vm.runInContext(readFileSync(new URL('../src/ui/visualization.js',import.meta.url),'utf8'),context);
const viz=context.window.TerminalVisualization;
test('visualization themes retain ten stable series with explicit missing-value formatting',()=>{
 assert.equal(viz.palette('dark').length,10);
 assert.equal(viz.palette('light').length,10);
 assert.equal(new Set(viz.palette('light')).size,10);
 assert.notDeepEqual(viz.palette('light'),viz.palette('dark'));
 assert.equal(viz.number(null),'—');
 assert.equal(viz.number(Infinity),'—');
 assert.equal(viz.number(12.345,2),'12.35');
 const palette=viz.palette('dark');palette[0]='changed';
 assert.notEqual(viz.palette('dark')[0],'changed');
});

test('all four chart identities provide distinct series and AA-sized graphical contrast on their surfaces',()=>{
 const identities=['obsidian','porcelain','glacier','volt'];
 for(const theme of identities){
  const t=viz.tokens(theme);assert.equal(t.theme,theme);assert.equal(t.series.length,10);assert.equal(new Set(t.series).size,10);
  assert.ok(viz.contrast(t.text,t.surface)>=4.5,theme+' text');assert.ok(viz.contrast(t.secondary,t.surface)>=4.5,theme+' chart labels');
  for(const color of t.series)assert.ok(viz.contrast(color,t.surface)>=3,theme+' series '+color);
  assert.notEqual(viz.heatColor(0,theme),viz.heatColor(null,theme));assert.notEqual(viz.heatColor(0,theme),viz.heatColor(1,theme));assert.notEqual(viz.divergingColor(-1,theme),viz.divergingColor(1,theme));
  for(const fraction of [0,.1,.3,.5,.8,1]){const background=viz.heatColor(fraction,theme);assert.ok(viz.contrast(background,viz.textFor(background,theme))>=4.5,theme+' heat '+fraction);}
  assert.equal(viz.exportTheme(theme).background,t.surface);assert.equal(viz.exportTheme(theme).grid,t.grid);assert.equal(viz.exportTheme(theme).text,t.secondary);
 }
 assert.equal(viz.palette('dark')[0],viz.palette('obsidian')[0]);assert.equal(viz.palette('light')[0],viz.palette('porcelain')[0]);
 assert.equal(new Set(identities.map(theme=>viz.palette(theme).join(','))).size,4);
});

class Mark{
 constructor(tag,attributes={},styles={}){this.tagName=tag;this.attributes=new Map(Object.entries(attributes));this.properties=new Map(Object.entries(styles));this.style={getPropertyValue:key=>this.properties.get(key)||'',setProperty:(key,value)=>this.properties.set(key,value)};this.textContent='Original data label';}
 getAttribute(key){return this.attributes.get(key)??null;}
 hasAttribute(key){return this.attributes.has(key);}
 setAttribute(key,value){this.attributes.set(key,String(value));}
 matches(selector){return selector==='[tabindex]'&&this.hasAttribute('tabindex');}
}
function plot(marks,styled=[],tooltips=[]){return {querySelectorAll:selector=>selector==='svg[role="img"],svg.chart'?[{querySelectorAll:()=>marks}]:selector==='[style],[data-ui-heat]'?styled:selector==='[data-ui-tooltip]'?tooltips:[]};}

test('repeated in-place recoloring preserves geometry, data, selections and accessible plot links',()=>{
 const line=new Mark('polyline',{stroke:'#87b5cf',fill:'none',points:'10,20 40,50','data-ui-series-index':'2'}),circle=new Mark('circle',{stroke:'#87b5cf',fill:'var(--surface)',cx:'40',cy:'50',r:'4','data-ui-series-index':'2',tabindex:'0','data-ui-tooltip':'Networks · 2025 · 12 marks','aria-label':'Networks, 2025, 12 marks'}),oldLine=new Mark('path',{stroke:'#b0a1ca',fill:'none',d:'M 10 20 L 40 50'}),label=new Mark('text',{}, {fill:'#182128'}),legend=new Mark('i',{}, {'--series':'#87b5cf'});
 const root=plot([line,circle,oldLine,label],[label,legend],[circle]);
 for(const theme of ['obsidian','porcelain','glacier','volt','obsidian']){
  viz.apply(root,theme);assert.equal(line.getAttribute('stroke'),viz.palette(theme)[2]);assert.equal(circle.getAttribute('stroke'),viz.palette(theme)[2]);assert.equal(oldLine.getAttribute('stroke'),viz.palette(theme)[1]);assert.equal(legend.properties.get('--series'),viz.palette(theme)[0]);assert.equal(label.properties.get('fill'),viz.tokens(theme).onSeries);
  assert.equal(line.getAttribute('fill'),'none');assert.equal(circle.getAttribute('fill'),'var(--surface)');assert.equal(line.getAttribute('points'),'10,20 40,50');assert.equal(circle.getAttribute('cy'),'50');assert.equal(circle.getAttribute('r'),'4');assert.equal(circle.textContent,'Original data label');assert.equal(circle.getAttribute('aria-label'),'Networks, 2025, 12 marks');assert.equal(circle.getAttribute('aria-describedby'),'chartTooltip');
 }
 assert.ok(line.getAttribute('stroke-dasharray'));assert.notEqual(line.getAttribute('stroke-dasharray'),oldLine.getAttribute('stroke-dasharray'));
});

test('semantic chart roles and inline style colors recolor without replacing CSS-variable surfaces',()=>{
 const positive=new Mark('rect',{fill:'#70c9ae','data-ui-semantic':'positive'}),line=new Mark('path',{stroke:'#87b5cf',fill:'none','data-ui-semantic':'accent','data-ui-theme-attr':'stroke'}),legend=new Mark('span',{}, {background:'#70c9ae',color:'#98a4b5'}),root=plot([positive,line],[legend]);
 for(const theme of ['volt','porcelain','glacier','obsidian']){viz.apply(root,theme);const t=viz.tokens(theme);assert.equal(positive.getAttribute('fill'),t.positive);assert.equal(line.getAttribute('stroke'),t.accent);assert.equal(line.getAttribute('fill'),'none');assert.equal(legend.properties.get('background'),t.positive);assert.equal(legend.properties.get('color'),t.secondary);}
});

test('all ten categorical lines remain distinguishable by non-color patterns and retained labels',()=>{
 const lines=Array.from({length:10},(_,i)=>new Mark('polyline',{stroke:'#87b5cf',fill:'none','data-ui-series-index':String(i),'aria-label':'Subject '+(i+1),points:'10,20 40,50'})),root=plot(lines);
 for(const theme of ['obsidian','porcelain','glacier','volt']){viz.apply(root,theme);assert.equal(new Set(lines.map(line=>line.getAttribute('stroke-dasharray')||'solid')).size,10);for(const [i,line] of lines.entries()){assert.equal(line.getAttribute('aria-label'),'Subject '+(i+1));assert.equal(line.getAttribute('points'),'10,20 40,50');}}
 // Pattern and text distinguishability survives a monochrome view; this is not a claim of clinical color-vision testing.
});

test('zero, missing and positive/negative heat observations remain distinct and readable in every theme',()=>{
 const zero=new Mark('button',{'data-ui-heat':'0'}),missing=new Mark('td',{'data-ui-heat':'missing'}),high=new Mark('button',{'data-ui-heat':'1'}),legacy=new Mark('td',{}, {background:'rgba(90,142,201,0.375)'}),negative=new Mark('td',{}, {background:'rgba(197,139,91,0.45)'}),root=plot([],[zero,missing,high,legacy,negative]);
 for(const theme of ['obsidian','porcelain','glacier','volt','obsidian']){
  viz.apply(root,theme);assert.equal(zero.properties.get('background'),viz.heatColor(0,theme));assert.equal(high.properties.get('background'),viz.heatColor(1,theme));assert.equal(legacy.properties.get('background'),viz.heatColor(.5,theme));assert.equal(negative.properties.get('background'),viz.divergingColor(-1,theme));assert.equal(missing.properties.get('background'),viz.heatColor(null,theme));assert.notEqual(missing.properties.get('background'),zero.properties.get('background'));assert.equal(missing.getAttribute('data-ui-missing'),'true');assert.match(missing.properties.get('background-image'),/repeating-linear-gradient/);
  for(const cell of [zero,missing,high,legacy,negative]){assert.equal(cell.textContent,'Original data label');assert.ok(viz.contrast(cell.properties.get('background'),cell.properties.get('color'))>=4.5);}
 }
});

test('runtime chart tokens consume the central CSS palette for the effective theme',()=>{
 const cssTokens={'--chart-series-1':'#123456','--chart-grid':'#234567','--color-surface':'#345678'},context=vm.createContext({window:{},document:{documentElement:{getAttribute:()=> 'glacier'}},getComputedStyle:()=>({getPropertyValue:key=>cssTokens[key]||''})});
 vm.runInContext(readFileSync(new URL('../src/ui/visualization.js',import.meta.url),'utf8'),context);const scoped=context.window.TerminalVisualization;
 assert.equal(scoped.palette('glacier')[0],'#123456');assert.equal(scoped.tokens('glacier').grid,'#234567');assert.equal(scoped.exportTheme('glacier').background,'#345678');assert.notEqual(scoped.palette('porcelain')[0],'#123456');
});

test('standalone chart export retains computed class styling and final marker geometry without changing the live plot',()=>{
 const path=new Mark('polyline',{points:'10,20 40,50'}),marker=new Mark('g',{}, {transform:'translate(40px, 50px)'}),label=new Mark('text');
 const original={querySelectorAll:()=>[path,marker,label],style:{getPropertyValue:()=>''}},copiedMarks=[new Mark('polyline',{points:'10,20 40,50'}),new Mark('g'),new Mark('text')];
 const copy={querySelectorAll:()=>copiedMarks,style:{setProperty(){}}};
 const properties=new Map([[path,{fill:'none',stroke:'rgb(224, 190, 128)','stroke-width':'2.4px'}],[marker,{transform:'matrix(1, 0, 0, 1, 30, 40)',opacity:'1'}],[label,{fill:'rgb(245, 242, 235)','font-size':'11px','font-family':'monospace'}]]);
 viz.inlineSvgAppearance(original,copy,node=>({getPropertyValue:key=>properties.get(node)?.[key]||''}));
 assert.equal(copiedMarks[0].properties.get('stroke'),'rgb(224, 190, 128)');assert.equal(copiedMarks[0].properties.get('fill'),'none');
 assert.equal(copiedMarks[1].properties.get('transform'),'translate(40px, 50px)','Export uses the target position instead of an intermediate animation frame.');
 assert.equal(copiedMarks[2].properties.get('font-size'),'11px');assert.equal(copiedMarks[2].properties.get('fill'),'rgb(245, 242, 235)');
 assert.equal(copiedMarks[0].getAttribute('points'),'10,20 40,50');assert.equal(path.properties.size,0);assert.equal(marker.properties.get('transform'),'translate(40px, 50px)');
 assert.equal(copiedMarks[1].properties.get('transition'),'none');
});
