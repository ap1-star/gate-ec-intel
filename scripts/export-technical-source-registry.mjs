import fs from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import {TECHNICAL_PATHWAYS,RECRUITMENT_SOURCES,RECRUITMENT_POSTS,RECRUITMENT_NOTICES,ORGANIZATIONS,SOURCE_REVIEWED_AT,REGISTRY_HISTORY} from '../src/domains/recruitment/index.mjs';

// Use the Codex bundled public package entry, never this site's runtime dependencies.
// Example: node scripts/export-technical-source-registry.mjs --artifact-tool <resolved artifact-tool .mjs>
const argument=process.argv.indexOf('--artifact-tool');
if(argument<0||!process.argv[argument+1])throw new Error('Pass the bundled @oai/artifact-tool public entry with --artifact-tool. This exporter does not install dependencies.');
const {Workbook}=await import(pathToFileURL(path.resolve(process.argv[argument+1])).href);
const root=fileURLToPath(new URL('../',import.meta.url));
const sourceMap=new Map(RECRUITMENT_SOURCES.map(source=>[source.id,source]));
const headers=['pathway_id','organization_id','organization','recruiting_body','examination_id','technical_pathway','sector','selection_route','state','branch_relevance_only','directory_status','currently_hiring','source_id','official_source_url','source_verification','source_checked_at_utc','source_publication_date','trusted_official_source','automatic_monitor_enabled','adapter','individual_post_criteria_sources','eligibility_note'];
const rows=TECHNICAL_PATHWAYS.map(row=>{
 const source=sourceMap.get(row.sourceIds[0]);
 return [row.id,row.organizationId,row.organization,row.recruitingBody,row.examinationId,row.pathwayTitle,row.sector,row.routeType,row.states.join('; '),row.branches.join('; '),row.status,row.currentlyHiring,source.id,source.url,row.verification.status,row.verification.checkedAt,row.verification.publishedAt,source.official,source.enabled,source.adapter,[...new Set(RECRUITMENT_POSTS.filter(post=>post.examinationId===row.examinationId).map(post=>post.sourceUrl))].join('; '),row.eligibilityNote];
});
const workbook=Workbook.create(),sheet=workbook.worksheets.add('Technical sources');
sheet.getRangeByIndexes(0,0,rows.length+1,headers.length).values=[headers,...rows];
sheet.showGridLines=false;sheet.freezePanes.freezeRows(1);sheet.freezePanes.freezeColumns(2);
sheet.getRangeByIndexes(0,0,rows.length+1,headers.length).format.font={name:'Arial',size:10};
sheet.getRangeByIndexes(0,0,1,headers.length).format={fill:'#182E43',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},rowHeight:32,wrapText:true};
sheet.getRangeByIndexes(0,0,rows.length+1,headers.length).format.columnWidth=28;
sheet.getRange('C1:F105').format.columnWidth=45;
sheet.getRange('G1:J105').format.columnWidth=24;
sheet.getRange('N1:N105').format.columnWidth=65;
sheet.getRange('O1:V105').format.columnWidth=35;
workbook.recalculate();
const matrix=sheet.getRangeByIndexes(0,0,rows.length+1,headers.length).values;
if(matrix.length!==105||matrix.some(row=>row.length!==22))throw new Error('Unexpected registry CSV dimensions.');
if(matrix.slice(1).some(row=>row[11]!==false))throw new Error('A directory entry incorrectly claims current hiring.');
const inspected=await workbook.inspect({kind:'table',range:'Technical sources!A1:D4',include:'values',tableMaxRows:4,tableMaxCols:4,maxChars:1800});
console.log(inspected.ndjson);
const csvCell=value=>value===null||value===undefined?'':typeof value==='boolean'?String(value):'"'+String(value).replaceAll('"','""')+'"';
await fs.writeFile(path.join(root,'TECHNICAL_EXAM_SOURCE_REGISTRY.csv'),matrix.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n');
await fs.mkdir(path.join(root,'docs','recruitment'),{recursive:true});
const preview=await workbook.render({sheetName:'Technical sources',range:'A1:D6',scale:1,format:'png'});
await fs.writeFile(path.join(root,'docs','recruitment','source-registry-preview.png'),new Uint8Array(await preview.arrayBuffer()));

const counts=values=>values.reduce((result,value)=>(result[value.verification.status]=(result[value.verification.status]??0)+1,result),{});
const pathCounts=counts(TECHNICAL_PATHWAYS),sourceCounts=counts(RECRUITMENT_SOURCES);
const md=value=>String(value??'Unknown').replaceAll('|','\\|').replaceAll('\n',' ');
const evidence=RECRUITMENT_POSTS.map(post=>`| ${post.id} | ${md(post.eligibility.sourceSection)} | ${md(post.eligibility.verificationMethod)} | ${post.eligibility.verified?'Partial criteria only':'Unverified'} | [Official source](<${post.sourceUrl}>) |`);
const pathwayMatrix=TECHNICAL_PATHWAYS.map(row=>{const source=sourceMap.get(row.sourceIds[0]);return `| ${row.id} | ${md(row.organization)} | ${md(row.states.join(', ')||'Notice-specific')} | ${row.verification.status} | ${source.enabled?'Enabled: link discovery':'Disabled: manual review'} | [Official/potential source](<${source.url}>) |`;});
const contents=`# Technical recruitment source verification

Registry review timestamp: **${SOURCE_REVIEWED_AT}**. Publication dates remain independent, nullable fields. An official portal check establishes source provenance and directory relevance; it does not certify an active vacancy, all extracted links, or individual eligibility.

## Coverage and evidence levels

- ${TECHNICAL_PATHWAYS.length} technical directory pathways across ${ORGANIZATIONS.length} organizations. Every directory row has currentlyHiring=false.
- Pathway evidence: ${pathCounts.official_page_checked} primary pages/documents read, ${pathCounts.official_search_reference} official indexed references with incomplete direct extraction, and ${pathCounts.unverified} potential sources still unverified.
- ${RECRUITMENT_SOURCES.length} unique source records: ${sourceCounts.official_page_checked} primary pages, ${sourceCounts.official_pdf_checked} separately registered primary PDFs, ${sourceCounts.official_search_reference} indexed/manual references, ${sourceCounts.unverified} unverified sources. Only ${RECRUITMENT_SOURCES.filter(source=>source.official).length} direct-read sources carry official=true. Indexed/unverified sources are not trusted for automatic verified notices.
- ${RECRUITMENT_SOURCES.filter(source=>source.enabled).length} source records enable HTML-link discovery. All other sources use manual_review. Enabled configuration does not establish successful production monitoring; scheduled check logs must demonstrate that separately.
- State coverage is representative: 15 state-authority pathways across 12 states. It is expandable and does not claim verified coverage of every state or an ECE-compatible post at every authority.
- ${RECRUITMENT_POSTS.length} individual-post examples and ${RECRUITMENT_NOTICES.length} closed/historical application cycles. Every actual eligibility rule remains incomplete or unverified; a positive comparison therefore requires further verification. Complete synthetic rules exist only in tests.

${REGISTRY_HISTORY.previousPackage} ${REGISTRY_HISTORY.scopeChange}

## Verified distinctions that affect candidates

| Subject | Finding and limitation | Primary evidence |
| --- | --- | --- |
| SSC JE 2026 | DoT Telecom lists electronics-related and other named disciplines. BRO Civil has a separate Civil qualification; a diploma route also requires two years of prescribed experience. Do not classify the entire exam from either post. ECE titles not verbatim in the DoT list require authority equivalence confirmation. | [SSC notice, Para 2](<https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_je_2026.pdf>) |
| IMD Scientific Assistant 2026 | The amended computing/electronics route requires Class XII Physics and Mathematics; the Science-with-Physics route is separate. | [10 September addendum](<https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Addendum_JE_10092026.pdf>) |
| BARC Electronics 2026 | Electronics discipline branches, 60 percent or 6.0/10 threshold, and separate GATE/online-exam screening routes were transcribed. The brochure has an inconsistent application-opening year; no opening timestamp is invented. Full qualification recognition, final-year and other conditions remain to be checked. | [OCES/DGFS brochure, Section 4 and Table 1a](<https://www.barc.gov.in/careers/barc_ts_OCES_DGFS_brochure.pdf>) |
| DRDO CEPTAM-11 | STA-B post 0108 accepts named electronics diplomas. Published exclusions for specified higher qualifications are retained independently of RAC. The Technician-A example records the higher-qualification restriction, not a fabricated universal ITI trade rule. | [CEPTAM-11 notice, Sections 1.1–1.2](<https://drdo.gov.in/drdo/sites/default/files/vacancy/CEPTAM-11_AdvtEnglish.pdf>) |
| DRDO RAC advertisement 156 | Graduate engineering and GATE EC conditions appeared in official indexed content. Direct full PDF extraction did not complete; the row remains partial and its source is not automatically trusted. | [RAC version 3](<https://rac.gov.in/download/advt_156_v3.pdf>) |
| RRB JE CEN 05/2025 | Repeated official PDF fetches failed. The supplied prior narrative says same-discipline BE/BTech may be accepted in lieu of diploma; that claim is not promoted to verified criteria. The actual JE post stays review_pending and its eligibility result is insufficient. Exact post/branch behavior is tested with clearly synthetic fixtures. | [Official JE PDF, pending full review](<https://www.rrbcdg.gov.in/uploads/2025/05-JE/052025JE-CEN.pdf>) |
| RRB Technician Grade I Signal | An official indexed category-1 table includes specified engineering degree routes. Do not reuse CEPTAM exclusions or Grade III ITI rules. Direct complete updated-PDF review remains pending. | [Official indexed Hindi PDF](<https://www.rrbcdg.gov.in/uploads/2025/02-TECH/022025-CEN-%E0%A4%B9%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A6%E0%A5%80.pdf>) |
| ISRO ICRB EMC 2025 | The 27 May 2025 notice and FAQ support a historical Electronics example and 16 June 2025 application close. It is always displayed closed. It is not evidence of a new opening or future eligibility. | [Notice](<https://www.isro.gov.in/media_isro/pdf/recruitmentNotice/2025_May/ICRBAdvt_BILINGUAL.pdf>), [FAQ](<https://www.isro.gov.in/media_isro/pdf/recruitmentNotice/2025_May/FREQUENTLYASKEDQUESTIONSANDANSWERS_EMC_2025.pdf>) |
| UPSC ESE 2027 | Official page gives notification 16 September 2026, application close 6 October 2026, and examination 31 January 2027. A future exam does not reopen the closed application cycle. | [Official examination page](<https://www.upsc.gov.in/examinations/Engineering%20Services%20(Preliminary)%20Examination,%202027>) |

## Dates and verification limits

The bundled notice records preserve source dates at date precision. deadlineAt, deadlineTimezone, and deadlineVerified are null/null/false. This intentionally prevents automated reminders from invented time-of-day or timezone metadata. Published dates may be unknown; checkedAt never fills them. RRB ALP 2026, many protected/JavaScript portals, and 37 potential source rows need further primary-source review. Private-sector portals are directory routes, not verified current job openings or general graduate assessments.

Source allowlisting is exact-host HTTPS with no user information, custom ports, wildcard government trust or localhost access. Source ownership review, enabled scheduling, extraction success, individual notice verification and full post-criteria mapping are separate states. A changed source or discovered link must not silently become a verified ECE vacancy. Production provider delivery and operational scheduler verification belong to the deployment handoffs, not this source research claim.

## Individual-post evidence matrix

| Post ID | Consulted location | Verification method | Completeness | Citation |
| --- | --- | --- | --- | --- |
${evidence.join('\n')}

## Directory verification matrix

Each row below is a monitored historical route or a potential source, never a current-hiring assertion. Publication date is unknown for directory portals unless separately recorded in a notice.

| Pathway ID | Organization | State | Source review | Adapter state | Citation |
| --- | --- | --- | --- | --- | --- |
${pathwayMatrix.join('\n')}

## Reproduction and tests

The CSV is generated from src/domains/recruitment/index.mjs with scripts/export-technical-source-registry.mjs using the bundled public Artifact Tool. It contains 104 data rows and 22 columns, with empty publication dates preserved. No spreadsheet formulas or inferred vacancy dates are added. Run node --test tests/technical-eligibility.test.mjs for the focused domain checks. The automated source-ID checks verify exact URL, host and organization mapping for every historical seed.
`;
await fs.writeFile(path.join(root,'docs','recruitment','SOURCE_VERIFICATION.md'),contents);
console.log(JSON.stringify({rows:rows.length,columns:headers.length,csv:'TECHNICAL_EXAM_SOURCE_REGISTRY.csv',matrix:'docs/recruitment/SOURCE_VERIFICATION.md'}));
