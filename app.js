// Calculator page wiring: reads the form, runs CRS.calculateCRS, renders the result.
// No network calls, no storage. All data stays in the browser.
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var ABILITIES = ['listening', 'reading', 'writing', 'speaking'];
  var ABILITY_LABELS = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' };

  // Test input configuration per test type.
  var TEST_CONFIG = {
    ielts: { step: '0.5', min: 0, max: 9, placeholders: ['8.0', '7.0', '7.0', '7.0'] },
    celpip: { step: '1', min: 0, max: 12, placeholders: ['10', '10', '10', '10'] },
    pte: { step: '1', min: 10, max: 90, placeholders: ['70', '70', '70', '70'] },
    tef: { step: '1', min: 0, max: 699, placeholders: ['249', '207', '310', '310'] },
    tcf: { step: '1', min: 0, max: 699, placeholders: ['458', '453', '10', '10'] }
  };
  var TCF_WRITING_MAX = 20;

  function buildClbSelect(select) {
    var opts = [{ v: 0, label: 'Below CLB 4' }];
    for (var c = 4; c <= 10; c++) opts.push({ v: c, label: 'CLB ' + c });
    opts.forEach(function (o) {
      var el = document.createElement('option');
      el.value = o.v;
      el.textContent = o.label;
      select.appendChild(el);
    });
    select.value = '7';
  }

  ABILITIES.forEach(function (a) {
    buildClbSelect($('clb-' + a));
    buildClbSelect($('clb2-' + a));
    buildClbSelect($('spouse-clb-' + a));
  });

  function applyTestConfig() {
    var test = $('langTest').value;
    var cfg = TEST_CONFIG[test] || TEST_CONFIG.ielts;
    ABILITIES.forEach(function (a, i) {
      var input = $('score-' + a);
      input.step = cfg.step;
      input.min = cfg.min;
      input.max = (test === 'tcf' && (a === 'writing' || a === 'speaking')) ? TCF_WRITING_MAX : cfg.max;
      input.placeholder = 'e.g. ' + cfg.placeholders[i];
    });
    var note = $('test-note');
    if (test === 'tef') {
      note.textContent = 'Enter the Equivalence ancien score for each ability from your TEF Canada results. Do not use the score out of 699.';
    } else if (test === 'tcf') {
      note.textContent = 'Enter your TCF Canada scores: listening and reading out of 699, writing and speaking out of 20.';
    } else if (test === 'ielts') {
      note.textContent = 'Enter the score for each ability from your Test Report Form. Only IELTS General Training counts, Academic and One Skill Retake do not.';
    } else {
      note.textContent = 'Enter the score for each ability from your test results.';
    }
  }

  function firstLangClb() {
    var mode = document.querySelector('input[name="langMode"]:checked').value;
    if (mode === 'clb') {
      return ABILITIES.map(function (a) { return parseInt($('clb-' + a).value, 10) || 0; });
    }
    var test = $('langTest').value;
    var scores = {};
    ABILITIES.forEach(function (a) { scores[a] = $('score-' + a).value; });
    return CRS.testScoresToCLB(test, scores);
  }

  function renderClbReadout(clbs) {
    var wrap = $('clb-readout');
    var mode = document.querySelector('input[name="langMode"]:checked').value;
    if (mode !== 'test') { wrap.innerHTML = ''; return; }
    var test = $('langTest').value;
    var entered = ABILITIES.some(function (a) { return $('score-' + a).value !== ''; });
    if (!entered) {
      wrap.innerHTML = '<span class="clb-chip">Enter your test scores to see your CLB levels.</span>';
      return;
    }
    wrap.innerHTML = ABILITIES.map(function (a, i) {
      var level = clbs[i];
      var label = level >= 4 ? 'CLB ' + level : 'Below CLB 4';
      var isFrench = (test === 'tef' || test === 'tcf');
      if (level >= 4 && isFrench) label = 'NCLC ' + level;
      return '<span class="clb-chip">' + ABILITY_LABELS[a] + ': <b>' + label + '</b></span>';
    }).join('');
  }

  function collectInput() {
    var marital = document.querySelector('input[name="marital"]:checked').value;
    var withSpouse = marital === 'with_spouse';
    var input = {
      withSpouse: withSpouse,
      age: parseInt($('age').value, 10),
      education: $('education').value,
      firstLangCLB: firstLangClb(),
      secondLangCLB: null,
      canWorkYears: parseInt($('can-work').value, 10),
      highWageTier: $('has-highwage').checked ? parseFloat($('highwage-tier').value) : 0,
      jobOfferTier: parseFloat($('job-offer').value),
      foreignWorkYears: parseInt($('foreign-work').value, 10),
      certificate: $('certificate').checked,
      spouse: null,
      sibling: $('sibling').checked,
      frenchBonus: parseInt($('french-bonus').value, 10),
      canEducation: $('can-edu').value,
      pnp: $('pnp').checked
    };
    if ($('has-second').checked) {
      input.secondLangCLB = ABILITIES.map(function (a) { return parseInt($('clb2-' + a).value, 10) || 0; });
    }
    if (withSpouse) {
      input.spouse = {
        education: $('spouse-education').value,
        langCLB: ABILITIES.map(function (a) { return parseInt($('spouse-clb-' + a).value, 10) || 0; }),
        canWorkYears: parseInt($('spouse-work').value, 10)
      };
    }
    return input;
  }

  function render(result, withSpouse) {
    $('score-total').textContent = result.total;
    var maxCore = withSpouse ? 530 : 570;
    $('max-core').textContent = maxCore;
    $('val-core').textContent = result.core;
    $('val-spouse').textContent = result.spouse;
    $('val-skill').textContent = result.skill;
    $('val-additional').textContent = result.additional;
    $('bar-core').style.width = Math.round(result.core / maxCore * 100) + '%';
    $('bar-spouse').style.width = Math.round(result.spouse / 40 * 100) + '%';
    $('bar-skill').style.width = Math.round(result.skill / 100 * 100) + '%';
    $('bar-additional').style.width = Math.round(result.additional / 600 * 100) + '%';

    var b = result.breakdown;
    var rows = [
      ['Age', b.age],
      ['Education', b.education],
      ['First language', b.firstLanguage],
      ['Second language', b.secondLanguage],
      ['Labour Market Integration (' + (b.lmi.route === 'work' ? 'work route' : 'job offer route') + ')', b.lmi.total]
    ];
    if (withSpouse) rows.push(['Spouse factors', b.spouse.total]);
    rows.push(['Skill transferability', b.skillTransferability.total]);
    rows.push(['Additional points', b.additional.total]);
    $('breakdown-rows').innerHTML = rows.map(function (r) {
      return '<div class="bd-row"><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
    }).join('');
  }

  function recalc() {
    var input = collectInput();
    renderClbReadout(input.firstLangCLB);
    render(CRS.calculateCRS(input), input.withSpouse);
  }

  // Visibility toggles.
  function syncVisibility() {
    var mode = document.querySelector('input[name="langMode"]:checked').value;
    $('test-mode').classList.toggle('hidden', mode !== 'test');
    $('clb-mode').classList.toggle('hidden', mode !== 'clb');
    $('second-lang-section').classList.toggle('hidden', !$('has-second').checked);
    $('highwage-tier-wrap').classList.toggle('hidden', !$('has-highwage').checked);
    var marital = document.querySelector('input[name="marital"]:checked').value;
    $('spouse-section').classList.toggle('hidden', marital !== 'with_spouse');
  }

  // NOC lookup.
  var TIER_LABELS = {
    2: '2x tier: at least twice the average median wage',
    1.5: '1.5x tier: at least 1.5 times the average median wage',
    1.3: '1.3x tier: at least 1.3 times the average median wage'
  };

  function renderNocResults(matches, query) {
    var list = $('noc-results');
    if (query.length < 2) {
      list.innerHTML = '<li class="noc-empty">Type at least 2 characters to search all 186 high-wage occupations.</li>';
      return;
    }
    if (matches.length === 0) {
      list.innerHTML = '<li class="noc-empty">No occupations match. Try a different job title or NOC code. If your occupation is not listed, it is not on the high-wage list.</li>';
      return;
    }
    list.innerHTML = '';
    matches.slice(0, 8).forEach(function (n) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = '<span class="noc-tier' + (n.tier === 2 ? ' t2' : '') + '">' + n.tier + 'x</span>' +
        '<span class="noc-code">NOC ' + n.code + '</span> ' + n.title;
      btn.setAttribute('aria-label', 'Select NOC ' + n.code + ' ' + n.title + ', tier ' + n.tier + 'x');
      btn.addEventListener('click', function () { selectNoc(n); });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function selectNoc(n) {
    $('has-highwage').checked = true;
    $('highwage-tier').value = String(n.tier);
    var note = $('noc-selected');
    note.classList.remove('hidden');
    note.textContent = 'Selected: NOC ' + n.code + ', ' + n.title + ' (' + TIER_LABELS[n.tier] + '). The high-wage tier in the calculator is now set to ' + n.tier + 'x. Check the 12+ months box requirement above: the bonus needs at least 12 months in a high-wage occupation.';
    syncVisibility();
    recalc();
    document.getElementById('calculator').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('noc-search').addEventListener('input', function () {
    var q = this.value.trim().toLowerCase();
    var matches = [];
    if (q.length >= 2) {
      matches = HIGH_WAGE_NOCS.filter(function (n) {
        return n.code.indexOf(q) !== -1 || n.title.toLowerCase().indexOf(q) !== -1;
      });
    }
    renderNocResults(matches, q);
  });

  // Events.
  $('crs-form').addEventListener('input', function () { syncVisibility(); recalc(); });
  $('crs-form').addEventListener('change', function () { syncVisibility(); recalc(); });
  $('langTest').addEventListener('change', applyTestConfig);

  // Init.
  applyTestConfig();
  renderNocResults([], '');
  syncVisibility();
  recalc();
})();
