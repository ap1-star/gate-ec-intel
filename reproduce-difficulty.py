import json,csv,statistics as st,collections,shutil
from pathlib import Path
root=Path(__file__).resolve().parent;raw=[r for p in Path('research').glob('toughness_20*.json') for r in json.loads(p.read_text(encoding='utf-8'))]
assert len(raw)==520 and len({r['id'] for r in raw})==520
weights={'concept':25,'reasoning':25,'computation':20,'integration':20,'representation':10}
Q={q['id']:q for q in json.loads((root/'question-audit.json').read_text(encoding='utf-8'))}
out=[]
for r in raw:
 if r['id']=='GATE-EC-2026-EC-65':
  r={**r,'initial_assessor_dimensions':r['dimensions'],'initial_assessor_score':65,'dimensions':{'concept':2,'reasoning':2,'computation':1,'integration':1,'representation':2},'rationale':'At the positive input peak of 6 V, D1 conducts and D2 is reverse-biased. The two equal resistors give (6+2)/2=4 V, so a full cycle-by-cycle regime analysis is unnecessary.','cognitive_steps_estimate':3,'cross_calibration_note':'Primary review inspected the source circuit and compared related 2023 diode questions; use the shortest sound peak-only solution rather than a full transfer-curve construction.'}
 r.pop('toughness_score',None)
 assert set(r['dimensions'])==set(weights)
 assert all(type(v)==int and 0<=v<=4 for v in r['dimensions'].values())
 score=round(sum(weights[k]*v/4 for k,v in r['dimensions'].items()),2)
 assert len(r['rationale'])>30
 q=Q[r['id']]
 r['source_preview']=f"source-pages/{q['year']}-{q['source']['page']}.jpg" if not q['has_image'] and (root/f"dist/source-pages/{q['year']}-{q['source']['page']}.jpg").exists() else None
 out.append({**r,'score':score,'band':'Easy' if score<35 else 'Moderate' if score<65 else 'Tough','rubric_version':'structural-toughness-v1.0','year':q['year'],'subject':q['subject'],'topic':q['topic'],'topic_family':q['topic_family'],'marks':q['marks'],'format':q['type'],'scoring_status':q['scoring_status'],'source_url':q['source']['url'],'source_page':q['source']['page'],'basis':'Expert-AI structural estimate for a prepared GATE EC candidate; not an observed student success rate.'})
def summary(a):
 return {'questions':len(a),'marks':sum(q['marks'] for q in a),'mean_score':round(st.mean(q['score'] for q in a),2) if a else None,'marks_weighted_mean':round(sum(q['score']*q['marks'] for q in a)/sum(q['marks'] for q in a),2) if a else None,'median':st.median(q['score'] for q in a) if a else None,'sd':round(st.stdev(q['score'] for q in a),2) if len(a)>1 else 0,'bands':{b:{'questions':sum(q['band']==b for q in a),'marks':sum(q['marks'] for q in a if q['band']==b)} for b in ['Easy','Moderate','Tough']}}
rubric={'version':'structural-toughness-v1.0','weights':weights,'formula':'score = 25*C/4 + 25*R/4 + 20*A/4 + 20*I/4 + 10*V/4','bands':{'Easy':'0 <= score < 35','Moderate':'35 <= score < 65','Tough':'65 <= score <= 100'},'target_candidate':'A prepared GATE EC candidate who knows the standard syllabus; relative to the shortest sound solution found in the review.','anchors':{'concept':['Recognition/recall','One standard fact','Standard applied concept','Nuanced theorem or model assumptions','Layered abstraction or synthesis'],'reasoning':['Recall','One inference','Two or three linked steps','Several dependent steps or cases','Multi-stage strategy or branching'],'computation':['None','Short arithmetic/algebra','Several calculations','Substantial symbolic/numeric manipulation','Lengthy multi-stage algebra'],'integration':['Isolated fact','Single topic with related facts','Coupled distinct topics','Major units linked','Multiple domains coupled'],'representation':['Direct text/formula','Simple schematic/plot','Decode topology, state or transform','Multiple representations/intermediate constructions','Complex linked graphical/state/symbolic representations']},'limitations':['Question marks, format and text length are not score inputs.','Weights and cutoffs are design choices, not fitted psychometric parameters.','Question-specific cognitive steps are estimates, not measured solve times.','Source corruption and low-confidence ratings are flagged.','MTA tasks receive structural scores but are excluded from scored-burden summaries by default.']}
stats={'rubric':rubric,'all_records':summary(out),'scored_records':summary([q for q in out if q['scoring_status']!='marks_to_all']),'years':{str(y):{'all':summary([q for q in out if q['year']==y]),'exclude_mta':summary([q for q in out if q['year']==y and q['scoring_status']!='marks_to_all'])} for y in range(2019,2027)}}
(root/'dist/difficulty-data.js').write_text('window.TOUGHNESS='+json.dumps({'rubric':rubric,'rows':out,'statistics':stats})+';',encoding='utf-8')
(root/'toughness-audit.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
(root/'difficulty-statistics.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
with (root/'toughness-audit.csv').open('w',newline='',encoding='utf-8-sig') as f:
 w=csv.writer(f);w.writerow(['id','year','subject','topic_family','topic','marks','format','scoring_status','toughness_0_100','band',*weights,'confidence','rationale','uncertainty_note','estimated_solution_actions','source_url','source_page'])
 for q in out:w.writerow([q['id'],q['year'],q['subject'],q['topic_family'],q['topic'],q['marks'],q['format'],q['scoring_status'],q['score'],q['band'],*[q['dimensions'][k] for k in weights],q['confidence'],q['rationale'],q['uncertainty_note'],q['cognitive_steps_estimate'],q['source_url'],q['source_page']])
for name in ['toughness-audit.json','toughness-audit.csv','difficulty-statistics.json']:shutil.copy2(root/name,root/'dist'/name)
print(json.dumps(stats['years'],indent=2))
