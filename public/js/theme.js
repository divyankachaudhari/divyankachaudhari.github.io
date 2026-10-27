/* light/dark toggle for the reading pages (the homepage handles its own) */
(function () {
  'use strict';
  var b = document.getElementById('theme-toggle');
  if (!b) return;
  function sync() { b.setAttribute('aria-label', document.body.classList.contains('light') ? 'Switch to dark mode' : 'Switch to light mode'); }
  b.addEventListener('click', function () {
    document.body.classList.toggle('light');
    try { localStorage.setItem('divyanka:home-theme', document.body.classList.contains('light') ? 'light' : 'dark'); } catch (e) { /* private mode */ }
    sync();
  });
  sync();
})();
