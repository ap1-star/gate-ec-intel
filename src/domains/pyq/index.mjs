import catalogue from './catalogue.json' with { type: 'json' };
export { catalogue };
export const donorPaperReferences=Object.freeze([
 {legacyKey:'officialPyqs:2021',year:2021,sourceUrl:'https://gate2026.iitg.ac.in/download.html',answerKeyUrl:'https://gate2026.iitg.ac.in/download.html'},
 {legacyKey:'officialPyqs:2022',year:2022,sourceUrl:'https://gate2026.iitg.ac.in/download.html',answerKeyUrl:'https://gate2026.iitg.ac.in/download.html'},
 {legacyKey:'officialPyqs:2023',year:2023,sourceUrl:'https://gate2026.iitg.ac.in/download.html',answerKeyUrl:'https://gate2026.iitg.ac.in/download.html'},
 {legacyKey:'officialPyqs:2024',year:2024,sourceUrl:'https://gate2026.iitg.ac.in/doc/download/2024/EC24S7.pdf',answerKeyUrl:'https://gate2026.iitg.ac.in/download.html'},
 {legacyKey:'officialPyqs:2025',year:2025,sourceUrl:'https://gate2026.iitg.ac.in/doc/download/2025/EC2025.pdf',answerKeyUrl:'https://gate2025.iitr.ac.in/question-papers.html'}
]);
export function reconcilePaperReferences(papers=catalogue.papers,references=donorPaperReferences){
 return references.map(reference=>{
  const candidate=papers.find(paper=>paper.year===reference.year&&paper.section==='EC');
  const exact=!!candidate&&candidate.sourceUrl===reference.sourceUrl;
  return {legacyKey:reference.legacyKey,granularity:'full_paper',canonicalPaperId:candidate?.id??null,relationship:exact?'exact_official_pdf_url':candidate?'same_year_section_archive_reference':'unresolved',sourceUrl:reference.sourceUrl,answerKeyUrl:reference.answerKeyUrl,canonicalSourceUrl:candidate?.sourceUrl??null,canonicalSourceSha256:candidate?.sourceSha256??null,sourceFile:'donor server/db.ts officialPyqs',questionMerge:false};
 });
}
export function filterQuestions(rows,filters={},bookmarkRows=[]){
 const keys=new Map(bookmarkRows.filter(item=>item.targetType==='question').map(item=>[item.targetId,item]));
 return rows.filter(q=>{
  if(filters.topic&&q.topic_family!==filters.topic)return false;
  if(filters.subtopic&&q.microtopic!==filters.subtopic)return false;
  if(filters.type&&q.type!==filters.type)return false;
  if(filters.marks&&q.marks!==Number(filters.marks))return false;
  if(filters.source==='reviewed'&&!q.source?.visual_review_completed)return false;
  if(filters.source==='flagged'&&!(q.quality?.open_issue_count>0))return false;
  if(filters.source==='no_open_flags'&&q.quality?.open_issue_count!==0)return false;
  if(filters.collection==='bookmarks'&&!keys.has(q.id))return false;
  if(filters.collection&&filters.collection!=='bookmarks'&&!keys.get(q.id)?.collectionIds?.includes(filters.collection))return false;
  return true;
 });
}
export function relatedQuestions(question,rows,limit=6){
 if(!question)return [];
 return rows.filter(q=>q.id!==question.id&&q.subject===question.subject&&q.topic_family===question.topic_family).sort((a,b)=>Number(b.microtopic===question.microtopic)-Number(a.microtopic===question.microtopic)||b.year-a.year||a.id.localeCompare(b.id)).slice(0,limit);
}
export function questionSummary(rows){return {questions:rows.length,marks:rows.reduce((n,q)=>n+q.marks,0),papers:new Set(rows.map(q=>q.year)).size,sourceReviewed:rows.filter(q=>q.source?.visual_review_completed).length,openFlags:rows.filter(q=>q.quality?.open_issue_count>0).length};}
