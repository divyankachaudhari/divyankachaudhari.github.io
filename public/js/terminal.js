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
  function print(html, cls) {
    var div = document.createElement('div');
    div.className = 'block' + (cls ? ' ' + cls : '');
    div.innerHTML = html;
    out.appendChild(div);
    return div;
  }
  function echoPrompt(text) {
    print(
      '<span class="ps1"><span class="u">divyanka</span><span class="dim">@</span><span class="h">london</span>' +
      '<span class="dim">:</span><span class="p">' + esc(cwd) + '</span><span class="dim">$</span></span> ' + esc(text),
      'echo'
    );
  }
  function scrollDown() {
    body.scrollTop = body.scrollHeight;
  }
  function setCwd(dir) {
    cwd = dir;
    document.querySelectorAll('.cwd').forEach(function (el) { el.textContent = dir; });
  }
  function go(url, newTab) {
    if (newTab) window.open(url, '_blank', 'noopener');
    else window.location.href = url;
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
    if (m.n === 12 || m.n <= 2) return { icon: '❄', cls: 'cold', text: 'hibernating', note: 'it\'s ' + m.name + ' in london. try again in summer.' };
    if (m.n <= 4) return { icon: '🌱', cls: 'warm', text: 'waking up', note: m.name + ' in london. blinking at the sun.' };
    if (m.n <= 8) return { icon: '☀', cls: 'hot', text: 'outside', note: m.name + ' in london. probably on a bike.' };
    if (m.n <= 10) return { icon: '🍂', cls: 'warm', text: 'preparing to hibernate', note: m.name + ' in london. stockpiling snacks.' };
    return { icon: '❄', cls: 'cold', text: 'hibernating', note: 'it\'s ' + m.name + ' in london. try again in summer.' };
  }
  function statusHtml() {
    var s = status();
    return '<span class="' + s.cls + '">' + s.icon + ' ' + esc(s.text) + '</span> <span class="dim">(' + esc(s.note) + ')</span>';
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
        '<p class="dim">more: ' + cmd('ls writing', 'writing') + ' · ' + cmd('photos') + ' · ' + cmd('neofetch') +
        ' · <a href="' + esc(S.pages.about) + '">about page</a></p>'
      ].join(' ');
    },
    'contact.txt': function () {
      return [
        '<p>Say hi. I read everything, eventually (faster in summer).</p>',
        '<table class="kv">',
        '<tr><td>form</td><td>' + ext(S.contactForm, 'anonymous-friendly contact form') + '</td></tr>',
        S.links.x ? '<tr><td>x</td><td>' + ext(S.links.x, '@' + slug(S.links.x)) + ' (DMs open-ish)</td></tr>' : '',
        S.links.linkedin ? '<tr><td>linkedin</td><td>' + ext(S.links.linkedin, 'divyanka-chaudhari') + '</td></tr>' : '',
        '</table>'
      ].join('');
    },
    'links.txt': function () {
      var rows = [
        ['github', S.links.github],
        ['linkedin', S.links.linkedin],
        ['x', S.links.x],
        ['instagram', S.links.instagram]
      ].filter(function (r) { return r[1]; }).map(function (r) {
        return '<tr><td>' + r[0] + '</td><td>' + ext(r[1], r[1].replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + '</td></tr>';
      });
      return '<table class="kv">' + rows.join('') + '</table>';
    }
  };

  function findPost(q) {
    q = String(q || '').toLowerCase().replace(/\.md$/, '');
    if (/^\d+$/.test(q)) return S.posts[Number(q) - 1];
    var exact = S.posts.filter(function (p) { return slug(p.url) === q; })[0];
    if (exact) return exact;
    return S.posts.filter(function (p) {
      return slug(p.url).indexOf(q) !== -1 || p.title.toLowerCase().indexOf(q) !== -1;
    })[0];
  }

  function listWriting() {
    if (!S.posts.length) return '<p class="dim">(empty. she\'s hibernating.)</p>';
    var rows = S.posts.map(function (p, i) {
      return '<tr><td class="dim">' + (i + 1) + '</td><td class="dim">' + esc(p.date) + '</td><td>' +
        '<a href="' + esc(p.url) + '">' + esc(p.title) + '</a></td></tr>';
    });
    return '<table class="ls">' + rows.join('') + '</table>' +
      '<p class="dim">click a title, or type <span class="hl">open 1</span></p>';
  }

  /* ---------- commands ---------- */

  var COMMANDS = {
    help: {
      desc: 'you are here',
      run: function () {
        var list = ['about', 'ls', 'cd', 'cat', 'open', 'photos', 'contact', 'links', 'status', 'neofetch', 'date', 'history', 'clear', 'gui'];
        var rows = list.map(function (n) {
          return '<tr><td>' + cmd(n === 'ls' ? 'ls' : n === 'cd' ? 'cd writing' : n === 'cat' ? 'cat about.txt' : n === 'open' ? 'open 1' : n, n) +
            '</td><td class="dim">' + esc(COMMANDS[n].desc) + '</td></tr>';
        });
        return '<table class="kv">' + rows.join('') + '</table>' +
          '<p class="dim">tab completes · ↑/↓ for history · ctrl+l clears · there are a few hidden ones too</p>';
      }
    },
    about: { desc: 'who is this', run: function () { return FILES['about.txt'](); } },
    whoami: { hidden: true, run: function () { return '<p>a visitor. but you probably meant ' + cmd('about') + '</p>'; } },
    ls: {
      desc: 'list files',
      run: function (args) {
        var target = (args[0] || '').replace(/\/$/, '');
        if (target === '-la' || target === '-a' || target === '-l') target = args[1] || '';
        var inWriting = target === 'writing' || (cwd === '~/writing' && (!target || target === '.'));
        if (target === '~' || target === '..') inWriting = false;
        if (inWriting) return listWriting();
        if (target && target !== '.' && target !== '~' && target !== '..') {
          return '<p>ls: ' + esc(target) + ': No such file or directory</p>';
        }
        var extra = args.join(' ').indexOf('a') !== -1 && args.join(' ').indexOf('-') !== -1
          ? '<span class="dim">.secrets</span>  ' : '';
        return '<p class="ls-row">' + extra + HOME.map(function (f) {
          return '<a href="#" class="cmd ' + f.cls + '" data-cmd="' + esc(f.run) + '">' + esc(f.name) + '</a>';
        }).join('  ') + '</p>';
      }
    },
    cd: {
      desc: 'change directory',
      run: function (args) {
        var t = (args[0] || '~').replace(/\/$/, '');
        if (t === '~' || t === '..' || t === '/' || t === '') { setCwd('~'); return ''; }
        if (t === 'writing' || t === '~/writing') { setCwd('~/writing'); return '<p class="dim">try ' + cmd('ls') + '</p>'; }
        if (t === 'photos') return COMMANDS.photos.run();
        if (FILES[t]) return '<p>cd: not a directory: ' + esc(t) + '</p>';
        return '<p>cd: no such file or directory: ' + esc(t) + '</p>';
      }
    },
    cat: {
      desc: 'read a file',
      run: function (args) {
        var f = args[0];
        if (!f) return '<p class="dim">usage: cat about.txt</p>';
        if (f === '.secrets') return '<p>i once beat a CTF flag out of a binary with nothing but patience and objdump. that\'s the secret.</p>';
        if (FILES[f]) return FILES[f]();
        var p = findPost(f);
        if (p) { setTimeout(function () { go(p.url); }, 350); return '<p class="dim">that\'s a long one. opening ' + esc(p.title) + '…</p>'; }
        return '<p>cat: ' + esc(f) + ': No such file or directory</p>';
      }
    },
    open: {
      desc: 'open a post or link',
      run: function (args) {
        var t = (args[0] || '').toLowerCase();
        if (!t) return '<p class="dim">usage: open 1 · open photos · open github</p>';
        if (S.links[t]) { go(S.links[t], true); return '<p class="dim">opening ' + esc(t) + ' in a new tab…</p>'; }
        if (t === 'photos' || t === 'insta') return COMMANDS.photos.run();
        if (S.pages[t]) { go(S.pages[t]); return '<p class="dim">opening ' + esc(t) + '…</p>'; }
        var p = findPost(args.join(' '));
        if (p) { setTimeout(function () { go(p.url); }, 250); return '<p class="dim">opening ' + esc(p.title) + '…</p>'; }
        return '<p>open: nothing called "' + esc(args.join(' ')) + '". try ' + cmd('ls writing') + '</p>';
      }
    },
    photos: {
      desc: 'my photography',
      run: function () {
        if (!S.links.instagram) return '<p>no photos yet</p>';
        return '<p>📷 ' + ext(S.links.instagram, '@' + slug(S.links.instagram)) + ' <span class="dim">(opens instagram)</span></p>';
      }
    },
    contact: { desc: 'how to reach me', run: function () { return FILES['contact.txt'](); } },
    links: { desc: 'everywhere else', run: function () { return FILES['links.txt'](); } },
    status: { desc: 'current mode', run: function () { return '<p>' + statusHtml() + '</p>'; } },
    neofetch: {
      desc: 'system info',
      run: function () {
        var s = status();
        var art = [
          '   ▄▄▄▄▄▄▄   ',
          '  █ ◕   ◕ █  ',
          '  █   ▽   █  ',
          '  █▄▄▄▄▄▄▄█  ',
          '   ▀▀   ▀▀   '
        ].join('\n');
        var info = [
          ['', '<b class="u">divyanka</b><span class="dim">@</span><b class="h">london</b>'],
          ['', '<span class="dim">───────────────</span>'],
          ['os', 'London (GMT/BST)'],
          ['host', 'a hedge fund'],
          ['kernel', 'quant'],
          ['uptime', '2 years in london'],
          ['shell', 'divyanka.sh'],
          ['packages', S.posts.length + ' blog posts'],
          ['de', 'IIT Delhi (CSE)'],
          ['hobbies', 'bike, boulder, skate, clay'],
          ['pottery', 'lvl 1 (bowls: lopsided)'],
          ['mode', s.icon + ' ' + s.text]
        ].map(function (r) {
          return r[0] ? '<span class="h">' + r[0] + '</span>: ' + r[1] : r[1];
        }).join('\n');
        return '<div class="neofetch"><pre class="art">' + esc(art) + '</pre><pre>' + info + '\n\n' +
          '<span class="sw s1">██</span><span class="sw s2">██</span><span class="sw s3">██</span><span class="sw s4">██</span><span class="sw s5">██</span><span class="sw s6">██</span></pre></div>';
      }
    },
    date: {
      desc: 'time in london',
      run: function () {
        return '<p>' + esc(new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'full', timeStyle: 'short' })) + ' <span class="dim">(london)</span></p>';
      }
    },
    history: {
      desc: 'what you typed',
      run: function () {
        if (!history.length) return '<p class="dim">(nothing yet)</p>';
        return '<pre>' + history.map(function (h, i) { return String(i + 1).padStart(4) + '  ' + esc(h); }).join('\n') + '</pre>';
      }
    },
    clear: { desc: 'clean slate', run: function () { out.innerHTML = ''; return ''; } },
    gui: { desc: 'the normal website', run: function () { go(S.pages.about); return '<p class="dim">booting gui…</p>'; } },
    echo: { hidden: true, run: function (args) { return '<p>' + esc(args.join(' ')) + '</p>'; } },
    pwd: { hidden: true, run: function () { return '<p>/home/divyanka' + esc(cwd.replace('~', '')) + '</p>'; } },
    writing: { hidden: true, run: function () { return listWriting(); } },
    blog: { hidden: true, run: function () { return listWriting(); } },
    sudo: { hidden: true, run: function () { return '<p>divyanka is not in the sudoers file. This incident will be reported.</p>'; } },
    rm: { hidden: true, run: function () { return '<p>nice try.</p>'; } },
    exit: { hidden: true, run: function () { return '<p>there is no escape. (psst: ' + cmd('gui') + ')</p>'; } },
    vim: { hidden: true, run: function () { return '<p>you are now trapped in vim. just kidding. <span class="dim">:q!</span></p>'; } },
    emacs: { hidden: true, run: function () { return '<p>great operating system, lacks a decent editor.</p>'; } },
    hello: { hidden: true, run: function () { return '<p>hi :)</p>'; } },
    hi: { hidden: true, run: function () { return '<p>hello :)</p>'; } },
    pottery: {
      hidden: true,
      run: function () {
        return '<pre class="art">' + esc('   ~  ~\n  _______\n \\       /\n  \\_____/   <- bowl #1. it wobbles.') + '</pre>';
      }
    },
    coffee: { hidden: true, run: function () { return '<p>418 I\'m a teapot.</p>'; } },
    make: { hidden: true, run: function (a) { return a.join(' ') === 'me a sandwich' ? '<p>What? Make it yourself.</p>' : '<p>make: *** No rule to make target \'' + esc(a.join(' ') || 'all') + '\'.  Stop.</p>'; } },
    ssh: { hidden: true, run: function () { return '<p>ssh: connect to host: you\'re already here.</p>'; } },
    git: { hidden: true, run: function () { return '<p>' + ext(S.source, 'this site is on github') + '. PRs welcome.</p>'; } }
  };
  var ALIASES = { '?': 'help', 'man': 'help', 'll': 'ls', 'dir': 'ls', 'instagram': 'photos', 'insta': 'photos', 'email': 'contact', 'socials': 'links', 'github': 'git' };

  /* ---------- run ---------- */

  function run(raw) {
    var line = String(raw).trim();
    echoPrompt(line);
    if (line) { history.push(line); }
    hIdx = history.length;
    if (!line) return scrollDown();

    var parts = line.split(/\s+/);
    var name = parts[0].toLowerCase();
    name = ALIASES[name] || name;
    var args = parts.slice(1);

    // `cat writing/foo` and `./something` niceties
    if (name.indexOf('./') === 0) { args = [name.slice(2)].concat(args); name = 'open'; }

    var c = COMMANDS[name];
    var html;
    if (c) {
      html = c.run(args);
    } else {
      html = '<p>zsh: command not found: ' + esc(parts[0]) + ' <span class="dim">· try</span> ' + cmd('help') + '</p>';
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
    var last = parts[parts.length - 1].toLowerCase();
    var pool = Object.keys(FILES).concat(['writing/']).concat(Object.keys(S.links)).concat(S.posts.map(function (p) { return slug(p.url); }));
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
      // extend to the longest common prefix
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

  // clicking a command anywhere runs it, like typing it
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-cmd]');
    if (!el) return;
    e.preventDefault();
    run(el.getAttribute("data-cmd"));
    if (!isTouch) input.focus();
  });

  // clicking empty terminal space focuses the prompt (but don't steal text selections)
  body.addEventListener('mouseup', function (e) {
    if (e.target.closest('a, button, input')) return;
    if (window.getSelection().toString()) return;
    input.focus({ preventScroll: true });
  });

  /* ---------- boot ---------- */

  var statusEl = document.getElementById('status');
  if (statusEl) statusEl.innerHTML = statusHtml();
  var lastLogin = document.getElementById('last-login');
  if (lastLogin) {
    lastLogin.textContent = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  if (!isTouch) input.focus({ preventScroll: true });

  // for the people who open devtools
  try {
    console.log(
      '%chey, nerd 👋%c\nyou opened devtools on a personal website. respect.\nthe source is here: ' + S.source + '\ntry typing `neofetch` in the terminal, or `ls -a`.',
      'font: 700 16px "JetBrains Mono", monospace; color: #f29bb8',
      'font: 12px "JetBrains Mono", monospace; color: inherit'
    );
  } catch (e) { /* noop */ }
})();
