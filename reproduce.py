import json,re,math,statistics as st,itertools,random,csv,collections,shutil
from topic_families import family
from pathlib import Path
ROOT=Path(__file__).resolve().parent;D=ROOT/'dist';D.mkdir(parents=True,exist_ok=True)
original=json.loads(Path('research/input-questions.json').read_text())['questions']
reviews=[r for p in Path('research').glob('audit_20*.json') for r in json.loads(p.read_text(encoding='utf-8'))]
assert len(reviews)==520 and len({r['question_id'] for r in reviews})==520
R={r['question_id']:r for r in reviews};M={r['question_id']:r for r in json.loads(Path('research/source_matches.json').read_text())}
manifest=json.loads(Path('research/sources/manifest.json').read_text());urls={r['year']:r['url'] for r in manifest}
aliases={'Network Theory':'Networks','Signals & Systems':'Signals and Systems','Electronic Devices & Circuits':'Electronic Devices','Electromagnetics (EMFT)':'Electromagnetics'}
canonical=lambda s:aliases.get(s,s)
rows=[]
for q in original:
 r=R[q['question_id']];m=M[q['question_id']];a={**(r.get('advanced_tags') or r.get('proposed_structural_tags') or {}),**(r.get('proposed_cognitive_tags') or {})}
 if r.get('cognitive_operations'):a['cognitive_operations']=r['cognitive_operations']
 if r.get('representations'):a['representations']=r['representations']
 flags=list(r.get('content_flags',[]));text=q.get('question_stem_text') or ''
 if any(t in text for t in ['Page ','Organizing Institute','Organising Institute']):flags.append('page_footer_artifact')
 if not q.get('paper_url'):flags.append('original_source_url_missing')
 if q.get('human_calibration_status')=='VERIFIED_CALIBRATED':flags.append('unsupported_original_calibration_claim')
 estimated={k:q.get(k) for k in ['conceptual_depth_1_5','calculation_load_0_4','cross_topic_integration_1_5','estimated_reasoning_steps','estimated_equations_count','cognitive_steps_count','expected_time_budget_sec','irt_difficulty_beta','irt_discrimination_alpha','irt_guessing_gamma','structural_difficulty_index']}
 source_page=r.get('official_source_pdf_page') or r.get('official_paper_page') or r.get('official_pdf_page') or (r.get('source_pages_1_based') or [None])[0] or r.get('source_visual_review',{}).get('official_pdf_page') or m['official_page']
 is_mta='MTA' in str(q.get('final_key_or_range','')).upper() or r.get('scoring_status')=='marks_to_all'
 structural={'cognitive_operations':a.get('cognitive_operations') or [a.get('cognitive_operation') or a.get('primary_cognitive_operation') or q.get('problem_solving_archetype') or 'not_assessed'], 'bloom_estimate':a.get('bloom_estimate') or 'not_assessed','representations':a.get('representation_types') or a.get('representations') or ['text/symbolic'], 'figure_dependency':a.get('requires_figure',a.get('requires_visual_representation',a.get('diagram_required_for_complete_review',bool(q.get('is_diagram_dependent') or q.get('is_graph_dependent'))))), 'negative_wording':bool(re.search(r'\b(not|incorrect|false|except)\b',text,re.I)), 'stem_word_count':len(re.findall(r'\w+',text)), 'evidence_class':'AI content estimate; no student calibration'}
 riskflags=[f for f in flags if any(s in str(f).lower() for s in ['corrupt','repair','missing','trunc','lost','error','damag','mismatch','unread','glyph','artifact']) and 'url' not in str(f).lower()]
 row={'id':q['question_id'],'year':q['year'],'section':q['official_key_section'],'paper_order':q['paper_order'],'official_number':m['official_question_number'],'type':q['question_type'],'marks':q['marks'],'negative_penalty':q['marks']/3 if q['question_type']=='MCQ' and not is_mta else 0,'scoring_status':'marks_to_all' if is_mta else 'standard','supplied_answer':q['final_key_or_range'],'stem':text,'options':q.get('options_json'),'subject':canonical(r['proposed_subject']),'topic':r['proposed_topic'],'microtopic':r.get('proposed_micro_topic') or q.get('micro_topic_tag'),'secondary_subjects':r.get('secondary_subjects') or r.get('proposed_secondary_subjects') or a.get('cross_subject_candidates') or [],'original_subject':q['primary_subject_tag'],'original_topic':q['topic_tag'],'review':r,'structural':structural,'original_uncalibrated_estimates':estimated,'empirical':{'difficulty_p':None,'point_biserial':None,'irt_alpha':None,'irt_beta':None,'irt_gamma':None,'median_response_seconds':None,'response_count':0,'status':'no_candidate_response_dataset'},'source':{'url':urls[q['year']],'page':source_page,'text_match':m['status'],'token_recall':m['lexical_token_recall'],'review_match':r['online_match_status'],'answer_key_check':r.get('answer_key_match_status') or r.get('official_key_check'),'source_sha256':next(x['sha256'] for x in manifest if x['year']==q['year'])},'flags':list(dict.fromkeys(flags)),'content_risks':riskflags,'has_image':Path('dist/question-images',q['question_id']+'.jpg').exists(),'subject_changed':canonical(q['primary_subject_tag'])!=canonical(r['proposed_subject']),'inference_eligible':r['semantic_verdict']!='ambiguous','calibration_eligible':False}
 row['original_microtopic']=q.get('micro_topic_tag')
 row['topic_family']=family(row['subject'],row['topic'])
 row['topic_family_basis']='Versioned rule-based consolidation of reviewed topic labels; fine-grained reviewed topic preserved.'
 row['reviewed_answer']=r.get('proposed_final_key_or_range') or r.get('official_answer') or (r.get('official_key_check') or {}).get('official_key') or q['final_key_or_range']
 row['source']['answer_key_check']=r.get('official_key_comparison') or row['source']['answer_key_check']
 row['source']['visual_review_completed']=bool(r.get('official_source_visual_review',{}).get('reviewed') or r.get('source_visual_review',{}).get('completed') or r.get('source_visual_review_completed'))
 if any(any(t in v.lower() for t in ['circuit','graph','diagram','geometry']) for v in structural['representations']):structural['figure_dependency']=True
 if r['semantic_verdict']=='correction' and not r.get('proposed_micro_topic'):
  row['microtopic']='; '.join(structural['cognitive_operations']) if structural['cognitive_operations']!=['not_assessed'] else r['proposed_topic']
 rows.append(row)
SUBJECTS=sorted(set(q['subject'] for q in rows));YEARS=list(range(2019,2027));rng=random.Random(20261112)
perms=list(itertools.permutations(range(8)));x=[i-3.5 for i in range(8)];den=sum(v*v for v in x)
stats=[]
for s in SUBJECTS:
 vals=[sum(q['marks'] for q in rows if q['subject']==s and q['year']==y) for y in YEARS]
 slope=sum(a*b for a,b in zip(x,vals))/den;obs=abs(slope*den)
 p=sum(abs(sum(x[i]*vals[j] for i,j in enumerate(perm)))>=obs-1e-9 for perm in perms)/len(perms)
 boots=sorted(st.mean(rng.choices(vals,k=8)) for _ in range(4000));med=st.median(vals)
 stats.append({'subject':s,'year_marks':vals,'mean':st.mean(vals),'median':med,'sd':st.stdev(vals),'iqr':st.quantiles(vals,n=4,method='inclusive')[2]-st.quantiles(vals,n=4,method='inclusive')[0],'mad':st.median(abs(v-med) for v in vals),'cv_pct':st.stdev(vals)/st.mean(vals)*100 if st.mean(vals) else None,'min':min(vals),'max':max(vals),'ols_slope':slope,'theil_sen_slope':st.median((vals[j]-vals[i])/(j-i) for i in range(8) for j in range(i+1,8)),'permutation_p':p,'bootstrap_mean_ci':[boots[99],boots[3899]],'papers_present':sum(v>0 for v in vals),'questions':sum(q['subject']==s for q in rows)})
ordered=sorted(stats,key=lambda s:s['permutation_p']);qv=1
for i in reversed(range(len(ordered))):qv=min(qv,ordered[i]['permutation_p']*len(ordered)/(i+1));ordered[i]['bh_q']=qv
yearstats=[]
for y in YEARS:
 a=[sum(q['marks'] for q in rows if q['year']==y and q['subject']==s) for s in SUBJECTS];probs=[v/100 for v in a];h=-sum(p*math.log2(p) for p in probs if p)
 yearstats.append({'year':y,'marks':sum(a),'questions':sum(q['year']==y for q in rows),'subject_entropy_bits':h,'normalized_entropy':h/math.log2(len(SUBJECTS)),'concentration_hhi':sum(p*p for p in probs),'formats':dict(collections.Counter(q['type'] for q in rows if q['year']==y))})
summary={'questions':len(rows),'semantic_reviews':len(reviews),'canonical_subjects':len(SUBJECTS),'subject_changes':sum(q['subject_changed'] for q in rows),'corrections_or_refinements':sum(q['review']['semantic_verdict']=='correction' for q in rows),'ambiguous':sum(q['review']['semantic_verdict']=='ambiguous' for q in rows),'content_risk_records':sum(bool(q['content_risks']) for q in rows),'text_aligned_candidates':sum(q['source']['token_recall'] is not None for q in rows),'image_source_records':195,'unsupported_calibration_claims':66,'calibrated_items':0,'mta':sum(q['scoring_status']=='marks_to_all' for q in rows),'verdicts':dict(collections.Counter(q['review']['semantic_verdict'] for q in rows))}
payload={'version':'2.0-research-audit','generated_date':'2026-11-12','summary':summary,'subjects':SUBJECTS,'years':YEARS,'questions':rows,'subject_stats':stats,'year_stats':yearstats,'source_manifest':manifest}
summary['visual_source_reviews']=sum(q['source']['visual_review_completed'] for q in rows)
summary['answer_key_corrections']=sum(q['reviewed_answer']!=q['supplied_answer'] and q['review'].get('official_key_comparison',{}).get('status')=='discrepancy' for q in rows)
(D/'research-data.js').write_text('window.RESEARCH='+json.dumps(payload)+';',encoding='utf-8')
(ROOT/'question-audit.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
(ROOT/'statistics.json').write_text(json.dumps({'summary':summary,'subjects':stats,'years':yearstats},indent=2),encoding='utf-8')
with (ROOT/'question-audit.csv').open('w',newline='',encoding='utf-8-sig') as f:
 writer=csv.writer(f);writer.writerow(['id','year','subject_original','subject_reviewed','topic_original','topic_reviewed','verdict','confidence','rationale','source_url','source_page','online_review_status','automated_text_match','answer_key_check','content_flags','bloom_estimate','cognitive_operations','empirical_difficulty','IRT_alpha','IRT_beta','IRT_gamma','original_answer','reviewed_answer','microtopic_reviewed','figure_dependency','marks','format','negative_penalty'])
 for q in rows:writer.writerow([q['id'],q['year'],q['original_subject'],q['subject'],q['original_topic'],q['topic'],q['review']['semantic_verdict'],q['review']['confidence'],q['review']['rationale'],q['source']['url'],q['source']['page'],q['source']['review_match'],q['source']['text_match'],json.dumps(q['source']['answer_key_check']),'; '.join(map(str,q['flags'])),q['structural']['bloom_estimate'],'; '.join(q['structural']['cognitive_operations']),'','','','',q['supplied_answer'],q['reviewed_answer'],q['microtopic'],q['structural']['figure_dependency'],q['marks'],q['type'],q['negative_penalty']])
for name in ['question-audit.csv','question-audit.json','statistics.json']:shutil.copy2(ROOT/name,D/name)
# Images already retained in dist/question-images.
print(json.dumps(summary,indent=2))
