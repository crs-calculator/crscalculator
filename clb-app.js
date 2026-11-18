// CLB calculator page: converts language test scores to CLB/NCLC levels using
// the official IRCC equivalency charts in crs-engine.js. No network calls.
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var ABILITIES = ['listening', 'reading', 'writing', 'speaking'];
  var ABILITY_LABELS = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' };

  var TEST_CONFIG = {
    ielts: { step: '0.5', min: 0, max: 9, placeholders: ['8.0', '7.0', '7.0', '7.0'] },
    celpip: { step: '1', min: 0, max: 12, placeholders: ['10', '10', '10', '10'] },
    pte: { step: '1', min: 10, max: 90, placeholders: ['70', '70', '70', '70'] },
    tef: { step: '1', min: 0, max: 699, placeholders: ['249', '207', '310', '310'] },
    tcf: { step: '1', min: 0, max: 699, placeholders: ['458', '453', '10', '10'] }
  };
  var TCF_WRITING_MAX = 20;

  // First-language CRS points per ability, without a spouse, by CLB level.
  // Source: IRCC CRS criteria page. CLB 4-5: 6, CLB 6: 9, CLB 7: 17, CLB 8: 23, CLB 9: 31, CLB 10: 34.
  function firstLangPointsSingle(clb) {
    if (clb < 4) return 0;
    if (clb <= 5) return 6;
    if (clb === 6) return 9;
    if (clb === 7) return 17;
    if (clb === 8) return 23;
    if (clb === 9) return 31;
    return 34;
  }

  function isFrenchTest(test) { return test === 'tef' || test === 'tcf'; }

  function applyTestConfig() {
    var test = $('clb-test').value;
    var cfg = TEST_CONFIG[test] || TEST_CONFIG.ielts;
    ABILITIES.forEach(function (a, i) {
      var input = $('clb-score-' + a);
      input.step = cfg.step;
      input.min = cfg.min;
      input.max = (test === 'tcf' && (a === 'writing' || a === 'speaking')) ? TCF_WRITING_MAX : cfg.max;
      input.placeholder = 'e.g. ' + cfg.placeholders[i];
    });
    var note = $('clb-note');
    if (test === 'tef') {
      note.textContent = 'Enter the Equivalence ancien score for each ability from your TEF Canada results. Do not use the score out of 699.';
    } else if (test === 'tcf') {
      note.textContent = 'Enter your TCF Canada scores: listening and reading out of 699, writing and speaking out of 20.';
    } else if (test === 'ielts') {
      note.textContent = 'Enter the score for each ability from your Test Report Form. Only IELTS General Training counts, Academic and One Skill Retake do not.';
    } else if (test === 'celpip') {
      note.textContent = 'Enter your CELPIP-General score for each ability. CELPIP scores equal CLB levels one to one. CELPIP-General LS is not accepted for Express Entry.';
    } else {
      note.textContent = 'Enter your PTE Core score for each ability, out of 90. PTE Academic is not accepted for Express Entry.';
    }
  }

  function render() {
    var test = $('clb-test').value;
    var label = isFrenchTest(test) ? 'NCLC' : 'CLB';
    var scores = {};
    var entered = 0;
    ABILITIES.forEach(function (a) {
      var v = $('clb-score-' + a).value;
      scores[a] = v;
      if (v !== '') entered++;
    });
    var clbs = CRS.testScoresToCLB(test, scores);
    var body = $('clb-results-body');
    body.innerHTML = '';
    var totalPoints = 0;
    ABILITIES.forEach(function (a, i) {
      var tr = document.createElement('tr');
      var level = clbs[i];
      var levelText = level >= 4 ? label + ' ' + level : 'Below ' + label + ' 4';
      var pts = firstLangPointsSingle(level);
      totalPoints += pts;
      var scoreText = scores[a] === '' ? 'Not entered' : scores[a];
      tr.innerHTML = '<td>' + ABILITY_LABELS[a] + '</td><td>' + scoreText + '</td><td><strong>' + levelText + '</strong></td><td>' + pts + '</td>';
      body.appendChild(tr);
    });
    $('clb-points-total').textContent = totalPoints;

    var summary = $('clb-summary');
    var minimums = $('clb-minimums');
    if (entered < 4) {
      summary.textContent = 'Enter all four scores to see your levels and the program minimums check.';
      minimums.innerHTML = '';
      return;
    }
    var lowest = Math.min.apply(null, clbs);
    var allAtLeast = function (n) { return clbs.every(function (c) { return c >= n; }); };
    if (lowest < 4) {
      summary.textContent = 'One or more abilities are below ' + label + ' 4. You would not meet the language minimum for any Express Entry program with these scores.';
    } else if (allAtLeast(9)) {
      summary.textContent = 'Your lowest ability is ' + label + ' ' + lowest + '. All four abilities are at ' + label + ' 9 or higher, which unlocks the top skill transferability combinations in the CRS.';
    } else if (allAtLeast(7)) {
      summary.textContent = 'Your lowest ability is ' + label + ' ' + lowest + '. You meet the CLB 7 language minimum for the Federal Skilled Worker Program and for CEC TEER 0 and 1 jobs.';
    } else {
      summary.textContent = 'Your lowest ability is ' + label + ' ' + lowest + '. Check the program minimums below to see which programs these scores meet.';
    }

    var checks = [
      { name: 'Federal Skilled Worker Program: ' + label + ' 7 in all four abilities', pass: allAtLeast(7) },
      { name: 'Canadian Experience Class, TEER 0 or 1 job: ' + label + ' 7 in all four abilities', pass: allAtLeast(7) },
      { name: 'Canadian Experience Class, TEER 2 or 3 job: ' + label + ' 5 in all four abilities', pass: allAtLeast(5) },
      { name: 'Federal Skilled Trades Program: ' + label + ' 5 in speaking and listening, ' + label + ' 4 in reading and writing', pass: clbs[0] >= 5 && clbs[3] >= 5 && clbs[1] >= 4 && clbs[2] >= 4 }
    ];
    minimums.innerHTML = checks.map(function (c) {
      return '<li>' + (c.pass ? 'Yes: ' : 'No: ') + c.name + '</li>';
    }).join('');
  }

  $('clb-test').addEventListener('change', function () { applyTestConfig(); render(); });
  ['listening', 'reading', 'writing', 'speaking'].forEach(function (a) {
    $('clb-score-' + a).addEventListener('input', render);
  });

  applyTestConfig();
  render();
})();
