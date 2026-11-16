/* Adapted from the user-supplied donor predictor. Center calculations retained; sensitivity endpoint bug corrected. */


const categoryLabels                         = { GEN: "General", GEN_EWS: "EWS", OBC_NCL: "OBC-NCL", SC: "SC", ST: "ST" };

function yearOf(years              , year        ) {
  return years.find((item) => Number(item.year) === Number(year));
}

function binPercentileBelow(year            , marks        ) {
  const bins = year.appeared_marks_distribution_bins                                                ;
  const m = Math.max(bins[0].range[0], Math.min(bins[bins.length - 1].range[1], marks));
  let index = bins.findIndex((bin) => m >= bin.range[0] && m < bin.range[1]);
  if (index < 0) index = bins.length - 1;
  const target = bins[index];
  const below = bins.slice(0, index).reduce((sum, bin) => sum + bin.count, 0);
  const fraction = (m - target.range[0]) / Math.max(1, target.range[1] - target.range[0]);
  return ((below + target.count * fraction) / year.appeared) * 100;
}

function binRank(year            , marks        ) {
  return Math.min(year.appeared, Math.max(1, Math.round(year.appeared * (1 - binPercentileBelow(year, marks) / 100)) + 1));
}

function referenceFor(years              , year            ) {
  return years.find((item) => item.appeared_marks_distribution_bins && item.difficulty === year.difficulty) ?? years.find((item) => Number(item.year) === 2025) ;
}

function anchorRank(years              , year            , marks        ) {
  if (marks <= 0) return year.appeared;
  if (marks >= year.air1_marks) return 1;
  const reference = referenceFor(years, year);
  const referenceCutoffPercentile = binPercentileBelow(reference, reference.cutoff_general);
  const anchors = []                                                             ;
  if (year.cutoff_general > 25.001) anchors.push({ m: year.cutoff_general, survival: 1 - referenceCutoffPercentile / 100, referenceMark: reference.cutoff_general });
  anchors.push({ m: year.percentile_95, survival: 0.05 }, { m: year.percentile_99, survival: 0.01 }, { m: year.percentile_99_9, survival: 0.001 }, { m: year.air1_marks, survival: 1 / year.appeared });
  anchors.sort((a, b) => a.m - b.m);
  anchors.forEach((item, index) => { if (index && item.m <= anchors[index - 1].m) item.m = anchors[index - 1].m + 0.01; });
  if (marks <= anchors[0].m) {
    const scaledMark = (anchors[0].referenceMark ?? reference.cutoff_general) * (marks / anchors[0].m);
    return Math.min(year.appeared, Math.max(1, Math.round(year.appeared * (1 - binPercentileBelow(reference, scaledMark) / 100)) + 1));
  }
  let survival = anchors[anchors.length - 1].survival;
  for (let index = 1; index < anchors.length; index += 1) {
    if (marks <= anchors[index].m) {
      const left = anchors[index - 1];
      const right = anchors[index];
      const ratio = (marks - left.m) / (right.m - left.m);
      survival = Math.exp(Math.log(left.survival) + ratio * (Math.log(right.survival) - Math.log(left.survival)));
      break;
    }
  }
  return Math.min(year.appeared, Math.max(1, Math.round(year.appeared * survival) + 1));
}

function confidenceFor(year            , marks        , exact         )                                      {
  if (year.is_hypothetical) return { label: "hypothetical", note: year.scenario_note ?? "Future what-if scenario; not a forecast." };
  if (exact) return { label: "verified", note: year.air1_marks - marks < 3 ? "Verified distribution data; sparse top-range results remain sensitive to small mark changes." : "Verified official distribution data for this year." };
  return { label: "unverified", note: marks <= year.percentile_95 ? "Historical anchor estimate that inherits the confidence of its source anchors." : "Upper-tail historical anchor estimate; treat this as an evidence-limited range, not an official result." };
}

function interpolateCurve(curve     , marks        ) {
  if (marks < curve.supported_marks.minimum || marks > curve.supported_marks.maximum) return null;
  const points = curve.curve_points                                    ;
  const exact = points.find((point) => point.marks === marks);
  if (exact) return exact.air;
  const rightIndex = points.findIndex((point) => point.marks > marks);
  const left = points[rightIndex - 1];
  const right = points[rightIndex];
  return left.air + ((marks - left.marks) / (right.marks - left.marks)) * (right.air - left.air);
}

export function donorPredictRank(input                                                                       , gateData     , curve2026     ) {
  const years = gateData.years_data                ;
  const year = yearOf(years, input.year);
  if (!year) throw new Error("The requested GATE EC year is unavailable.");
  if (!Number.isFinite(input.marks) || input.marks < -20 || input.marks > 100) throw new Error("Marks must be between -20 and 100.");
  let rank        ;
  let lowRank        ;
  let highRank        ;
  let method        ;
  let confidence                                     ;
  let scenarioDisclosure                    ;
  if (input.year === 2026) {
    const current = interpolateCurve(curve2026, input.marks);
    if (current === null) throw new Error(`The 2026 reconstructed curve supports marks from ${curve2026.supported_marks.minimum} to ${curve2026.supported_marks.maximum}.`);
    rank = Math.round(current);
    lowRank = Math.round(interpolateCurve(curve2026, Math.min(curve2026.supported_marks.maximum, input.marks + 0.75)) );
    highRank = Math.round(interpolateCurve(curve2026, Math.max(curve2026.supported_marks.minimum, input.marks - 0.75)) );
    method = "2026 reconstructed external curve";
    confidence = { label: "unverified", note: curve2026.disclosure };
  } else {
    const exact = Boolean(year.appeared_marks_distribution_bins);
    const adjustedMarks = input.year === 2027 ? Math.max(0, Math.min(100, input.marks + (Number(input.toughness ?? 0) * 2.63))) : input.marks;
    const rankFor = (marks        ) => exact ? binRank(year, marks) : anchorRank(years, year, marks);
    rank = rankFor(adjustedMarks);
    lowRank = rankFor(Math.min(100, adjustedMarks + 0.75));
    highRank = rankFor(Math.max(-20, adjustedMarks - 0.75));
    method = exact ? "verified distribution interpolation" : "difficulty-matched historical anchor model";
    confidence = confidenceFor(year, adjustedMarks, exact);
    if (input.year === 2027) scenarioDisclosure = "The paper-toughness control is a bounded hypothetical scenario. It is not a forecast.";
  }
  const categoryCutoff = input.category === "GEN" ? year.cutoff_general : ["GEN_EWS", "OBC_NCL"].includes(input.category) ? year.cutoff_obc : year.cutoff_sc_st;
  const score = estimateScore(input.marks, year, years);
  return {
    marks: input.marks, year: input.year, category: input.category, categoryLabel: categoryLabels[input.category] ?? input.category,
    rank, lowRank, highRank, score: score.score, scoreConfidence: score.confidence, method, confidence: confidence.label, confidenceNote: confidence.note,
    categoryCutoff, qualifies: input.marks >= categoryCutoff, cutoffConfidence: year.cutoff_confidence ?? confidence.label,
    difficulty: year.difficulty, scenarioDisclosure,
  };
}

function estimateScore(marks        , year            , years              ) {
  const reference = referenceFor(years, year);
  const m0 = year.official_summary?.mean_marks_top_0_1_percent ?? year.air1_marks * ((reference.official_summary?.mean_marks_top_0_1_percent ?? reference.air1_marks * 0.8) / reference.air1_marks);
  const score = marks <= 0 ? 0 : marks <= year.cutoff_general ? 350 * marks / year.cutoff_general : marks <= m0 ? 350 + 550 * (marks - year.cutoff_general) / Math.max(.01, m0 - year.cutoff_general) : 900 + 100 * Math.min(1.15, (marks - m0) / Math.max(.01, year.air1_marks - m0));
  return { score: Math.round(Math.max(0, Math.min(1000, score))), confidence: year.official_summary ? "verified"               : "unverified"               };
}

export function admissionOutcomes(rank        , gateData     ) {
  const tiers = [
    { key: "iit_top", name: "IISc / IIT — top tier", family: "IIT", examples: ["IISc Bengaluru", "IIT Bombay", "IIT Delhi", "IIT Madras"] },
    { key: "iit_old", name: "IIT — established tier", family: "IIT", examples: ["IIT Kanpur", "IIT Kharagpur", "IIT Roorkee", "IIT Guwahati"] },
    { key: "iit_new", name: "IIT — newer tier", family: "IIT", examples: ["IIT Hyderabad", "IIT Indore", "IIT Patna"] },
    { key: "nit_top", name: "NIT — top tier", family: "NIT", examples: ["NIT Trichy", "NIT Surathkal", "NIT Warangal"] },
    { key: "nit_good", name: "NIT — strong tier", family: "NIT", examples: ["NIT Rourkela", "NIT Calicut", "MNNIT Allahabad"] },
    { key: "nit_general", name: "NIT / IIEST — wider option set", family: "NIT", examples: ["IIEST Shibpur", "Newer NIT programmes"] },
    { key: "iiit", name: "IIIT programmes", family: "IIIT", examples: ["Source-specific cutoff data not supplied"] },
  ];
  return tiers.map((tier) => {
    const benchmark = gateData.admission_benchmarks[tier.key];
    if (!benchmark) return { ...tier, status: "data needed", confidence: "unverified"              , note: "No institute-specific IIIT cutoff values were supplied, so the platform intentionally does not invent an admission result." };
    const range = benchmark.air.startsWith("<") ? [1, Number(benchmark.air.slice(1)) - 1] : benchmark.air.split("-").map(Number);
    const status = rank < range[0] ? "above benchmark" : rank <= range[1] ? "within benchmark" : rank <= range[1] * 1.3 ? "near benchmark" : "outside benchmark";
    const scopeNote = tier.family === "NIT" ? "No reviewed NIT branch-level CCMT extract is loaded; this is a tier benchmark only, not a branch-level cutoff comparison." : "Historical benchmark from the supplied prototype; admission depends on programme, category, round, eligibility and seat availability.";
    return { ...tier, status, benchmark, confidence: "unverified"              , note: scopeNote };
  });
}
