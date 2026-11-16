const researchMonitor=monitor;
monitor=function(){
 const all=R.questions, scored=all.filter(q=>q.scoring_status!=='marks_to_all'), stats=toughStats(scored);
 const subjectRows=R.subject_stats.slice().sort((a,b)=>b.mean-a.mean);
 return '<section class="atlas-hero"><div><div class="atlas-kicker">GATE EC / RESEARCH ATLAS / 2019—2026</div><h1>Find the pattern.<br><em>Build your edge.</em></h1><p>Eight years of papers, connected. Follow the marks, explore the difficulty and inspect the questions behind every signal.</p><div class="atlas-cta"><a href="#difficulty">Enter the terminal <span>↗</span></a><a href="#questions">Browse questions →</a></div></div><div class="atlas-orbit"><span class="orbit-tag">OFFICIAL PAPER CORPUS</span><strong>'+all.length+'</strong><span class="orbit-bottom">QUESTIONS INDEXED<br>EC / 19—26</span><i></i></div></section>'+
 '<div class="atlas-strip"><span>THE CORPUS AT A GLANCE</span><span>8 PAPERS</span><span>800 MARKS</span><span>10 ANALYTICAL SUBJECTS</span><a href="#audit">VIEW DATA QUALITY ↗</a></div>'+
 '<section class="atlas-section"><div class="atlas-section-title"><div><span class="atlas-kicker">SUBJECT INTELLIGENCE</span><h2>Follow the marks.</h2></div><p>Mean marks per paper across all eight years.<br>Select a subject to inspect its historical weight.</p></div><div class="atlas-subjects">'+subjectRows.map((s,i)=>'<button class="atlas-subject" data-atlas-subject="'+E(s.subject)+'"><span class="atlas-rank">'+String(i+1).padStart(2,'0')+'</span><div><strong>'+E(s.subject)+'</strong><div class="atlas-track"><i style="width:'+s.mean/Math.max(...subjectRows.map(s=>s.mean))*100+'%"></i></div></div><b>'+F(s.mean,1)+'<small>marks / paper</small></b></button>').join('')+'</div></section>'+
 '<section class="atlas-dark"><div class="atlas-section-title"><div><span class="atlas-kicker">DIFFICULTY INTELLIGENCE</span><h2>The shape of<br><em>the challenge.</em></h2></div><p>Each score combines concepts, reasoning, computation,<br>integration and representation. Free-mark items excluded.</p></div><div class="atlas-difficulty">'+Object.keys(BCOLORS).map(b=>'<a href="#difficulty"><span>'+b+'</span><strong>'+stats.bands[b].n+'</strong><p>'+stats.bands[b].marks+' historical marks</p><div style="width:'+stats.bands[b].n/stats.n*100+'%;background:'+BCOLORS[b]+'"></div></a>').join('')+'</div><div class="atlas-dark-footer"><span>AI CONTENT ESTIMATES / EDITABLE THRESHOLDS / SOURCE EVIDENCE</span><a href="#difficulty">Compare all eight papers ↗</a></div></section>'+
 '<section class="atlas-section"><div class="atlas-section-title"><div><span class="atlas-kicker">THE ANALYTICAL WORKSPACE</span><h2>Choose your next question.</h2></div></div><div class="atlas-tools">'+[['subjects','Where do the marks sit?','Subject weight, topic recurrence and year-by-year comparisons.'],['distributions','How does difficulty vary?','Explore distributions, percentiles and structural parameters.'],['inference','Which trends hold up?','Slopes, permutation tests and uncertainty across papers.'],['questions','What was actually asked?','Search all 520 questions and read the official source.'],['responses','How did candidates perform?','Import response data for observed accuracy and timing.'],['audit','How reliable is the data?','Inspect field repairs, tagging decisions and open flags.']].map(([id,t,p])=>'<a href="#'+id+'"><span>↗</span><h3>'+t+'</h3><p>'+p+'</p></a>').join('')+'</div></section><details class="atlas-research"><summary>Open the full research monitor</summary>'+researchMonitor()+'</details>';
};
const atlasLabels={monitor:'Overview',difficulty:'Difficulty',subjects:'Subjects & topics',questions:'Question library',distributions:'Distributions',inference:'Trends',audit:'Data quality',responses:'Responses',evidence:'Methods'};
document.querySelector('aside').innerHTML='<a class="atlas-logo" href="#monitor"><span>↗</span> GATE <small>/ RESEARCH ATLAS</small></a><nav id="atlasNav">'+modules.map(([id])=>'<a href="#'+id+'" data-nav="'+id+'">'+atlasLabels[id]+'</a>').join('')+'</nav><button class="atlas-search" id="atlasSearch" aria-label="Search tools and questions">⌕</button>';
document.getElementById('atlasSearch').onclick=openCommands;
const previousAtlasRender=render;
render=function(){
 previousAtlasRender();
 document.body.classList.toggle('atlas-overview',view==='monitor');
};
document.addEventListener('click',e=>{
 const subject=e.target.closest('[data-atlas-subject]');
 if(subject){$('#from').value=2019;$('#to').value=2026;$('#subject').value=subject.dataset.atlasSubject;location.hash='subjects';render()}
});
if(!location.hash)location.hash='monitor';
render();
