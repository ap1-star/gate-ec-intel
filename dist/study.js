let studyMode = 'years';
const fullDifficultyWorkspace = difficulty;
const studyModes = {years:'Compare years', topics:'Explore topics', advanced:'Advanced analysis'};

function studyNavigation() {
  return '<div class="study-nav" role="group" aria-label="Difficulty views">' +
    Object.entries(studyModes).map(([key,label]) =>
      '<button data-study-mode="'+key+'" aria-pressed="'+(studyMode===key)+'">'+label+'</button>'
    ).join('')+'</div>';
}

function paperRows(rows) {
  return scopeYears().map(year => ({year, ...toughStats(rows.filter(q => q.year===year))}));
}

function paperComparison(rows) {
  const papers = paperRows(rows);
  const ranked = papers.filter(p=>p.n).sort((a,b)=>b.bands.Tough.n-a.bands.Tough.n);
  const top = ranked[0];
  if (!top) return '<p class="empty">No questions match these filters. Change the years or reset the filters.</p>';
  const leaders = ranked.filter(p=>p.bands.Tough.n===top.bands.Tough.n);
  const detail = (paper,band) => '<button data-diff-drill="'+paper.year+'" data-band="'+band+'" aria-label="Inspect '+paper.year+' '+band+' questions">'+paper.bands[band].n+'</button>';
  return '<section class="study-card"><h2>How did difficulty change by year?</h2><p>'+
    (ranked.length===1?'In this selection, '+top.year+' contains '+top.bands.Tough.n+' tough questions.':
    leaders.map(p=>p.year).join(', ')+' '+(leaders.length===1?'has':'share')+' the highest tough-question count ('+top.bands.Tough.n+').')+
    ' Select a count to read the questions.</p><div class="study-table-wrap"><table class="study-table"><thead><tr><th>Paper</th><th>Difficulty mix</th><th>Easy</th><th>Moderate</th><th>Tough</th><th>Total</th></tr></thead><tbody>'+
    papers.map(p=>'<tr><th scope="row">'+p.year+'</th><td><div class="study-bar" aria-hidden="true">'+
      Object.keys(BCOLORS).map(b=>'<i style="background:'+BCOLORS[b]+';width:'+(p.n?100*p.bands[b].n/p.n:0)+'%"></i>').join('')+'</div></td>'+
      Object.keys(BCOLORS).map(b=>'<td>'+detail(p,b)+'</td>').join('')+'<td>'+p.n+'</td></tr>').join('')+
    '</tbody></table></div></section>';
}

function topicComparison(rows) {
  const groups=toughTopicGroups(rows).filter(g=>g.n>=difficultyState.minN);
  return '<section class="study-card"><h2>Which topics had harder questions?</h2><p>Compare average scores across '+groups.length+' topic groups with at least '+difficultyState.minN+' questions. Select a topic to see its question mix.</p>'+
    '<label class="study-sort">Rank by <select id="topicDifficultySort" aria-label="Topic difficulty sort">'+
    [['hard','Highest average difficulty'],['easy','Lowest average difficulty'],['marks','Most easy marks'],['volatile','Most variation']].map(([v,l])=>'<option value="'+v+'" '+(v===difficultyState.topicSort?'selected':'')+'>'+l+'</option>').join('')+
    '</select></label>'+toughTopics(rows)+'</section>';
}

difficulty = function() {
  const navigation=studyNavigation();
  if(studyMode==='advanced') return navigation+fullDifficultyWorkspace();
  const rows=toughRows(), totals=toughStats(rows);
  const bandCards=Object.entries(BCOLORS).map(([band,color])=>
    '<div class="study-band" style="--band-color:'+color+'"><span>'+band+'</span><strong>'+totals.bands[band].n+'</strong><small>'+totals.bands[band].marks+' marks</small></div>').join('');
  return navigation+'<div class="study-summary"><section class="study-overview"><h2>Difficulty at a glance</h2><p>'+totals.n+' questions · '+totals.marks+' marks · '+(difficultyState.excludeMTA?'free-mark questions excluded':'free-mark questions included')+(difficultyState.confidence==='high'?' · high-confidence ratings only':'')+'</p><div class="study-bands">'+bandCards+'</div></section><section class="study-guide"><h2>Reading the scores</h2><p>Each question receives a score out of 100 based on the reasoning, concepts and calculations it needs.</p><p>Easy below '+difficultyState.easy+' · Tough from '+difficultyState.tough+'. Scores are estimates for a prepared candidate.</p><button data-study-mode="advanced">Adjust scoring thresholds →</button></section></div>'+
    (studyMode==='years'?paperComparison(rows):topicComparison(rows));
};

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-study-mode]');
  if(!button)return;
  studyMode=button.dataset.studyMode;
  render();
  document.querySelector('.study-nav [aria-pressed="true"]')?.focus();
});
const previousStudyRender=render;
render=function(){
  previousStudyRender();
  if(view==='difficulty'){
    $('#title').textContent='Paper difficulty';
    $('#subtitle').textContent='Compare GATE EC papers by year, then explore the topics and questions behind each result.';
  }
};
render();
