/* App shell: content registry, progress, device check, router and pages. */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h;

  /* ---------------- content registry ---------------- */
  var content = QG.content = { tracks: [], lessons: {}, order: [] };
  content.registerTrack = function (t) { t.lessons = t.lessons || []; content.tracks.push(t); content.tracks.sort(function (a, b) { return a.num - b.num; }); };
  content.register = function (l) {
    content.lessons[l.id] = l;
    var t = content.track(l.track); if (t && t.lessons.indexOf(l.id) < 0) t.lessons.push(l.id);
  };
  content.track = function (id) { for (var i = 0; i < content.tracks.length; i++) if (content.tracks[i].id === id) return content.tracks[i]; return null; };
  content.allLessons = function () { var a = []; content.tracks.forEach(function (t) { t.lessons.forEach(function (id) { a.push(id); }); }); return a; };
  QG.widgets = QG.widgets || {};
  QG.labs = QG.labs || {};
  QG.labList = QG.labList || [];

  /* ---------------- progress ---------------- */
  var progress = QG.progress = {
    data: function () { return ui.store.get('progress', { lessons: {}, challenges: {}, last: null }); },
    save: function (d) { ui.store.set('progress', d); },
    lessonDone: function (id) { var d = progress.data(); return !!(d.lessons[id] && d.lessons[id].done); },
    markLesson: function (id, extra) { var d = progress.data(); d.lessons[id] = Object.assign(d.lessons[id] || {}, { done: true, at: Date.now() }, extra || {}); progress.save(d); },
    setQuiz: function (id, score, total) { var d = progress.data(); d.lessons[id] = Object.assign(d.lessons[id] || {}, { quiz: score, quizTotal: total }); progress.save(d); },
    markChallenge: function (id) { var d = progress.data(); if (!d.challenges[id]) { d.challenges[id] = Date.now(); progress.save(d); return true; } return false; },
    setLast: function (id) { var d = progress.data(); d.last = id; progress.save(d); },
    trackPct: function (t) { if (!t.lessons.length) return 0; var n = t.lessons.filter(progress.lessonDone).length; return n / t.lessons.length; }
  };

  /* ---------------- device check ---------------- */
  QG.device = {
    info: null,
    check: function () {
      var mem = navigator.deviceMemory || null, cores = navigator.hardwareConcurrency || 2;
      var mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (window.matchMedia && matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 820);
      // quick benchmark: 16-qubit Hadamard layer
      var sv = new QG.StateVector(16), m = QG.gates.matrix1('h'), t0 = performance.now(), reps = 0;
      while (performance.now() - t0 < 60) { sv.apply1(reps % 16, m); reps++; }
      var msPerGate16 = (performance.now() - t0) / reps, msPerGate20 = msPerGate16 * 16;
      var maxQ = 20;
      if (mobile || (mem && mem < 4)) maxQ = 18;
      else if (mem && mem >= 8 && msPerGate20 < 4) maxQ = 22;
      var info = { cores: cores, memGB: mem, mobile: mobile, msPerGate16: msPerGate16, msPerGate20: msPerGate20, maxQubits: maxQ, maxDensityQubits: 10, worker: QG.worker ? QG.worker.ensure() : 'main', storage: ui.store.available() };
      QG.device.info = info;
      return info;
    }
  };

  /* ---------------- glossary popovers ---------------- */
  QG.glossary = QG.glossary || {};
  function attachGlossary(root) {
    ui.$$('[data-term]', root).forEach(function (el) {
      var key = el.getAttribute('data-term').toLowerCase(), def = QG.glossary[key];
      if (!def) return;
      el.classList.add('gloss-term'); el.setAttribute('tabindex', '0');
      var pop = null;
      function show() { if (pop) return; pop = h('div', { class: 'gloss-pop', role: 'tooltip', html: '<strong>' + ui.esc(def.term) + '</strong><br>' + QG.math.process(def.def) }); document.body.appendChild(pop); var r = el.getBoundingClientRect(); pop.style.left = Math.max(8, Math.min(window.innerWidth - 336, r.left + window.scrollX)) + 'px'; pop.style.top = (r.bottom + window.scrollY + 6) + 'px'; }
      function hide() { if (pop) { pop.remove(); pop = null; } }
      el.addEventListener('mouseenter', show); el.addEventListener('mouseleave', hide); el.addEventListener('focus', show); el.addEventListener('blur', hide);
    });
  }

  /* ---------------- quiz ---------------- */
  function renderQuiz(lesson) {
    var box = h('div', { class: 'card' }), score = 0, answered = 0, total = lesson.quiz.length;
    var result = h('div', { class: 'small muted', style: { marginTop: '8px' } }, 'Answer all ' + total + ' questions to finish the check.');
    lesson.quiz.forEach(function (q, qi) {
      var wrap = h('div', { class: 'quiz-q' }, h('div', { html: '<strong>' + (qi + 1) + '.</strong> ' + QG.math.process(q.q) }));
      var opts = h('div', { class: 'opts', role: 'group', 'aria-label': 'Question ' + (qi + 1) }), why = h('div', { class: 'why', 'aria-live': 'polite' }), done = false;
      q.options.forEach(function (o, oi) {
        var b = h('button', { class: 'opt', html: QG.math.process(o), onclick: function () {
          if (done) return; done = true; answered++;
          var right = oi === q.answer; if (right) score++;
          b.classList.add(right ? 'right' : 'wrong');
          if (!right) opts.children[q.answer].classList.add('right');
          why.innerHTML = (right ? '<span class="ok-text">Correct.</span> ' : '<span class="warn-text">Not quite.</span> ') + QG.math.process(q.why || '');
          if (answered === total) {
            progress.setQuiz(lesson.id, score, total);
            result.innerHTML = 'Score: <strong>' + score + ' / ' + total + '</strong>. ' + (score === total ? '<span class="ok-text">Perfect!</span>' : 'Review the explanations above, then try the next lesson.');
            progress.markLesson(lesson.id); updateTocMarks();
          }
        } });
        opts.appendChild(b);
      });
      wrap.appendChild(opts); wrap.appendChild(why); box.appendChild(wrap);
    });
    box.appendChild(result);
    return box;
  }

  /* ---------------- widgets mounting ---------------- */
  function mountWidgets(root, lesson) {
    ui.$$('[data-widget]', root).forEach(function (el) {
      var name = el.getAttribute('data-widget'), opts = {};
      try { opts = JSON.parse(el.getAttribute('data-opts') || '{}'); } catch (e) { console.warn('bad widget opts', e); }
      opts.lessonId = lesson && lesson.id;
      el.classList.add('widget');
      if (QG.widgets[name]) { try { QG.widgets[name](el, opts); } catch (e) { el.appendChild(h('div', { class: 'err-text' }, 'Widget error: ' + e.message)); console.error(e); } }
      else el.appendChild(h('div', { class: 'muted small' }, 'Widget "' + name + '" is not available yet.'));
    });
  }
  QG.mountWidgets = mountWidgets;

  /* ---------------- pages ---------------- */
  var main = null;
  var TRACK_COLORS = ['c-blue', 'c-green', 'c-yellow'];

  function logoSVG() {
    return '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="none" stroke="#1a73e8" stroke-width="3"/><ellipse cx="20" cy="20" rx="16" ry="6" fill="none" stroke="#34a853" stroke-width="2.4"/><line x1="20" y1="20" x2="29" y2="9" stroke="#fbbc04" stroke-width="3" stroke-linecap="round"/><circle cx="29" cy="9" r="3.4" fill="#fbbc04"/><circle cx="20" cy="20" r="2.2" fill="#1a73e8"/></svg>';
  }
  QG.logoSVG = logoSVG;

  /* YouTube videos as click-to-play cards: nothing is fetched from YouTube until the student presses play. */
  var VIDEOS = [
    { id: '0yufc_Sdnjc', label: 'Explainer', col: 'blue', desc: 'What a quantum computer is and how it differs from a normal one.' },
    { id: '8HOWnQOAm4c', label: 'For Kids', col: 'green', desc: 'A gentle, picture-first introduction for young learners.' },
    { id: 'DlblgbPW-lo', label: 'Futuristic', col: 'yellow', desc: 'Where quantum computing might take science and technology next.' }];
  function videoRow() {
    var row = h('div', { class: 'video-row' });
    VIDEOS.forEach(function (v) {
      var frame = h('div', { class: 'video-frame v-' + v.col });
      var play = h('button', { class: 'video-play', 'aria-label': 'Play the ' + v.label + ' video (loads from YouTube)', onclick: function () {
        frame.innerHTML = '';
        frame.appendChild(h('iframe', { src: 'https://www.youtube-nocookie.com/embed/' + v.id + '?rel=0', title: v.label + ' video on quantum computing', allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture', allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin' }));
      } }, h('span', { class: 'video-tri', 'aria-hidden': 'true' }), h('span', { class: 'video-tag' }, v.label));
      // YouTube's own thumbnail; if it cannot load (offline), the coloured background shows instead.
      var thumb = h('img', { class: 'video-thumb', src: 'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg', alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
      thumb.addEventListener('error', function () { thumb.remove(); frame.classList.remove('has-thumb'); });
      thumb.addEventListener('load', function () { frame.classList.add('has-thumb'); });
      frame.appendChild(thumb); frame.appendChild(play);
      row.appendChild(h('div', { class: 'card video-card' }, frame,
        h('div', { class: 'video-meta' }, h('span', { class: 'chip ' + v.col }, v.label), h('p', { class: 'small muted' }, v.desc),
          h('a', { class: 'small', href: 'https://youtu.be/' + v.id, target: '_blank', rel: 'noopener noreferrer' }, 'Open on YouTube ↗'))));
    });
    return h('div', null, row, h('p', { class: 'small muted' }, 'Videos and their thumbnails come from YouTube and need an internet connection. Nothing plays until you press play. If a video will not play when this page is opened from a file, use "Open on YouTube".'));
  }

  function pageHome() {
    var info = QG.device.info || QG.device.check(), d = progress.data(), last = d.last && content.lessons[d.last];
    var first = content.allLessons()[0];
    var el = h('div');
    el.appendChild(h('section', { class: 'hero' },
      h('div', null,
        h('h1', { html: 'Learn <span class="c1">quantum</span> computing, from the <span class="c2">qubit</span> to <span class="c3">biology</span>.' }),
        h('p', { class: 'lead' }, 'A hands-on course for undergraduates. Every simulator runs on your own computer, inside this page, with no internet, no installs and no account.'),
        h('div', { class: 'btn-row' },
          h('a', { class: 'btn primary', href: '#/learn/' + (last ? last.id : first) }, last ? 'Continue: ' + last.title : 'Start learning'),
          h('a', { class: 'btn', href: '#/playground' }, 'Try the Playground'),
          h('a', { class: 'btn', href: '#/academy' }, 'Join the 12-week Academy'),
          h('a', { class: 'btn', href: '#/lab/composer' }, 'Open the Circuit Composer'),
          h('a', { class: 'btn', href: '#/labs' }, 'All simulators'))),
      h('div', { class: 'hero-art', id: 'hero-bloch' })));
    var hb = QG.Bloch(el.querySelector('#hero-bloch'), { size: 300, trail: true, caption: false });
    var t = 0, timer = setInterval(function () {
      if (!document.body.contains(hb.canvas)) { clearInterval(timer); return; }
      t += 0.03; var th = 1.1 + 0.6 * Math.sin(t * 0.7), ph = t;
      hb.set({ x: Math.sin(th) * Math.cos(ph), y: Math.sin(th) * Math.sin(ph), z: Math.cos(th) });
      if (hb.trailPts.length > 160) hb.trailPts.shift();
    }, 40);

    el.appendChild(h('h2', null, 'Watch: quantum computing in three videos'));
    el.appendChild(videoRow());

    el.appendChild(h('h2', null, 'Your learning journey'));
    el.appendChild(h('p', { class: 'muted' }, 'Nine tracks take you from the maths you need, through qubits, gates and algorithms, to real applications in chemistry, enzymes, photosynthesis and drug discovery.'));
    el.appendChild(journey());

    el.appendChild(h('h2', null, 'Your computer is the quantum simulator'));
    el.appendChild(h('div', { class: 'grid cols-2' },
      h('div', { class: 'card' },
        h('p', { class: 'panel-title' }, 'This device'),
        h('div', { class: 'stat-row' },
          h('div', { class: 'stat' }, h('b', null, String(info.maxQubits)), h('span', null, 'qubits (state vector)')),
          h('div', { class: 'stat' }, h('b', null, String(info.maxDensityQubits)), h('span', null, 'qubits with noise')),
          h('div', { class: 'stat' }, h('b', null, String(info.cores)), h('span', null, 'CPU threads')),
          h('div', { class: 'stat' }, h('b', null, info.msPerGate20.toFixed(1) + ' ms'), h('span', null, 'per gate at 20 qubits'))),
        h('p', { class: 'small muted' }, 'Simulation runs in a ' + (info.worker === 'worker' ? 'background thread (Web Worker), so the page stays responsive' : 'the main page thread (background threads are not available in this browser)') + '. Progress is saved ' + (info.storage ? 'in this browser only.' : 'for this visit only (browser storage is blocked).'))),
      h('div', { class: 'card' },
        h('p', { class: 'panel-title' }, 'Why simulate?'),
        h('p', null, 'A classical computer stores ' + '2ⁿ' + ' complex numbers to simulate n qubits. 20 qubits need 16 MB; 30 qubits would need 16 GB; 50 qubits more memory than any computer has. That exponential growth is exactly why real quantum computers are interesting.'),
        h('a', { href: '#/about' }, 'How this platform works →'))));
    return el;
  }

  function journey() {
    var grid = h('div', { class: 'journey' });
    content.tracks.forEach(function (t, k) {
      var ready = t.lessons.length > 0, pct = progress.trackPct(t);
      grid.appendChild(h('a', { class: 'track-card' + (ready ? '' : ' soon'), href: ready ? '#/learn/' + t.lessons[0] : '#/learn' },
        h('span', { class: 'num ' + TRACK_COLORS[k % 3] }, String(t.num)),
        h('h3', null, t.title),
        h('p', null, t.summary),
        h('div', { class: 'tag-row', style: { marginTop: '8px' } }, ready ? h('span', { class: 'chip blue' }, t.lessons.length + ' lessons') : h('span', { class: 'chip yellow' }, 'Coming soon')),
        ready ? h('div', { class: 'bar', title: Math.round(pct * 100) + '% complete' }, h('i', { style: { width: (pct * 100) + '%' } })) : null));
    });
    return grid;
  }

  function pageLearn() {
    var el = h('div', null, h('h1', null, 'Course map'), h('p', { class: 'muted' }, 'Work through the tracks in order. Each lesson follows the same rhythm: Idea → Visual → Try it → Code it → Check.'));
    content.tracks.forEach(function (t, k) {
      var card = h('section', { class: 'card', style: { marginBottom: '14px' } },
        h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, h('span', { class: 'num ' + TRACK_COLORS[k % 3], style: { display: 'inline-grid', placeItems: 'center', width: '32px', height: '32px', borderRadius: '50%', color: '#fff', fontWeight: 500 } }, String(t.num)), h('h2', { style: { margin: 0 } }, t.title)),
        h('p', { class: 'muted' }, t.summary));
      if (t.lessons.length) {
        var ol = h('ol', { style: { margin: '0', paddingLeft: '22px' } });
        t.lessons.forEach(function (id) { var l = content.lessons[id]; ol.appendChild(h('li', null, h('a', { href: '#/learn/' + id }, l.id + '  ' + l.title), ' ', h('span', { class: 'small muted' }, l.minutes + ' min'), progress.lessonDone(id) ? h('span', { class: 'ok-text' }, ' ✓') : null)); });
        card.appendChild(ol);
      } else if (t.outline) {
        card.appendChild(h('p', { class: 'small' }, h('span', { class: 'chip yellow' }, 'Coming in a later phase'), ' Planned lessons: ' + t.outline.join(' · ')));
      }
      el.appendChild(card);
    });
    return el;
  }

  var tocRef = null;
  function updateTocMarks() { if (!tocRef) return; ui.$$('a[data-lid]', tocRef).forEach(function (a) { var id = a.getAttribute('data-lid'); a.classList.toggle('done', progress.lessonDone(id)); a.classList.toggle('todo', !progress.lessonDone(id)); }); }

  function pageLesson(id) {
    var l = content.lessons[id];
    if (!l) return h('div', null, h('h1', null, 'Lesson not found'), h('a', { href: '#/learn' }, 'Back to the course map'));
    progress.setLast(id);
    var t = content.track(l.track), all = content.allLessons(), idx = all.indexOf(id);
    var toc = h('nav', { class: 'toc', 'aria-label': 'Lessons in this track' }, h('h4', null, 'Track ' + t.num + ': ' + t.title));
    t.lessons.forEach(function (lid) { var L = content.lessons[lid]; toc.appendChild(h('a', { href: '#/learn/' + lid, 'data-lid': lid, class: (lid === id ? 'active ' : '') + (progress.lessonDone(lid) ? 'done' : 'todo') }, L.id + ' ' + L.title)); });
    toc.appendChild(h('a', { href: '#/learn', style: { marginTop: '10px', color: 'var(--muted)' } }, '← All tracks'));
    tocRef = toc;
    var art = h('article', { class: 'lesson' },
      h('div', { class: 'meta' }, h('span', { class: 'chip blue' }, 'Lesson ' + l.id), h('span', { class: 'chip' }, l.minutes + ' min'), (l.tags || []).map(function (x) { return h('span', { class: 'chip green' }, x); })),
      h('h1', null, l.title));
    if (l.objectives) art.appendChild(h('div', { class: 'objectives' }, h('h4', null, 'You will learn to'), h('ul', null, l.objectives.map(function (o) { return h('li', { html: QG.math.process(o) }); }))));
    var body = h('div', { class: 'lesson-body', html: QG.math.process(l.body) });
    art.appendChild(body);
    if (l.quiz && l.quiz.length) { art.appendChild(h('span', { class: 'step-label' }, 'Check your understanding')); art.appendChild(renderQuiz(l)); }
    else art.appendChild(h('div', { class: 'btn-row', style: { marginTop: '20px' } }, h('button', { class: 'btn', onclick: function () { progress.markLesson(id); updateTocMarks(); ui.toast('Marked complete'); } }, 'Mark lesson complete')));
    if (l.refs && l.refs.length) { art.appendChild(h('h3', null, 'Go deeper')); art.appendChild(h('ul', { class: 'small' }, l.refs.map(function (r) { return h('li', { html: r }); }))); }
    var prev = idx > 0 ? content.lessons[all[idx - 1]] : null, next = idx < all.length - 1 ? content.lessons[all[idx + 1]] : null;
    art.appendChild(h('div', { class: 'lesson-nav' },
      prev ? h('a', { class: 'btn', href: '#/learn/' + prev.id }, '← ' + prev.title) : h('span'),
      next ? h('a', { class: 'btn primary', href: '#/learn/' + next.id }, next.title + ' →') : h('a', { class: 'btn primary', href: '#/labs' }, 'Explore the simulators →')));
    var el = h('div', { class: 'lesson-layout' }, toc, art);
    setTimeout(function () { mountWidgets(body, l); attachGlossary(body); }, 0);
    return el;
  }

  function pageLabs() {
    var el = h('div', null, h('h1', null, 'Simulators'), h('p', { class: 'muted' }, 'Every simulator runs locally in your browser. Open one directly, or meet it inside a lesson.'));
    var grid = h('div', { class: 'grid cols-3' });
    QG.labList.forEach(function (lab) {
      var ready = !!QG.labs[lab.id];
      grid.appendChild(h(ready ? 'a' : 'div', { class: 'card lab-card', href: ready ? '#/lab/' + lab.id : null },
        h('div', { class: 'icon', style: { background: 'var(--' + lab.color + '-soft)', color: 'var(--' + (lab.color === 'yellow' ? 'yellow-ink' : lab.color) + ')' } }, lab.icon),
        h('h3', null, lab.title), h('p', null, lab.desc),
        h('div', { class: 'tag-row' }, h('span', { class: 'chip' }, 'Track ' + lab.track), ready ? h('span', { class: 'chip green' }, 'Ready') : h('span', { class: 'chip yellow' }, 'Phase ' + lab.phase))));
    });
    el.appendChild(grid);
    return el;
  }

  function pageLab(id) {
    var lab = QG.labs[id];
    if (!lab) return h('div', null, h('h1', null, 'Simulator not available yet'), h('p', null, 'This simulator is planned for a later phase.'), h('a', { href: '#/labs' }, '← All simulators'));
    var el = h('div');
    setTimeout(function () { lab(el); attachGlossary(el); var t = el.querySelector('h1'); if (t) document.title = t.textContent + ' · QGiriBio'; }, 0);
    return el;
  }

  function pageGlossary() {
    var keys = Object.keys(QG.glossary).sort(function (a, b) { return QG.glossary[a].term.localeCompare(QG.glossary[b].term); });
    var filter = h('input', { type: 'text', placeholder: 'Filter terms…', 'aria-label': 'Filter glossary', style: { width: '100%', maxWidth: '360px' } });
    var dl = h('dl', { class: 'gloss-list' });
    function draw() {
      dl.innerHTML = ''; var f = filter.value.toLowerCase();
      keys.forEach(function (k) { var g = QG.glossary[k]; if (f && (g.term + ' ' + g.def).toLowerCase().indexOf(f) < 0) return; dl.appendChild(h('dt', null, g.term)); dl.appendChild(h('dd', { html: QG.math.process(g.def) })); });
    }
    filter.addEventListener('input', draw); draw();
    return h('div', null, h('h1', null, 'Glossary'), filter, dl, h('h2', null, 'Notation decoder'), h('div', { class: 'card', html: QG.math.process(QG.notationDecoder || '') }));
  }

  function pageProgress() {
    var d = progress.data(), all = content.allLessons(), done = all.filter(progress.lessonDone);
    var quizzes = Object.keys(d.lessons).filter(function (k) { return d.lessons[k].quizTotal; });
    var qs = quizzes.reduce(function (s, k) { return s + d.lessons[k].quiz; }, 0), qt = quizzes.reduce(function (s, k) { return s + d.lessons[k].quizTotal; }, 0);
    var el = h('div', null, h('h1', null, 'Your progress'),
      h('div', { class: 'card' }, h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', null, done.length + ' / ' + all.length), h('span', null, 'lessons complete')),
        h('div', { class: 'stat' }, h('b', null, qt ? Math.round(100 * qs / qt) + '%' : '–'), h('span', null, 'quiz score')),
        h('div', { class: 'stat' }, h('b', null, String(Object.keys(d.challenges).length)), h('span', null, 'challenges solved')))),
      h('h2', null, 'Tracks'), journey(),
      h('h2', null, 'Backup'),
      h('p', { class: 'muted' }, 'Progress lives in this browser only. Download a backup to move it to another computer or browser.'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', onclick: function () { ui.download(JSON.stringify({ app: 'qgiribio', version: QG.version, data: ui.store.dump() }, null, 2), 'qgiribio-progress.json', 'application/json'); } }, 'Download backup'),
        h('label', { class: 'btn' }, 'Restore backup…', h('input', { type: 'file', accept: '.json,application/json', class: 'sr-only', onchange: function (e) {
          var f = e.target.files[0]; if (!f) return; var r = new FileReader();
          r.onload = function () { try { var o = JSON.parse(r.result); if (o.app !== 'qgiribio') throw new Error('Not a QGiriBio backup'); Object.keys(o.data).forEach(function (k) { ui.store.set(k, o.data[k]); }); ui.toast('Progress restored'); route(); } catch (err) { ui.toast('Could not restore: ' + err.message); } };
          r.readAsText(f);
        } })),
        h('button', { class: 'btn', onclick: function () { if (confirm('Erase all progress in this browser? This cannot be undone.')) { ui.store.set('progress', { lessons: {}, challenges: {}, last: null }); route(); } } }, 'Reset progress')));
    return el;
  }

  function pageAbout() { return h('div', { class: 'lesson', html: QG.math.process(QG.aboutHTML || '') }); }

  /* ---------------- router ---------------- */
  var NAV = [['#/', 'Home'], ['#/learn', 'Learn'], ['#/playground', 'Playground'], ['#/academy', 'Academy'], ['#/labs', 'Simulators'], ['#/lab/code', 'Code Lab'], ['#/glossary', 'Glossary'], ['#/progress', 'Progress'], ['#/about', 'About']];
  function route() {
    var hash = location.hash || '#/', parts = hash.slice(2).split('/'), page;
    main.className = '';
    if (!parts[0]) page = pageHome();
    else if (parts[0] === 'learn' && parts[1]) page = pageLesson(decodeURIComponent(parts[1]));
    else if (parts[0] === 'learn') page = pageLearn();
    else if (parts[0] === 'playground' && QG.pages && QG.pages.playground) { main.className = 'wide'; page = h('div'); QG.pages.playground(page); }
    else if (parts[0] === 'academy' && QG.pages && QG.pages.academy) { main.className = 'wide'; page = h('div'); QG.pages.academy(page, parts.slice(1)); }
    else if (parts[0] === 'labs') page = pageLabs();
    else if (parts[0] === 'lab') { main.className = 'wide'; page = pageLab(parts[1]); }
    else if (parts[0] === 'glossary') page = pageGlossary();
    else if (parts[0] === 'progress') page = pageProgress();
    else if (parts[0] === 'about') page = pageAbout();
    else page = h('div', null, h('h1', null, 'Page not found'), h('a', { href: '#/' }, 'Home'));
    main.innerHTML = ''; main.appendChild(page);
    ui.$$('.nav a').forEach(function (a) {
      var href = a.getAttribute('href'), on = href === '#/' ? hash === '#/' || hash === '' : hash.indexOf(href) === 0 || (href === '#/learn' && hash.indexOf('#/learn') === 0) || (href === '#/labs' && hash.indexOf('#/lab/') === 0 && hash !== '#/lab/code');
      a.classList.toggle('active', !!on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var title = page.querySelector('h1'); document.title = (title ? title.textContent + ' · ' : '') + 'QGiriBio';
    window.scrollTo(0, 0);
  }
  QG.route = route;

  function applyTheme(t) { if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }

  QG.start = function () {
    applyTheme(ui.store.get('theme', 'auto'));
    var themeBtn = h('button', { class: 'icon-btn', title: 'Switch light/dark theme', 'aria-label': 'Switch light or dark theme', onclick: function () {
      var cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var nxt = cur === 'dark' ? 'light' : 'dark'; applyTheme(nxt); ui.store.set('theme', nxt); route();
    } }, '◐');
    var bar = h('header', { class: 'topbar' },
      h('a', { class: 'brand', href: '#/', html: logoSVG() + '<span>Q<b>Giri</b>Bio</span>' }),
      h('nav', { class: 'nav', 'aria-label': 'Main' }, NAV.map(function (n) { return h('a', { href: n[0] }, n[1]); })),
      h('span', { class: 'spacer' }), themeBtn);
    main = h('main', { id: 'main', tabindex: '-1' });
    var foot = h('footer', { class: 'footer' }, 'QGiriBio v' + QG.version + ' · runs entirely on your device · teaching simulations, not research tools');
    document.body.innerHTML = '';
    document.body.appendChild(h('button', { class: 'sr-only', onclick: function () { main.focus(); } }, 'Skip to content'));
    document.body.appendChild(bar); document.body.appendChild(main); document.body.appendChild(foot);
    QG.device.check();
    window.addEventListener('hashchange', route);
    route();
  };
})();
