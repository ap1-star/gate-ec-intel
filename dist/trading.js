let terminalLayout='split';
let watchSort='hard';
const priorTradingDifficulty=difficulty;

function tradingYearChart(rows){
 const years=paperRows(rows), max=Math.max(1,...years.map(y=>y.n));
 return '<div class="tv-chart"><div class="tv-grid">'+[0,1,2,3,4].map(i=>'<div style="bottom:'+i*25+'%"><span>'+Math.round(max*i/4)+'</span></div>').join('')+'</div><div class="tv-bars">'+years.map(p=>'<div class="tv-year"><div class="tv-stack">'+Object.keys(BCOLORS).reverse().map(b=>'<button data-diff-drill="'+p.year+'" data-band="'+b+'" style="height:'+(p.bands[b].n/max*100)+'%;background:'+BCOLORS[b]+'" aria-label="Inspect '+p.year+' '+b+' questions"><span>'+p.bands[b].n+'</span></button>').join('')+'</div><b>'+p.year+'</b><small>'+p.n+' questions</small></div>').join('')+'</div></div>';
}
difficulty=function(){
 if(studyMode==='advanced')return priorTradingDifficulty();
 const rows=toughRows(),stats=toughStats(rows), groups=toughTopicGroups(rows).filter(g=>g.n>=difficultyState.minN).sort((a,b)=>watchSort==='hard'?b.avg-a.avg:a.avg-b.avg);
 return '<div class="tv-toolbar"><div class="tv-symbol"><span>EC</span><div><strong>GATE Electronics</strong><small>Historical paper analysis · 2019–2026</small></div></div><div class="tv-actions"><button data-terminal-layout="split" aria-pressed="'+(terminalLayout==='split')+'">▥ Split view</button><button data-terminal-layout="wide" aria-pressed="'+(terminalLayout==='wide')+'">▰ Full chart</button><button data-study-mode="advanced">Indicators & settings</button></div></div>'+
 '<div class="tv-quotes">'+[['Questions',stats.n,'in selected cohort'],['Easy marks',stats.bands.Easy.marks,'historical mark pool'],['Tough questions',stats.bands.Tough.n,'score ≥ '+difficultyState.tough],['Mean challenge',F(stats.avg,1),'/100 · structural estimate']].map(([a,b,c])=>'<div><span>'+a+'</span><strong>'+b+'</strong><small>'+c+'</small></div>').join('')+'</div>'+
 '<div class="tv-layout '+(terminalLayout==='wide'?'tv-wide':'')+'"><section class="tv-panel tv-main"><div class="tv-panel-head"><div><span class="tv-eyebrow">PAPER COMPARISON</span><h2>Difficulty across the years</h2></div><span class="tv-live">● '+rows.length+' questions</span></div><div class="tv-legend">'+Object.keys(BCOLORS).map(b=>'<span><i style="background:'+BCOLORS[b]+'"></i>'+b+'</span>').join('')+'<small>Select a segment to inspect its questions</small></div>'+tradingYearChart(rows)+'<div class="tv-chart-foot"><span>UNIT / QUESTION COUNT</span><span>'+(difficultyState.excludeMTA?'Free-mark questions excluded':'Free-mark questions included')+'</span></div></section>'+
 '<section class="tv-panel tv-watch"><div class="tv-panel-head"><div><span class="tv-eyebrow">TOPIC WATCHLIST</span><h2>Challenge radar</h2></div><select id="watchSort" aria-label="Watchlist sort"><option value="hard">Toughest first</option><option value="easy" '+(watchSort==='easy'?'selected':'')+'>Easiest first</option></select></div><div class="tv-watch-label"><span>TOPIC / SAMPLE</span><span>AVG / 100</span></div>'+groups.slice(0,8).map(g=>'<button class="tv-watch-row" data-diff-topic="'+E(g.topic)+'" data-subject="'+E(g.subject)+'"><div><strong>'+E(g.topic)+'</strong><small>'+E(g.subject)+' · n='+g.n+'</small></div><div class="tv-watch-score"><b>'+F(g.avg,1)+'</b><i><em style="width:'+g.avg+'%"></em></i></div></button>').join('')+'<button class="tv-more" data-study-mode="advanced">Open all topic indicators ↗</button></section></div>'+
 '<section class="tv-panel tv-bottom"><div class="tv-panel-head"><div><span class="tv-eyebrow">PAPER LEDGER</span><h2>Counts, marks and score distribution</h2></div><a href="#questions">Question library ↗</a></div>'+toughYearTable(rows)+'</section>';
};
document.addEventListener('click',e=>{const button=e.target.closest('[data-terminal-layout]');if(button){terminalLayout=button.dataset.terminalLayout;render()}});
document.addEventListener('change',e=>{if(e.target.id==='watchSort'){watchSort=e.target.value;render()}});
const tradingRender=render;
render=function(){tradingRender();if(view==='difficulty'){$('#title').textContent='EC Intelligence';$('#subtitle').textContent='Historical difficulty, topic signals and question-level evidence.'}};
render();
