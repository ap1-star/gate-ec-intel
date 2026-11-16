const workspaceTitles={
 difficulty:['PAPER DIFFICULTY','Read the challenge.','Compare the papers, inspect the topics and follow every score to its question.'],
 subjects:['SUBJECT INTELLIGENCE','Where the marks sit.','Explore subject weight, variation and recurrence across the selected papers.'],
 distributions:['DISTRIBUTION LAB','Understand the spread.','Inspect the shape, range and concentration of each question parameter.'],
 inference:['HISTORICAL TRENDS','Test the signal.','Eight annual papers. Transparent methods and visible uncertainty.'],
 questions:['QUESTION LIBRARY','Go to the source.','Search the reviewed corpus and inspect the official paper, tags and score.'],
 audit:['DATA QUALITY','Inspect the evidence.','Field repairs, review decisions and open issues in one traceable register.'],
 responses:['RESPONSE ANALYTICS','Bring your observations.','Import candidate responses to measure accuracy, timing and item behaviour.'],
 evidence:['METHODS & SOURCES','Know the foundations.','Understand the corpus, scoring rubric, statistical methods and source evidence.']
};
const originalSubjectPage=subjects;
subjects=function(){
 const rows=groups(scope()).sort((a,b)=>b.marks-a.marks);
 const maximum=Math.max(1,...rows.map(row=>row.marks));
 return '<section class="subject-explorer"><div class="workspace-section-head"><div><span>WEIGHT / SELECTED PAPERS</span><h2>The subject landscape.</h2></div><p>'+scopeYears().length+' papers · '+scope().length+' questions · '+sum(rows.map(r=>r.marks))+' marks</p></div><div class="subject-rankings">'+rows.map((r,i)=>'<button class="subject-ranking" data-select-subject="'+E(r.subject)+'"><span>'+String(i+1).padStart(2,'0')+'</span><div><strong>'+E(r.subject)+'</strong><div class="subject-mark-bar"><i style="width:'+r.marks/maximum*100+'%"></i></div><small>'+r.questions+' questions · '+F(r.avg,1)+' mean marks per paper</small></div><b>'+r.marks+'<small>marks</small></b></button>').join('')+'</div></section><details class="workspace-details" open><summary>Annual matrix & statistical ledger</summary>'+originalSubjectPage()+'</details>';
};
let questionDisplay='cards';
const originalLibrary=questionList;
questionList=function(audit=false){
 let html=originalLibrary(audit);
 if(audit)return html;
 const rows=selectedQuestionRows().slice(page*15,page*15+15);
 const cards='<div class="question-card-grid">'+rows.map(q=>'<button class="question-card" data-question="'+E(q.id)+'"><div class="question-card-top"><span>'+q.year+' / '+q.section+' '+q.official_number+'</span><span>'+q.type+' · '+q.marks+' MARKS</span></div><h3>'+E(q.topic_family)+'</h3><p class="question-excerpt">'+E(q.stem.slice(0,170))+(q.stem.length>170?'…':'')+'</p><div class="question-card-bottom"><span>'+E(q.subject)+'</span><b>'+F(q.toughness.score,1)+' <small>/100</small></b></div><div class="question-card-link">Inspect question & evidence ↗</div></button>').join('')+'</div>';
 const switcher='<div class="library-view-switch"><span>READING VIEW</span><div><button data-library-display="cards" aria-pressed="'+(questionDisplay==='cards')+'">Cards</button><button data-library-display="table" aria-pressed="'+(questionDisplay==='table')+'">Table</button></div></div>';
 html=html.replace('<div class="table-scroll"><table class="data-table">',switcher+'<div class="table-scroll"><table class="data-table">');
 if(questionDisplay==='cards')html=html.replace(/<div class="table-scroll"><table class="data-table">[\s\S]*?<\/table><\/div>/,cards);
 return html;
};
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-library-display]');
 if(button){questionDisplay=button.dataset.libraryDisplay;render()}
});
const workspaceRender=render;
render=function(){
 workspaceRender();
 document.body.classList.add('workspace-design');
 document.body.dataset.workspaceView=view;
 if(view!=='monitor'){
  const copy=workspaceTitles[view];
  $('#overline').textContent=copy[0];
  $('#title').textContent=copy[1];
  $('#subtitle').textContent=copy[2];
 }
};
render();
