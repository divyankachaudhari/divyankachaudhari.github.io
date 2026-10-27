/* Homepage sky: an ASCII London skyline that follows the real season. No dependencies.
   winter: snow (it settles on roofs)   spring: drizzle + blossom
   summer: sun, fireflies, a cyclist    autumn: rain + falling leaves
   click the sky to add more. press `s` to cycle seasons. */
(function () {
  'use strict';

  var canvas = document.getElementById('sky');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CW = 8, CH = 13;              // character cell size in CSS px
  var FONT = '12px Menlo, Monaco, "DejaVu Sans Mono", monospace';
  var W, H, cols, rows, ground, waterTop;
  var staticLayer, staticCells, roofTop, windows, eye, snowCap;
  var particles = [];
  var clicks = 0;
  var t = 0, last = 0;
  var cyclist = null;

  var PALETTES = {
    dark: {
      bg: '#15131a', far: '#2b2733', near: '#3d3748', edge: '#5a5266', glass: '#4a5a78',
      window: '#f8e3a8', star: '#8a849c', moon: '#e4dff0', sun: '#f8e3a8',
      snow: '#efeaf7', rain: '#7f9fd6', leaf: ['#f5b8a0', '#f8e3a8', '#f2a3a3'], petal: '#f5b8d6',
      firefly: '#f8e3a8', water: '#3b4a6b', waterHi: '#a9c7ff', eye: '#a9c7ff', pod: '#f5b8d6',
      clock: '#f8e3a8', rider: '#f5b8d6', bike: '#a9c7ff'
    },
    light: {
      bg: '#f4f0e8', far: '#ddd5e6', near: '#c9bfd6', edge: '#a99cbb', glass: '#a9bde0',
      window: '#d9a84a', star: '#c9bfd6', moon: '#8a849c', sun: '#e0a640',
      snow: '#8a849c', rain: '#7f9fd6', leaf: ['#d9825f', '#d9a84a', '#cf6f6f'], petal: '#d97aa6',
      firefly: '#d9a84a', water: '#c3cde0', waterHi: '#6f8fc7', eye: '#6f8fc7', pod: '#d97aa6',
      clock: '#d9a84a', rider: '#b8577f', bike: '#6f8fc7'
    }
  };
  function pal() { return PALETTES[document.body.classList.contains('light') ? 'light' : 'dark']; }

  /* ---------- season ---------- */

  var SEASONS = ['winter', 'spring', 'summer', 'autumn'];
  var TAGLINES = {
    winter: 'hibernating. back in april.',
    spring: 'waking up. blinking at the sun.',
    summer: 'outside. probably on a bike.',
    autumn: 'stockpiling snacks for winter.'
  };
  var NOUNS = { winter: 'snowflakes', spring: 'petals', summer: 'fireflies', autumn: 'raindrops' };
  function londonMonth() {
    return Number(new Intl.DateTimeFormat('en-GB', { month: 'numeric', timeZone: 'Europe/London' }).format(new Date()));
  }
  function seasonFor(m) {
    return m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn';
  }
  var param = new URLSearchParams(location.search).get('season');
  var season = SEASONS.indexOf(param) !== -1 ? param : seasonFor(londonMonth());

  /* ---------- helpers ---------- */

  function rng(seed) { // mulberry32: same skyline every visit
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var r = Math.imul(seed ^ seed >>> 15, 1 | seed);
      r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
      return ((r ^ r >>> 14) >>> 0) / 4294967296;
    };
  }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function key(x, y) { return y * cols + x; }

  /* ---------- the skyline (static layer) ---------- */

  function put(map, x, y, ch, color) {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return;
    map.set(key(x, y), { x: x, y: y, ch: ch, c: color });
  }

  function buildSkyline() {
    var P = pal();
    var r = rng(25111998);
    var map = new Map();
    windows = [];
    var narrow = cols < 80;

    // ordinary buildings, two depths
    [[P.far, 0.10, 0.30, ':'], [P.near, 0.05, 0.18, '#']].forEach(function (layer, li) {
      var x = 0;
      while (x < cols) {
        var w = 3 + Math.floor(r() * (li ? 6 : 8));
        var h = Math.round(rows * (layer[1] + r() * (layer[2] - layer[1])));
        for (var bx = x; bx < Math.min(cols, x + w); bx++) {
          for (var by = ground - h; by <= ground; by++) {
            var edge = bx === x || bx === x + w - 1 || by === ground - h;
            var tex = li ? (r() < 0.12 ? '%' : r() < 0.5 ? '#' : '=') : (r() < 0.3 ? '.' : ':');
            put(map, bx, by, edge && li ? (by === ground - h ? '_' : '|') : tex, edge && li ? P.edge : layer[0]);
            if (li && !edge && (bx - x) % 2 === 1 && (ground - by) % 2 === 0 && r() < 0.16) {
              windows.push({ x: bx, y: by, on: true });
            }
          }
        }
        x += w + (li ? Math.floor(r() * 3) : 0);
      }
    });

    var spots = narrow ? { eye: 0.18, tower: 0.5, shard: 0.82 } : { eye: 0.15, tower: 0.36, shard: 0.6, gherkin: 0.8 };

    // Elizabeth Tower (Big Ben)
    var tx = Math.round(cols * spots.tower), th = Math.round(rows * 0.3);
    var top = ground - th;
    for (var y = top; y <= ground; y++) {
      for (var dx = -2; dx <= 2; dx++) {
        var ch = Math.abs(dx) === 2 ? '|' : (y % 3 === 0 ? '=' : '#');
        put(map, tx + dx, y, ch, Math.abs(dx) === 2 ? P.edge : P.near);
      }
    }
    var clockY = top + 3;
    put(map, tx - 1, clockY, '(', P.clock); put(map, tx, clockY, 'o', P.clock); put(map, tx + 1, clockY, ')', P.clock);
    put(map, tx - 2, top - 1, '/', P.edge); put(map, tx + 2, top - 1, '\\', P.edge);
    put(map, tx - 1, top - 1, '#', P.near); put(map, tx, top - 1, '#', P.near); put(map, tx + 1, top - 1, '#', P.near);
    put(map, tx - 1, top - 2, '/', P.edge); put(map, tx + 1, top - 2, '\\', P.edge); put(map, tx, top - 2, '#', P.near);
    put(map, tx, top - 3, '|', P.edge); put(map, tx, top - 4, '|', P.edge); put(map, tx, top - 5, '^', P.edge);

    // The Shard
    var sx = Math.round(cols * spots.shard), sh = Math.round(rows * 0.42), half = 6;
    for (var i = 0; i <= sh; i++) {
      var hw = Math.round((1 - i / sh) * half);
      var yy = ground - i;
      for (var d = -hw; d <= hw; d++) {
        var c = d === -hw ? '/' : d === hw ? '\\' : ((d + i) % 4 === 0 ? '.' : ':');
        put(map, sx + d, yy, c, d === -hw || d === hw ? P.edge : P.glass);
      }
    }
    put(map, sx, ground - sh - 1, '\'', P.edge);

    // The Gherkin (diamond lattice)
    if (spots.gherkin) {
      var gx = Math.round(cols * spots.gherkin), gh = Math.round(rows * 0.24), rx = 5;
      for (var gy = 0; gy <= gh; gy++) {
        var t01 = gy / gh;
        var w2 = Math.round(rx * Math.sin(Math.PI * Math.min(1, 0.15 + t01 * 0.95)));
        for (var gd = -w2; gd <= w2; gd++) {
          var gc = Math.abs(gd) === w2 ? (gd < 0 ? '(' : ')') : ((gd + gy) % 2 ? '/' : '\\');
          put(map, gx + gd, ground - gy, gc, Math.abs(gd) === w2 ? P.edge : P.glass);
        }
      }
    }

    // London Eye: rim and legs are static, spokes and pods turn (drawn per frame)
    var R = Math.round(rows * (narrow ? 0.13 : 0.17));
    var ex = Math.round(cols * spots.eye), ey = ground - R - 1;
    eye = { x: ex, y: ey, R: R, rx: R * CH / CW };
    for (var a = 0; a < Math.PI * 2; a += 0.02) {
      put(map, Math.round(ex + Math.cos(a) * eye.rx), Math.round(ey + Math.sin(a) * R), '.', P.eye);
    }
    for (var ly = ey + 1; ly <= ground; ly++) {
      var off = Math.round((ly - ey) * 0.5);
      put(map, ex - off, ly, '/', P.edge);
      put(map, ex + off, ly, '\\', P.edge);
    }

    // the river wall
    for (var wx = 0; wx < cols; wx++) put(map, wx, ground, '_', P.edge);

    staticCells = map;
    roofTop = new Array(cols).fill(ground);
    map.forEach(function (cell) { if (cell.y < roofTop[cell.x]) roofTop[cell.x] = cell.y; });
    snowCap = new Map();
    renderStatic();
  }

  function renderStatic() {
    var P = pal();
    var dpr = window.devicePixelRatio || 1;
    staticLayer = document.createElement('canvas');
    staticLayer.width = W * dpr;
    staticLayer.height = H * dpr;
    var s = staticLayer.getContext('2d');
    s.scale(dpr, dpr);
    s.font = FONT;
    s.textBaseline = 'top';
    // stars
    var r = rng(7);
    s.fillStyle = P.star;
    for (var i = 0; i < cols * rows * 0.004; i++) {
      var x = Math.floor(r() * cols), y = Math.floor(r() * (ground * 0.55));
      s.fillText(r() < 0.8 ? '.' : '+', x * CW, y * CH);
    }
    staticCells.forEach(function (cell) {
      s.fillStyle = cell.c;
      s.fillText(cell.ch, cell.x * CW, cell.y * CH);
    });
  }

  /* ---------- particles ---------- */

  function spawn(kind, x, y) {
    var P = pal();
    var p = { kind: kind, x: x, y: y, vx: 0, vy: 0, ph: Math.random() * 6 };
    if (kind === 'snow') { p.vy = 0.08 + Math.random() * 0.12; p.ch = Math.random() < 0.6 ? '*' : '.'; p.c = P.snow; }
    if (kind === 'rain') { p.vy = 0.7 + Math.random() * 0.4; p.vx = -0.18; p.ch = '/'; p.c = P.rain; }
    if (kind === 'leaf') { p.vy = 0.07 + Math.random() * 0.08; p.ch = pick(['~', '*', ',']); p.c = pick(P.leaf); }
    if (kind === 'petal') { p.vy = 0.06 + Math.random() * 0.07; p.ch = pick(['*', '.', '\'']); p.c = P.petal; }
    if (kind === 'firefly') { p.ch = '.'; p.c = P.firefly; p.life = 300 + Math.random() * 400; }
    particles.push(p);
    return p;
  }

  function ambient() {
    var want = {
      winter: [['snow', 0.55]],
      spring: [['rain', 0.06], ['petal', 0.08]],
      summer: [['firefly', 0.05]],
      autumn: [['rain', 0.22], ['leaf', 0.05]]
    }[season];
    want.forEach(function (w) {
      var have = particles.filter(function (p) { return p.kind === w[0]; }).length;
      var target = Math.round(cols * w[1]);
      for (var i = have; i < target && i < have + 3; i++) {
        if (w[0] === 'firefly') spawn('firefly', Math.random() * cols, ground * (0.3 + Math.random() * 0.6));
        else spawn(w[0], Math.random() * (cols + 20), -Math.random() * 10);
      }
    });
  }

  function step() {
    particles = particles.filter(function (p) {
      p.ph += 0.05;
      if (p.kind === 'firefly') {
        p.x += Math.sin(p.ph * 0.7) * 0.15;
        p.y += Math.cos(p.ph * 0.5) * 0.08;
        p.life--;
        return p.life > 0;
      }
      var sway = p.kind === 'snow' ? 0.06 : p.kind === 'rain' ? 0 : 0.18;
      p.x += p.vx + Math.sin(p.ph) * sway;
      p.y += p.vy;
      var cx = Math.round(p.x);
      if (cx < 0 || cx >= cols) return p.y < rows;
      // snow settles on the first roof it meets (one row deep)
      if (p.kind === 'snow' && p.y >= roofTop[cx] - 1) {
        var k = key(cx, roofTop[cx] - 1);
        if (!snowCap.has(k)) snowCap.set(k, Math.random() < 0.5 ? '.' : '_');
        return false;
      }
      return p.y < (p.kind === 'rain' ? roofTop[cx] : ground);
    });
    if (cyclist) {
      cyclist.x += 0.22;
      if (cyclist.x > cols + 8) cyclist.x = -10;
    }
    // windows flicker occasionally
    if (windows.length && Math.random() < 0.05) {
      var w = pick(windows);
      w.on = !w.on;
    }
  }

  /* ---------- drawing ---------- */

  function draw() {
    var P = pal();
    var dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(staticLayer, 0, 0, W, H);
    ctx.font = FONT;
    ctx.textBaseline = 'top';

    function cell(x, y, ch, c, clear) {
      if (clear) { ctx.fillStyle = P.bg; ctx.fillRect(x * CW, y * CH, CW, CH); }
      ctx.fillStyle = c;
      ctx.fillText(ch, x * CW, y * CH);
    }

    // lit windows
    windows.forEach(function (w) { if (w.on) cell(w.x, w.y, '*', P.window, true); });

    // moon or sun
    var mx = Math.round(cols * 0.86), my = Math.round(rows * (cols < 80 ? 0.06 : 0.14));
    if (season === 'summer') {
      for (var a = 0; a < 8; a++) {
        var ang = a * Math.PI / 4 + t * 0.01;
        var rx = Math.round(Math.cos(ang) * 6), ry = Math.round(Math.sin(ang) * 3);
        cell(mx + rx, my + ry, '\\|/-'.charAt(((a % 4) + 4) % 4), P.sun);
      }
      ['(o)', '(@@@)', '(o)'].forEach(function (s, i) {
        for (var j = 0; j < s.length; j++) cell(mx - Math.floor(s.length / 2) + j, my - 1 + i, s.charAt(j), P.sun);
      });
    } else {
      [' _ ', '(  )', ' -  '].forEach(function (s, i) {
        for (var j = 0; j < s.length; j++) if (s.charAt(j) !== ' ') cell(mx - 1 + j, my - 1 + i, s.charAt(j), P.moon);
      });
    }

    // London Eye spokes and pods, turning slowly
    var rot = t * 0.0025;
    for (var s2 = 0; s2 < 8; s2++) {
      var ang2 = rot + s2 * Math.PI / 8;
      var ca = Math.cos(ang2), sa = Math.sin(ang2);
      var deg = ((ang2 * 180 / Math.PI) % 180 + 180) % 180;
      var ch = deg < 22.5 || deg >= 157.5 ? '-' : deg < 67.5 ? '\\' : deg < 112.5 ? '|' : '/';
      for (var r2 = -eye.R + 1; r2 < eye.R; r2++) {
        if (r2 === 0) continue;
        cell(Math.round(eye.x + ca * r2 * CH / CW), Math.round(eye.y + sa * r2), ch, P.eye);
      }
    }
    for (var pd = 0; pd < 16; pd++) {
      var ang3 = rot + pd * Math.PI / 8;
      cell(Math.round(eye.x + Math.cos(ang3) * eye.rx), Math.round(eye.y + Math.sin(ang3) * eye.R), 'o', P.pod, true);
    }
    cell(eye.x, eye.y, '@', P.pod, true);

    // snow lying on roofs
    snowCap.forEach(function (ch, k) { cell(k % cols, Math.floor(k / cols), ch, P.snow); });

    // the Thames
    for (var wy = waterTop; wy < rows; wy++) {
      for (var wx = 0; wx < cols; wx++) {
        var v = Math.sin(wx * 0.35 + t * 0.06 + wy * 1.7) + Math.sin(wx * 0.11 - t * 0.04);
        if (v > 1.2) cell(wx, wy, '~', P.waterHi);
        else if (v > 0.2) cell(wx, wy, '-', P.water);
        else if (v > -0.4) cell(wx, wy, '~', P.water);
      }
    }

    // cyclist on the embankment
    if (cyclist) {
      ['   __o', ' _ \\<_', '(_)/(_)'].forEach(function (s, i) {
        for (var j = 0; j < s.length; j++) {
          var chx = s.charAt(j);
          if (chx === ' ') continue;
          cell(Math.round(cyclist.x) + j, ground - 3 + i + 1, chx, i === 2 ? P.bike : P.rider, true);
        }
      });
    }

    // falling things
    particles.forEach(function (p) {
      if (p.kind === 'firefly' && Math.sin(p.ph * 2) < -0.3) return; // blink
      cell(Math.round(p.x), Math.round(p.y), p.ch, p.c);
    });
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (now - last < 33) return; // ~30fps is plenty for ASCII
    last = now;
    t++;
    ambient();
    step();
    draw();
  }

  /* ---------- setup ---------- */

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    cols = Math.ceil(W / CW);
    rows = Math.ceil(H / CH);
    var waterRows = Math.max(3, Math.round(rows * 0.09));
    waterTop = rows - waterRows;
    ground = waterTop - 1;
    particles = [];
    buildSkyline();
    setSeason(season, true);
    if (reduced) { for (var i = 0; i < 200; i++) { ambient(); step(); } draw(); }
  }

  function setSeason(s, quiet) {
    season = s;
    cyclist = s === 'summer' ? { x: -8 } : null;
    if (!quiet) { particles = []; snowCap = new Map(); }
    var where = document.getElementById('where');
    var m = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'Europe/London' }).format(new Date()).toLowerCase();
    if (where) where.textContent = 'london \u00b7 ' + m + ' \u00b7 ' + s;
    typeTagline(TAGLINES[s]);
    updateCount();
  }

  function updateCount() {
    var el = document.getElementById('count');
    if (el) el.textContent = clicks ? 'you added ' + clicks + ' ' + NOUNS[season] : 'click the sky';
  }

  var typing;
  function typeTagline(text) {
    var el = document.getElementById('tagline');
    if (!el) return;
    clearInterval(typing);
    if (reduced) { el.textContent = text; return; }
    var i = 0;
    el.textContent = '';
    typing = setInterval(function () {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(typing);
    }, 55);
  }

  canvas.addEventListener('pointerdown', function (e) {
    var x = e.clientX / CW, y = e.clientY / CH;
    var kind = { winter: 'snow', spring: 'petal', summer: 'firefly', autumn: 'rain' }[season];
    for (var i = 0; i < 24; i++) {
      var p = spawn(kind, x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 3);
      if (kind === 'firefly') p.life = 200 + Math.random() * 200;
    }
    clicks += 24;
    updateCount();
    if (reduced) draw();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 's' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      clicks = 0;
      setSeason(SEASONS[(SEASONS.indexOf(season) + 1) % 4]);
      if (reduced) { for (var i = 0; i < 200; i++) { ambient(); step(); } draw(); }
    }
  });

  var toggle = document.getElementById('theme-toggle');
  function syncToggle() { if (toggle) toggle.setAttribute('aria-label', document.body.classList.contains('light') ? 'Switch to dark mode' : 'Switch to light mode'); }
  if (toggle) {
    toggle.addEventListener('click', function () {
      document.body.classList.toggle('light');
      try { localStorage.setItem('divyanka:home-theme', document.body.classList.contains('light') ? 'light' : 'dark'); } catch (e) { /* private mode */ }
      syncToggle();
      buildSkyline();
      if (reduced) draw();
    });
  }
  syncToggle();

  var resizeTimer;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });

  resize();
  if (!reduced) requestAnimationFrame(loop);
})();
