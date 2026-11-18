// CRS scoring engine: IRCC Comprehensive Ranking System rules in effect 3 Nov 2026.
// Source: IRCC CRS criteria page, 2026 changes page, high-wage occupations list and
// language test results page, all read from canada.ca on 17 Nov 2026.
// See crs-scoring-tables.md for the full reference. Pure functions, no DOM access.
// Works in the browser and under Node for testing.
(function (global) {
  'use strict';

  // Age points: [with spouse, without spouse]. Ages 17 or less and 45 or more score 0.
  var AGE = {
    18: [90, 99], 19: [95, 105], 20: [100, 110], 21: [100, 110], 22: [100, 110],
    23: [100, 110], 24: [100, 110], 25: [100, 110], 26: [100, 110], 27: [100, 110],
    28: [100, 110], 29: [100, 110], 30: [95, 105], 31: [90, 99], 32: [85, 94],
    33: [80, 88], 34: [75, 83], 35: [70, 77], 36: [65, 72], 37: [60, 66],
    38: [55, 61], 39: [50, 55], 40: [45, 50], 41: [35, 39], 42: [25, 28],
    43: [15, 17], 44: [5, 6]
  };

  // Education levels: [with spouse, without spouse, skill-transferability category]
  // category: 0 = secondary or less, 1 = post-secondary credential of 1+ year,
  // 2 = two or more credentials / master's / professional / doctoral.
  var EDUCATION = {
    less_secondary: [0, 0, 0],
    secondary: [28, 30, 0],
    one_year: [84, 90, 1],
    two_year: [91, 98, 1],
    bachelor: [112, 120, 1],
    two_or_more: [119, 128, 2],
    master: [126, 135, 2],
    phd: [140, 150, 2]
  };

  // First official language, points per ability by CLB level: [with spouse, without spouse]
  function firstLangAbilityPoints(clb, withSpouse) {
    var i = withSpouse ? 0 : 1;
    if (clb < 4) return 0;
    if (clb <= 5) return 6;
    if (clb === 6) return [8, 9][i];
    if (clb === 7) return [16, 17][i];
    if (clb === 8) return [22, 23][i];
    if (clb === 9) return [29, 31][i];
    return [32, 34][i]; // CLB 10 or more
  }

  // Second official language, points per ability. Combined cap 22 / 24.
  function secondLangAbilityPoints(clb) {
    if (clb <= 4) return 0;
    if (clb <= 6) return 1;
    if (clb <= 8) return 3;
    return 6;
  }

  // Canadian work experience, work-length points, by years index 0..5 (5 = 5 or more).
  var WORK_LENGTH = { spouse: [0, 35, 46, 56, 63, 70], single: [0, 40, 53, 64, 72, 80] };

  // High-wage bonus (needs 12+ months in high-wage occupations) and job offer points by tier.
  var HIGH_WAGE_BONUS = { 0: 0, 1.3: 20, 1.5: 40, 2: 70 };
  var JOB_OFFER = { 0: 0, 1.3: 50, 1.5: 70, 2: 100 };

  // Spouse education points by level key.
  var SPOUSE_EDU = {
    less_secondary: 0, secondary: 2, one_year: 6, two_year: 7,
    bachelor: 8, two_or_more: 9, master: 10, phd: 10
  };

  // Spouse language, points per ability.
  function spouseLangAbilityPoints(clb) {
    if (clb <= 4) return 0;
    if (clb <= 6) return 1;
    if (clb <= 8) return 3;
    return 5;
  }

  var SPOUSE_WORK = [0, 5, 7, 8, 9, 10]; // by years index 0..5

  // CLB conversion: lowest test score reaching CLB 4..10, per ability.
  // Ability order: listening, reading, writing, speaking.
  var CLB_THRESHOLDS = {
    ielts: {
      listening: [4.5, 5, 5.5, 6, 7.5, 8, 8.5],
      reading: [3.5, 4, 5, 6, 6.5, 7, 8],
      writing: [4, 5, 5.5, 6, 6.5, 7, 7.5],
      speaking: [4, 5, 5.5, 6, 6.5, 7, 7.5]
    },
    celpip: {
      listening: [4, 5, 6, 7, 8, 9, 10],
      reading: [4, 5, 6, 7, 8, 9, 10],
      writing: [4, 5, 6, 7, 8, 9, 10],
      speaking: [4, 5, 6, 7, 8, 9, 10]
    },
    pte: {
      listening: [28, 39, 50, 60, 71, 82, 89],
      reading: [33, 42, 51, 60, 69, 78, 88],
      writing: [41, 51, 60, 69, 79, 88, 90],
      speaking: [42, 51, 59, 68, 76, 84, 89]
    },
    tef: { // TEF Canada, "Equivalence ancien score" column only
      listening: [145, 181, 217, 249, 280, 298, 316],
      reading: [121, 151, 181, 207, 233, 248, 263],
      writing: [181, 226, 271, 310, 349, 371, 393],
      speaking: [181, 226, 271, 310, 349, 371, 393]
    },
    tcf: { // TCF Canada: listening/reading out of 699, writing/speaking out of 20
      listening: [331, 369, 398, 458, 503, 523, 549],
      reading: [342, 375, 406, 453, 499, 524, 549],
      writing: [4, 6, 7, 10, 12, 14, 16],
      speaking: [4, 6, 7, 10, 12, 14, 16]
    }
  };

  var ABILITIES = ['listening', 'reading', 'writing', 'speaking'];

  // Convert one test score to a CLB/NCLC level (0 = below CLB 4). A score between
  // two rows counts as the lower row.
  function scoreToCLB(test, ability, score) {
    var t = CLB_THRESHOLDS[test];
    if (!t) return 0;
    var mins = t[ability];
    if (!mins) return 0;
    var s = Number(score);
    if (isNaN(s)) return 0;
    var level = 0;
    for (var k = 0; k < mins.length; k++) {
      if (s >= mins[k]) level = 4 + k;
    }
    return level;
  }

  function testScoresToCLB(test, scores) {
    // scores: {listening, reading, writing, speaking} raw test scores.
    // Returns [listening, reading, writing, speaking] CLB levels.
    return ABILITIES.map(function (a) { return scoreToCLB(test, a, scores[a]); });
  }

  function clampInt(v, lo, hi, fallback) {
    var n = parseInt(v, 10);
    if (isNaN(n)) return fallback;
    if (n < lo) return lo;
    if (n > hi) return hi;
    return n;
  }

  function sum(arr) {
    return arr.reduce(function (a, b) { return a + b; }, 0);
  }

  function minClb(clbs) {
    return Math.min.apply(null, clbs);
  }

  function calculateCRS(input) {
    var withSpouse = !!input.withSpouse;
    var col = withSpouse ? 0 : 1; // 0 = with spouse column, 1 = single column

    // A. Core
    var agePts = (AGE[clampInt(input.age, 0, 120, 0)] || [0, 0])[col];
    var edu = EDUCATION[input.education] || EDUCATION.less_secondary;
    var eduPts = edu[col];
    var eduCat = edu[2];

    var firstClb = (input.firstLangCLB || [0, 0, 0, 0]).map(function (c) { return clampInt(c, 0, 10, 0); });
    var firstLangPts = sum(firstClb.map(function (c) { return firstLangAbilityPoints(c, withSpouse); }));

    var secondClb = input.secondLangCLB || null;
    var secondLangPts = 0;
    if (secondClb) {
      secondLangPts = Math.min(
        withSpouse ? 22 : 24,
        sum(secondClb.map(function (c) { return secondLangAbilityPoints(clampInt(c, 0, 10, 0)); }))
      );
    }

    // Labour Market Integration: max of work route and job offer route.
    var canYears = clampInt(input.canWorkYears, 0, 5, 0);
    var workLength = WORK_LENGTH[withSpouse ? 'spouse' : 'single'][canYears];
    var bonus = HIGH_WAGE_BONUS[input.highWageTier] || 0;
    var workRoute = workLength + bonus;
    var offerPts = JOB_OFFER[input.jobOfferTier] || 0;
    var lmiCap = withSpouse ? 140 : 150;
    var lmiPts = Math.min(lmiCap, Math.max(workRoute, offerPts));
    var lmiRoute = workRoute >= offerPts ? 'work' : 'offer';

    var core = agePts + eduPts + firstLangPts + secondLangPts + lmiPts;

    // B. Spouse factors
    var spouseDetail = { education: 0, language: 0, work: 0, total: 0 };
    if (withSpouse && input.spouse) {
      spouseDetail.education = SPOUSE_EDU[input.spouse.education] || 0;
      var sClb = (input.spouse.langCLB || [0, 0, 0, 0]).map(function (c) { return clampInt(c, 0, 10, 0); });
      spouseDetail.language = Math.min(20, sum(sClb.map(spouseLangAbilityPoints)));
      spouseDetail.work = SPOUSE_WORK[clampInt(input.spouse.canWorkYears, 0, 5, 0)];
      spouseDetail.total = Math.min(40, spouseDetail.education + spouseDetail.language + spouseDetail.work);
    }

    // C. Skill transferability. Within each sub-factor take the higher variant,
    // each capped at 50, total capped at 100. Rules unchanged by the Nov 2026 change.
    var minFirst = minClb(firstClb);
    var foreign = clampInt(input.foreignWorkYears, 0, 2, 0); // 0 none, 1 = 1-2 yrs, 2 = 3+ yrs

    var eduLang = 0, eduWork = 0;
    if (eduCat > 0) {
      if (minFirst >= 9) { eduLang = eduCat === 1 ? 25 : 50; }
      else if (minFirst >= 7) { eduLang = eduCat === 1 ? 13 : 25; }
      if (canYears >= 2) { eduWork = eduCat === 1 ? 25 : 50; }
      else if (canYears >= 1) { eduWork = eduCat === 1 ? 13 : 25; }
    }
    var eduCombo = Math.min(50, Math.max(eduLang, eduWork));

    var foreignLang = 0, foreignWork = 0;
    if (foreign === 1) {
      if (minFirst >= 9) foreignLang = 25;
      else if (minFirst >= 7) foreignLang = 13;
      if (canYears >= 2) foreignWork = 25;
      else if (canYears >= 1) foreignWork = 13;
    } else if (foreign === 2) {
      if (minFirst >= 9) foreignLang = 50;
      else if (minFirst >= 7) foreignLang = 25;
      if (canYears >= 2) foreignWork = 50;
      else if (canYears >= 1) foreignWork = 25;
    }
    var foreignCombo = Math.min(50, Math.max(foreignLang, foreignWork));

    var certCombo = 0;
    if (input.certificate) {
      if (minFirst >= 7) certCombo = 50;
      else if (minFirst >= 5) certCombo = 25;
    }
    var skill = Math.min(100, eduCombo + foreignCombo + certCombo);

    // D. Additional points, capped at 600.
    var siblingPts = input.sibling ? 15 : 0;
    var frenchPts = [0, 25, 50].indexOf(input.frenchBonus) >= 0 ? input.frenchBonus : 0;
    var canEduPts = input.canEducation === '3_plus' ? 30 : (input.canEducation === '1_2' ? 15 : 0);
    var pnpPts = input.pnp ? 600 : 0;
    var additional = Math.min(600, siblingPts + frenchPts + canEduPts + pnpPts);

    var total = core + spouseDetail.total + skill + additional;

    return {
      total: total,
      core: core,
      spouse: spouseDetail.total,
      skill: skill,
      additional: additional,
      breakdown: {
        age: agePts,
        education: eduPts,
        firstLanguage: firstLangPts,
        secondLanguage: secondLangPts,
        lmi: { workLength: workLength, highWageBonus: bonus, jobOffer: offerPts, route: lmiRoute, total: lmiPts },
        spouse: spouseDetail,
        skillTransferability: { education: eduCombo, foreignWork: foreignCombo, certificate: certCombo, total: skill },
        additional: { sibling: siblingPts, french: frenchPts, canadianEducation: canEduPts, pnp: pnpPts, total: additional }
      }
    };
  }

  var CRS = {
    calculateCRS: calculateCRS,
    scoreToCLB: scoreToCLB,
    testScoresToCLB: testScoresToCLB,
    ABILITIES: ABILITIES,
    MAX_SCORE: 1270
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CRS;
  } else {
    global.CRS = CRS;
  }
})(typeof window !== 'undefined' ? window : this);
