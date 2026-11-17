# Combined admissions and career atlas

Score Line and GATE Seat Map are imported as public evidence snapshots at the site owner's explicit request. The original 520-question research corpus and prior reference tools remain available. The new **Programme Atlas** combines programme discovery, round history, qualification mapping, placements, companies, official GATE statistics, historical PSU references, BITS reported ranges and a source library.

The imported raw tables contain 56,065 CCMT observations and 30,616 IIT/IISc/other admission observations from Score Line, plus 34,433 CCMT round pairs from Seat Map. These overlap. Exact matching contexts with equal overlapping scores are combined and both provenances retained; 891 exact repeats inside Score Line are removed from the display histories. Thirty disagreeing contexts remain as separate conflicting records. Names or eligibility are never merged by fuzzy matching. The resulting 54,307 displayed admission records are source contexts across years/categories/stages, not 54,307 distinct programmes or current vacancies.

Other datasets contain 11,391 placement observations, 19,516 company evidence lines covering 4,536 source company IDs, 178 GATE paper/year reports, 3,644 PSU cutoff observations and 213 BITS aggregate rows. Placement metrics retain salary definition, programme scope and source kind. Company offers are not added across potentially overlapping documents. BITS ranges are candidate-reported; 77 all-iteration aggregates overlap the round observations. Scores, marks, AIR, composite values and other units remain distinct.

Seat Map supplies 842 real CCMT programme groups at 84 institutes, with 530 qualifying-degree labels and 30 GATE papers. A raw Total Seats summary row is quarantined so seats are not doubled. The supplied 2026 matrix totals 13,759 seats across categories, not currently available seats. At degree code 178 (T135, B.Tech ECE), paper EC and General category, the mapping lists 273 programme groups with 1,743 matrix seats; 267 groups have numeric cutoff evidence and cover 1,705 seats. The other six groups have no supplied 2026 cutoff. The 2026 mapping does not prove eligibility for older or future cycles.

Documents remain linked to their published originals and imported copies. PDF files are not bulk mirrored. No independent document-by-document transcription audit or nationwide completeness certification is claimed. No public source license was declared by the imported projects; user ownership/authorization is the reuse basis. Original project attribution is retained in the source library and provenance manifests.

## Build and refresh

`npm run build` regenerates canonical chunks entirely offline from the bundled JSON snapshots. The application fetches only the requested workspace's versioned chunks. Railway serves these public files with cached gzip compression; Netlify/Vercel use their static delivery. The deployment has no runtime dependency on either donor website for data browsing. Original document links still require their source hosts.

Acquisition is separate: `node scripts/import-scoreline.mjs` and `node scripts/import-seatmap.mjs --refresh` download the public source snapshots when deliberately run. Inspect the new manifests and changes before release. Dataset downloads are not an automatic update service.

The original video asset is audit material and is excluded from Git/source ZIPs. `youtube-public.json` preserves all extracted evidence rows but removes the 136 unnecessary commenter author/text records. It records the original asset hash and the publication transformation. No individual BITS applicant rows are acquired.

See `research/COMBINED_ATLAS_REPORT.json` for exact counts, release version, chunk sizes and hashes; `research/imported/*/manifest.json` and schema notes retain acquisition provenance. CSV downloads preserve original units and source IDs; formula prefixes are escaped.
