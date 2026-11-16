import {filterQuestions,relatedQuestions,questionSummary,reconcilePaperReferences,catalogue} from '../domains/pyq/index.mjs';
export function createPyqFeature(bridge){
 const {C,icon}=bridge,E=C.escape;
 const state={topic:'',subtopic:'',type:'',marks:'',source:'',collection:'',display:'table',bookmarks:[],collections:[],loadedFor:null,loading:false,error:'',busy:false,paramsKey:'',generation:0,columns:[true,true,true,false,true,true,true,true]};
 const previousColumns=bridge.getPreference?.('gate-pyq-columns',null);
 if(Array.isArray(previousColumns)&&previousColumns.length===8&&previousColumns.every(v=>typeof v==='boolean')&&previousColumns.some(Boolean))state.columns=[...previousColumns];
 else{const legacy=bridge.getPreference?.('gate-v5-columns',null);if(Array.isArray(legacy)&&legacy.length===6&&legacy.every(v=>typeof v==='boolean'))state.columns=[legacy[0],legacy[1],true,legacy[2],legacy[3],legacy[4],legacy[5],true];}
 const applyColumns=()=>document.querySelectorAll('.feature-pyq>.panel>.table-scroll table tr').forEach(row=>[...row.children].forEach((cell,i)=>cell.hidden=!state.columns[i]));
 const filters=()=>({topic:state.topic,subtopic:state.subtopic,type:state.type,marks:state.marks,source:state.source,collection:state.collection});
 const session=()=>bridge.session();
 const authenticated=()=>session().status==='authenticated';
 const bookmark=qid=>state.bookmarks.find(b=>b.targetType==='question'&&b.targetId===qid);
 const selectedCollection=()=>state.collection&&!['bookmarks'].includes(state.collection)?state.collection:null;
 const inSelection=qid=>{const b=bookmark(qid);return !!b&&(!selectedCollection()||b.collectionIds?.includes(selectedCollection()));};
 const sourceLink=(url,label,extra='')=>{try{const parsed=new URL(url);return parsed.protocol==='https:'?'<a class="text-link" data-pyq-source '+extra+' href="'+E(parsed.href)+'" target="_blank" rel="noopener noreferrer">'+E(label)+' '+icon('external-link')+'</a>':'<span>Source unavailable</span>';}catch{return '<span>Source unavailable</span>';}};
 const button=(id,compact=false)=>'<button type="button" class="'+(compact?'icon-button':'button')+'" data-pyq-action="bookmark" data-pyq-id="'+E(id)+'" aria-label="'+(inSelection(id)?'Remove bookmark ':'Bookmark ')+E(id)+'" '+(state.busy?'disabled':'')+'>'+icon(inSelection(id)?'check':'file-text')+(compact?'':inSelection(id)?'Bookmarked':'Bookmark')+'</button>';
 const options=(values,current,empty)=>'<option value="">'+E(empty)+'</option>'+values.map(v=>'<option value="'+E(v)+'" '+(String(v)===String(current)?'selected':'')+'>'+E(v)+'</option>').join('');
 function topicOptions(){return [...new Set(bridge.scopeRows().map(q=>q.topic_family))].sort();}
 function resetFilters(){Object.assign(state,{topic:'',subtopic:'',type:'',marks:'',source:'',collection:''});bridge.setPage(0);}
 function syncParams(){
  const params=bridge.params(),key=params.toString();if(state.paramsKey===key)return;state.paramsKey=key;
  if(params.has('subject')||params.has('topic')){resetFilters();bridge.applyQuestionParams(params);if(params.has('topic'))state.topic=params.get('topic')||'';}
  if(params.has('collection')){state.collection=params.get('collection')||'';bridge.setPage(0);}
 }
 function filterRows(rows){return filterQuestions(rows,filters(),state.bookmarks);}
 function renderQuestions(){
  syncParams();
  const rows=bridge.rows(),summary=questionSummary(rows),pageSize=15;
  let page=Math.max(0,bridge.page());if(page*pageSize>=rows.length&&page>0){page=Math.max(0,Math.ceil(rows.length/pageSize)-1);bridge.setPage(page);}
  const visible=rows.slice(page*pageSize,page*pageSize+pageSize),topics=topicOptions(),subtopics=[...new Set(bridge.scopeRows().filter(q=>!state.topic||q.topic_family===state.topic).map(q=>q.microtopic))].sort();
  const accountNotice=session().status==='unavailable'?'<span>Bookmarks & collections need the account service. Public research works independently.</span><a class="text-link" data-pyq-nav href="#profile">Account status '+icon('arrow-up-right')+'</a>':!authenticated()?'<span>Sign in to save questions and organize collections.</span><a class="text-link" data-pyq-nav href="#profile">Sign in '+icon('arrow-up-right')+'</a>':'<span>'+state.bookmarks.filter(b=>b.targetType==='question').length+' saved question bookmarks · '+state.collections.length+' collections</span><a class="text-link" href="#dashboard">Open dashboard '+icon('arrow-up-right')+'</a>';
  const metrics='<div class="pyq-summaries">'+[['Questions',summary.questions],['Marks',summary.marks],['Years',summary.papers],['Source reviewed',summary.sourceReviewed],['Open flags',summary.openFlags]].map(([label,value])=>'<span><small>'+label+'</small><strong>'+value+'</strong></span>').join('')+'</div>';
  const toolbar='<div class="pyq-filter-grid"><label>Topic<select data-pyq-filter="topic">'+options(topics,state.topic,'All topic families')+'</select></label><label>Subtopic<select data-pyq-filter="subtopic">'+options(subtopics,state.subtopic,'All microtopics')+'</select></label><label>Format<select data-pyq-filter="type">'+options(['MCQ','MSQ','NAT'],state.type,'All formats')+'</select></label><label>Marks<select data-pyq-filter="marks">'+options(['1','2'],state.marks,'Any marks')+'</select></label><label>Source review<select data-pyq-filter="source"><option value="">All records</option>'+[['reviewed','Source reviewed'],['flagged','Open content flags'],['no_open_flags','No open flags']].map(([v,l])=>'<option value="'+v+'" '+(state.source===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label>Saved collection<select data-pyq-filter="collection" '+(!authenticated()?'disabled':'')+'><option value="">All research records</option><option value="bookmarks" '+(state.collection==='bookmarks'?'selected':'')+'>My bookmarks</option>'+state.collections.map(c=>'<option value="'+E(c.id)+'" '+(state.collection===c.id?'selected':'')+'>'+E(c.name)+'</option>').join('')+'</select></label></div>';
  const controls='<div class="pyq-retained-controls"><label>Sort <select id="databaseSort">'+['id','year','marks','score'].map(value=>'<option value="'+value+'" '+(bridge.sort?.()===value?'selected':'')+'>'+({id:'Question ID',year:'Exam year',marks:'Marks',score:'Content score'})[value]+'</option>').join('')+'</select></label><label>Review outcome <select id="verdict">'+[['all','All review outcomes'],['consistent','Consistent'],['correction','Corrections / refinements'],['ambiguous','Ambiguous'],['changed','Subject changes'],['risk','Content risk flags']].map(([value,label])=>'<option value="'+value+'" '+(bridge.verdict?.()===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label>Difficulty <select id="questionToughnessBand">'+['all','Easy','Moderate','Tough'].map(value=>'<option value="'+value+'" '+(bridge.difficultyBand?.()===value?'selected':'')+'>'+(value==='all'?'All bands':value)+'</option>').join('')+'</select></label><details><summary>Table columns</summary>'+['Question','Subject & topic','Format / marks','Content operation','Content score','Evidence','Official source','Save'].map((label,i)=>'<label><input type="checkbox" data-pyq-column="'+i+'" '+(state.columns[i]?'checked':'')+'> '+label+'</label>').join('')+'</details></div><div class="research-table-toolbar"><label class="table-search">'+icon('search')+'<input id="search" aria-label="Search question records" value="'+E(bridge.query())+'" placeholder="Search ID, subject, topic or review rationale…"></label><div class="panel-tools">'+C.SegmentedControl({items:[['table','Table'],['cards','Cards']],selected:state.display,attribute:'data-pyq-display'})+'<button class="button" data-pyq-action="clear">Clear extra filters</button></div></div>';
  const rowsHtml=visible.map(q=>'<tr data-question="'+E(q.id)+'" tabindex="0" role="button" aria-label="Inspect '+E(q.id)+'"><td class="question-id">'+E(q.id.replace('GATE-EC-',''))+'<small>'+q.year+' · '+q.section+'</small></td><td>'+E(q.subject)+'<small>'+E(q.topic_family)+' · '+E(q.microtopic)+'</small></td><td><span class="format-tag">'+q.type+'</span><small>'+q.marks+' mark'+(q.marks===1?'':'s')+'</small></td><td>'+E(q.structural.cognitive_operations[0])+'</td><td class="number-cell">'+q.toughness.score.toFixed(1)+'<small>'+E(bridge.band(q.toughness.score))+'</small></td><td>'+C.SourceBadge({label:q.source.visual_review_completed?'Source reviewed':'Review pending'})+'<small>'+q.quality.open_issue_count+' open flag'+(q.quality.open_issue_count===1?'':'s')+'</small></td><td>'+sourceLink(q.source.url,'PDF')+'</td>'+(session().status!=='unavailable'?'<td>'+button(q.id,true)+'</td>':'')+'</tr>').join('');
  const table=state.display==='table'?C.DataTable({headers:['Question','Subject & topic','Format / marks','Content operation','Content score /100','Evidence','Official source',...(session().status!=='unavailable'?['Save']:[])],rowsHtml}):'<div class="question-card-grid">'+visible.map(q=>'<article class="question-card"><div class="question-card-top"><button class="text-link" data-question="'+E(q.id)+'">'+E(q.id)+' '+icon('arrow-up-right')+'</button><span class="format-tag">'+q.type+' · '+q.marks+'m</span></div><h3>'+E(q.topic_family)+'</h3><p>'+E(q.subject)+' · '+E(q.microtopic)+'</p><div>'+C.SourceBadge({label:q.source.visual_review_completed?'Source reviewed':'Review pending'})+'<span class="mono">'+q.toughness.score.toFixed(1)+'/100</span></div><footer>'+sourceLink(q.source.url,'Official paper')+(session().status!=='unavailable'?button(q.id,true):'')+'</footer></article>').join('')+'</div>';
  const empty=rows.length?'':C.EmptyState({title:'No matching questions',description:'Broaden the topic, format or saved-collection filters. Source flags remain separate from source review.',actionHtml:'<button class="button" data-pyq-action="clear">Clear extra filters</button>'});
  const pagination='<div class="pagination"><span>'+(rows.length?page*pageSize+1:0)+'–'+Math.min((page+1)*pageSize,rows.length)+' of '+rows.length+' questions</span><div><button class="button" data-pyq-page="-1" '+(page===0?'disabled':'')+'>Previous</button><button class="button" data-pyq-page="1" '+((page+1)*pageSize>=rows.length?'disabled':'')+'>Next</button></div></div>';
  const collections=authenticated()?'<form class="pyq-collection-form" data-pyq-form="collection"><label>New collection<input name="name" required maxlength="80" placeholder="For example, networks revision"></label><button class="button" '+(state.busy?'disabled':'')+'>Create collection</button><span>Account-owned; no research records are altered.</span></form>':'';
  const links=reconcilePaperReferences();
  const paperTable=C.DataTable({headers:['Paper','Official source','Donor relationship','Audit'],rowsHtml:catalogue.papers.map(p=>{const l=links.find(l=>l.canonicalPaperId===p.id);return '<tr><td class="question-id">'+E(p.id)+'<small>'+p.questionIds.length+' existing question IDs</small></td><td>'+sourceLink(p.sourceUrl,'Master paper')+'</td><td>'+E(l?l.relationship==='exact_official_pdf_url'?'Exact official PDF URL':'Year-qualified archive reference':'Terminal source only')+'</td><td>'+E(l?.legacyKey||'Existing corpus')+'<small>No question records merged or added</small></td></tr>';}).join('')});
  return '<div class="feature-pyq">'+metrics+'<div class="pyq-account-strip">'+accountNotice+'</div>'+(state.error?'<div class="feature-feedback" role="alert">'+E(state.error)+' <button class="text-link" data-pyq-action="retry">Retry bookmarks</button></div>':'')+'<section class="panel"><div class="panel-head pyq-library-head"><div><span class="section-eyebrow">Question intelligence</span><h2>Canonical question library</h2><p class="panel-description">Refine the cohort, inspect the source, and explore each question.</p></div><span class="pyq-cohort-count">'+rows.length+' records</span></div>'+toolbar+controls+table+empty+pagination+'</section>'+collections+'<details class="workspace-details"><summary>Official paper index & source reconciliation</summary><p class="pyq-method-note">Five donor full-paper links are mapped separately from the 520 canonical questions. Exact PDF URL matches and archive-only relationships are recorded explicitly; text similarity is never used to merge records.</p>'+paperTable+'</details></div>';
 }
 async function load(){
  const user=session().user?.id,generation=state.generation;
  if(!authenticated()||state.loadedFor===user||state.loading)return;
  state.loading=true;state.error='';
  const current=()=>state.generation===generation&&session().status==='authenticated'&&session().user?.id===user;
  try{
   const [bookmarks,collections]=await Promise.all([bridge.api('/api/bookmarks?limit=520'),bridge.api('/api/collections')]);
   const items=[...(bookmarks.items||[])];
   if(bookmarks.total>items.length){const next=await bridge.api('/api/bookmarks?limit=520&offset='+items.length);items.push(...(next.items||[]));}
   if(!current())return;
   state.bookmarks=items;state.collections=collections.items||[];state.loadedFor=user;
  }catch(error){if(current()){state.error=error.message;state.loadedFor=user;}}
  finally{if(current()){state.loading=false;bridge.render();}}
 }
 function resetUser(){state.generation++;state.bookmarks=[];state.collections=[];state.loadedFor=null;state.error='';state.collection='';state.loading=false;state.busy=false;}
 async function toggleBookmark(id){
  if(!authenticated()){bridge.navigate('profile');return;}
  const q=bridge.questions().find(q=>q.id===id);if(!q)return;
  const generation=state.generation,user=session().user?.id,current=()=>generation===state.generation&&session().user?.id===user;
  state.busy=true;
  try{const existing=bookmark(id),collectionId=selectedCollection();
   if(existing&&inSelection(id))await bridge.api('/api/bookmarks/'+encodeURIComponent(existing.id)+(collectionId?'?collectionId='+encodeURIComponent(collectionId):''),{method:'DELETE'});
   else await bridge.api('/api/bookmarks',{method:'POST',body:{targetType:'question',targetId:id,...(collectionId?{collectionId}:{})}});
   if(!current())return;state.loadedFor=null;await load();if(current())bridge.toast('Bookmark updated.');
  }catch(error){if(current()){state.error=error.message;bridge.toast(error.message);}}
  finally{if(current()){state.busy=false;bridge.render();document.querySelectorAll('[data-pyq-action="bookmark"]').forEach(node=>{if(node.dataset.pyqId===id){node.disabled=false;node.innerHTML=icon(inSelection(id)?'check':'file-text')+(node.classList.contains('icon-button')?'':inSelection(id)?'Bookmarked':'Bookmark');node.setAttribute('aria-label',(inSelection(id)?'Remove bookmark ':'Bookmark ')+id);}});}}
 }
 function handleClick(event){
  const navigation=event.target.closest('[data-pyq-nav]');if(navigation){if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return false;event.preventDefault();event.stopPropagation();document.getElementById('inspector')?.close();const url=new URL(navigation.href,location.href),parts=url.hash.slice(1).split('?'),target=parts[0]||'questions';state.paramsKey='__reload__';bridge.navigate(target,Object.fromEntries(new URLSearchParams(parts[1]||'')));return true;}
  const source=event.target.closest('[data-pyq-source]');if(source){event.stopPropagation();return true;}
  const action=event.target.closest('[data-pyq-action]'),page=event.target.closest('[data-pyq-page]'),display=event.target.closest('[data-pyq-display]');
  if(!action&&!page&&!display)return false;event.preventDefault();event.stopPropagation();
  if(action?.dataset.pyqAction==='bookmark')void toggleBookmark(action.dataset.pyqId);
  if(action?.dataset.pyqAction==='clear'){resetFilters();bridge.render();}
  if(action?.dataset.pyqAction==='retry'){state.loadedFor=null;void load();}
  if(page){bridge.setPage(Math.max(0,bridge.page()+Number(page.dataset.pyqPage)));bridge.render();}
  if(display){state.display=display.dataset.pyqDisplay;bridge.setPage(0);bridge.render();}
  return true;
 }
 function handleChange(event){
  if(event.target.id==='subject'){state.topic='';state.subtopic='';}
  if(event.target.hasAttribute('data-pyq-column')){const index=Number(event.target.dataset.pyqColumn),next=[...state.columns];next[index]=event.target.checked;if(!next.some(Boolean)){bridge.toast('Keep at least one table column visible.');event.target.checked=true;return true;}state.columns=next;bridge.setPreference?.('gate-pyq-columns',next);applyColumns();return true;}
  const name=event.target.dataset.pyqFilter;if(!name)return false;
  state[name]=event.target.value;if(name==='topic')state.subtopic='';bridge.setPage(0);bridge.render();return true;
 }
 async function handleSubmit(event){
  const form=event.target.closest('[data-pyq-form="collection"]');if(!form)return false;event.preventDefault();
  const name=new FormData(form).get('name')?.toString().trim();if(!name)return true;const generation=state.generation;state.busy=true;
  try{await bridge.api('/api/collections',{method:'POST',body:{name}});if(generation!==state.generation)return true;state.loadedFor=null;await load();bridge.toast('Collection created.');}
  catch(error){if(generation===state.generation){state.error=error.message;bridge.toast(error.message);}}
  finally{if(generation===state.generation){state.busy=false;bridge.render();}}return true;
 }
 function decorateInspector(id){
  const q=bridge.questions().find(q=>q.id===id),root=document.getElementById('inspectBody');if(!q||!root)return;
  const related=relatedQuestions(q,bridge.questions());
  const account=authenticated()?button(id):'<a class="button" data-pyq-nav href="#profile">'+(session().status==='unavailable'?'Account service status':'Sign in to bookmark')+'</a>';
  root.insertAdjacentHTML('beforeend','<section class="detail-card pyq-related"><h3>Save & explore this question</h3><div class="pyq-detail-actions">'+account+'<a class="button" data-pyq-nav href="#questions?subject='+encodeURIComponent(q.subject)+'&topic='+encodeURIComponent(q.topic_family)+'">Related topic cohort</a></div><p>Related questions share the same reviewed primary subject and topic family. These are historical links, not personalized recommendations.</p>'+related.map(r=>'<button class="pyq-related-row" data-question="'+E(r.id)+'"><span>'+E(r.id)+'<small>'+E(r.microtopic)+'</small></span><span>'+r.marks+'m · '+r.type+'</span></button>').join('')+(!related.length?'<p>No other questions in this corpus share that subject/topic family.</p>':'')+'</section>');
 }
 return {renderers:{questions:renderQuestions},names:{questions:'Unified PYQ Intelligence'},descriptions:{questions:'One canonical question explorer, source audit trail and account-owned saved collections.'},filterRows,load,resetUser,resetFilters,handleClick,handleChange,handleSubmit,decorateInspector,afterRender:applyColumns,state};
}
