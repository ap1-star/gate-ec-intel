import json,csv,re,shutil,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parent if Path(__file__).name=='reproduce-quality.py' else Path('outputs/gate-terminal')
D=ROOT/'dist'; FROZEN=ROOT/'research'
triage=json.loads((FROZEN/'issue-triage-v4.json').read_text(encoding='utf-8'))
repairs=json.loads((FROZEN/'content-repairs-v4.json').read_text(encoding='utf-8'))
closures=json.loads((FROZEN/'repair-closures-v4.json').read_text(encoding='utf-8'))
payload=json.loads((D/'research-data.js').read_text(encoding='utf-8').removeprefix('window.RESEARCH=').rstrip(';'))
qmap={q['id']:q for q in payload['questions']}; imap={q['id']:q for q in triage['questions']}
for c in closures['closures']:
 for d in imap[c['id']]['dispositions']:
  if d['flag']==c['flag']:
   d['previous_status']=d['status'];d['status']=c['status'];d['resolution']=c['rationale'];d['repair_evidence']=c['evidence']
for r in repairs:
 q=qmap[r['id']]
 q.setdefault('original_transcription',{'stem':q['stem'],'options':q['options']})
 for k,v in r['fields'].items():q[k]=json.dumps(v,ensure_ascii=False) if k=='options' else v
 q['content_repair']=r
 q['structural']['stem_word_count']=len(re.findall(r'\w+',q['stem']))
 imap[q['id']]['applied_repair']=r
 # Preserve unresolved flag dispositions: a targeted repair is not a blanket certification.
 imap[q['id']]['repair_status']='targeted_fields_repaired; remaining flags require closure'
for r in triage['taxonomy_convention']['resolutions']:
 q=qmap[r['id']];q.setdefault('previous_taxonomy_review',dict(q['review']))
 for field in ['subject','topic','microtopic','secondary_subjects','topic_family']:q[field]=r['proposed_'+field]
 q['taxonomy_resolution']=r;q['inference_eligible']=True
 q['review']={**q['review'],'semantic_verdict':'consistent','rationale':r['rationale'],'taxonomy_convention':r['convention_version']}
 for d in imap[q['id']]['dispositions']:
  if d['status'] in ['open_taxonomy','open_convention_review']:
   d['status']='resolved_by_declared_convention';d['resolution']=r['rationale']
for q in payload['questions']:
 i=imap[q['id']];opens=[d for d in i['dispositions'] if d['status'].startswith('open')]
 i['open_issue_count']=len(opens);i['highest_open_severity']=max((d['severity'] for d in opens),key=lambda s:{'minor':1,'major':2,'critical':3}.get(s,0),default='none')
 i['status']='requires_review' if opens else 'no_open_flagged_issue'
 q['quality']={'status':i['status'],'open_issue_count':len(opens),'severity':i['highest_open_severity'],'targeted_repair':q['id'] in {r['id'] for r in repairs},'transcription_certified':False}
 q['official_preview']=f"source-pages/{q['year']}-{q['source']['page']}.jpg"
 assert (D/q['official_preview']).exists(),q['id']
 q['source_pages_preview']=[q['official_preview']]
 for page in q['review'].get('source_pages_1_based',[]):
  src=f"source-pages/{q['year']}-{page}.jpg"
  if src not in q['source_pages_preview'] and (D/src).exists():q['source_pages_preview'].append(src)
payload['version']='4.0-quality-release-candidate'
payload['summary']['ambiguous']=0
payload['summary']['taxonomy_conventions_resolved']=4
payload['summary']['verdicts']=dict(collections.Counter(q['review']['semantic_verdict'] for q in payload['questions']))
triage['summary']['disposition_counts']=dict(collections.Counter(d['status'] for q in triage['questions'] for d in q['dispositions']))
triage['summary']['targeted_repairs']=len(repairs)
triage['summary']['closed_content_flags']=len(closures['closures'])
triage['summary']['taxonomy_conventions_applied']=4
triage['summary']['question_status_counts']=dict(collections.Counter(q['status'] for q in triage['questions']))
triage['summary']['highest_open_severity_counts']=dict(collections.Counter(q['highest_open_severity'] for q in triage['questions']))
triage['summary']['note']='Counts remain conservative: repaired fields and open residual flags are reported separately. No independent human certification.'
(D/'research-data.js').write_text('window.RESEARCH='+json.dumps(payload)+';',encoding='utf-8')
(D/'quality-data.js').write_text('window.QUALITY='+json.dumps(triage)+';',encoding='utf-8')
for name,data in [('question-audit.json',payload['questions']),('issue-register.json',triage),('content-repairs.json',repairs)]:
 (ROOT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8');shutil.copy2(ROOT/name,D/name)
with (ROOT/'issue-register.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['id','year','severity','open_issues','targeted_repair','flag','disposition','action','source_url','source_page'])
 for q in triage['questions']:
  for d in q['dispositions'] or [{}]:w.writerow([q['id'],q['year'],q['highest_open_severity'],q['open_issue_count'],bool(q.get('applied_repair')),d.get('flag',''),d.get('status','no_flags'),d.get('resolution',d.get('action','')),q['evidence']['source_url'],q['evidence']['source_page']])
shutil.copy2(ROOT/'issue-register.csv',D/'issue-register.csv')
# Keep the public audit table aligned with convention decisions and canonical text.
with (ROOT/'question-audit.csv').open(encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
fields=list(rows[0])+['canonical_stem','canonical_options','targeted_repair','taxonomy_convention','open_issue_count']
for row in rows:
 q=qmap[row['id']];row.update(topic_reviewed=q['topic'],microtopic_reviewed=q['microtopic'],verdict=q['review']['semantic_verdict'],rationale=q['review']['rationale'],canonical_stem=q['stem'],canonical_options=q['options'],targeted_repair=q['quality']['targeted_repair'],taxonomy_convention=q.get('taxonomy_resolution',{}).get('convention_version',''),open_issue_count=q['quality']['open_issue_count'])
with (ROOT/'question-audit.csv').open('w',encoding='utf-8-sig',newline='') as f:w=csv.DictWriter(f,fieldnames=list(dict.fromkeys(fields)));w.writeheader();w.writerows(rows)
shutil.copy2(ROOT/'question-audit.csv',D/'question-audit.csv')
s=json.loads((ROOT/'statistics.json').read_text());s['summary']=payload['summary'];(ROOT/'statistics.json').write_text(json.dumps(s,indent=2));shutil.copy2(ROOT/'statistics.json',D/'statistics.json')
print(json.dumps(triage['summary'],indent=2))
