// NOC high-wage lookup page: renders the full 186-code IRCC list from
// noc-data.js with search and tier filtering. No network calls.
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var activeTier = 'all';

  var sorted = HIGH_WAGE_NOCS.slice().sort(function (a, b) {
    return a.code < b.code ? -1 : (a.code > b.code ? 1 : 0);
  });

  function tierLabel(tier) {
    return tier === 2 ? '2x' : (tier === 1.5 ? '1.5x' : '1.3x');
  }

  function render() {
    var q = $('noc-page-search').value.trim().toLowerCase();
    var matches = sorted.filter(function (n) {
      if (activeTier !== 'all' && n.tier !== parseFloat(activeTier)) return false;
      if (q === '') return true;
      return n.code.indexOf(q) !== -1 || n.title.toLowerCase().indexOf(q) !== -1;
    });
    var body = $('noc-table-body');
    body.innerHTML = '';
    if (matches.length === 0) {
      var tr = document.createElement('tr');
      var td = document.createElement('td');
      td.colSpan = 3;
      td.textContent = 'No occupations match. Try a different job title or NOC code. If your occupation is not in this list, it is not on the IRCC high-wage list.';
      tr.appendChild(td);
      body.appendChild(tr);
    } else {
      matches.forEach(function (n) {
        var tr = document.createElement('tr');
        var tdCode = document.createElement('td');
        tdCode.textContent = n.code;
        var tdTitle = document.createElement('td');
        tdTitle.textContent = n.title;
        var tdTier = document.createElement('td');
        var badge = document.createElement('span');
        badge.className = 'noc-tier' + (n.tier === 2 ? ' t2' : '');
        badge.style.float = 'none';
        badge.textContent = tierLabel(n.tier);
        tdTier.appendChild(badge);
        tr.appendChild(tdCode);
        tr.appendChild(tdTitle);
        tr.appendChild(tdTier);
        body.appendChild(tr);
      });
    }
    $('noc-count').textContent = 'Showing ' + matches.length + ' of 186 occupations.';
  }

  $('noc-page-search').addEventListener('input', render);

  document.querySelectorAll('.tier-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      activeTier = chip.getAttribute('data-tier');
      document.querySelectorAll('.tier-chip').forEach(function (c) {
        c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
      });
      render();
    });
  });

  render();
})();
