/* divyanka.sh: a tiny fake shell for the homepage. No dependencies. */
(function () {
  'use strict';

  var S = window.SITE || { posts: [], links: {}, pages: {} };
  var out = document.getElementById('out');
  var form = document.getElementById('prompt');
  var input = document.getElementById('cmd');
  var body = document.getElementById('term-body');
  if (!out || !form || !input) return;

  var cwd = '~';
  var history = [];
  var hIdx = 0;
  var isTouch = window.matchMedia('(pointer: coarse)').matches;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function cmd(c, label) {
    return '<a href="#" class="cmd" data-cmd="' + esc(c) + '">' + esc(label || c) + '</a>';
  }
  function ext(url, label) {
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + '</a>';
  }
  function slug(url) {
    return url.replace(/\/+$/, '').split('/').pop().replace(/\.html$/, '').toLowerCase();
  }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function print(html, cls) {
    var div = document.createElement('div');
    div.className = 'block' + (cls ? ' ' + cls : '');
    div.innerHTML = html;
    out.appendChild(div);
    return div;
  }
  function echoPrompt(text) {
    print(
      '<span class="ps1"><span class="u">divyanka@london</span>:<span class="p">' + esc(cwd) + '</span>$</span> ' + esc(text),
      'echo'
    );
  }
  function scrollDown() { body.scrollTop = body.scrollHeight; }
  function setCwd(dir) {
    cwd = dir;
    document.querySelectorAll('.cwd').forEach(function (el) { el.textContent = dir; });
  }
  function go(url, newTab) {
    if (newTab) window.open(url, '_blank', 'noopener');
    else window.location.href = url;
  }
  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem('divyanka.sh:' + key);
      localStorage.setItem('divyanka.sh:' + key, String(value));
    } catch (e) { return null; }
    return null;
  }
  // rendered HTML -> plain text, for pipes
  function htmlToText(html) {
    var t = String(html)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|li|pre|h\d)>/gi, '\n')
      .replace(/<\/td>/gi, '  ')
      .replace(/<[^>]+>/g, '');
    var ta = document.createElement('textarea');
    ta.innerHTML = t;
    return ta.value.replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '');
  }
  // how many monospace columns fit in the terminal right now
  function termCols() {
    var probe = document.createElement('span');
    probe.textContent = 'MMMMMMMMMM';
    probe.style.visibility = 'hidden';
    probe.style.position = 'absolute';
    out.appendChild(probe);
    var w = probe.getBoundingClientRect().width / 10;
    probe.remove();
    var inner = body.clientWidth - 32;
    return Math.max(20, Math.floor(inner / (w || 8)));
  }
  function londonParts() {
    var parts = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, year: 'numeric' })
      .formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return parts;
  }

  /* ---------- london-aware status ---------- */

  function londonMonth() {
    var d = new Date();
    var n = Number(new Intl.DateTimeFormat('en-GB', { month: 'numeric', timeZone: 'Europe/London' }).format(d));
    var name = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'Europe/London' }).format(d).toLowerCase();
    return { n: n, name: name };
  }
  function status() {
    var m = londonMonth();
    if (m.n === 12 || m.n <= 2) return { icon: '*', cls: 'cold', text: 'hibernating', note: 'it\'s ' + m.name + ' in london. try again in summer.' };
    if (m.n <= 4) return { icon: '~', cls: 'warm', text: 'waking up', note: m.name + ' in london. blinking at the sun.' };
    if (m.n <= 8) return { icon: '+', cls: 'hot', text: 'outside', note: m.name + ' in london. probably on a bike.' };
    if (m.n <= 10) return { icon: '-', cls: 'warm', text: 'preparing to hibernate', note: m.name + ' in london. stockpiling snacks.' };
    return { icon: '*', cls: 'cold', text: 'hibernating', note: 'it\'s ' + m.name + ' in london. try again in summer.' };
  }
  function statusHtml() {
    var s = status();
    return '<span class="' + s.cls + '">[' + s.icon + '] ' + esc(s.text) + '</span> <span class="dim">(' + esc(s.note) + ')</span>';
  }

  /* ---------- themes ---------- */

  var THEMES = ['pastel', 'classic', 'green', 'amber', 'white'];
  function applyTheme(t) {
    if (t === 'pastel') document.body.removeAttribute('data-theme');
    else document.body.setAttribute('data-theme', t);
  }

  /* ---------- the "filesystem" ---------- */

  var HOME = [
    { name: 'about.txt', run: 'cat about.txt', cls: 'file' },
    { name: 'writing/', run: 'ls writing', cls: 'dir' },
    { name: 'photos@', run: 'photos', cls: 'link' },
    { name: 'contact.txt', run: 'cat contact.txt', cls: 'file' },
    { name: 'links.txt', run: 'cat links.txt', cls: 'file' }
  ];

  var FILES = {
    'about.txt': function () {
      return [
        '<p>Hi, I\'m <b class="hl">Divyanka</b>. I\'m a quant at a hedge fund in London, where I\'ve lived for the past two years.',
        'Before that I studied Computer Science and Engineering at IIT Delhi.</p>',
        '<p>I like the internet. I learned most of what I know from it, and I\'d like to make it a little better than I found it.</p>',
        '<p>My year runs on two settings: I hibernate through the London winter and come out properly in summer.',
        'When I\'m out I\'m biking, bouldering or skating (national-level skater once; athletics for IIT Delhi at inter-IIT).',
        'I\'ve just started pottery, so expect lopsided bowls.</p>',
        '<p class="dim">more: ' + cmd('ls writing', 'writing') + ' | ' + cmd('photos') + ' | ' + cmd('man divyanka') +
        ' | <a href="' + esc(S.pages.about) + '">about page</a> | <a href="' + esc(S.pages.blog) + '">blog</a></p>'
      ].join(' ');
    },
    'contact.txt': function () {
      return [
        '<p>Say hi. I read everything, eventually (faster in summer).</p>',
        '<table class="kv">',
        '<tr><td>form</td><td>' + ext(S.contactForm, 'anonymous-friendly contact form') + '</td></tr>',
        S.links.linkedin ? '<tr><td>linkedin</td><td>' + ext(S.links.linkedin, 'divyanka-chaudhari') + '</td></tr>' : '',
        '</table>'
      ].join('');
    },
    'links.txt': function () {
      var rows = [
        ['github', S.links.github],
        ['linkedin', S.links.linkedin],
        ['instagram', S.links.instagram]
      ].filter(function (r) { return r[1]; }).map(function (r) {
        return '<tr><td>' + r[0] + '</td><td>' + ext(r[1], r[1].replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + '</td></tr>';
      });
      return '<table class="kv">' + rows.join('') + '</table>';
    }
  };

  function findPost(q) {
    q = String(q || '').toLowerCase().replace(/\.md$/, '');
    if (!q) return null;
    if (/^\d+$/.test(q)) return S.posts[Number(q) - 1];
    var exact = S.posts.filter(function (p) { return slug(p.url) === q; })[0];
    if (exact) return exact;
    return S.posts.filter(function (p) {
      return slug(p.url).indexOf(q) !== -1 || p.title.toLowerCase().indexOf(q) !== -1;
    })[0];
  }

  function listWriting() {
    if (!S.posts.length) return '<p class="dim">(empty. hibernating.)</p>';
    var rows = S.posts.map(function (p, i) {
      return '<tr><td class="dim">' + (i + 1) + '</td><td class="dim">' + esc(p.date) + '</td><td>' +
        cmd('less ' + (i + 1), p.title) + ' <a class="dim" href="' + esc(p.url) + '">(web)</a></td></tr>';
    });
    return '<table class="ls">' + rows.join('') + '</table>' +
      '<p class="dim">click a title to read it here (or <span class="hl">less 1</span>), or <span class="hl">open 1</span> for the web page</p>';
  }

  /* ---------- fortune & cowsay ---------- */

  var FORTUNES = [
    'There are 10 kinds of people: those who understand binary and those who don\'t.',
    'It works on my machine.',
    'Weather forecast for London: grey, with a chance of grey.',
    'Hibernation is just long-term caching.',
    'A lopsided bowl still holds tea.',
    'The best time to go bouldering was summer. The second best time is the indoor gym.',
    'Past performance is not indicative of future results.',
    'Correlation is not causation, but it is a good place to start digging.',
    'Premature optimization is the root of all evil. -- Donald Knuth',
    'Talk is cheap. Show me the code. -- Linus Torvalds',
    'Have you tried turning it off and on again?',
    'The cloud is just someone else\'s computer.',
    '99 little bugs in the code. Take one down, patch it around. 127 little bugs in the code.',
    'In theory there is no difference between theory and practice. In practice there is.',
    'Your bike tyres are probably underinflated.',
    'Fall seven times, stand up eight. (Also applies to skating.)',
    'Never trust a backtest you didn\'t overfit yourself.',
    'The snake will remember that.',
    'Mind the gap.',
    'Clay doesn\'t care about your plans.',
    'Today\'s forecast: 90% chance of tea.',
    'Every expert was once a beginner who didn\'t rage-quit.',
    'If it compiles on the first try, be suspicious.',
    'Out of office until April. -- divyanka, every November'
  ];

  function wrap(text, width) {
    var lines = [];
    String(text).split('\n').forEach(function (para) {
      var line = '';
      para.split(/\s+/).forEach(function (word) {
        while (word.length > width) {
          if (line) { lines.push(line); line = ''; }
          lines.push(word.slice(0, width));
          word = word.slice(width);
        }
        if (!word) return;
        if ((line + ' ' + word).trim().length > width) { lines.push(line); line = word; }
        else line = (line + ' ' + word).trim();
      });
      lines.push(line);
    });
    while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
    return lines;
  }

  function cowsay(text, think) {
    var lines = wrap(text || 'moo', 40);
    var w = Math.max.apply(null, lines.map(function (l) { return l.length; }));
    var bubble = [' ' + '_'.repeat(w + 2)];
    if (lines.length === 1) {
      bubble.push((think ? '( ' : '< ') + lines[0].padEnd(w) + (think ? ' )' : ' >'));
    } else {
      lines.forEach(function (l, i) {
        var a = think ? '(' : i === 0 ? '/' : i === lines.length - 1 ? '\\' : '|';
        var b = think ? ')' : i === 0 ? '\\' : i === lines.length - 1 ? '/' : '|';
        bubble.push(a + ' ' + l.padEnd(w) + ' ' + b);
      });
    }
    bubble.push(' ' + '-'.repeat(w + 2));
    var t = think ? 'o' : '\\';
    return bubble.concat([
      '        ' + t + '   ^__^',
      '         ' + t + '  (oo)\\_______',
      '            (__)\\       )\\/\\',
      '                ||----w |',
      '                ||     ||'
    ]).join('\n');
  }

  /* ---------- man pages ---------- */

  function manDivyanka() {
    var p = londonParts();
    var header = 'DIVYANKA(1)';
    var mid = 'User Commands';
    var cols = Math.min(78, termCols());
    function spread(a, b, c) {
      var gap = Math.max(1, cols - a.length - b.length - c.length);
      var l = Math.floor(gap / 2);
      return a + ' '.repeat(l) + b + ' '.repeat(gap - l) + c;
    }
    var S1 = function (t) { return '<b class="hl">' + t + '</b>'; };
    var lines = [
      spread(header, mid, header),
      '',
      S1('NAME'),
      '       divyanka - quant in london, ex-IIT Delhi, likes the internet',
      '',
      S1('SYNOPSIS'),
      '       <b>divyanka</b> [--summer | --winter] [--bike] [--boulder] [--skate] [--clay]',
      '',
      S1('DESCRIPTION'),
      '       Lives in London (2 years). Works as a quant at a hedge fund.',
      '       Studied Computer Science and Engineering at IIT Delhi.',
      '       Learned most things from the internet and would like to leave',
      '       it a little better than it was found.',
      '',
      S1('OPTIONS'),
      '       <b>--summer</b>   go outside. bike, boulder, skate.',
      '       <b>--winter</b>   hibernate. response times may increase.',
      '       <b>--clay</b>     pottery. output may be lopsided.',
      '',
      S1('FILES'),
      '       ~/writing/    blog posts. see ' + cmd('ls writing'),
      '       ~/photos@     photography. see ' + cmd('photos'),
      '',
      S1('BUGS'),
      '       Hibernates from roughly November to March.',
      '       Pottery support is still in alpha.',
      '       Was once a national-level skater; still falls over sometimes.',
      '',
      S1('SEE ALSO'),
      '       ' + cmd('links', 'github(1)') + ', ' + cmd('links', 'linkedin(1)') + ', ' + cmd('photos', 'instagram(1)') + ', ' + cmd('snake', 'snake(6)'),
      '',
      spread('divyanka.sh', p.month + ' ' + p.year, header)
    ];
    return '<pre class="man">' + lines.join('\n') + '</pre>';
  }

  /* ---------- weather (open-meteo, fetched only when asked) ---------- */

  var WX_ART = {
    sun: ['    \\   /    ', '     .-.     ', '  - (   ) -  ', '     `-\'     ', '    /   \\    '],
    cloud: ['             ', '     .--.    ', '  .-(    ).  ', ' (___.__)__) ', '             '],
    rain: ['     .-.     ', '    (   ).   ', '   (___(__)  ', '    \' \' \' \'  ', '   \' \' \' \'   '],
    snow: ['     .-.     ', '    (   ).   ', '   (___(__)  ', '    *  *  *  ', '   *  *  *   '],
    fog: ['             ', ' _ - _ - _ - ', '  _ - _ - _  ', ' _ - _ - _ - ', '             '],
    storm: ['     .-.     ', '    (   ).   ', '   (___(__)  ', '    /_ /_    ', '     /  /    ']
  };
  function wxKind(code) {
    if (code === 0 || code === 1) return ['sun', code === 0 ? 'clear sky' : 'mostly clear'];
    if (code === 2 || code === 3) return ['cloud', code === 2 ? 'partly cloudy' : 'overcast'];
    if (code === 45 || code === 48) return ['fog', 'fog'];
    if (code >= 51 && code <= 57) return ['rain', 'drizzle'];
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return ['rain', 'rain'];
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ['snow', 'snow'];
    if (code >= 95) return ['storm', 'thunderstorm'];
    return ['cloud', 'weather'];
  }
  function weather(block) {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=51.5072&longitude=-0.1276' +
      '&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=Europe%2FLondon';
    var done = false;
    var timer = setTimeout(function () { if (!done) block.innerHTML = '<p class="err">weather: connection timed out. (it\'s probably grey.)</p>'; }, 8000);
    fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      done = true; clearTimeout(timer);
      var c = d.current;
      var k = wxKind(c.weather_code);
      var t = Math.round(c.temperature_2m), feels = Math.round(c.apparent_temperature);
      var wet = k[0] === 'rain' || k[0] === 'snow' || k[0] === 'storm' || c.precipitation > 0;
      var verdict = wet || t < 8
        ? ['cold', 'hibernate. stay in, make tea, play ' + cmd('snake') + '.']
        : t < 15
          ? ['warm', 'borderline. the bouldering gym counts as outside.']
          : ['hot', 'go outside. bike somewhere.'];
      var art = WX_ART[k[0]];
      var info = [
        '<b>London</b>',
        k[1],
        t + '\u00b0C <span class="dim">(feels like ' + feels + '\u00b0C)</span>',
        'wind ' + Math.round(c.wind_speed_10m) + ' km/h',
        c.precipitation + ' mm rain'
      ];
      block.innerHTML = '<pre>' + art.map(function (a, i) { return '<span class="hl">' + esc(a) + '</span>  ' + info[i]; }).join('\n') + '</pre>' +
        '<p>verdict: <span class="' + verdict[0] + '">' + verdict[1] + '</span></p>' +
        '<p class="dim">data: open-meteo.com</p>';
      scrollDown();
    }).catch(function () {
      done = true; clearTimeout(timer);
      block.innerHTML = '<p class="err">weather: could not reach the weather service. assume drizzle.</p>';
    });
  }

  /* ---------- full-screen programs ("apps") ---------- */
  // An app takes over the keyboard until it exits. Only one runs at a time.

  var app = null;
  function startApp(a) {
    stopApp(true);
    app = a;
    form.hidden = true;
    input.blur();
  }
  function stopApp(silent) {
    if (!app) return;
    var a = app;
    app = null;
    if (a.stop) a.stop(silent);
    form.hidden = false;
    if (!isTouch) input.focus({ preventScroll: true });
    scrollDown();
  }

  var DIRKEYS = {
    ArrowUp: 'up', w: 'up', k: 'up',
    ArrowDown: 'down', s: 'down', j: 'down',
    ArrowLeft: 'left', a: 'left', h: 'left',
    ArrowRight: 'right', d: 'right', l: 'right'
  };
  var VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function dpad() {
    return isTouch ? '<div class="dpad">' +
      '<button type="button" data-dir="up" aria-label="up">^</button>' +
      '<button type="button" data-dir="left" aria-label="left">&lt;</button>' +
      '<button type="button" data-dir="down" aria-label="down">v</button>' +
      '<button type="button" data-dir="right" aria-label="right">&gt;</button></div>' : '';
  }
  function best(name, score) {
    var b = Number(store(name + '-best')) || 0;
    if (score !== undefined && score > b) { store(name + '-best', score); return score; }
    return b;
  }
  function endLinks() {
    return '<a href="#" data-app="restart">[r] play again</a> | <a href="#" data-app="quit">[q] quit</a>';
  }

  /* ----- snake ----- */

  var DEATHS = ['the snake has gone into hibernation.', 'segfault (core dumped).', 'margin call.', 'it hit a wall. relatable.', 'process exited with code 1.'];

  function startSnake() {
    var narrow = body.clientWidth < 560;
    var W = narrow ? 14 : 24, H = 14;
    var block = print('<p class="game-bar"></p><pre class="game" aria-label="snake game"></pre><p class="game-help dim"></p>' + dpad(), 'game-block');
    var y = Math.floor(H / 2);
    var g = {
      name: 'snake', W: W, H: H,
      snake: [{ x: 4, y: y }, { x: 3, y: y }, { x: 2, y: y }],
      dir: [1, 0], queue: [], food: null, score: 0, best: best('snake'),
      speed: 130, timer: null, paused: false, over: false,
      bar: block.querySelector('.game-bar'), screen: block.querySelector('.game'), help: block.querySelector('.game-help')
    };
    function placeFood() {
      var free = [];
      for (var yy = 0; yy < g.H; yy++) for (var xx = 0; xx < g.W; xx++) {
        if (!g.snake.some(function (p) { return p.x === xx && p.y === yy; })) free.push({ x: xx, y: yy });
      }
      g.food = pick(free);
    }
    function draw() {
      var cells = [];
      for (var yy = 0; yy < g.H; yy++) cells.push(new Array(g.W).fill(0));
      g.snake.forEach(function (p, i) { cells[p.y][p.x] = i === 0 ? 2 : 1; });
      if (g.food) cells[g.food.y][g.food.x] = 3;
      var rows = ['<span class="frame">+' + '--'.repeat(g.W) + '+</span>'];
      cells.forEach(function (row) {
        rows.push('<span class="frame">|</span>' + row.map(function (c) {
          return c === 2 ? '<span class="hd">@ </span>' : c === 1 ? '<span class="sn">o </span>' : c === 3 ? '<span class="fd">* </span>' : '  ';
        }).join('') + '<span class="frame">|</span>');
      });
      rows.push('<span class="frame">+' + '--'.repeat(g.W) + '+</span>');
      g.screen.innerHTML = rows.join('\n');
      g.bar.innerHTML = '<span class="hl">snake</span>  <span class="dim">score</span> ' + g.score +
        '  <span class="dim">best</span> ' + Math.max(g.best, g.score) + (g.paused ? '  <span class="warm">[paused]</span>' : '');
    }
    function over(won) {
      g.over = true;
      clearTimeout(g.timer);
      draw();
      var isBest = g.score > g.best;
      best('snake', g.score);
      g.help.innerHTML = (won ? '<span class="hot">you filled the board. respect.</span>' : '<span class="err">' + esc(pick(DEATHS)) + '</span>') +
        ' score ' + g.score + (isBest && g.score ? ' <span class="hot">| new best!</span>' : '') + '<br>' + endLinks();
      scrollDown();
    }
    function tick() {
      if (app !== g || g.over) return;
      if (g.paused) { g.timer = setTimeout(tick, g.speed); return; }
      while (g.queue.length) {
        var d = g.queue.shift();
        if (d[0] !== -g.dir[0] || d[1] !== -g.dir[1]) { g.dir = d; break; }
      }
      var head = { x: g.snake[0].x + g.dir[0], y: g.snake[0].y + g.dir[1] };
      var ate = g.food && head.x === g.food.x && head.y === g.food.y;
      var check = ate ? g.snake : g.snake.slice(0, -1);
      if (head.x < 0 || head.y < 0 || head.x >= g.W || head.y >= g.H ||
          check.some(function (p) { return p.x === head.x && p.y === head.y; })) return over();
      g.snake.unshift(head);
      if (ate) {
        g.score++;
        g.speed = Math.max(65, g.speed - 4);
        if (g.snake.length >= g.W * g.H) return over(true);
        placeFood();
      } else g.snake.pop();
      draw();
      g.timer = setTimeout(tick, g.speed);
    }
    g.dirIn = function (dir) { if (!g.over && g.queue.length < 3) g.queue.push(VEC[dir]); };
    g.key = function (key) {
      if (DIRKEYS[key]) { g.dirIn(DIRKEYS[key]); return true; }
      if (key === ' ' || key === 'p') { if (!g.over) { g.paused = !g.paused; draw(); } return true; }
      if (key === 'q' || key === 'Escape') { stopApp(); return true; }
      if ((key === 'r' || key === 'Enter') && g.over) { startSnake(); return true; }
      return false;
    };
    g.action = function (a) {
      if (a === 'quit') stopApp();
      else if (a === 'restart') startSnake();
      else if (a === 'pause' && !g.over) { g.paused = !g.paused; draw(); }
    };
    g.hide = function () { if (!g.over) { g.paused = true; draw(); } };
    g.stop = function (silent) {
      clearTimeout(g.timer);
      if (!silent) print('<p class="dim">snake exited | score ' + g.score + ' | best ' + Math.max(g.best, g.score) + '</p>');
    };
    startApp(g);
    placeFood();
    g.help.innerHTML = isTouch
      ? 'swipe or use the arrows | <a href="#" data-app="pause">pause</a> | <a href="#" data-app="quit">quit</a>'
      : 'arrows / wasd / hjkl to move | space to pause | q to quit';
    draw();
    scrollDown();
    g.timer = setTimeout(tick, 400);
  }

  /* ----- 2048 ----- */

  function start2048() {
    var block = print('<p class="game-bar"></p><pre class="game g2048" aria-label="2048 game"></pre><p class="game-help dim"></p>' + dpad(), 'game-block');
    var g = {
      name: '2048', grid: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      score: 0, best: best('2048'), over: false, won: false,
      bar: block.querySelector('.game-bar'), screen: block.querySelector('.game'), help: block.querySelector('.game-help')
    };
    function empty() {
      var e = [];
      g.grid.forEach(function (row, y) { row.forEach(function (v, x) { if (!v) e.push([x, y]); }); });
      return e;
    }
    function spawn() {
      var e = empty();
      if (!e.length) return;
      var c = pick(e);
      g.grid[c[1]][c[0]] = Math.random() < 0.9 ? 2 : 4;
    }
    function slideRow(row) {
      var vals = row.filter(Boolean), res = [], gained = 0;
      for (var i = 0; i < vals.length; i++) {
        if (vals[i] === vals[i + 1]) { res.push(vals[i] * 2); gained += vals[i] * 2; i++; }
        else res.push(vals[i]);
      }
      while (res.length < 4) res.push(0);
      return { row: res, gained: gained };
    }
    function move(dir) {
      if (g.over) return;
      var moved = false, gained = 0;
      for (var i = 0; i < 4; i++) {
        var line = [];
        for (var j = 0; j < 4; j++) {
          line.push(dir === 'left' ? g.grid[i][j] : dir === 'right' ? g.grid[i][3 - j] : dir === 'up' ? g.grid[j][i] : g.grid[3 - j][i]);
        }
        var r = slideRow(line);
        gained += r.gained;
        for (var k = 0; k < 4; k++) {
          var v = r.row[k];
          var pos = dir === 'left' ? [i, k] : dir === 'right' ? [i, 3 - k] : dir === 'up' ? [k, i] : [3 - k, i];
          if (g.grid[pos[0]][pos[1]] !== v) { moved = true; g.grid[pos[0]][pos[1]] = v; }
        }
      }
      if (!moved) return;
      g.score += gained;
      spawn();
      if (!g.won && g.grid.some(function (r) { return r.indexOf(2048) !== -1; })) {
        g.won = true;
        g.help.innerHTML = '<span class="hot">2048! you win. keep going if you like.</span> <a href="#" data-app="quit">[q] quit</a>';
      }
      if (!canMove()) gameOver();
      draw();
    }
    function canMove() {
      if (empty().length) return true;
      for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) {
        var v = g.grid[y][x];
        if ((x < 3 && g.grid[y][x + 1] === v) || (y < 3 && g.grid[y + 1][x] === v)) return true;
      }
      return false;
    }
    function gameOver() {
      g.over = true;
      var isBest = g.score > g.best;
      best('2048', g.score);
      g.help.innerHTML = '<span class="err">no moves left.</span> score ' + g.score + (isBest ? ' <span class="hot">| new best!</span>' : '') + '<br>' + endLinks();
    }
    function draw() {
      var sep = '+------+------+------+------+';
      var rows = [sep];
      g.grid.forEach(function (row) {
        rows.push('|' + row.map(function (v) {
          var s = v ? String(v) : '';
          return '<span class="t' + Math.min(v, 4096) + '">' + s.padStart(5) + ' </span>';
        }).join('|') + '|');
        rows.push(sep);
      });
      g.screen.innerHTML = rows.join('\n');
      g.bar.innerHTML = '<span class="hl">2048</span>  <span class="dim">score</span> ' + g.score + '  <span class="dim">best</span> ' + Math.max(g.best, g.score);
    }
    g.dirIn = move;
    g.key = function (key) {
      if (DIRKEYS[key]) { move(DIRKEYS[key]); return true; }
      if (key === 'q' || key === 'Escape') { stopApp(); return true; }
      if (key === 'r' && g.over) { start2048(); return true; }
      return false;
    };
    g.action = function (a) { if (a === 'quit') stopApp(); else if (a === 'restart') start2048(); };
    g.stop = function (silent) { if (!silent) print('<p class="dim">2048 exited | score ' + g.score + ' | best ' + Math.max(g.best, g.score) + '</p>'); };
    startApp(g);
    spawn(); spawn();
    g.help.innerHTML = isTouch ? 'swipe or use the arrows | <a href="#" data-app="quit">quit</a>' : 'arrows / wasd / hjkl to slide | q to quit';
    draw();
    scrollDown();
  }

  /* ----- hangman ----- */

  var WORDS = ['segfault', 'kernel', 'recursion', 'bouldering', 'pottery', 'volatility', 'arbitrage', 'hibernate',
    'terminal', 'compiler', 'algorithm', 'bytecode', 'assembly', 'debugger', 'backtest', 'gradient', 'skateboard',
    'sourdough', 'bicycle', 'internet', 'cryptography', 'pointer', 'mutex', 'deadlock', 'polymorphism', 'regex',
    'kubernetes', 'monad', 'heisenbug', 'latency', 'checksum', 'firmware', 'drizzle', 'umbrella', 'teapot'];
  var GALLOWS = [
    ['  +---+', '  |   |', '      |', '      |', '      |', '      |', '========='],
    ['  +---+', '  |   |', '  O   |', '      |', '      |', '      |', '========='],
    ['  +---+', '  |   |', '  O   |', '  |   |', '      |', '      |', '========='],
    ['  +---+', '  |   |', '  O   |', ' /|   |', '      |', '      |', '========='],
    ['  +---+', '  |   |', '  O   |', ' /|\\  |', '      |', '      |', '========='],
    ['  +---+', '  |   |', '  O   |', ' /|\\  |', ' /    |', '      |', '========='],
    ['  +---+', '  |   |', '  O   |', ' /|\\  |', ' / \\  |', '      |', '=========']
  ];

  function startHangman() {
    var letters = '';
    if (isTouch) {
      letters = '<div class="letters">' + 'abcdefghijklmnopqrstuvwxyz'.split('').map(function (c) {
        return '<button type="button" data-letter="' + c + '">' + c + '</button>';
      }).join('') + '</div>';
    }
    var block = print('<p class="game-bar"></p><pre class="game" aria-label="hangman game"></pre><p class="game-help dim"></p>' + letters, 'game-block');
    var g = {
      name: 'hangman', word: pick(WORDS), guessed: [], wrong: 0, over: false,
      bar: block.querySelector('.game-bar'), screen: block.querySelector('.game'), help: block.querySelector('.game-help'), block: block
    };
    function shown() { return g.word.split('').map(function (c) { return g.guessed.indexOf(c) !== -1 ? c : '_'; }).join(' '); }
    function draw() {
      var misses = g.guessed.filter(function (c) { return g.word.indexOf(c) === -1; });
      var art = GALLOWS[g.wrong].slice();
      art[1] += '      ' + '<b class="hl">' + shown() + '</b>';
      art[3] += '      <span class="dim">misses:</span> <span class="err">' + (misses.join(' ') || '-') + '</span>';
      art[4] += '      <span class="dim">lives:</span> ' + (6 - g.wrong);
      g.screen.innerHTML = art.join('\n');
      g.bar.innerHTML = '<span class="hl">hangman</span>  <span class="dim">nerdy words, ' + g.word.length + ' letters</span>';
      block.querySelectorAll('[data-letter]').forEach(function (b) { b.disabled = g.guessed.indexOf(b.getAttribute('data-letter')) !== -1 || g.over; });
    }
    function guess(c) {
      if (g.over || g.guessed.indexOf(c) !== -1) return;
      g.guessed.push(c);
      if (g.word.indexOf(c) === -1) g.wrong++;
      var won = g.word.split('').every(function (ch) { return g.guessed.indexOf(ch) !== -1; });
      if (won || g.wrong >= 6) {
        g.over = true;
        var streak = won ? (Number(store('hangman-streak')) || 0) + 1 : 0;
        store('hangman-streak', streak);
        g.help.innerHTML = (won ? '<span class="hot">you got it: ' + g.word + '.</span> streak ' + streak
          : '<span class="err">hanged. the word was "' + g.word + '".</span>') + '<br>' + endLinks();
      }
      draw();
      scrollDown();
    }
    g.key = function (key) {
      if (/^[a-z]$/.test(key) && !g.over) { guess(key); return true; }
      if (key === 'Escape' || (g.over && key === 'q')) { stopApp(); return true; }
      if (g.over && (key === 'r' || key === 'Enter')) { startHangman(); return true; }
      return false;
    };
    g.letter = guess;
    g.action = function (a) { if (a === 'quit') stopApp(); else if (a === 'restart') startHangman(); };
    g.stop = function (silent) { if (!silent && !g.over) print('<p class="dim">hangman exited. the word was "' + g.word + '".</p>'); };
    startApp(g);
    g.help.innerHTML = isTouch ? 'tap letters | <a href="#" data-app="quit">quit</a>' : 'type letters to guess | esc to quit';
    draw();
    scrollDown();
  }

  /* ----- less: read a post inside the terminal ----- */

  function sanitize(node, base) {
    var html = '';
    node.childNodes.forEach(function (n) {
      if (n.nodeType === 3) { html += esc(n.nodeValue); return; }
      if (n.nodeType !== 1) return;
      var t = n.tagName.toLowerCase();
      if (t === 'script' || t === 'style' || t === 'iframe') return;
      if (t === 'img') {
        var src = new URL(n.getAttribute('src') || '', base).href;
        html += '<a href="' + esc(src) + '" target="_blank" rel="noopener">[image' + (n.alt ? ': ' + esc(n.alt) : '') + ']</a>';
        return;
      }
      if (t === 'a') {
        var href = new URL(n.getAttribute('href') || '#', base).href;
        html += '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + sanitize(n, base) + '</a>';
        return;
      }
      if (/^h[1-6]$/.test(t)) { html += '<p class="hl"><b>' + sanitize(n, base) + '</b></p>'; return; }
      if (t === 'pre') { html += '<pre class="code">' + esc(n.textContent) + '</pre>'; return; }
      if (t === 'li') { html += '<div class="li">* ' + sanitize(n, base) + '</div>'; return; }
      if (t === 'br') { html += '<br>'; return; }
      if (t === 'strong' || t === 'b') { html += '<b>' + sanitize(n, base) + '</b>'; return; }
      if (t === 'code') { html += '<span class="hl">' + sanitize(n, base) + '</span>'; return; }
      if (t === 'td' || t === 'th') { html += sanitize(n, base) + '  '; return; }
      if (/^(p|blockquote|div|ul|ol|table|tr|figure|section)$/.test(t)) { html += '<div class="para">' + sanitize(n, base) + '</div>'; return; }
      html += sanitize(n, base);
    });
    return html;
  }

  function startLess(post) {
    var block = print('<div class="pager" tabindex="-1"><p class="dim">reading ' + esc(post.url) + '...</p></div><p class="pager-status"></p>', 'less-block');
    var pager = block.querySelector('.pager');
    var statusEl = block.querySelector('.pager-status');
    var a = { name: 'less' };
    function updateStatus() {
      var max = pager.scrollHeight - pager.clientHeight;
      var pct = max <= 0 ? 100 : Math.round(pager.scrollTop / max * 100);
      statusEl.innerHTML = '<span class="inv">' + esc(slug(post.url)) + ' ' + (pct >= 100 ? '(END)' : pct + '%') + '</span> ' +
        (isTouch ? '<a href="#" data-app="quit">[q] quit</a>' : '<span class="dim">j/k scroll, space page, g/G top/end, q quit</span>');
    }
    pager.addEventListener('scroll', updateStatus);
    a.key = function (key) {
      var page = pager.clientHeight - 30;
      if (key === 'q' || key === 'Escape') { stopApp(); return true; }
      if (key === 'j' || key === 'ArrowDown' || key === 'Enter') pager.scrollTop += 24;
      else if (key === 'k' || key === 'ArrowUp') pager.scrollTop -= 24;
      else if (key === ' ' || key === 'f' || key === 'PageDown') pager.scrollTop += page;
      else if (key === 'b' || key === 'PageUp') pager.scrollTop -= page;
      else if (key === 'g' || key === 'Home') pager.scrollTop = 0;
      else if (key === 'G' || key === 'End') pager.scrollTop = pager.scrollHeight;
      else return false;
      return true;
    };
    a.action = function (x) { if (x === 'quit') stopApp(); };
    a.stop = function () {
      block.remove();
      print('<p class="dim">less: closed "' + esc(post.title) + '". <a href="' + esc(post.url) + '">open the web version</a></p>');
    };
    startApp(a);
    scrollDown();
    fetch(post.url).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (htmlText) {
      if (app !== a) return;
      var doc = new DOMParser().parseFromString(htmlText, 'text/html');
      var article = doc.querySelector('.post') || doc.querySelector('article') || doc.body;
      var base = new URL(post.url, location.href).href;
      pager.innerHTML = sanitize(article, base);
      pager.scrollTop = 0;
      updateStatus();
      scrollDown();
    }).catch(function () {
      if (app !== a) return;
      pager.innerHTML = '<p class="err">less: could not read ' + esc(post.url) + '</p>';
      updateStatus();
    });
    updateStatus();
  }

  /* ----- top: a fake process list of my life ----- */

  var PROCS = [
    ['1', 'root', 'hibernate.d', 0.0, 0.4],
    ['42', 'divyanka', 'quant --market-hours', 61, 22],
    ['107', 'divyanka', 'internet --doomscroll', 9, 6],
    ['256', 'divyanka', 'bouldering', 12, 18],
    ['311', 'divyanka', 'bike --lane=cycle', 3, 2],
    ['404', 'divyanka', 'pottery.d --lopsided', 3, 4],
    ['512', 'divyanka', 'skate', 2, 1],
    ['640', 'divyanka', 'photos.d', 1, 3],
    ['777', 'divyanka', 'tea', 4, 0.5],
    ['1337', 'divyanka', 'snake --best-score', 0.3, 0.2]
  ];

  function procTable(jitter) {
    return PROCS.map(function (p) {
      var cpu = Math.max(0, p[3] + (jitter ? (Math.random() - 0.5) * p[3] * 0.4 : 0));
      return { pid: p[0], user: p[1], cmd: p[2], cpu: cpu, mem: p[4] };
    });
  }

  function startTop() {
    var block = print('<pre class="top"></pre><p class="dim top-help"></p>', 'top-block');
    var pre = block.querySelector('.top');
    var a = { name: 'top', timer: null };
    function draw() {
      var p = londonParts();
      var rows = procTable(true).sort(function (x, y) { return y.cpu - x.cpu; });
      var load = [0.42, 0.38, 0.31].map(function (l) { return (l + (Math.random() - 0.5) * 0.1).toFixed(2); }).join(', ');
      var lines = [
        'top - ' + p.hour + ':' + p.minute + ':' + p.second + ' up 2 years in london,  1 user,  load average: ' + load,
        'Tasks: ' + rows.length + ' total,   2 running,   ' + (rows.length - 2) + ' sleeping,   0 stopped,   0 zombie',
        'Mem:  plenty for snacks   Swap:  winter wardrobe',
        '',
        '<span class="inv">  PID USER      %CPU %MEM COMMAND                   </span>'
      ];
      rows.forEach(function (r) {
        lines.push(r.pid.padStart(5) + ' ' + r.user.padEnd(9) + ' ' + r.cpu.toFixed(1).padStart(4) + ' ' + r.mem.toFixed(1).padStart(4) + ' ' + esc(r.cmd));
      });
      pre.innerHTML = lines.join('\n');
    }
    a.key = function (key) { if (key === 'q' || key === 'Escape') { stopApp(); return true; } return false; };
    a.action = function (x) { if (x === 'quit') stopApp(); };
    a.stop = function () { clearInterval(a.timer); };
    startApp(a);
    block.querySelector('.top-help').innerHTML = isTouch ? '<a href="#" data-app="quit">[q] quit</a>' : 'press q to quit';
    draw();
    a.timer = setInterval(draw, 1000);
    scrollDown();
  }

  /* ----- sl: you typed sl instead of ls ----- */

  var TRAIN = [
    '      (  ) (@@) ( )  (@)  ()    @@    O     @',
    '     (@@@)',
    '   (    )',
    '    (@@@@)',
    '   ====        ________________   ________________',
    ' _D _|  |_____|  divyanka.sh   | |   ls != sl     |',
    '  |(_)---  |  |________________| |________________|',
    '  / |  |   |    ||         ||       ||         || ',
    ' |__|__|___|____||_________||_______||_________||_',
    '  O===O===O    (O)       (O)       (O)       (O)  '
  ];
  var SMOKE = [
    TRAIN.slice(0, 4),
    ['    (@@) ( ) (@)  (  )  @@    ()     @    O', '   (   )', '  (@@@@)', '     (  )']
  ];

  function startSl() {
    if (reducedMotion) { print('<p>sl: the train is not running today (reduced motion). you meant ' + cmd('ls') + '.</p>'); return; }
    var block = print('<pre class="sl"></pre>', 'sl-block');
    var pre = block.querySelector('.sl');
    var cols = termCols();
    var trainW = Math.max.apply(null, TRAIN.map(function (l) { return l.length; }));
    var x = cols;
    var frame = 0;
    var a = { name: 'sl' };
    function draw() {
      var art = SMOKE[Math.floor(frame / 3) % 2].concat(TRAIN.slice(4));
      pre.textContent = art.map(function (line) {
        var s = x >= 0 ? ' '.repeat(x) + line : line.slice(-x);
        return s.slice(0, cols);
      }).join('\n');
    }
    a.key = function () { return true; }; // ctrl+c doesn't work. that's the point.
    a.stop = function () {
      clearInterval(a.timer);
      block.remove();
      print('<p class="dim">(you typed sl. that\'s what happens.) did you mean ' + cmd('ls') + '?</p>');
    };
    startApp(a);
    draw();
    scrollDown();
    a.timer = setInterval(function () {
      x -= 2; frame++;
      draw();
      if (x < -trainW) stopApp();
    }, 40);
  }

  /* ----- cmatrix ----- */

  function startMatrix() {
    if (reducedMotion) { print('<p>cmatrix: wake up, neo. (animation skipped: reduced motion is on.)</p>'); return; }
    var canvas = document.createElement('canvas');
    canvas.className = 'matrix';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var color = getComputedStyle(document.body).getPropertyValue('--green').trim() || '#00cd00';
    var bright = getComputedStyle(document.body).getPropertyValue('--bright-green').trim() || '#5ff967';
    var size = 16, colsN, drops, last = 0;
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789$+-*/=%"\'#&_(),.;:?!\\|{}<>[]^~';
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      colsN = Math.ceil(canvas.width / size);
      drops = [];
      for (var i = 0; i < colsN; i++) drops.push(Math.floor(Math.random() * (canvas.height / size)) - 8);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    resize();
    var a = { name: 'cmatrix', raf: 0 };
    function frame(t) {
      a.raf = requestAnimationFrame(frame);
      if (t - last < 55) return;
      last = t;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = size + 'px Monaco, Menlo, monospace';
      for (var i = 0; i < colsN; i++) {
        var y = drops[i] * size;
        if (y > 0) {
          ctx.fillStyle = color;
          ctx.fillText(pick(chars), i * size, y - size);
          ctx.fillStyle = bright;
          ctx.fillText(pick(chars), i * size, y);
        }
        drops[i]++;
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
      }
    }
    a.key = function () { stopApp(); return true; };
    a.action = function () { stopApp(); };
    a.stop = function () {
      cancelAnimationFrame(a.raf);
      window.removeEventListener('resize', resize);
      canvas.remove();
      print('<p class="dim">cmatrix: you took the blue pill.</p>');
    };
    canvas.addEventListener('click', function () { if (app === a) stopApp(); });
    window.addEventListener('resize', resize);
    startApp(a);
    a.raf = requestAnimationFrame(frame);
  }

  /* ---------- easter egg: a tiny CTF hidden in ls -a ---------- */
  // trail: ls -a -> cat .secrets -> strings .vault.bin -> echo ... | rot13 -> unlock <password>

  var VAULT_PASSWORD = 'lopsided';
  function vaultCracked() { return store('vault') === '1'; }
  function rot13(t) {
    return String(t).replace(/[a-z]/gi, function (c) {
      var base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
    });
  }
  var VAULT_STRINGS = [
    '/lib64/ld-linux-x86-64.so.2',
    'libc.so.6',
    'puts',
    'strcmp',
    'GLIBC_2.2.5',
    'enter password:',
    'wrong. the snake will remember that.',
    'hint: rot13 is a cipher, not a security measure',
    rot13('password: ' + VAULT_PASSWORD),
    'correct! run: unlock <password>',
    'GCC: (GNU) 13.2.0',
    '.text',
    '.data',
    '.bss'
  ];

  function unlockVault(pw) {
    pw = String(pw || '').trim().toLowerCase();
    if (!pw) return '<p class="dim">usage: unlock &lt;password&gt;</p>';
    if (pw !== VAULT_PASSWORD) return '<p class="err">access denied.</p><p class="dim">' + esc(VAULT_STRINGS[6]) + '</p>';
    var first = !vaultCracked();
    store('vault', '1');
    var trophy = [
      '     ___________',
      '    |           |',
      '    |  CAPTURED |',
      '    |    THE    |',
      '    |   FLAG    |',
      '     \\         /',
      '      `-.___.-\'',
      '         | |',
      '       __|_|__',
      '      |_______|'
    ].join('\n');
    return '<pre class="trophy">' + esc(trophy) + '</pre>' +
      '<p><b class="hl">flag{lopsided_bowls_still_hold_tea}</b></p>' +
      '<p>you cracked the vault. very few people ever find this. ' +
      '<a href="' + esc(S.contactForm) + '" target="_blank" rel="noopener">tell me you did</a>, I\'d love to know.</p>' +
      (first ? '<p>unlocked a secret command: ' + cmd('snow') + ' <span class="dim">(for hibernation season)</span></p>'
             : '<p class="dim">you\'ve been here before. ' + cmd('snow') + ' is still yours.</p>');
  }

  function startSnow() {
    if (reducedMotion) { print('<p>snow: it\'s snowing, quietly. (animation skipped: reduced motion is on.)</p>'); return; }
    var canvas = document.createElement('canvas');
    canvas.className = 'matrix';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var color = getComputedStyle(document.body).getPropertyValue('--fg').trim() || '#e4dff0';
    var flakes = [], last = 0;
    var a = { name: 'snow', raf: 0 };
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      flakes = [];
      var n = Math.floor(canvas.width * canvas.height / 9000);
      for (var i = 0; i < n; i++) {
        flakes.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, v: 0.6 + Math.random() * 1.6, c: pick(['*', '.', '+', '.', '*']), p: Math.random() * 6 });
      }
    }
    function frame(t) {
      a.raf = requestAnimationFrame(frame);
      if (t - last < 33) return;
      last = t;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      ctx.font = '14px Monaco, Menlo, monospace';
      flakes.forEach(function (f) {
        f.y += f.v;
        f.p += 0.03;
        f.x += Math.sin(f.p) * 0.4;
        if (f.y > canvas.height) { f.y = -10; f.x = Math.random() * canvas.width; }
        ctx.fillText(f.c, f.x, f.y);
      });
      ctx.fillStyle = color;
      ctx.font = '13px Monaco, Menlo, monospace';
      ctx.fillText('hibernation mode. press any key to wake up.', 16, canvas.height - 18);
    }
    a.key = function () { stopApp(); return true; };
    a.action = function () { stopApp(); };
    a.stop = function () {
      cancelAnimationFrame(a.raf);
      window.removeEventListener('resize', resize);
      canvas.remove();
      print('<p class="dim">*yawn* ' + esc(status().note) + '</p>');
    };
    canvas.addEventListener('click', function () { if (app === a) stopApp(); });
    window.addEventListener('resize', resize);
    resize();
    startApp(a);
    a.raf = requestAnimationFrame(frame);
  }

  /* ---------- commands ---------- */

  function helpTable() {
    var groups = [
      ['me', [['about', 'about'], ['ls writing', 'ls'], ['cd writing', 'cd'], ['cat about.txt', 'cat'], ['less 1', 'less'], ['open 1', 'open'], ['photos', 'photos'], ['contact', 'contact'], ['links', 'links'], ['man divyanka', 'man']]],
      ['fun', [['fortune', 'fortune'], ['cowsay moo', 'cowsay'], ['weather', 'weather'], ['neofetch', 'neofetch'], ['top', 'top'], ['ps', 'ps'], ['sl', 'sl'], ['cmatrix', 'cmatrix'], ['theme', 'theme']]],
      ['games', [['snake', 'snake'], ['2048', '2048'], ['hangman', 'hangman']]],
      ['system', [['status', 'status'], ['date', 'date'], ['history', 'history'], ['clear', 'clear'], ['gui', 'gui']]]
    ];
    return '<table class="kv help">' + groups.map(function (g) {
      return '<tr><td>' + g[0] + '</td><td>' + g[1].map(function (c) { return cmd(c[0], c[1]); }).join('  ') + '</td></tr>';
    }).join('') + '</table>' +
      '<p class="dim">pipes work too: ' + cmd('fortune | cowsay') + '. tab completes, up/down for history, ctrl+c quits programs, ctrl+l clears. there are a few hidden commands.</p>';
  }

  var COMMANDS = {
    help: { run: helpTable },
    about: { desc: 'who is this', run: function () { return FILES['about.txt'](); } },
    whoami: { hidden: true, run: function () { return '<p>a visitor. but you probably meant ' + cmd('about') + '</p>'; } },
    ls: {
      run: function (args) {
        var target = (args[0] || '').replace(/\/$/, '');
        if (target === '-la' || target === '-a' || target === '-l') target = args[1] || '';
        var inWriting = target === 'writing' || (cwd === '~/writing' && (!target || target === '.'));
        if (target === '~' || target === '..') inWriting = false;
        if (inWriting) return listWriting();
        if (target && target !== '.' && target !== '~' && target !== '..') {
          return '<p>ls: ' + esc(target) + ': No such file or directory</p>';
        }
        var extra = /-\w*a/.test(args.join(' ')) ? cmd('cat .secrets', '.secrets') + '  ' + cmd('cat .vault.bin', '.vault.bin') + '  ' : '';
        return '<p class="ls-row">' + extra + HOME.map(function (f) {
          return '<a href="#" class="cmd ' + f.cls + '" data-cmd="' + esc(f.run) + '">' + esc(f.name) + '</a>';
        }).join('  ') + '</p>';
      }
    },
    cd: {
      run: function (args) {
        var t = (args[0] || '~').replace(/\/$/, '');
        if (t === '~' || t === '..' || t === '/' || t === '') { setCwd('~'); return ''; }
        if (t === 'writing' || t === '~/writing') { setCwd('~/writing'); return '<p class="dim">try ' + cmd('ls') + '</p>'; }
        if (t === 'photos') return COMMANDS.photos.run();
        if (FILES[t]) return '<p>-bash: cd: ' + esc(t) + ': Not a directory</p>';
        return '<p>-bash: cd: ' + esc(t) + ': No such file or directory</p>';
      }
    },
    cat: {
      run: function (args) {
        var f = (args[0] || '').replace(/^writing\//, '');
        if (!f) return '<p class="dim">usage: cat about.txt</p>';
        if (f === '.secrets') return '<p>so you found the hidden files. nice.</p><p>the next one is a binary, and real reversers don\'t <span class="hl">cat</span> binaries. what would you run on a binary to find readable text in it?</p>';
        if (f === '.vault.bin') return '<pre class="wrap dim">' + esc('\u007fELF\u0002\u0001\u0001\u0000\u0000\u0000 @\u0000\u0038\u0000 \u0000\u0000 \u0000> \u0001\u0000 \u0090\u0010 \u0000...') + '</pre><p class="err">cat: .vault.bin: binary file. try <span class="hl">strings</span>.</p>';
        if (FILES[f]) return FILES[f]();
        var p = findPost(f);
        if (p) { startLess(p); return ''; }
        return '<p>cat: ' + esc(f) + ': No such file or directory</p>';
      }
    },
    less: {
      app: true,
      run: function (args) {
        var p = findPost(args.join(' ').replace(/^writing\//, ''));
        if (!args.length) return '<p class="dim">usage: less 1 (see ' + cmd('ls writing') + ')</p>';
        if (!p) return '<p>less: ' + esc(args.join(' ')) + ': No such file or directory</p>';
        startLess(p);
        return '';
      }
    },
    more: { hidden: true, app: true, run: function (a) { return COMMANDS.less.run(a); } },
    open: {
      run: function (args) {
        var t = (args[0] || '').toLowerCase();
        if (!t) return '<p class="dim">usage: open 1 | open photos | open github</p>';
        if (S.links[t]) { go(S.links[t], true); return '<p class="dim">opening ' + esc(t) + ' in a new tab...</p>'; }
        if (t === 'photos' || t === 'insta') return COMMANDS.photos.run();
        if (S.pages[t]) { go(S.pages[t]); return '<p class="dim">opening ' + esc(t) + '...</p>'; }
        var p = findPost(args.join(' '));
        if (p) { setTimeout(function () { go(p.url); }, 250); return '<p class="dim">opening ' + esc(p.title) + '...</p>'; }
        return '<p>open: nothing called "' + esc(args.join(' ')) + '". try ' + cmd('ls writing') + '</p>';
      }
    },
    photos: {
      run: function () {
        if (!S.links.instagram) return '<p>no photos yet</p>';
        return '<p>photos: ' + ext(S.links.instagram, '@' + slug(S.links.instagram)) + ' <span class="dim">(opens instagram)</span></p>';
      }
    },
    contact: { run: function () { return FILES['contact.txt'](); } },
    links: { run: function () { return FILES['links.txt'](); } },
    status: { run: function () { return '<p>' + statusHtml() + '</p>'; } },
    man: {
      run: function (args) {
        var t = (args[0] || '').toLowerCase();
        if (!t) return '<p>What manual page do you want?<br><span class="dim">try</span> ' + cmd('man divyanka') + '</p>';
        if (t === 'divyanka') return manDivyanka();
        if (t === 'man') return '<p>man: the manual for the manual is the manual. try ' + cmd('man divyanka') + '.</p>';
        if (COMMANDS[t] && !COMMANDS[t].hidden) {
          return '<pre>' + esc(t.toUpperCase()) + '(1)\n\n<b class="hl">NAME</b>\n       ' + esc(t) + ' - see <a href="#" class="cmd" data-cmd="help">help</a>. this is a very small operating system.</pre>';
        }
        return '<p>No manual entry for ' + esc(t) + '</p>';
      }
    },
    fortune: { run: function () { return '<pre class="wrap">' + esc(pick(FORTUNES)) + '</pre>'; } },
    cowsay: { run: function (args, stdin) { return '<pre>' + esc(cowsay(stdin || args.join(' '))) + '</pre>'; } },
    cowthink: { hidden: true, run: function (args, stdin) { return '<pre>' + esc(cowsay(stdin || args.join(' '), true)) + '</pre>'; } },
    weather: {
      run: function () {
        var b = print('<p class="dim">fetching london weather...</p>');
        weather(b);
        return '';
      }
    },
    neofetch: {
      run: function () {
        var s = status();
        var art = [
          '    .--.     ',
          '   |o_o |    ',
          '   |:_/ |    ',
          '  //   \\ \\   ',
          ' (|     | )  ',
          "/'\\_   _/`\\  ",
          '\\___)=(___/  '
        ].join('\n');
        var info = [
          ['', '<b class="u">divyanka@london</b>'],
          ['', '<span class="dim">---------------</span>'],
          ['os', 'London (GMT/BST)'],
          ['host', 'a hedge fund'],
          ['kernel', 'quant'],
          ['uptime', '2 years in london'],
          ['shell', 'divyanka.sh'],
          ['packages', S.posts.length + ' blog posts'],
          ['de', 'IIT Delhi (CSE)'],
          ['hobbies', 'bike, boulder, skate, clay'],
          ['pottery', 'lvl 1 (bowls: lopsided)'],
          ['theme', document.body.getAttribute('data-theme') || 'pastel'],
          ['mode', s.text]
        ].map(function (r) { return r[0] ? '<span class="h">' + r[0] + '</span>: ' + r[1] : r[1]; }).join('\n');
        return '<div class="neofetch"><pre class="art">' + esc(art) + '</pre><pre>' + info + '</pre></div>';
      }
    },
    top: { app: true, run: function () { startTop(); return ''; } },
    htop: { hidden: true, app: true, run: function () { startTop(); return ''; } },
    ps: {
      run: function () {
        var rows = procTable(false);
        return '<pre><span class="inv">USER       PID %CPU %MEM COMMAND                 </span>\n' + rows.map(function (r) {
          return r.user.padEnd(9) + ' ' + r.pid.padStart(4) + ' ' + r.cpu.toFixed(1).padStart(4) + ' ' + r.mem.toFixed(1).padStart(4) + ' ' + esc(r.cmd);
        }).join('\n') + '</pre><p class="dim">live view: ' + cmd('top') + '</p>';
      }
    },
    kill: { hidden: true, run: function (a) { return /hibernate/.test(a.join(' ')) || a.join(' ').indexOf('1') !== -1 ? '<p>-bash: kill: (1) - Operation not permitted. winter is coming.</p>' : '<p>-bash: kill: be nice.</p>'; } },
    sl: { app: true, run: function () { startSl(); return ''; } },
    cmatrix: { app: true, run: function () { startMatrix(); return ''; } },
    matrix: { hidden: true, app: true, run: function () { startMatrix(); return ''; } },
    theme: {
      run: function (args) {
        var t = (args[0] || '').toLowerCase();
        var cur = document.body.getAttribute('data-theme') || 'pastel';
        if (!t) {
          return '<p>current theme: <span class="hl">' + cur + '</span></p><p>' + THEMES.map(function (x) { return cmd('theme ' + x, x); }).join('  ') +
            '</p><p class="dim">pastel is the default. classic is the old xterm look; green and amber are old CRT monitor colours. your choice is remembered.</p>';
        }
        if (THEMES.indexOf(t) === -1) return '<p>theme: unknown theme "' + esc(t) + '". options: ' + THEMES.join(', ') + '</p>';
        applyTheme(t);
        store('theme', t);
        return '<p class="dim">theme set to ' + t + '.</p>';
      }
    },
    games: {
      run: function () {
        return '<table class="kv"><tr><td>' + cmd('snake') + '</td><td class="dim">eat, grow, don\'t hit the walls</td></tr>' +
          '<tr><td>' + cmd('2048') + '</td><td class="dim">slide numbers, merge to 2048</td></tr>' +
          '<tr><td>' + cmd('hangman') + '</td><td class="dim">guess nerdy words</td></tr></table>';
      }
    },
    snake: { app: true, run: function () { startSnake(); return ''; } },
    '2048': { app: true, run: function () { start2048(); return ''; } },
    hangman: { app: true, run: function () { startHangman(); return ''; } },
    date: {
      run: function () {
        var p = londonParts();
        return '<p>' + p.weekday + ' ' + p.month + ' ' + String(p.day).padStart(2, ' ') + ' ' + p.hour + ':' + p.minute + ':' + p.second + ' GMT/BST ' + p.year + ' <span class="dim">(london)</span></p>';
      }
    },
    history: {
      run: function () {
        if (!history.length) return '<p class="dim">(nothing yet)</p>';
        return '<pre>' + history.map(function (h, i) { return String(i + 1).padStart(4) + '  ' + esc(h); }).join('\n') + '</pre>';
      }
    },
    clear: { run: function () { out.innerHTML = ''; return ''; } },
    gui: { run: function () { go(S.pages.blog); return '<p class="dim">starting x11...</p>'; } },
    echo: { hidden: true, run: function (args) { return '<p>' + esc(args.join(' ')) + '</p>'; } },
    pwd: { hidden: true, run: function () { return '<p>/home/divyanka' + esc(cwd.replace('~', '')) + '</p>'; } },
    uptime: { hidden: true, run: function () { return '<p>up 2 years in london, 1 user, load average: tea, tea, tea</p>'; } },
    writing: { hidden: true, run: function () { return listWriting(); } },
    blog: { hidden: true, run: function () { return listWriting(); } },
    sudo: { hidden: true, run: function () { return '<p>divyanka is not in the sudoers file. This incident will be reported.</p>'; } },
    rm: { hidden: true, run: function () { return '<p>nice try.</p>'; } },
    exit: { hidden: true, run: function () { return '<p>there is no escape. (psst: ' + cmd('gui') + ')</p>'; } },
    logout: { hidden: true, run: function () { return '<p>there is no escape. (psst: ' + cmd('gui') + ')</p>'; } },
    vim: { hidden: true, run: function () { return '<p>you are now trapped in vim. just kidding. <span class="dim">:q!</span></p>'; } },
    emacs: { hidden: true, run: function () { return '<p>great operating system, lacks a decent editor.</p>'; } },
    hello: { hidden: true, run: function () { return '<p>hi :)</p>'; } },
    hi: { hidden: true, run: function () { return '<p>hello :)</p>'; } },
    pottery: {
      hidden: true,
      run: function () { return '<pre class="art">' + esc('   ~  ~\n  _______\n \\       /\n  \\_____/   <- bowl #1. it wobbles.') + '</pre>'; }
    },
    coffee: { hidden: true, run: function () { return '<p>418 I\'m a teapot.</p>'; } },
    tea: { hidden: true, run: function () { return '<pre>' + esc('   ( (\n    ) )\n  ........\n  |      |]\n  \\      /\n   `----\'   brewing. 4 minutes.') + '</pre>'; } },
    make: { hidden: true, run: function (a) { return a.join(' ') === 'me a sandwich' ? '<p>What? Make it yourself.</p>' : '<p>make: *** No rule to make target \'' + esc(a.join(' ') || 'all') + '\'.  Stop.</p>'; } },
    ssh: { hidden: true, run: function () { return '<p>ssh: connect to host: you\'re already here.</p>'; } },
    git: { hidden: true, run: function () { return '<p>' + ext(S.source, 'this site is on github') + '. PRs welcome.</p>'; } },
    strings: {
      hidden: true,
      run: function (a, stdin) {
        var f = a[0];
        if (f === '.vault.bin' || f === './.vault.bin') return '<pre>' + esc(VAULT_STRINGS.join('\n')) + '</pre>';
        if (stdin !== undefined) return '<pre class="wrap">' + esc(stdin) + '</pre>';
        if (!f) return '<p class="dim">usage: strings &lt;file&gt;</p>';
        return '<p>strings: \'' + esc(f) + '\': No such file</p>';
      }
    },
    file: { hidden: true, run: function (a) { return a[0] === '.vault.bin' ? '<p>.vault.bin: ELF 64-bit LSB executable, x86-64, not stripped (encrypted with love)</p>' : a[0] ? '<p>' + esc(a[0]) + ': ASCII text, probably</p>' : '<p class="dim">usage: file &lt;file&gt;</p>'; } },
    hexdump: { hidden: true, run: function (a) { return a[0] === '.vault.bin' ? '<pre>00000000  7f 45 4c 46 02 01 01 00  00 00 00 00 00 00 00 00  |.ELF............|\n*\n</pre><p class="dim">that\'s a lot of hex. something friendlier pulls out the readable bits.</p>' : '<p class="dim">usage: hexdump &lt;file&gt;</p>'; } },
    xxd: { hidden: true, run: function (a) { return COMMANDS.hexdump.run(a); } },
    objdump: { hidden: true, run: function (a) { return a.join(' ').indexOf('.vault.bin') !== -1 ? '<p>objdump: disassembling 4,096 instructions of hand-written assembly... respect, but there\'s a faster way to find text in a binary.</p>' : '<p class="dim">usage: objdump -d &lt;file&gt;</p>'; } },
    rot13: { hidden: true, run: function (a, stdin) { return '<pre class="wrap">' + esc(rot13(stdin !== undefined ? stdin : a.join(' '))) + '</pre>'; } },
    unlock: { hidden: true, run: function (a) { return unlockVault(a.join(' ')); } },
    snow: {
      hidden: true,
      app: true,
      run: function () {
        if (!vaultCracked()) return '<p>-bash: snow: command not found</p>';
        startSnow();
        return '';
      }
    },
    // pipe filters (also usable on their own)
    grep: { hidden: true, run: function (a, stdin) { if (stdin === undefined) return '<p class="dim">usage: fortune | grep word</p>'; var q = a.join(' ').toLowerCase(); return '<pre class="wrap">' + esc(stdin.split('\n').filter(function (l) { return l.toLowerCase().indexOf(q) !== -1; }).join('\n')) + '</pre>'; } },
    wc: { hidden: true, run: function (a, stdin) { var t = stdin || ''; return '<pre>' + [t ? t.split('\n').length : 0, t.split(/\s+/).filter(Boolean).length, t.length].map(function (n) { return String(n).padStart(8); }).join('') + '</pre>'; } },
    head: { hidden: true, run: function (a, stdin) { return '<pre class="wrap">' + esc((stdin || '').split('\n').slice(0, 10).join('\n')) + '</pre>'; } },
    tail: { hidden: true, run: function (a, stdin) { return '<pre class="wrap">' + esc((stdin || '').split('\n').slice(-10).join('\n')) + '</pre>'; } },
    sort: { hidden: true, run: function (a, stdin) { return '<pre class="wrap">' + esc((stdin || '').split('\n').sort().join('\n')) + '</pre>'; } },
    rev: { hidden: true, run: function (a, stdin) { return '<pre class="wrap">' + esc((stdin || a.join(' ')).split('\n').map(function (l) { return l.split('').reverse().join(''); }).join('\n')) + '</pre>'; } }
  };
  var ALIASES = { '?': 'help', 'll': 'ls', 'dir': 'ls', 'instagram': 'photos', 'insta': 'photos', 'email': 'contact', 'socials': 'links', 'github': 'git', 'game': 'games', 'play': 'games', 'clr': 'clear', 'cls': 'clear' };

  /* ---------- run ---------- */

  function resolve(word) {
    var name = word.toLowerCase();
    return ALIASES[name] || name;
  }

  function runPipeline(segments) {
    var text;
    for (var i = 0; i < segments.length; i++) {
      var parts = segments[i].split(/\s+/).filter(Boolean);
      if (!parts.length) return '<p>-bash: syntax error near unexpected token `|\'</p>';
      var name = resolve(parts[0]);
      var c = COMMANDS[name];
      if (!c) return '<p>-bash: ' + esc(parts[0]) + ': command not found</p>';
      if (c.app) return '<p>-bash: ' + esc(name) + ': can\'t be used in a pipe (it\'s interactive)</p>';
      var html = c.run(parts.slice(1), text);
      if (i === segments.length - 1) return html;
      text = htmlToText(html);
    }
    return '';
  }

  function run(raw) {
    stopApp(true);
    var line = String(raw).trim();
    echoPrompt(line);
    if (line) history.push(line);
    hIdx = history.length;
    if (!line) return scrollDown();

    var html;
    if (line.indexOf('|') !== -1) {
      html = runPipeline(line.split('|').map(function (s) { return s.trim(); }));
    } else {
      var parts = line.split(/\s+/);
      var name = resolve(parts[0]);
      var args = parts.slice(1);
      if (name === './.vault.bin') { name = 'unlock'; if (!args.length) { print('<p>enter password: <span class="dim">(usage: ./.vault.bin &lt;password&gt;)</span></p>'); return scrollDown(); } }
      else if (name.indexOf('./') === 0) { args = [name.slice(2)].concat(args); name = 'open'; }
      var c = COMMANDS[name];
      html = c ? c.run(args) : '<p>-bash: ' + esc(parts[0]) + ': command not found <span class="dim">(try</span> ' + cmd('help') + '<span class="dim">)</span></p>';
    }
    if (html) print(html);
    scrollDown();
  }

  /* ---------- tab completion ---------- */

  function completions(value) {
    var parts = value.split(/\s+/);
    if (parts.length <= 1) {
      return Object.keys(COMMANDS).filter(function (k) { return !COMMANDS[k].hidden; })
        .filter(function (k) { return k.indexOf(parts[0].toLowerCase()) === 0; });
    }
    var first = resolve(parts[0]);
    var last = parts[parts.length - 1].toLowerCase();
    var pool;
    if (first === 'theme') pool = THEMES;
    else if (first === 'man') pool = ['divyanka'];
    else pool = Object.keys(FILES).concat(['writing/']).concat(Object.keys(S.links)).concat(S.posts.map(function (p) { return slug(p.url); }));
    if (last.charAt(0) === '.') pool = pool.concat(['.secrets', '.vault.bin']);
    return pool.filter(function (k) { return k.indexOf(last) === 0; });
  }
  function complete() {
    var v = input.value;
    var c = completions(v);
    if (!c.length) return;
    var parts = v.split(/\s+/);
    if (c.length === 1) {
      parts[parts.length - 1] = c[0];
      input.value = parts.join(' ') + (parts.length === 1 ? ' ' : '');
    } else {
      echoPrompt(v);
      print('<p class="ls-row">' + c.map(function (x) { return esc(x); }).join('  ') + '</p>');
      var prefix = c.reduce(function (a, b) { var i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(0, i); });
      parts[parts.length - 1] = prefix;
      input.value = parts.join(' ');
      scrollDown();
    }
  }

  /* ---------- events ---------- */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value;
    input.value = '';
    run(v);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') { e.preventDefault(); complete(); }
    else if (e.key === 'ArrowUp') {
      if (hIdx > 0) { hIdx--; input.value = history[hIdx]; }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (hIdx < history.length - 1) { hIdx++; input.value = history[hIdx]; }
      else { hIdx = history.length; input.value = ''; }
      e.preventDefault();
    } else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
    else if (e.key === 'c' && e.ctrlKey && !window.getSelection().toString()) {
      e.preventDefault(); echoPrompt(input.value + '^C'); input.value = ''; scrollDown();
    }
  });

  // keys go to the running program, if any
  document.addEventListener('keydown', function (e) {
    if (!app) return;
    if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      if (app.name !== 'sl') stopApp();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var key = e.key.length === 1 && e.key !== 'G' ? e.key.toLowerCase() : e.key;
    if (app.key && app.key(key, e)) e.preventDefault();
  });

  document.addEventListener('click', function (e) {
    var dir = e.target.closest('[data-dir]');
    if (dir) { e.preventDefault(); if (app && app.dirIn) app.dirIn(dir.getAttribute('data-dir')); return; }
    var letter = e.target.closest('[data-letter]');
    if (letter) { e.preventDefault(); if (app && app.letter) app.letter(letter.getAttribute('data-letter')); return; }
    var act = e.target.closest('[data-app]');
    if (act) { e.preventDefault(); if (app && app.action) app.action(act.getAttribute('data-app')); return; }
    var el = e.target.closest('[data-cmd]');
    if (!el) return;
    e.preventDefault();
    run(el.getAttribute('data-cmd'));
    if (!isTouch && !app) input.focus();
  });

  // swipes steer games on touch screens
  var touchStart = null;
  body.addEventListener('touchstart', function (e) {
    if (!app || !app.dirIn) return;
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  body.addEventListener('touchend', function (e) {
    if (!app || !app.dirIn || !touchStart) return;
    var dx = e.changedTouches[0].clientX - touchStart.x;
    var dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    app.dirIn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && app && app.hide) app.hide();
  });

  // clicking empty terminal space focuses the prompt (but don't steal text selections)
  body.addEventListener('mouseup', function (e) {
    if (app) return;
    if (e.target.closest('a, button, input')) return;
    if (window.getSelection().toString()) return;
    input.focus({ preventScroll: true });
  });

  /* ---------- boot ---------- */

  var savedTheme = store('theme');
  if (savedTheme && THEMES.indexOf(savedTheme) !== -1) applyTheme(savedTheme);

  var statusEl = document.getElementById('status');
  if (statusEl) statusEl.innerHTML = statusHtml();
  var lastLogin = document.getElementById('last-login');
  if (lastLogin) {
    // classic `last` format: "Wed Oct 14 22:30:01"
    var p = londonParts();
    lastLogin.textContent = p.weekday + ' ' + p.month + ' ' + String(p.day).padStart(2, ' ') + ' ' + p.hour + ':' + p.minute + ':' + p.second;
  }
  if (!isTouch) input.focus({ preventScroll: true });

  // for the people who open devtools
  try {
    console.log(
      '%chey, nerd.%c\nyou opened devtools on a personal website. respect.\nthe source is here: ' + S.source + '\ntry `fortune | cowsay`, `sl`, or `ls -a` in the terminal.',
      'font: 700 14px monospace; color: #f5b8d6',
      'font: 12px monospace; color: inherit'
    );
  } catch (e) { /* noop */ }
})();
