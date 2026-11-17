const M=window.V5Math;
const researchState={subject:R.subjects[0],otherSubject:R.subjects[1],tab:'descriptive',iterations:1500,seed:20261114,window:3,
  compareA:2021,compareB:2026,scheme:'equal',multipliers:R.subjects.map(()=>1),topic:'',subtopic:'',plotLow:0,plotHigh:100,columns:['year','subject','topic','marks','type']};
let bootstrapCache=null;
const notes={
 monitor:'The corpus contains 520 records and eight official annual papers. Follow a measure to its records and official source.',
 explorer:'Scores describe structural solution demands. Set a score interval to cross-filter the scatterplot and matching question list.',
 subjects:'Annual allocation includes zero marks for a subject absent from a complete paper. Marks count once under the primary subject.',
 topics:'Primary labels follow the declared taxonomy convention. Secondary subject context creates non-additive overlaps.',
 lab:'The annual paper is the resampling and trend unit. Moment skewness and excess kurtosis describe this small sample without bias correction.',
 compare:'Differences use the same taxonomy and scoring convention. Scores are AI annotations. MTA inclusion is explicit.',
 scenarios:'Hypothetical allocations are normalized to 100 marks. Backtests use only preceding annual papers, with at least two training years.',
 reports:'Reports record the active scope, dataset version and methodology. Browser print can save the report as PDF.',
 audit:'Source visual review, content review and independent certification have separate statuses. Open flags do not all imply incorrect records.',
 questions:'Question text is preserved from the supplied corpus and source-backed repairs. Official PDFs remain authoritative for formula and figure inspection.',
 difficulty:'Toughness uses five 0–4 content dimensions with fixed weights. No independent reviewer agreement or response calibration is available.',
 distributions:'Unavailable measurements are omitted and the sample size is stated. Ordinal scores do not imply equal measurement intervals.',
 inference:'Exact trend tests use eight annual papers and assume exchangeable years. Subject marks have a fixed total, which can induce correlations.',
 responses:'Candidate observations stay in this browser session. Imported complete-candidate rest scores use correct-item marks before penalties.',
 evidence:'Independent analytical research platform. GATE and IITs do not operate or endorse this project.'
};
const newRoutes=[['explorer','Research Explorer'],['topics','Topic Intelligence'],['lab','Statistical Laboratory'],['compare','Cross-Year Analysis'],['scenarios','Scenario Laboratory'],['reports','Reports and Exports']];
for(const [id,title] of newRoutes)if(!modules.some(m=>m[0]===id))modules.push([id,'',title,'']);
const routes=[['monitor','Overview'],['explorer','Research Explorer'],['subjects','Subject Intelligence'],['topics','Topic Intelligence'],
 ['questions','Question Database'],['lab','Statistical Laboratory'],['compare','Cross-Year Analysis'],['difficulty','Difficulty Analysis'],
 ['scenarios','Scenario Laboratory'],['audit','Data Reliability'],['reports','Reports and Exports'],['evidence','Methodology']];
function safeSave(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function safeLoad(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
let theme=safeLoad('gate-v5-theme','dark'),contextVisible=safeLoad('gate-v5-context',false);
function scopeDescription(){return $('#from').value+'–'+$('#to').value+' / '+($('#subject').value==='all'?'All subjects':$('#subject').value)}
function annual(subject=researchState.subject) {
  const rows=scope();
  return scopeYears().map(year=>sum(rows.filter(q=>q.year===year&&q.subject===subject).map(q=>q.marks)));
}
function table(headers,rows){return '<div class="table-scroll"><table class="data-table"><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(value=>'<td>'+value+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'}
function selector(id,values,current){return '<select id="'+id+'" aria-label="'+id+'">'+values.map(value=>'<option '+(String(value)===String(current)?'selected':'')+'>'+E(value)+'</option>').join('')+'</select>'}
function chart(title,body,foot=''){return '<section class="panel v5-chart-panel"><div class="panel-head"><h2>'+title+'</h2><div class="chart-actions"><button data-chart-export="svg">SVG</button><button data-chart-export="png">PNG</button></div></div>'+body+'<div class="panel-foot">'+foot+'</div></section>'}
function linePlot(series,years) {
 const palette=['#48d7e8','#a498ef','#ddb77b','#76b49c','#e19a99','#8fb4e1','#c0bc8d','#a5c0b2','#bd9dc1','#b7a58b'];
 const values=series.flatMap(s=>s.values.filter(Number.isFinite)),maximum=Math.max(1,...values);
 const x=i=>48+i*650/Math.max(1,years.length-1),y=v=>230-v/maximum*185;
 return '<svg viewBox="0 0 750 280" role="img" aria-label="Historical annual marks chart">'+[0,.25,.5,.75,1].map(p=>'<line class="gridline" x1="48" x2="700" y1="'+y(maximum*p)+'" y2="'+y(maximum*p)+'"/><text x="5" y="'+y(maximum*p)+'">'+F(maximum*p,1)+'</text>').join('')+
 years.map((year,i)=>'<text x="'+x(i)+'" y="261" text-anchor="middle">'+year+'</text>').join('')+
 series.map((s,j)=>'<polyline fill="none" stroke="'+palette[j%10]+'" stroke-width="2" points="'+s.values.map((v,i)=>v===null?'':x(i)+','+y(v)).filter(Boolean).join(' ')+'"/>'+s.values.map((v,i)=>v===null?'':'<circle cx="'+x(i)+'" cy="'+y(v)+'" r="4" fill="'+palette[j%10]+'"><title>'+E(s.name)+' / '+years[i]+': '+F(v,2)+'</title></circle>').join('')).join('')+'</svg><div class="plot-legend">'+series.map((s,i)=>'<span style="--series:'+palette[i%10]+'">'+E(s.name)+'</span>').join('')+'</div>';
}
function histogram(values,label) {
 if(!values.length)return '<p class="empty">No observations in this scope.</p>';
 const lo=Math.min(...values),hi=Math.max(...values),bins=Array(12).fill(0);
 values.forEach(v=>bins[Math.min(11,Math.floor((v-lo)/(hi-lo||1)*12))]++);
 const max=Math.max(1,...bins);
 return '<svg viewBox="0 0 650 250" role="img" aria-label="'+E(label)+' histogram">'+bins.map((n,i)=>'<rect x="'+(40+i*48)+'" y="'+(205-n/max*170)+'" width="40" height="'+n/max*170+'" fill="#48b8c8"><title>['+F(lo+(hi-lo)*i/12,2)+', '+F(lo+(hi-lo)*(i+1)/12,2)+(i===11?']':')')+' / n='+n+'</title></rect>').join('')+'<text x="40" y="233">'+F(lo,2)+'</text><text x="610" y="233" text-anchor="end">'+F(hi,2)+'</text></svg>';
}
function boxPlot(values) {
 const d=M.describe(values);if(!d.n)return '<p class="empty">No observations.</p>';
 const x=v=>55+(v-d.min)/(d.max-d.min||1)*590;
 const out=values.filter(v=>v<d.q1-1.5*d.iqr||v>d.q3+1.5*d.iqr);
 const inside=values.filter(v=>!out.includes(v)),low=Math.min(...inside),high=Math.max(...inside);
 return '<svg viewBox="0 0 700 145" role="img" aria-label="Annual marks box plot"><line x1="'+x(low)+'" x2="'+x(high)+'" y1="60" y2="60" stroke="#98a4b5"/><rect x="'+x(d.q1)+'" y="35" width="'+Math.max(1,x(d.q3)-x(d.q1))+'" height="50" fill="#23424a" stroke="#48d7e8"/><line x1="'+x(d.median)+'" x2="'+x(d.median)+'" y1="35" y2="85" stroke="#f1f5f9"/>'+[low,high].map(v=>'<line x1="'+x(v)+'" x2="'+x(v)+'" y1="45" y2="75" stroke="#98a4b5"/>').join('')+out.map(v=>'<circle cx="'+x(v)+'" cy="60" r="4" fill="#df9b91"><title>Outlier '+v+'</title></circle>').join('')+'<text x="55" y="120">Q1 '+F(d.q1)+' · Median '+F(d.median)+' · Q3 '+F(d.q3)+' · n='+d.n+'</text></svg>';
}
function selectedSubjectControl(){return '<div class="v5-controls"><label>Subject '+selector('researchSubject',R.subjects,researchState.subject)+'</label></div>'}
function laboratory() {
 const values=annual(),years=scopeYears(),d=M.describe(values);
 const tabs=['descriptive','bootstrap','trends','correlation','change'];
 const controls='<div class="v5-tabs">'+tabs.map(tab=>'<button data-lab-tab="'+tab+'" aria-pressed="'+(researchState.tab===tab)+'">'+tab+'</button>').join('')+'</div>'+selectedSubjectControl();
 if(researchState.tab==='descriptive'){
  const stats=table(['Statistic','Value','Definition'],[
   ['Mean',F(d.mean,3),'Σx / n'],['Median',F(d.median,3),'50th percentile, linear interpolation'],
   ['Variance',F(d.variance,3),'Σ(x − mean)² / (n − 1)'],['Sample SD',F(d.sd,3),'Square root of sample variance'],
   ['Quartiles',F(d.q1)+' / '+F(d.q3),'25th and 75th percentiles'],['IQR',F(d.iqr),'Q3 − Q1'],
   ['CV',d.cv===null?'—':F(d.cv*100)+'%','Sample SD / |mean|'],
   ['Moment skewness',F(d.skewness,3),'m3 / m2^(3/2), n ≥ 3'],
   ['Excess kurtosis',F(d.excessKurtosis,3),'m4 / m2² − 3, n ≥ 4'],
   ['Observed range',F(d.min)+'–'+F(d.max),'Minimum and maximum'],['Annual sample',d.n,'One observation per annual paper']]);
  return controls+metricCards([['Annual observations',d.n,'Paper-level sample'],['Mean allocation',F(d.mean,2),'marks / paper'],['Sample SD',F(d.sd,2),'marks'],['IQR',F(d.iqr,2),'marks']])+
   '<div class="grid-two">'+chart('Annual allocation distribution',histogram(values,'Annual marks'),'n='+d.n+' papers. Each year contributes once.')+chart('Box-and-whisker summary',boxPlot(values),'Tukey whiskers extend to observations within 1.5 × IQR.')+'</div>'+panel('','Descriptive estimates','Active scope / '+scopeDescription(),stats)+
   panel('','Concentration and allocation variation','Fixed-total paper allocations',table(['Subject','Annual sample variance','Share of sum of marginal variances'],R.subjects.map(s=>{const v=M.describe(annual(s)).variance,den=sum(R.subjects.map(s=>M.describe(annual(s)).variance||0));return [E(s),F(v,2),den?F((v||0)/den*100)+'%':'—']})),'','These shares describe marginal variability. Covariances make total-paper variance zero when total marks are fixed.');
 }
 if(researchState.tab==='bootstrap'){
  const key=JSON.stringify([values,researchState.iterations,researchState.seed]);
  if(bootstrapCache?.key!==key)bootstrapCache={key,...M.bootstrap(values,researchState.iterations,researchState.seed)};
  const b=bootstrapCache;
  return controls+'<div class="v5-controls"><label>Resamples <input id="bootstrapIterations" type="number" min="200" max="10000" value="'+researchState.iterations+'"></label><label>Seed <input id="bootstrapSeed" type="number" value="'+researchState.seed+'"></label><button id="runBootstrap">Apply resampling</button></div>'+
   metricCards([['Observed mean',F(d.mean,3),'marks / annual paper'],['95% percentile interval',b.interval?F(b.interval[0],2)+'–'+F(b.interval[1],2):'—','Exploratory exchangeable-paper bootstrap'],['Resamples',b.samples.length,'LCG random seed '+researchState.seed],['Annual sample',d.n,'Years resampled with replacement']])+
   chart('Bootstrap mean distribution',histogram(b.samples,'Bootstrap mean'),'Resample n annual papers, calculate their mean, repeat. The interval describes resampling variability under exchangeability.')+
   chart('Interval on the annual allocation scale',intervalPlot(b.interval,d.mean),'Percentile interval. Eight historical papers provide limited inference. No future-paper coverage is claimed.');
 }
 if(researchState.tab==='trends'){
  const rolling=M.rolling(values,researchState.window),slope=M.slope(years,values);
  return controls+'<div class="v5-controls"><label>Rolling window '+selector('rollingWindow',[2,3,4,5],researchState.window)+'</label></div>'+
   chart('Annual and trailing rolling means',linePlot([{name:'Annual marks',values},{name:'Trailing mean',values:rolling}],years),'Incomplete windows are omitted, not zero-filled.')+
   metricCards([['Theil–Sen slope',F(slope,3),'median pairwise marks / year'],['First-to-last difference',values.length>1?F(values.at(-1)-values[0]):'—','Descriptive endpoint difference'],['Sample',values.length,'annual papers'],['Rolling window',researchState.window,'trailing complete observations']])+
   panel('','Endpoint and outlier sensitivity','Recalculate robust slope after omitting one annual paper',table(['Omitted year','Slope','Change from full sample'],years.map((y,i)=>{let s=M.slope(years.filter((_,j)=>j!==i),values.filter((_,j)=>j!==i));return[y,F(s,3),s===null||slope===null?'—':F(s-slope,3)]})));
 }
 if(researchState.tab==='correlation')return controls+correlationExplorer();
 const splits=years.slice(2,-1).map((year,index)=>{const cut=index+2,left=values.slice(0,cut),right=values.slice(cut);return[year,F(M.average(left),2),F(M.average(right),2),F(M.average(right)-M.average(left),2),left.length+' / '+right.length]});
 return controls+chart('Annual allocation history',linePlot([{name:researchState.subject,values}],years),'Candidate splits are descriptive. This sample cannot establish a definitive structural change.')+panel('','Exploratory split means','At least two annual observations on each side',table(['First year after split','Earlier mean','Later mean','Difference','n earlier / later'],splits));
}
function intervalPlot(interval,center){
 if(!interval)return '<p class="empty">At least two annual observations are required.</p>';
 const lo=Math.min(interval[0],center),hi=Math.max(interval[1],center),x=v=>70+(v-lo)/(hi-lo||1)*540;
 return '<svg viewBox="0 0 700 130" role="img" aria-label="Bootstrap percentile interval"><line x1="'+x(interval[0])+'" x2="'+x(interval[1])+'" y1="55" y2="55" stroke="#48d7e8" stroke-width="4"/><circle cx="'+x(center)+'" cy="55" r="6" fill="#e5b879"/><text x="45" y="105">'+F(interval[0],2)+' — '+F(interval[1],2)+' marks · observed mean '+F(center,2)+'</text></svg>';
}
function correlationExplorer(){
 const ys=scopeYears(),subjects=R.subjects,values=subjects.map(s=>annual(s)),second=annual(researchState.otherSubject),first=annual();
 const matrix=table(['Pearson r / n='+ys.length,...subjects.map(short)],subjects.map((s,i)=>[E(short(s)),...subjects.map((_,j)=>{const r=M.pearson(values[i],values[j]);return '<span title="'+E(s+' / '+subjects[j])+'" style="color:'+(r===null?'#98a4b5':r>=0?'#77bda8':'#d9a39c')+'">'+F(r,2)+'</span>'})]));
 return '<div class="quality-banner">Annual subject marks sum to a fixed total. This compositional constraint can induce negative associations. Many pairs are inspected without significance claims.</div>'+
  '<div class="v5-controls"><label>Compare subject '+selector('otherSubject',R.subjects,researchState.otherSubject)+'</label></div>'+
  metricCards([['Pearson r',F(M.pearson(first,second),3),'linear association'],['Spearman rho',F(M.spearman(first,second),3),'average ranks for ties'],['Paired sample',ys.length,'annual papers'],['Constant variable',M.describe(first).sd===0||M.describe(second).sd===0?'Yes':'No','Undefined correlations display an em dash']])+
  chart('Annual allocation pairs',scatter(first,second,ys),'X '+E(researchState.subject)+' · Y '+E(researchState.otherSubject)+' / marks')+panel('','Subject correlation matrix','Meaningful paired annual allocations',matrix)+
  panel('','Leave-one-year-out sensitivity','Pearson association after removing each observation',table(['Omitted year','Pearson r'],ys.map((year,i)=>[year,F(M.pearson(first.filter((_,j)=>i!==j),second.filter((_,j)=>i!==j)),3)])));
}
function scatter(a,b,labels){
 const mx=Math.max(1,...a),my=Math.max(1,...b);
 return '<svg viewBox="0 0 700 270" role="img" aria-label="Paired annual allocation scatterplot"><line x1="40" y1="225" x2="660" y2="225" class="gridline"/><line x1="40" y1="20" x2="40" y2="225" class="gridline"/>'+a.map((v,i)=>'<circle cx="'+(40+v/mx*600)+'" cy="'+(225-b[i]/my*190)+'" r="6" fill="#48d7e8"><title>'+labels[i]+' / X='+v+' / Y='+b[i]+'</title></circle><text x="'+(48+v/mx*600)+'" y="'+(220-b[i]/my*190)+'">'+labels[i]+'</text>').join('')+'<text x="40" y="255">X: 0 to '+mx+' marks</text><text x="420" y="255">Y: 0 to '+my+' marks</text></svg>';
}
function topicIntelligence(){
 let rows=scope();
 const families=[...new Set(rows.map(q=>q.topic_family))].sort();
 if(researchState.topic)rows=rows.filter(q=>q.topic_family===researchState.topic);
 const subtopics=[...new Set(rows.map(q=>q.microtopic))].sort();
 if(researchState.subtopic)rows=rows.filter(q=>q.microtopic===researchState.subtopic);
 const groups=[...new Set(rows.map(q=>q.topic_family))].map(topic=>{const items=rows.filter(q=>q.topic_family===topic);return {topic,items,marks:sum(items.map(q=>q.marks))}});
 const marks=sum(groups.map(g=>g.marks)),ys=scopeYears();
 const mosaic='<div class="topic-mosaic">'+groups.map(g=>'<button data-topic-filter="'+E(g.topic)+'" style="flex-grow:'+g.marks+';flex-basis:'+Math.max(10,g.marks/(marks||1)*100)+'%"><strong>'+E(g.topic)+'</strong><span>'+g.marks+' marks · '+g.items.length+' questions</span></button>').join('')+'</div>';
 return '<div class="v5-controls"><label>Topic '+selector('topicFamily',['All topics',...families],researchState.topic||'All topics')+'</label><label>Subtopic '+selector('subtopic',['All subtopics',...subtopics],researchState.subtopic||'All subtopics')+'</label><button id="openTopicQuestions">Inspect matching questions ↗</button></div>'+
  chart('Subject → topic allocation treemap',mosaic,'Tile area is proportional to observed marks, with a minimum label footprint for small topics. n='+rows.length+' questions.')+
  panel('','Topic recurrence and coverage','Absence is zero only inside a complete annual corpus',table(['Topic','Questions','Marks','Years present','Unseen years','MCQ / NAT / MSQ','Low classification confidence'],groups.map(g=>{const seen=ys.filter(y=>g.items.some(q=>q.year===y));return[E(g.topic),g.items.length,g.marks,seen.length+' / '+ys.length,ys.filter(y=>!seen.includes(y)).join(', ')||'None',['MCQ','NAT','MSQ'].map(t=>g.items.filter(q=>q.type===t).length).join(' / '),g.items.filter(q=>q.review.confidence!=='high').length]})))+
  panel('','Topic co-occurrence','Count of complete annual papers in which both topics occur',table(['Topic pair','Shared years'],groups.slice(0,12).flatMap((g,i)=>groups.slice(i+1,12).map(h=>[E(g.topic+' × '+h.topic),ys.filter(y=>g.items.some(q=>q.year===y)&&h.items.some(q=>q.year===y)).length])).sort((a,b)=>b[1]-a[1]).slice(0,15)),'','Annual co-presence describes shared papers. It does not establish conceptual dependence.');
}
function explorer(){
 const rows=scope().filter(q=>q.toughness.score>=researchState.plotLow&&q.toughness.score<=researchState.plotHigh);
 const svg='<svg viewBox="0 0 750 290" role="img" aria-label="Question score and marks scatterplot">'+rows.map(q=>'<circle tabindex="0" role="button" data-question="'+E(q.id)+'" aria-label="Inspect '+E(q.id)+'" cx="'+(45+q.toughness.score/100*650)+'" cy="'+(240-q.marks*75)+'" r="3" fill="#48d7e8" fill-opacity=".4"><title>'+E(q.id)+' / score '+q.toughness.score+' / '+q.marks+' marks</title></circle>').join('')+'<text x="40" y="275">Score 0 → 100 (x) · marks 1 or 2 (y). Overlapping points are expected.</text></svg>';
 return '<div class="v5-controls"><label>Brush lower score <input id="brushLow" type="range" min="0" max="100" value="'+researchState.plotLow+'"></label><label>Upper score <input id="brushHigh" type="range" min="0" max="100" value="'+researchState.plotHigh+'"></label><span>'+researchState.plotLow+'–'+researchState.plotHigh+' / '+rows.length+' records</span><button id="brushReset">Reset selection</button><button id="openBrushed">Open selected questions</button></div>'+
  chart('Question marks versus structural difficulty',svg,'Score-range brush cross-filters this chart and the table. All points retain stable question IDs.')+
  panel('','Selection ledger','First 30 matching records. Export includes the entire selection.',table(['ID','Subject / topic','Score','Marks'],rows.slice(0,30).map(q=>['<button data-question="'+E(q.id)+'">'+E(q.id)+'</button>',E(q.subject+' / '+q.topic_family),F(q.toughness.score,2),q.marks])));
}
function comparison(){
 const ys=scopeYears(),a=ys.includes(researchState.compareA)?researchState.compareA:ys[0],b=ys.includes(researchState.compareB)?researchState.compareB:ys.at(-1);
 const qa=scope().filter(q=>q.year===a),qb=scope().filter(q=>q.year===b);
 const va=R.subjects.map(s=>sum(qa.filter(q=>q.subject===s).map(q=>q.marks))),vb=R.subjects.map(s=>sum(qb.filter(q=>q.subject===s).map(q=>q.marks)));
 const svg='<svg viewBox="0 0 750 390" role="img" aria-label="Subject marks cross-year slope chart">'+R.subjects.map((s,i)=>{const max=Math.max(1,...va,...vb),y=v=>330-v/max*270;return '<line x1="150" x2="550" y1="'+y(va[i])+'" y2="'+y(vb[i])+'" stroke="hsl('+(i*35)+',35%,65%)"><title>'+E(s)+' / '+a+' '+va[i]+' → '+b+' '+vb[i]+'</title></line><text x="5" y="'+(22+i*18)+'">'+E(short(s))+': '+va[i]+' → '+vb[i]+'</text>'}).join('')+'<text x="150" y="370">'+a+'</text><text x="550" y="370">'+b+'</text></svg>';
 return '<div class="v5-controls"><label>Base year '+selector('compareYearA',ys,a)+'</label><label>Comparison year '+selector('compareYearB',ys,b)+'</label></div>'+
  chart('Cross-year allocation changes',svg,'Same primary taxonomy and active subject scope in both papers.')+
  panel('','Difference table',a+' → '+b,table(['Subject','Base marks','Comparison marks','Difference'],R.subjects.map((s,i)=>[E(s),va[i],vb[i],vb[i]-va[i]])))+
  panel('','Formats, difficulty and reliability','MTA included for historical paper composition',table(['Measure',a,b],[
   ['Questions',qa.length,qb.length],['Marks',sum(qa.map(q=>q.marks)),sum(qb.map(q=>q.marks))],
   ...['MCQ','NAT','MSQ'].map(t=>[t,qa.filter(q=>q.type===t).length,qb.filter(q=>q.type===t).length]),
   ...['Easy','Moderate','Tough'].map(band=>[band,qa.filter(q=>toughBand(q.toughness.score)===band).length,qb.filter(q=>toughBand(q.toughness.score)===band).length]),
   ['Open flagged records',qa.filter(q=>q.quality.open_issue_count).length,qb.filter(q=>q.quality.open_issue_count).length]
  ]));
}
function scenarioData(){
 const years=scopeYears(),rows=R.questions.filter(q=>years.includes(q.year)&&($('#quality').value!=='changed'||q.subject_changed)&&($('#quality').value!=='clear'||q.inference_eligible));
 // Scenarios require complete annual composition, independent of the subject filter.
 const vectors=years.map(y=>R.subjects.map(s=>sum(rows.filter(q=>q.year===y&&q.subject===s).map(q=>q.marks))));
 const weights=years.map((_,i)=>researchState.scheme==='recent'?i+1:1);
 const baseline=M.allocation(vectors,weights,R.subjects.map(()=>1));
 const allocation=M.allocation(vectors,weights,researchState.multipliers);
 return {years,vectors,weights,baseline,allocation};
}
function scenarios(){
 if($('#quality').value!=='all')return '<div class="empty">Scenarios require complete papers. Set Review to All reviewed records to retain each year’s full 100-mark composition.</div>';
 const data=scenarioData(),selected=R.subjects.indexOf(researchState.subject);
 const sensitivities=R.subjects.map((subject,i)=>{
  const low=[...researchState.multipliers],high=[...low];low[i]*=.8;high[i]*=1.2;
  return{subject,low:M.allocation(data.vectors,data.weights,low)[selected]-data.allocation[selected],high:M.allocation(data.vectors,data.weights,high)[selected]-data.allocation[selected]};
 }).sort((a,b)=>Math.max(Math.abs(b.low),Math.abs(b.high))-Math.max(Math.abs(a.low),Math.abs(a.high)));
 const max=Math.max(.1,...sensitivities.flatMap(s=>[Math.abs(s.low),Math.abs(s.high)]));
 const tornado='<svg viewBox="0 0 750 360" role="img" aria-label="Scenario sensitivity tornado">'+sensitivities.map((s,i)=>'<text x="5" y="'+(30+i*30)+'">'+E(short(s.subject))+'</text>'+[s.low,s.high].map((v,j)=>'<rect x="'+(v<0?500+v/max*180:500)+'" y="'+(20+i*30+j*8)+'" width="'+Math.abs(v)/max*180+'" height="7" fill="'+(j?'#48d7e8':'#dfb783')+'"><title>'+E(s.subject)+' multiplier '+(j?'+20%':'−20%')+' → selected allocation Δ '+F(v,3)+' marks</title></rect>').join('')).join('')+'</svg>';
 const projection=M.ec2027MeanForecast(data.vectors,R.subjects);
 const projected=panel('','GATE EC 2027 / conservative baseline','Research projection · NOT an official paper or validated future-paper forecast',
   '<div class="quality-banner"><b>IIT Madras is the confirmed organizing institute.</b> Historical GATE 2019 gives only one example of an IIT Madras paper; this forecast does not infer institute-specific difficulty.</div>'+
   table(['Subject','2027 planning allocation','Historical mean'],R.subjects.map((s,i)=>[E(s),projection.forecast[i]+' marks',F(projection.historicalMean[i],2)]))+
   '<p class="sub">Method: equal mean from '+E(data.years.join(', '))+'. Official 2027 requirements fix General Aptitude at 15 and Engineering Mathematics at 13, leaving 72 technical marks normalized across the other subjects. Integer totals sum to 100. All historical classifications are approximate and the syllabus has changed for 2027. There is no demonstrated improvement over the historical mean, so this is a planning allocation, not a claim of predictability.</p>');
 const bt=M.backtest(data.vectors,researchState.scheme);
 const cv=M.leaveOneYearOut(data.vectors,data.years,researchState.scheme),result=cv.summary;
 const verdict=!result?'Insufficient complete annual papers':result.beatsBaseline?'PASS — beats held-out mean':'FAIL — does not beat held-out mean';
 const cvSummary=panel('','Prediction reality check / leave-one-year-out','Each held-out year is excluded from both model and mean baseline',
   '<div class="quality-banner"><b>'+verdict+'</b> · '+(result?'Model MAE '+F(result.modelMae,3)+' vs seven-year mean '+F(result.baselineMae,3)+' marks per subject · improvement '+F(result.relativeImprovement*100,1)+'% · model wins '+result.yearWins+'/'+result.yearCount+' years.':'At least three years required.')+'</div>'+
   (result?table(['Held-out year','7-year mean MAE','Model MAE','Model − mean','Winner'],cv.rows.map(row=>[row.year,F(row.baselineMae,3),F(row.modelMae,3),F(row.modelMae-row.baselineMae,3),row.modelMae<row.baselineMae-1e-9?'Model':row.modelMae>row.baselineMae+1e-9?'Mean':'Tie'])):'')+
   '<p class="sub">Primary benchmark: other-seven-year average (no target leakage). The full eight-year average includes each test year and is not a valid predictive benchmark. This retrospective test permits later years in the training fold; it cannot establish prospective forecasting skill. See the separate past-only expanding-window backtest below.</p>'+
   (result?'<p class="sub">Leaky eight-year average MAE, reference only: '+F(result.fullMeanReferenceMae,3)+'. Negative improvement means the model is worse. All ten subjects, including fixed General Aptitude, count toward the score.</p>':''));
 return '<div class="quality-banner"><b>Hypothetical allocation experiment.</b> Adjustments are assumptions, not validated forecasts. All subjects are included and the total is normalized to 100. Global subject selection does not restrict the allocation model.</div>'+
  '<div class="v5-controls"><label>Historical weighting '+selector('scenarioScheme',['equal','recent'],researchState.scheme)+'</label><label>Sensitivity outcome '+selector('researchSubject',R.subjects,researchState.subject)+'</label><button id="scenarioReset">Reset assumptions</button></div>'+
  panel('','Allocation assumptions','Multipliers change relative allocation before normalization',table(['Subject','Input multiplier','Historical baseline','Scenario marks','Difference'],R.subjects.map((s,i)=>[E(s),'<input class="scenario-multiplier" data-index="'+i+'" aria-label="'+E(s)+' multiplier" type="number" min="0" max="5" step=".1" value="'+researchState.multipliers[i]+'">',F(data.baseline[i],2),F(data.allocation[i],2),F(data.allocation[i]-data.baseline[i],2)])))+
  chart('Sensitivity tornado / '+E(researchState.subject),tornado,'Each assumption moves ±20% in isolation. Other multipliers stay fixed, then allocations renormalize to 100.')+
  cvSummary+
  projected+
  chart('Historical expanding-window backtest',linePlot([{name:'Mean absolute subject error',values:bt.map(b=>b.mae)}],bt.map(b=>data.years[b.index])),'Minimum two training years. Only historical weighting is backtested. User multipliers are hypothetical and have no validated backtest.')+
  panel('','Scenario reconciliation','Raw values, not rounded display totals',table(['Measure','Value'],[['Scenario total',F(sum(data.allocation),10)],['Reference years',data.years.join(', ')],['Weight scheme',researchState.scheme==='recent'?'Linear recency weights 1…n':'Equal annual weights'],['Backtest sample',bt.length+' held-out papers'],['Baseline mean absolute error',bt.length?F(mean(bt.map(b=>b.mae)),3):'—']]));
}
function reliabilityMatrix(){
 return chart('Source and review coverage by year',table(['Year','Records','Source URL','Visual source review','Open flagged','Targeted repairs','Independent certification'],scopeYears().map(y=>{const q=scope().filter(q=>q.year===y);return[y,q.length,q.filter(q=>q.source.url).length,q.filter(q=>q.source.visual_review_completed).length,q.filter(q=>q.quality.open_issue_count).length,q.filter(q=>q.quality.targeted_repair).length,'Not supplied']})),'Coverage counts refer to the active scope. Metadata completeness does not certify every transcription.');
}
function researchReport(){
 const rows=scope(),years=scopeYears(),subject=researchState.subject,values=annual(subject),d=M.describe(values),now=new Date().toLocaleString();
 return '<article class="research-report"><h2>GATE EC research summary</h2><p>Generated '+E(now)+' · Dataset '+E(R.version)+' · Product V5.0</p><p>Scope '+E(scopeDescription())+' · Review '+E($('#quality').value)+' · '+rows.length+' records · '+sum(rows.map(q=>q.marks))+' marks.</p>'+
 '<h3>Observed annual allocation / '+E(subject)+'</h3>'+table(['Years','Mean marks','Median','Sample SD','IQR','Annual n'],[[years.join(', '),F(d.mean,3),F(d.median,3),F(d.sd,3),F(d.iqr,3),d.n]])+
 '<h3>Methods and limits</h3><p>Mean = sum / n. Sample variance = Σ(x − mean)² / (n − 1). Quartiles use linear interpolation. Annual papers are the units for trends and resampling. Structural toughness is an AI annotation with editable thresholds '+difficultyState.easy+'/'+difficultyState.tough+'. Independent reviewer ratings and calibrated candidate-response parameters are unavailable.</p><p>Subject allocations sum to a fixed annual total and can show induced negative correlations. Historical changes do not establish future allocation. Scenarios are hypothetical normalized assumptions.</p><p>Open flagged records '+rows.filter(q=>q.quality.open_issue_count).length+'. Source manifest, stable identifiers and repair history accompany exports. Official paper links provide source access.</p><p>Independent analytical research platform. Not operated or endorsed by GATE or IITs.</p></article>';
}
function reports(){
 return '<div class="v5-controls"><button id="filteredCSV">Export active questions / CSV</button><button id="downloadResearchReport">Download report / HTML</button><button id="printReport">Print / save PDF</button><button id="downloadScenario">Scenario / JSON</button></div>'+researchReport()+
 panel('','Data dictionary and release notes','V5.0 / research preview',table(['Field class','Meaning'],[['Identity','Stable question ID, year, official number, format and marks'],['Classification','Reviewed primary subject/topic, secondary context and versioned convention'],['Difficulty','Five content dimensions, score, rationale and uncertainty'],['Source','Official URL, page, document hash and source review status'],['Quality','Open dispositions, targeted field repairs and preserved originals'],['Empirical','Null until observed candidate responses support measurement']]))+
 '<div class="quality-banner">V5 adds numerical research tools, scenario assumptions, comparison, reports, local saved views and the new shell. Independent ratings, formal accessibility certification and psychometric calibration remain pending.</div>';
}
function safeSave(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function safeLoad(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}

function scopeDescription(){return $('#from').value+'–'+$('#to').value+' / '+($('#subject').value==='all'?'All subjects':$('#subject').value)}
document.querySelector('aside').innerHTML='<a class="v5-brand" href="#monitor"><b>G/</b><span>GATE EC<small>RESEARCH TERMINAL V5.0</small></span></a><nav id="v5nav">'+routes.map(([id,label],i)=>'<a href="#'+id+'" data-nav="'+id+'"><small>'+String(i+1).padStart(2,'0')+'</small>'+label+'</a>').join('')+'</nav><p class="v5-independent">Independent analytical research.<br>Not operated or endorsed by GATE or IITs.</p><a class="v5-response-link" href="#responses">Candidate response workbench ↗</a>';
document.querySelector('header').innerHTML='<button id="v5Menu" aria-label="Toggle navigation">☰</button><b id="v5Crumb">Overview</b><div class="v5-command-actions"><span>DATA 2019–26 / 520 RECORDS</span><button id="v5Search">Search tools <kbd>Ctrl K</kbd></button><button id="v5Theme">Theme</button><button id="v5Context">Context</button></div>';
document.querySelector('.app').insertAdjacentHTML('beforeend','<div id="researchContext" aria-label="Research context"></div>');
document.querySelector('.scope-bar').insertAdjacentHTML('beforeend','<button id="saveLocalView">Save view</button><button id="restoreLocalView">Restore view</button><button id="shareScope">Copy scope link</button>');
const routeFunctions={monitor:()=>researchMonitor()+reliabilityMatrix(),explorer,subjects,topics:topicIntelligence,lab:laboratory,compare:comparison,scenarios,reports,
 questions:()=>questionList(false),audit:()=>reliabilityMatrix()+questionList(true),difficulty:()=>fullDifficultyWorkspace(),distributions:distribution,inference,responses,evidence};
const v5Titles={monitor:'Research overview',explorer:'Explore the corpus',subjects:'Subject intelligence',topics:'Topic intelligence',lab:'Statistical laboratory',compare:'Compare annual papers',scenarios:'Scenario laboratory',reports:'Reports & exports',questions:'Question database',audit:'Data reliability',difficulty:'Difficulty analysis',distributions:'Distribution explorer',inference:'Exact trend studio',responses:'Candidate response workbench',evidence:'Methodology & sources'};
render=function(){
 view=routeFunctions[location.hash.slice(1)]?location.hash.slice(1):'monitor';
 document.body.className='v5-app '+(theme==='light'?'v5-light':'')+(contextVisible?' has-context':'');
 $('#title').textContent=v5Titles[view];$('#subtitle').textContent=notes[view];$('#overline').textContent='RESEARCH / '+view.toUpperCase();$('#v5Crumb').textContent=v5Titles[view];
 document.querySelectorAll('[data-nav]').forEach(link=>{link.classList.toggle('active',link.dataset.nav===view);if(link.dataset.nav===view)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')});
 $('#content').innerHTML=routeFunctions[view]();
 $('#researchContext').innerHTML='<button id="closeContext" aria-label="Close context">×</button><h3>Research context</h3><small>ACTIVE SCOPE</small><p>'+E(scopeDescription())+'<br>'+scope().length+' records · '+sum(scope().map(q=>q.marks))+' marks</p><small>INTERPRETATION</small><p>'+E(notes[view])+'</p><small>EVIDENCE</small><p>520 source identity reviews. 45 targeted content repairs. 220 records retain open flags.</p><a href="#audit">Data reliability ↗</a><a href="#evidence">Methods and sources ↗</a><small>LOCAL RESEARCH NOTE</small><textarea id="localAnnotation" aria-label="Local research note">'+E(safeLoad('gate-v5-note-'+view,''))+'</textarea>';
 document.querySelector('.scope-bar').hidden=['inference','responses','evidence'].includes(view);
 document.querySelectorAll('[data-question],[data-select-subject],[data-diff-topic],[data-diff-topic-year],[data-sort],[data-scope-year],[data-topic-family]').forEach(el=>{if(el.tagName!=='BUTTON'&&el.tagName!=='A'){el.tabIndex=0;el.setAttribute('role','button')}});
};
$('#v5Search').onclick=openCommands;
$('#v5Theme').onclick=()=>{theme=theme==='dark'?'light':'dark';safeSave('gate-v5-theme',theme);render()};
$('#v5Context').onclick=()=>{contextVisible=!contextVisible;safeSave('gate-v5-context',contextVisible);render()};
$('#v5Menu').onclick=()=>document.body.classList.toggle('nav-open');
function csvExport(rows){const columns=['id','year','subject','topic','microtopic','marks','type','scoring_status','reviewed_answer'];download('gate-v5-filtered.csv',[columns,...rows.map(q=>columns.map(k=>q[k]))].map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n'))}
function downloadReport(){download('gate-v5-report.html','<!doctype html><meta charset="utf-8"><title>GATE EC Research Report</title><style>body{font:14px/1.8 Arial;max-width:1000px;margin:40px auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:12px}</style>'+researchReport(),'text/html')}
$('#saveLocalView').onclick=()=>{safeSave('gate-v5-saved-view',{route:view,scope:['from','to','subject','quality'].map(k=>$('#'+k).value),query,verdict,questionDisplay,questionContext:{...questionContext},difficulty:{...difficultyState},research:{...researchState},issueFilter});toast('Saved this view on your device.')};
$('#restoreLocalView').onclick=()=>{const v=safeLoad('gate-v5-saved-view',null);if(!v){toast('No saved view on this device.');return}['from','to','subject','quality'].forEach((k,i)=>$('#'+k).value=v.scope[i]);query=v.query;verdict=v.verdict;questionDisplay=v.questionDisplay;Object.assign(questionContext,v.questionContext);Object.assign(difficultyState,v.difficulty);Object.assign(researchState,v.research);issueFilter=v.issueFilter;location.hash=v.route;render()};
$('#shareScope').onclick=async()=>{const url=new URL(location.href);['from','to','subject','quality'].forEach(k=>url.searchParams.set(k,$('#'+k).value));try{await navigator.clipboard.writeText(url.href);toast('Copied route and global scope.')}catch{toast('Clipboard unavailable. Save this view locally instead.')}};
const priorV5Export=exportCurrentView;
exportCurrentView=function(){
 if(view==='questions'){csvExport(selectedQuestionRows());return}
 if(view==='explorer'){csvExport(scope().filter(q=>q.toughness.score>=researchState.plotLow&&q.toughness.score<=researchState.plotHigh));return}
 if(view==='scenarios'){download('gate-v5-hypothetical-scenario.json',JSON.stringify({basis:'Hypothetical assumptions',settings:researchState,...scenarioData()},null,2),'application/json');return}
 if(view==='lab'){download('gate-v5-laboratory.json',JSON.stringify({version:R.version,scope:scopeDescription(),settings:researchState,years:scopeYears(),values:annual(),statistics:M.describe(annual()),bootstrap:researchState.tab==='bootstrap'?bootstrapCache:null,methods:notes.lab},null,2),'application/json');return}
 if(view==='topics'){csvExport(scope().filter(q=>(!researchState.topic||q.topic_family===researchState.topic)&&(!researchState.subtopic||q.microtopic===researchState.subtopic)));return}
 if(view==='reports'){downloadReport();return}priorV5Export();
};$('#export').onclick=exportCurrentView;
document.addEventListener('input',e=>{if(e.target.id==='localAnnotation')safeSave('gate-v5-note-'+view,e.target.value)});
document.addEventListener('change',e=>{
 const id=e.target.id;
 if(id==='researchSubject')researchState.subject=e.target.value;
 else if(id==='otherSubject')researchState.otherSubject=e.target.value;
 else if(id==='rollingWindow')researchState.window=+e.target.value;
 else if(id==='compareYearA')researchState.compareA=+e.target.value;
 else if(id==='compareYearB')researchState.compareB=+e.target.value;
 else if(id==='scenarioScheme')researchState.scheme=e.target.value;
 else if(id==='topicFamily'){researchState.topic=e.target.value==='All topics'?'':e.target.value;researchState.subtopic=''}
 else if(id==='subtopic')researchState.subtopic=e.target.value==='All subtopics'?'':e.target.value;
 else if(id==='brushLow')researchState.plotLow=Math.min(+e.target.value,researchState.plotHigh);
 else if(id==='brushHigh')researchState.plotHigh=Math.max(+e.target.value,researchState.plotLow);
 else if(e.target.matches('.scenario-multiplier')){
  const v=Number(e.target.value);if(!Number.isFinite(v)||v<0||v>5){toast('Use multipliers from 0 to 5.');return}
  const next=[...researchState.multipliers];next[+e.target.dataset.index]=v;
  if(next.every(v=>v===0)){toast('At least one multiplier must be positive.');return}researchState.multipliers=next;
 }else return;render();
});
document.addEventListener('click',e=>{
 const tab=e.target.closest('[data-lab-tab]');if(tab){researchState.tab=tab.dataset.labTab;render()}
 const topic=e.target.closest('[data-topic-filter]');if(topic){researchState.topic=topic.dataset.topicFilter;researchState.subtopic='';render()}
 const id=e.target.id;
 if(id==='closeContext'){contextVisible=false;safeSave('gate-v5-context',false);render()}
 if(id==='runBootstrap'){const iterations=+$('#bootstrapIterations').value,seed=+$('#bootstrapSeed').value;if(!Number.isInteger(iterations)||iterations<200||iterations>10000||!Number.isInteger(seed)){toast('Use 200–10,000 resamples and an integer seed.');return}researchState.iterations=iterations;researchState.seed=seed;render()}
 if(id==='scenarioReset'){researchState.multipliers=R.subjects.map(()=>1);researchState.scheme='equal';render()}
 if(id==='brushReset'){researchState.plotLow=0;researchState.plotHigh=100;render()}
 if(id==='openBrushed'||id==='openTopicQuestions'){
  clearQuestionContext();
  if(id==='openTopicQuestions'){questionContext.topic=researchState.subtopic||researchState.topic||null;questionContext.field=researchState.subtopic?'microtopic':'topic_family'}
  else window.v5BrushedIds=new Set(scope().filter(q=>q.toughness.score>=researchState.plotLow&&q.toughness.score<=researchState.plotHigh).map(q=>q.id));
  location.hash='questions';render();
 }
 if(id==='filteredCSV')csvExport(scope());
 if(id==='downloadResearchReport')downloadReport();
 if(id==='printReport')window.print();
 if(id==='downloadScenario')download('gate-v5-scenario.json',JSON.stringify({assumptionDriven:true,settings:researchState,...scenarioData()},null,2),'application/json');
 const button=e.target.closest('[data-chart-export]');if(button)exportChart(button);
});
function exportChart(button){
 const svg=button.closest('.v5-chart-panel').querySelector('svg');if(!svg){toast('Use Export view for underlying tabular values.');return}
 const copy=svg.cloneNode(true);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');copy.querySelectorAll('text').forEach(el=>el.setAttribute('fill','#98a4b5'));copy.querySelectorAll('.gridline').forEach(el=>el.setAttribute('stroke','#293444'));
 const source=new XMLSerializer().serializeToString(copy);if(button.dataset.chartExport==='svg'){download('gate-v5-chart.svg',source,'image/svg+xml');return}
 const img=new Image(),url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'}));img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=1500;canvas.height=Math.round(1500*(copy.viewBox.baseVal.height||300)/(copy.viewBox.baseVal.width||750));const ctx=canvas.getContext('2d');ctx.fillStyle='#10141c';ctx.fillRect(0,0,1500,650);ctx.drawImage(img,0,0,1500,650);canvas.toBlob(blob=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='gate-chart.png';a.click();URL.revokeObjectURL(a.href)});URL.revokeObjectURL(url)};img.onerror=()=>{URL.revokeObjectURL(url);toast('PNG conversion unavailable. Export SVG instead.')};img.src=url;
}
const beforeV5Selector=selectedQuestionRows;
selectedQuestionRows=function(){return beforeV5Selector().filter(q=>!window.v5BrushedIds||window.v5BrushedIds.has(q.id))};
const beforeV5Clear=clearQuestionContext;
clearQuestionContext=function(){beforeV5Clear();window.v5BrushedIds=null};
commands=function(){
 const value=$('#commandInput').value.toLowerCase();
 const found=modules.filter(m=>(m[0]+' '+m[2]+' '+(v5Titles[m[0]]||'')).toLowerCase().includes(value));
 const questions=value.length>=3?R.questions.filter(q=>(q.id+' '+q.topic+' '+q.subject).toLowerCase().includes(value)).slice(0,6):[];
 $('#commandResults').innerHTML=found.map(([id])=>'<button class="command-result" data-command="'+id+'">'+E(v5Titles[id]||id)+'</button>').join('')+questions.map(q=>'<button class="command-result" data-question="'+E(q.id)+'">'+E(q.id)+' / '+E(q.topic)+'</button>').join('')||'<div class="empty">No matching tool or question.</div>';
};
const sharedParams=new URLSearchParams(location.search);
for(const key of ['from','to','subject','quality'])if(sharedParams.has(key)){const target=$('#'+key),value=sharedParams.get(key);if([...target.options].some(o=>o.value===value))target.value=value}
if(+$('#from').value>+$('#to').value)$('#to').value=$('#from').value;
render();



const beforeV5Subjects=subjects;
subjects=function(){
 const years=scopeYears(),series=R.subjects.filter(subject=>scope().some(q=>q.subject===subject)).map(subject=>({name:subject,values:annual(subject)}));
 return chart('Historical subject weightage',linePlot(series,years),'Annual subject marks. The active year, subject and review scope applies to every series.')+beforeV5Subjects();
};
const beforeV5Groups=groups;
groups=function(rows){return beforeV5Groups(rows).map(row=>({...row,sd:scopeYears().length>1?row.sd:null,cv:scopeYears().length>1?row.cv:null}))};
document.querySelector('footer').innerHTML='<span>GATE EC RESEARCH TERMINAL / V5.0</span><span>Independent platform · official-source links · research estimates</span><a href="#evidence">Methodology ↗</a>';
const beforeDifficultyExport=exportDifficulty;
exportDifficulty=function(){
 const years=scopeYears();difficultyState.compareA=years.includes(difficultyState.compareA)?difficultyState.compareA:years[0];difficultyState.compareB=years.includes(difficultyState.compareB)?difficultyState.compareB:years.at(-1);
 beforeDifficultyExport();
};
render();

function allocationTreemap(groups){
 const total=sum(groups.map(g=>g.marks));if(!total)return '<p class="empty">No observed marks.</p>';
 const columns=Array.from({length:4},()=>[]);groups.sort((a,b)=>b.marks-a.marks).forEach((g,i)=>columns[i%4].push(g));
 let x=0,index=0,content='';
 for(const column of columns){const marks=sum(column.map(g=>g.marks)),width=marks/total*740;let y=0;
  for(const g of column){const height=g.marks/marks*340,clip='topicClip'+index++;
   content+='<defs><clipPath id="'+clip+'"><rect x="'+(x+5)+'" y="'+(y+5)+'" width="'+Math.max(0,width-10)+'" height="'+Math.max(0,height-10)+'"/></clipPath></defs><g role="button" tabindex="0" data-topic-filter="'+E(g.topic)+'" aria-label="Filter '+E(g.topic)+'"><rect x="'+x+'" y="'+y+'" width="'+width+'" height="'+height+'" fill="'+(index%2?'#24414a':'#273b51')+'" stroke="#10141c" stroke-width="2"/><title>'+E(g.topic)+' / '+g.marks+' marks / '+g.items.length+' questions</title><text clip-path="url(#'+clip+')" x="'+(x+8)+'" y="'+(y+20)+'">'+E(g.topic)+'</text><text clip-path="url(#'+clip+')" x="'+(x+8)+'" y="'+(y+37)+'">'+g.marks+' marks</text></g>';y+=height;
  }x+=width;
 }
 return '<svg viewBox="0 0 740 340" role="img" aria-label="Topic treemap with area proportional to marks">'+content+'</svg>';
}
const originalV5Topics=topicIntelligence;
topicIntelligence=function(){
 let rows=scope().filter(q=>(!researchState.topic||q.topic_family===researchState.topic)&&(!researchState.subtopic||q.microtopic===researchState.subtopic));
 const groups=[...new Set(rows.map(q=>q.topic_family))].map(topic=>{const items=rows.filter(q=>q.topic_family===topic);return {topic,items,marks:sum(items.map(q=>q.marks))}});
 return originalV5Topics().replace(/<div class="topic-mosaic">[\s\S]*?<\/div>/,allocationTreemap(groups)).replace('Tile area is proportional to observed marks, with a minimum label footprint for small topics.','Tile area is exactly proportional to observed marks. Small labels are clipped; hover or select for evidence.');
};
let databaseSort='id',databaseColumns=[true,true,true,true,true,true];
const beforeV5QuestionList=questionList;
questionList=function(audit=false){
 let html=beforeV5QuestionList(audit);
 if(!audit)html='<div class="v5-controls"><label>Sort '+selector('databaseSort',['id','year','marks','score'],databaseSort)+'</label><details><summary>Table columns</summary>'+['Question','Subject/topic','Operation','Toughness','Review','Source'].map((name,i)=>'<label><input class="database-column" data-index="'+i+'" type="checkbox" '+(databaseColumns[i]?'checked':'')+'> '+name+'</label>').join('')+'</details></div>'+html;
 return html;
};
const beforeDatabaseSort=selectedQuestionRows;
selectedQuestionRows=function(){return beforeDatabaseSort().slice().sort((a,b)=>databaseSort==='id'?a.id.localeCompare(b.id):databaseSort==='score'?b.toughness.score-a.toughness.score:b[databaseSort]-a[databaseSort]||a.id.localeCompare(b.id))};
const beforeDatabaseRender=render;
render=function(){
 beforeDatabaseRender();
 if(view==='questions')document.querySelectorAll('#content table.data-table tr').forEach(row=>[...row.children].forEach((cell,i)=>cell.hidden=!databaseColumns[i]));
 document.querySelectorAll('.chart-actions').forEach(actions=>{if(!actions.closest('.v5-chart-panel').querySelector('svg'))actions.hidden=true});
};
document.addEventListener('change',e=>{if(e.target.id==='databaseSort'){databaseSort=e.target.value;page=0;render()}if(e.target.matches('.database-column')){const next=[...databaseColumns];next[+e.target.dataset.index]=e.target.checked;if(!next.some(Boolean)){toast('Keep at least one column visible.');e.target.checked=true;return}databaseColumns=next;safeSave('gate-v5-columns',next);render()}});
databaseColumns=safeLoad('gate-v5-columns',databaseColumns);
render();
function questionTypeChart(){
 const years=scopeYears(),types=['MCQ','NAT','MSQ'],colors=['#48d7e8','#9b8ed7','#d7b47a'];
 const by=years.map(year=>types.map(type=>scope().filter(q=>q.year===year&&q.type===type).length)),max=Math.max(1,...by.map(sum));
 const svg='<svg viewBox="0 0 740 300" role="img" aria-label="Stacked question format by year">'+years.map((year,i)=>{
  let offset=0;return by[i].map((count,j)=>{const height=count/max*210,rect='<rect x="'+(40+i*80)+'" y="'+(245-offset-height)+'" width="45" height="'+height+'" fill="'+colors[j]+'"><title>'+year+' / '+types[j]+' / '+count+' questions</title></rect>';offset+=height;return rect}).join('')+'<text x="'+(62+i*80)+'" y="275" text-anchor="middle">'+year+'</text>';
 }).join('')+'</svg><div class="plot-legend">'+types.map((type,i)=>'<span style="--series:'+colors[i]+'">'+type+'</span>').join('')+'</div>';
 return chart('Annual question-format composition',svg,'Counts include EC and GA in the active scope. Each stack reconciles to its selected annual question count.');
}
routeFunctions.monitor=()=>researchMonitor()+questionTypeChart()+reliabilityMatrix();
const originalV5DifficultyRoute=routeFunctions.difficulty;
routeFunctions.difficulty=()=>{
 const rows=toughRows(),s=toughStats(rows);
 return metricCards([['Question-weighted mean',F(s.avg,2),'Each question contributes once'],['Marks-weighted mean',F(s.weighted,2),'Σ(score × marks) / Σmarks'],['Annotation confidence',rows.filter(q=>q.toughness.confidence==='high').length+' / '+rows.length,'high confidence / selected'],['Independent agreement','Unavailable','No independent rating matrix supplied']])+originalV5DifficultyRoute();
};
const beforeChartActionsRender=render;
render=function(){
 beforeChartActionsRender();
 document.querySelectorAll('.panel').forEach(section=>{
  if(section.querySelector('svg')&&!section.querySelector('.chart-actions')){
   section.classList.add('v5-chart-panel');
   section.querySelector('.panel-head')?.insertAdjacentHTML('beforeend','<div class="chart-actions"><button data-chart-export="svg">SVG</button><button data-chart-export="png">PNG</button></div>');
  }
 });
};
render();
Object.assign(researchState,{periodAFrom:2019,periodATo:2022,periodBFrom:2023,periodBTo:2026});
const annualComparison=comparison;
comparison=function(){
 const controls='<div class="v5-controls"><label>Period A from '+selector('periodAFrom',R.years,researchState.periodAFrom)+'</label><label>to '+selector('periodATo',R.years,researchState.periodATo)+'</label><label>Period B from '+selector('periodBFrom',R.years,researchState.periodBFrom)+'</label><label>to '+selector('periodBTo',R.years,researchState.periodBTo)+'</label></div>';
 const periods=[R.years.filter(y=>y>=researchState.periodAFrom&&y<=researchState.periodATo),R.years.filter(y=>y>=researchState.periodBFrom&&y<=researchState.periodBTo)];
 const rows=R.questions.filter(q=>($('#subject').value==='all'||q.subject===$('#subject').value)&&($('#quality').value==='all'||($('#quality').value==='clear'?q.inference_eligible:q.subject_changed)));
 return annualComparison()+panel('','Selected-period comparison','Independent period endpoints below override the global year range. Global subject and review filters apply.',controls+table(['Subject','Period A mean / paper','Period B mean / paper','Difference','n years A / B'],R.subjects.map(s=>{
 const allocation=periods.map(years=>years.map(y=>sum(rows.filter(q=>q.year===y&&q.subject===s).map(q=>q.marks))));
 return[E(s),F(M.average(allocation[0]),2),F(M.average(allocation[1]),2),F(M.average(allocation[1])-M.average(allocation[0]),2),periods[0].length+' / '+periods[1].length];
 })));
};routeFunctions.compare=()=>comparison();
document.addEventListener('change',e=>{if(['periodAFrom','periodATo','periodBFrom','periodBTo'].includes(e.target.id)){researchState[e.target.id]=+e.target.value;for(const period of ['A','B'])if(researchState['period'+period+'From']>researchState['period'+period+'To'])researchState['period'+period+'To']=researchState['period'+period+'From'];render()}});
const beforeExtraExport=exportCurrentView;
exportCurrentView=function(){
 if(view==='compare'){download('gate-v5-comparison.json',JSON.stringify({version:R.version,scope:scopeDescription(),settings:researchState,years:scopeYears(),records:scope().map(q=>({id:q.id,year:q.year,subject:q.subject,marks:q.marks,type:q.type,score:q.toughness.score}))},null,2),'application/json');return}
 beforeExtraExport();
};$('#export').onclick=exportCurrentView;
render();
