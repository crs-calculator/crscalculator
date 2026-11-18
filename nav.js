// Mobile menu and dropdown navigation. No dependencies, no network calls.
(function () {
  'use strict';
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  var drops = document.querySelectorAll('.nav-drop');
  drops.forEach(function (drop) {
    var btn = drop.querySelector('.nav-drop-btn');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = drop.classList.contains('open');
      drops.forEach(function (d) {
        d.classList.remove('open');
        d.querySelector('.nav-drop-btn').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        drop.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-drop')) {
      drops.forEach(function (d) {
        d.classList.remove('open');
        d.querySelector('.nav-drop-btn').setAttribute('aria-expanded', 'false');
      });
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      drops.forEach(function (d) {
        d.classList.remove('open');
        d.querySelector('.nav-drop-btn').setAttribute('aria-expanded', 'false');
      });
      if (nav) nav.classList.remove('open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();
