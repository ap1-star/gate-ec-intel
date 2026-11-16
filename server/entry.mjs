import assets from 'terminal-static-assets';
import research from '../src/domains/pyq/catalogue.json';
import {predictRank,CAREER_DATA_VERSION} from '../src/domains/career/index.mjs';
import {ORGANIZATIONS,RECRUITING_BODIES,RECRUITMENT_CYCLES,TECHNICAL_PATHWAYS,RECRUITMENT_SOURCES,RECRUITMENT_NOTICES,evaluateTechnicalEligibility} from '../src/domains/recruitment/index.mjs';
import {createHostedWorker} from './hosted-worker.mjs';
export default createHostedWorker({assets,research,predictRank,careerDataVersion:CAREER_DATA_VERSION,evaluateTechnicalEligibility,catalogue:{organizations:ORGANIZATIONS,recruitingBodies:RECRUITING_BODIES,cycles:RECRUITMENT_CYCLES,examinations:TECHNICAL_PATHWAYS,pathways:TECHNICAL_PATHWAYS,sources:RECRUITMENT_SOURCES,notices:RECRUITMENT_NOTICES}});
