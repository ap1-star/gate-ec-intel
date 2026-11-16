// Recruiter/pathway directory. A directory row is never a current vacancy or eligibility assertion.
export const TECHNICAL_REGISTRY_VERSION='technical-career-v4-2026-11-16';
export const SOURCE_REVIEWED_AT='2026-11-15T22:05:37Z';
export const REGISTRY_HISTORY=Object.freeze({previousPackage:'A prior narrative described 58 pathways; the row-level CSV was not supplied or found in this checkout.',scopeChange:'General graduate examinations and standalone hiring assessments are excluded. This is a newly sourced technical directory, not a claimed row-by-row audit of an unavailable CSV.'});
export const EXCLUDED_GENERAL_ROUTES=Object.freeze(['ssc_chsl','ssc_cgl','rrb_ntpc','rrb_ntpc_graduate','rrb_ntpc_undergraduate','bank_po','bank_clerk','ibps_po','ibps_clerk','generic_administration','generic_clerical','standalone_tcs_ion_nqt','standalone_amcat']);
const excludedPattern=/\bSSC[\s_-]*(?:CHSL|CGL)\b|\bRRB[\s_-]*NTPC\b|\bnon[\s-]*technical[\s-]*popular\b|\bbanking[\s_-]*(?:PO|clerk)\b|\bIBPS[\s_-]*(?:PO|clerk)\b|\b(?:general administrative|general clerical|standalone AMCAT|standalone TCS iON NQT)\b/i;
export function isExcludedRecruitment(entry={}){
 const values=[entry.id,entry.examinationId,entry.examination,entry.title,entry.name,entry.pathwayTitle].filter(Boolean).join(' ');
 return EXCLUDED_GENERAL_ROUTES.includes(entry.id)||EXCLUDED_GENERAL_ROUTES.includes(entry.examinationId)||excludedPattern.test(values);
}
export function isTechnicalPathway(entry){return !!entry&&entry.technical===true&&!isExcludedRecruitment(entry);}
export function isTechnicalRecruitmentTitle(title){
 return typeof title==='string'&&!excludedPattern.test(title)&&/\b(?:engineer(?:ing)?|technical|technician|scientist|scientific|electronics|telecommunication|telecom|instrumentation|embedded|semiconductor|VLSI|hardware|software|signal|research fellow|research associate|loco pilot)\b/i.test(title)&&!/\b(?:accounts officer|administrative officer|stenographer|staff car driver|office assistant|clerical)\b/i.test(title);
}
// P: primary portal read; I: official indexed reference/JS/protected portal, extraction not verified;
// U: potential official source, verification pending. No source date is inferred from checkedAt.
const rows=[
 ['gate_technical','gate','GATE organizing institutes','GATE-based technical recruitment','national','gate','https://gate2026.iitg.ac.in/','P'],
 ['upsc_ese','upsc','Union Public Service Commission','Engineering Services — Electronics and Telecommunication','national','independent_exam','https://www.upsc.gov.in/examinations/Engineering%20Services%20(Preliminary)%20Examination,%202027','P'],
 ['upsc_direct_technical','upsc','Union Public Service Commission','Direct technical and scientific specialist recruitment','national','direct','https://www.upsc.gov.in/recruitment/recruitment-advertisement','I'],
 ['rrb_je','rrb','Railway Recruitment Boards','JE — exact Electronics, Signal and Telecommunication posts','national','independent_exam','https://www.rrbcdg.gov.in/2025-05-je.php','I'],
 ['rrb_technician_signal','rrb','Railway Recruitment Boards','Technician Grade I Signal — notice-specific qualifications','national','independent_exam','https://www.rrbcdg.gov.in/2025-02-tech.php','I'],
 ['rrb_alp','rrb','Railway Recruitment Boards','Assistant Loco Pilot — exact technical qualification and medical standard','national','independent_exam','https://www.rrbcdg.gov.in/2026-01-alp.php','U'],
 ['ssc_je','ssc','Staff Selection Commission','JE — post-specific engineering qualifications; includes reviewed 2026 Telecom route','national','independent_exam','https://ssc.gov.in/','I'],
 ['ssc_selection_technical','ssc','Staff Selection Commission','Selection Posts — technical and scientific posts only','national','independent_exam','https://ssc.gov.in/','I'],
 ['imd_sa','imd','India Meteorological Department / SSC','Scientific Assistant — exact degree and subject conditions','national','independent_exam','https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Addendum_JE_10092026.pdf','P'],
 ['barc_oces','barc','Bhabha Atomic Research Centre','OCES/DGFS — Electronics screening discipline','scientific','mixed','https://www.barc.gov.in/careers/','P'],
 ['barc_direct','barc','Bhabha Atomic Research Centre','Direct scientific and technical recruitment','scientific','direct','https://www.barc.gov.in/careers/','P'],
 ['dae_technical','dae','Department of Atomic Energy','DAE technical posts — individual unit and post rules','scientific','mixed','https://dae.gov.in/','U'],
 ['npcil_technical','npcil','Nuclear Power Corporation of India','Executive trainees, scientific and technical posts','scientific','mixed','https://www.npcilcareers.co.in/','P'],
 ['igcar_technical','igcar','Indira Gandhi Centre for Atomic Research','Scientific and technical recruitment','scientific','mixed','https://www.igcar.gov.in/recruitment.html','P','Tamil Nadu'],
 ['rrcat_technical','rrcat','Raja Ramanna Centre for Advanced Technology','Scientific and technical recruitment','scientific','mixed','https://www.rrcat.gov.in/hrd/Openings/','U','Madhya Pradesh'],
 ['vecc_technical','vecc','Variable Energy Cyclotron Centre','Scientific and technical recruitment','scientific','mixed','https://www.vecc.gov.in/recruitment','P','West Bengal'],
 ['ecil_technical','ecil','Electronics Corporation of India','Electronics engineering and technical recruitment','scientific','mixed','https://www.ecil.co.in/jobopenings','P'],
 ['nfc_technical','nfc','Nuclear Fuel Complex','Technical and scientific posts','scientific','mixed','https://www.nfc.gov.in/recruitment.html','U','Telangana'],
 ['hwb_technical','hwb','Heavy Water Board','Technical and scientific posts','scientific','mixed','https://www.hwb.gov.in/','U'],
 ['bhavini_technical','bhavini','Bharatiya Nabhikiya Vidyut Nigam','Technical recruitment routes','scientific','mixed','https://bhavini.nic.in/','U','Tamil Nadu'],
 ['ucil_technical','ucil','Uranium Corporation of India','Engineering and technical posts','scientific','mixed','https://ucil.gov.in/','U'],
 ['ipr_technical','ipr','Institute for Plasma Research','Electronics, instrumentation and research posts','scientific','mixed','https://www.ipr.res.in/documents/jobs_career.html','U','Gujarat'],
 ['drdo_rac','drdo','Defence Research and Development Organisation','RAC Scientist B — Electronics and Communication','defence','gate','https://rac.gov.in/','I'],
 ['drdo_ceptam','drdo','Defence Research and Development Organisation','CEPTAM — post-specific diploma/trade restrictions','defence','independent_exam','https://drdo.gov.in/drdo/en/offerings/vacancies/ceptam-11-advertisement-post-sta-b-and-technician','P'],
 ['drdo_laboratories','drdo','Defence Research and Development Organisation','Laboratory scientific, technical and research posts','defence','direct','https://drdo.gov.in/drdo/en/offerings/vacancies','P'],
 ['bel_technical','bel','Bharat Electronics Limited','Electronics engineering and technical recruitment','defence','mixed','https://bel-india.in/job-notifications/','I'],
 ['hal_technical','hal','Hindustan Aeronautics Limited','Aeronautics, electronics and technical recruitment','defence','mixed','https://hal-india.co.in/career','I'],
 ['bdl_technical','bdl','Bharat Dynamics Limited','Electronics and engineering recruitment','defence','mixed','https://bdl-india.in/recruitments','P'],
 ['beml_technical','beml','BEML Limited','Engineering and technical posts','defence','mixed','https://www.bemlindia.in/careers/','P'],
 ['isro_icrb','isro','Indian Space Research Organisation','ICRB Scientist/Engineer — Electronics','space','mixed','https://www.isro.gov.in/Careers.html','P'],
 ['isro_sac','sac','ISRO Space Applications Centre','Centre-specific scientific and electronics posts','space','mixed','https://www.isro.gov.in/Careers.html','P','Gujarat'],
 ['isro_vssc','vssc','ISRO Vikram Sarabhai Space Centre','Centre-specific scientific and technical posts','space','mixed','https://www.isro.gov.in/Careers.html','P','Kerala'],
 ['isro_ursc','ursc','ISRO U R Rao Satellite Centre','Electronics, spacecraft and technical posts','space','mixed','https://www.ursc.gov.in/jobs/jobs.jsp','P','Karnataka'],
 ['isro_sdsc_shar','sdsc_shar','ISRO Satish Dhawan Space Centre SHAR','Centre-specific technical and scientific posts','space','mixed','https://www.isro.gov.in/Careers.html','P','Andhra Pradesh'],
 ['isro_lpsc','lpsc','ISRO Liquid Propulsion Systems Centre','Centre-specific scientific and technical posts','space','mixed','https://www.isro.gov.in/Careers.html','P','Kerala'],
 ['isro_istrac','istrac','ISRO Telemetry Tracking and Command Network','Tracking, communication and technical posts','space','mixed','https://www.istrac.gov.in/','P','Karnataka'],
 ['isro_nrsc','nrsc','ISRO National Remote Sensing Centre','Scientific, computing and technical posts','space','mixed','https://www.isro.gov.in/Careers.html','P','Telangana'],
 ['isro_iprc','iprc','ISRO Propulsion Complex','Scientific and technical posts','space','mixed','https://www.isro.gov.in/Careers.html','P','Tamil Nadu'],
 ['isro_hsfc','hsfc','ISRO Human Space Flight Centre','Scientific and engineering posts','space','mixed','https://www.isro.gov.in/Careers.html','P','Karnataka'],
 ['ntro_technical','ntro','National Technical Research Organisation','Scientist B and exact technical posts','telecom','mixed','https://www.ntro.gov.in/','U'],
 ['ib_acio_tech','ib','Intelligence Bureau / Ministry of Home Affairs','ACIO-II Technical — not general ACIO recruitment','telecom','gate','https://www.mha.gov.in/en/notifications/vacancies','I'],
 ['nic_technical','nic','National Informatics Centre','Scientific and technical computing posts','telecom','mixed','https://www.nic.in/recruitments/','U'],
 ['nielit_technical','nielit','National Institute of Electronics and Information Technology','Technical, scientific and electronics posts','telecom','mixed','https://www.nielit.gov.in/recruitments','U'],
 ['cdac_technical','cdac','Centre for Development of Advanced Computing','Project engineering, computing and electronics roles','telecom','direct','https://cdac.in/?id=current_jobs','P'],
 ['cdot_technical','cdot','Centre for Development of Telematics','Telecommunications engineering and R&D roles','telecom','direct','https://www.cdot.in/cdotweb/web/current_openings.php?lang=en','P'],
 ['sameer_technical','sameer','Society for Applied Microwave Electronics Engineering and Research','RF, microwave, electronics and research posts','telecom','mixed','https://recruitment.sameer.gov.in/','P'],
 ['railtel_technical','railtel','RailTel Corporation of India','Technical networking, telecom and computing posts','telecom','mixed','https://www.railtel.in/careers.html','I'],
 ['cris_technical','cris','Centre for Railway Information Systems','Computing and technical engineering posts','telecom','mixed','https://cris.org.in/','U'],
 ['bsnl_technical','bsnl','Bharat Sanchar Nigam Limited','Technical recruitment only when officially announced','telecom','mixed','https://www.bsnl.co.in/opencms/bsnl/BSNL/about_us/hrd/jobs.html','U'],
 ['ntpc_technical','ntpc','NTPC Limited','Engineering executive trainees and technical specialists','psu','mixed','https://ntpc.co.in/jobs-ntpc','I'],
 ['ongc_technical','ongc','Oil and Natural Gas Corporation','Electronics, instrumentation and technical engineering posts','psu','mixed','https://ongcindia.com/web/eng/career/recruitment-notice','U'],
 ['iocl_technical','iocl','Indian Oil Corporation','Engineering and technical recruitment','psu','mixed','https://iocl.com/latest-job-opening','P'],
 ['bpcl_technical','bpcl','Bharat Petroleum Corporation','Engineering and technical posts only','psu','mixed','https://www.bharatpetroleum.in/careers/job-openings.aspx','U'],
 ['hpcl_technical','hpcl','Hindustan Petroleum Corporation','Engineering and technical posts only','psu','mixed','https://www.hindustanpetroleum.com/job-openings','P'],
 ['gail_technical','gail','GAIL India','Executive trainees and technical engineering posts','psu','mixed','https://www.gailonline.com/Vacancies.html','I'],
 ['powergrid_technical','powergrid','Power Grid Corporation of India','Electronics, telecom and engineering posts','psu','mixed','https://www.powergrid.in/job-opportunities','P'],
 ['bhel_technical','bhel','Bharat Heavy Electricals Limited','Engineering trainees and technical posts','psu','mixed','https://careers.bhel.in/','U'],
 ['sail_technical','sail','Steel Authority of India','Management trainees and technical engineering posts','psu','mixed','https://sailcareers.com/','P'],
 ['nlc_technical','nlc','NLC India','Graduate engineering and technical posts','psu','mixed','https://www.nlcindia.in/new_website/careers/CAREER.htm','U'],
 ['coal_india_technical','coal_india','Coal India Limited','Technical management trainees and engineering posts','psu','mixed','https://www.coalindia.in/career-cil/','U'],
 ['aai_technical','aai','Airports Authority of India','Electronics, communication and technical posts','psu','mixed','https://www.aai.aero/en/careers/recruitment','I'],
 ['eil_technical','eil','Engineers India Limited','Engineering and instrumentation recruitment','psu','mixed','https://recruitment.eil.co.in/','P'],
 ['nalco_technical','nalco','National Aluminium Company','Graduate engineering and technical posts','psu','mixed','https://nalcoindia.com/Career/','I'],
 ['nmdc_technical','nmdc','NMDC Limited','Engineering and technical posts','psu','mixed','https://www.nmdc.co.in/careers','I'],
 ['dvc_technical','dvc','Damodar Valley Corporation','Engineering and technical recruitment','psu','mixed','https://www.dvc.gov.in/','U','West Bengal'],
 ['grid_india_technical','grid_india','Grid Controller of India','Engineering and technical power-system roles','psu','mixed','https://grid-india.in/en/careers','U'],
 ['nhpc_technical','nhpc','NHPC Limited','Engineering and technical recruitment','psu','mixed','https://www.nhpcindia.com/','U'],
 ['sjvn_technical','sjvn','SJVN Limited','Engineering and technical recruitment','psu','mixed','https://sjvn.nic.in/','U'],
 ['thdc_technical','thdc','THDC India','Engineering and technical recruitment','psu','mixed','https://www.thdc.co.in/','U'],
 ['rites_technical','rites','RITES Limited','Engineering, signal and technical consultancy posts','psu','mixed','https://rites.com/Career','U'],
 ['ircon_technical','ircon','IRCON International','Engineering, signal and telecommunications posts','psu','mixed','https://www.ircon.org/','U'],
 ['tnpsc_technical','tnpsc','Tamil Nadu Public Service Commission','Combined Technical Services — exact degree/diploma post','state','independent_exam','https://tnpsc.gov.in/web/examdashboard/index.aspx?notid=024fc5d2-a6b0-4c29-93db-979bf485d544','I','Tamil Nadu'],
 ['kerala_psc_electronics','kerala_psc','Kerala Public Service Commission','Electronics engineering and scientific posts','state','independent_exam','https://www.keralapsc.gov.in/','I','Kerala'],
 ['msetcl_telecom','msetcl','Maharashtra State Electricity Transmission Company','Assistant Engineer Telecommunication — exact notice','state','independent_exam','https://www.mahatransco.in/uploads/career/career_1719225778.pdf','I','Maharashtra'],
 ['rpsc_technical','rpsc','Rajasthan Public Service Commission','Technical and engineering posts; exact discipline required','state','independent_exam','https://rpsc.rajasthan.gov.in/','U','Rajasthan'],
 ['apsc_telecom','apsc','Assam Public Service Commission','Police telecom and technical engineering posts','state','independent_exam','https://apsc.nic.in/','U','Assam'],
 ['opsc_technical','opsc','Odisha Public Service Commission','Technical and engineering posts; ECE acceptance not assumed','state','independent_exam','https://opsc.gov.in/Public/OPSC/Default.aspx','P','Odisha'],
 ['uppsc_technical','uppsc','Uttar Pradesh Public Service Commission','Technical and engineering posts; ECE acceptance not assumed','state','independent_exam','https://uppsc.up.nic.in/','P','Uttar Pradesh'],
 ['mpsc_technical','mpsc','Maharashtra Public Service Commission','Technical and engineering posts; ECE acceptance not assumed','state','independent_exam','https://mpsc.gov.in/','I','Maharashtra'],
 ['appsc_technical','appsc','Andhra Pradesh Public Service Commission','Technical and engineering posts; ECE acceptance not assumed','state','independent_exam','https://psc.ap.gov.in/','U','Andhra Pradesh'],
 ['tgpsc_technical','tgpsc','Telangana Public Service Commission','Technical and engineering posts; ECE acceptance not assumed','state','independent_exam','https://www.tspsc.gov.in/','U','Telangana'],
 ['wbsetcl_technical','wbsetcl','West Bengal State Electricity Transmission Company','Technical posts; exact accepted branch required','state','mixed','https://www.wbsetcl.in/career.php','P','West Bengal'],
 ['keltron_technical','keltron','Kerala State Electronics Development Corporation','Electronics, embedded and technical engineering roles','state','direct','https://www.keltron.org/','U','Kerala'],
 ['keonics_technical','keonics','Karnataka State Electronics Development Corporation','Electronics and IT technical roles','state','direct','https://keonics.in/','U','Karnataka'],
 ['webel_technical','webel','West Bengal Electronics Industry Development Corporation','Electronics and IT technical roles','state','direct','https://www.webel.in/','U','West Bengal'],
 ['hartron_technical','hartron','Haryana State Electronics Development Corporation','Electronics and computing technical posts','state','direct','https://hartron.org.in/','U','Haryana'],
 ['qualcomm_engineering','qualcomm','Qualcomm','Semiconductor, RF, embedded and engineering vacancies only','private','direct','https://www.qualcomm.com/company/careers','P'],
 ['nvidia_engineering','nvidia','NVIDIA','Hardware, semiconductor and computing engineering roles','private','direct','https://www.nvidia.com/en-us/about-nvidia/careers/','P'],
 ['intel_engineering','intel','Intel','Semiconductor and hardware engineering roles','private','direct','https://www.intel.com/content/www/us/en/jobs/jobs-at-intel.html','U'],
 ['amd_engineering','amd','AMD','Semiconductor, hardware and computing engineering roles','private','direct','https://careers.amd.com/','U'],
 ['ti_engineering','ti','Texas Instruments','Analog, semiconductor and embedded engineering roles','private','direct','https://careers.ti.com/en/sites/CX','I'],
 ['nxp_engineering','nxp','NXP Semiconductors','Semiconductor and embedded engineering roles','private','direct','https://www.nxp.com/company/about-nxp/careers:CAREERS','P'],
 ['stm_engineering','stm','STMicroelectronics','Semiconductor and electronics engineering roles','private','direct','https://careers.st.com/','U'],
 ['micron_engineering','micron','Micron Technology','Semiconductor and hardware engineering roles','private','direct','https://careers.micron.com/careers','P'],
 ['mediatek_engineering','mediatek','MediaTek','Semiconductor, wireless and embedded engineering roles','private','direct','https://www.mediatek.com/careers','U'],
 ['renesas_engineering','renesas','Renesas Electronics','Semiconductor and embedded engineering roles','private','direct','https://jobs.renesas.com/','P'],
 ['synopsys_engineering','synopsys','Synopsys','EDA, VLSI and semiconductor engineering roles','private','direct','https://careers.synopsys.com/','P'],
 ['cadence_engineering','cadence','Cadence Design Systems','EDA, VLSI and electronics engineering roles','private','direct','https://www.cadence.com/en_US/home/company/life-at-cadence/careers.html','P'],
 ['nokia_engineering','nokia','Nokia','Telecommunications, RF and software engineering roles','private','direct','https://www.nokia.com/careers/','P'],
 ['ericsson_engineering','ericsson','Ericsson','Telecommunications, RF and software engineering roles','private','direct','https://www.ericsson.com/en/careers','P'],
 ['arm_engineering','arm','Arm','Semiconductor, embedded and computing engineering roles','private','direct','https://careers.arm.com/','P'],
 ['broadcom_engineering','broadcom','Broadcom','Semiconductor, RF and computing engineering roles','private','direct','https://www.broadcom.com/company/careers','P'],
 ['applied_materials_engineering','applied_materials','Applied Materials','Semiconductor equipment and engineering roles','private','direct','https://www.appliedmaterials.com/us/en/careers.html','P'],
 ['google_hardware','google','Google','Hardware and computing engineering vacancies only','private','direct','https://www.google.com/about/careers/applications/','P']
];
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
const sourceMap=new Map(),organizationMap=new Map();
export const recruitingBodyIdFor=(organizationId,examinationId)=>examinationId==='drdo_rac'?'drdo_rac':examinationId==='drdo_ceptam'?'drdo_ceptam':organizationId==='imd'?'ssc':examinationId==='isro_icrb'?'isro_icrb':organizationId;
function verification(code){return {status:code==='P'?'official_page_checked':code==='I'?'official_search_reference':'unverified',checkedAt:SOURCE_REVIEWED_AT,publishedAt:null,method:code==='P'?'Official public page/PDF read':code==='I'?'Official search-index content; direct extraction incomplete, blocked or JavaScript-dependent':'Potential official portal; review not completed',eligibilityVerified:false};}
export const TECHNICAL_PATHWAYS=freeze(rows.map(([id,organizationId,organization,pathwayTitle,sector,routeType,sourceUrl,review,state])=>{
 let source=sourceMap.get(sourceUrl);
 if(!source){const enabled=review==='P'&&!sourceUrl.toLowerCase().endsWith('.pdf');source={id:organizationId+'_official_'+(sourceMap.size+1),organizationId,organizationIds:[organizationId],name:organization+' official recruitment source',url:sourceUrl,allowedHosts:[new URL(sourceUrl).hostname],official:review==='P',adapter:enabled?'html_links':'manual_review',technicalOnly:true,enabled,checkIntervalHours:24,verification:verification(review),limitations:review==='P'?'Discovery of links only. Each notice and its technical post must be verified before matching or alerts.':'Manual source/adapter review required; no automated extraction success is claimed.'};sourceMap.set(sourceUrl,source);}else if(!source.organizationIds.includes(organizationId))source.organizationIds.push(organizationId);
 if(!organizationMap.has(organizationId))organizationMap.set(organizationId,{id:organizationId,name:organization,sector,states:state?[state]:[],sourceUrl,sourceIds:[source.id],verification:verification(review),currentlyHiring:false});
 const relevance=sector==='state'?['post_specific']:['ECE','EC','ETC'];
 return {id,organizationId,organization,recruitingBodyId:recruitingBodyIdFor(organizationId,id),recruitingBody:id==='drdo_rac'?'DRDO Recruitment and Assessment Centre':id==='drdo_ceptam'?'DRDO Centre for Personnel Talent Management':organizationId==='imd'?'Staff Selection Commission':organization,examinationId:id,examination:pathwayTitle,pathwayTitle,name:pathwayTitle,title:pathwayTitle,sector,routeType,states:state?[state]:[],locations:state?[state]:['India — location depends on the notice'],branches:relevance,technical:true,status:review==='U'?'unverified_source':'historical_watch',sourceIds:[source.id],sourceUrl,verification:verification(review),currentlyHiring:false,eligibilityNote:'Technical posts only. Directory relevance does not establish ECE eligibility or an active vacancy. Check the exact notice, post, degree title, discipline, cycle and other conditions.'};
}));
// Evidence documents are registered separately so a historical seed retains the exact
// source and host that were reviewed. Disabled evidence sources do not claim live polling.
for(const [id,organizationId,url,review] of [
 ['ssc_je_2026_document','ssc','https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_je_2026.pdf','P'],
 ['barc_oces_2026_document','barc','https://www.barc.gov.in/careers/barc_ts_OCES_DGFS_brochure.pdf','P'],
 ['drdo_ceptam11_document','drdo','https://drdo.gov.in/drdo/sites/default/files/vacancy/CEPTAM-11_AdvtEnglish.pdf','P'],
 ['drdo_rac156_document','drdo','https://rac.gov.in/download/advt_156_v3.pdf','I'],
 ['rrb_je_2025_document','rrb','https://www.rrbcdg.gov.in/uploads/2025/05-JE/052025JE-CEN.pdf','I'],
 ['rrb_technician_2025_document','rrb','https://www.rrbcdg.gov.in/uploads/2025/02-TECH/022025-CEN-%E0%A4%B9%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A6%E0%A5%80.pdf','I'],
 ['isro_icrb_2025_document','isro','https://www.isro.gov.in/media_isro/pdf/recruitmentNotice/2025_May/ICRBAdvt_BILINGUAL.pdf','P']
])if(!sourceMap.has(url))sourceMap.set(url,{id,organizationId,organizationIds:[organizationId],name:organizationMap.get(organizationId)?.name+' historical notice evidence',url,allowedHosts:[new URL(url).hostname],official:review==='P',adapter:'manual_review',technicalOnly:true,enabled:false,checkIntervalHours:24,verification:{...verification(review),status:review==='P'?'official_pdf_checked':'official_search_reference'},limitations:review==='P'?'Historical document read; no current vacancy or automatic PDF parsing is asserted.':'Official indexed reference; direct full-document extraction or post review remains incomplete. Not a trusted published-criteria source.'});
// Explicit additional official domains found in consulted notice PDFs, not arbitrary host wildcards.
const extraOfficialHosts=['rrbchennai.gov.in','www.rrbchennai.gov.in','rrb.indianrailways.gov.in','recruit-ndl.nielit.gov.in','www.barc.gov.in','barc.gov.in','www.upsc.gov.in','upsc.gov.in','drdo.gov.in','www.drdo.gov.in','rac.gov.in','www.isro.gov.in','www.rrbcdg.gov.in','ssc.gov.in','www.mahatransco.in','www.keralapsc.gov.in','tnpsc.gov.in'];
export const RECRUITMENT_SOURCES=freeze([...sourceMap.values()]);
export const ORGANIZATIONS=freeze([...organizationMap.values()]);
export const RECRUITING_BODIES=freeze([...ORGANIZATIONS.map(organization=>({id:organization.id,organizationId:organization.id,name:organization.name})),{id:'drdo_rac',organizationId:'drdo',name:'Recruitment and Assessment Centre'},{id:'drdo_ceptam',organizationId:'drdo',name:'Centre for Personnel Talent Management'},{id:'isro_icrb',organizationId:'isro',name:'ISRO Centralised Recruitment Board'}]);
export const EXAMINATIONS=freeze(TECHNICAL_PATHWAYS.map(pathway=>({id:pathway.examinationId,pathwayId:pathway.id,organizationId:pathway.organizationId,recruitingBodyId:pathway.recruitingBodyId,name:pathway.examination,title:pathway.examination,technical:true,routeType:pathway.routeType,status:pathway.status,sourceIds:pathway.sourceIds,sourceUrl:pathway.sourceUrl,eligibilityNote:pathway.eligibilityNote})));
const approvedHosts=new Set([...RECRUITMENT_SOURCES.flatMap(source=>source.allowedHosts),...extraOfficialHosts]);
export function isApprovedRecruitmentUrl(value){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&approvedHosts.has(url.hostname.toLowerCase());}catch{return false;}
}
export function filterPathways({query='',sector='all',routeType='all',organizationId='all',state='all',branch='all',verification='all',status='all'}={}){
 return TECHNICAL_PATHWAYS.filter(pathway=>isTechnicalPathway(pathway)&&(sector==='all'||pathway.sector===sector)&&(routeType==='all'||pathway.routeType===routeType)&&(organizationId==='all'||pathway.organizationId===organizationId)&&(state==='all'||pathway.states.includes(state))&&(branch==='all'||pathway.branches.includes(branch))&&(verification==='all'||pathway.verification.status===verification)&&(status==='all'||pathway.status===status)&&(!query||[pathway.organization,pathway.pathwayTitle,pathway.sector,...pathway.states].join(' ').toLowerCase().includes(String(query).toLowerCase())));
}
