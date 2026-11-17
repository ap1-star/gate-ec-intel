// A task sequence shared by admissions and recruitment. It never converts input units.
export function careerNavigation(bridge,active){
 const E=bridge.C.escape;
 const steps=[['rank','01','Estimate rank','Marks → model AIR'],['opportunities','02','Find programmes','Score → combined atlas'],['placements','03','Compare outcomes','Placements → company evidence'],['recruitment','04','Explore careers','Exams → exact post rules']];
 const current=active==='psu'?'recruitment':['admissions','institutes'].includes(active)?'opportunities':active;
 const context=bridge.params?.()||new URLSearchParams(),query=new URLSearchParams();
 for(const key of ['metric','score','rank','scoreBasis','year','category','marks','toughness','scenarioB','scenarioC'])if(context.has(key)&&context.get(key).length<100)query.set(key,context.get(key));
 const suffix=query.size?'?'+query.toString():'';
 return '<nav class="career-journey" aria-label="Admissions and career workflow">'+steps.map(([route,n,label,detail])=>'<a href="#'+route+E(suffix)+'" '+(route===current?'aria-current="page"':'')+'><span class="career-journey-index">'+n+'</span><span><strong>'+E(label)+'</strong><small>'+E(detail)+'</small></span><span class="career-journey-arrow" aria-hidden="true">↗</span></a>').join('')+'</nav>';
}
