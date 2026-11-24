/* Academy (#/academy/...): the 12-week Quantum Computing Academy programme, with its full course package
 * (notebooks, Q# practicals, lecture scripts, slide outlines, question banks, docs) viewable and runnable offline. */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h, A = QG.academy;
  QG.pages = QG.pages || {};

  var PAGES = [['overview', 'Overview'], ['curriculum', 'Curriculum'], ['lectures', 'Lecture Studio'], ['labs', 'Coding Labs'], ['assessment', 'Assessment'], ['projects', 'Research Projects'], ['operations', 'Faculty & Delivery'], ['resources', 'Resources']];
  var RUBRIC = [['Correctness', 35, 'Code runs and produces correct results'], ['Mathematical explanation', 20, 'Definitions, equations and assumptions are stated'], ['Code quality', 15, 'Readable, structured, commented, reproducible'], ['Validation', 15, 'Tests, baselines, sanity checks'], ['Scientific interpretation', 15, 'Meaning and limitations of the result']];
  var TYPE_NAMES = { notebook: 'Notebook', qsharp: 'Q#', markdown: 'Notes', csv: 'Table', gift: 'Question bank', python: 'Python', text: 'Text' };

  function file(p) { return (QG.academyFiles || {})[p]; }
  function fig(name, cls) { return h('div', { class: 'afig-wrap' + (cls ? ' ' + cls : ''), html: QG.academyFig(name) }); }
  function week(n) { return A.weeks[n - 1]; }
  function phaseOf(w) { return A.phases.filter(function (p) { return p.id === w.phase; })[0]; }
  function chipCol(col) { return col === '--green' ? 'green' : col === '--yellow' ? 'yellow' : 'blue'; }
  function weeksDone() { return ui.store.get('academy:weeks', {}); }
  function link(href, text, cls) { return h('a', { href: href, class: cls || null }, text); }
  function ext(href, text) { return h('a', { href: href, target: '_blank', rel: 'noopener noreferrer' }, text, h('span', { class: 'ext-mark', 'aria-hidden': 'true' }, ' ↗')); }
  function W2(n) { return String(n).padStart(2, '0'); }
  function fmtSize(b) { return b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' KB'; }
  function nbTitle(path) { var f = file(path); if (!f) return path; try { var nb = JSON.parse(f.text), src = nb.cells[0].source.join(''), m = /^#\s+(.+)$/m.exec(src); return m ? m[1] : path; } catch (e) { return path; } }

  /* ---------------- text renderers ---------------- */
  var PY_KW = /\b(import|from|as|def|return|for|in|if|elif|else|while|class|with|lambda|print|True|False|None|and|or|not|assert|try|except|raise|yield|pass|break|continue|is)\b/g;
  var QS_KW = /\b(namespace|operation|function|open|import|use|let|mutable|set|return|for|in|if|else|repeat|until|within|apply|Controlled|Adjoint|Unit|Result|Qubit|Int|Double|Bool|One|Zero|true|false|size)\b/g;
  var JS_KW = /\b(const|let|var|function|return|for|if|else|while|of|in|new|true|false|null|undefined|class|this|async|await)\b/g;
  function highlight(src, lang) {
    var KW = lang === 'qsharp' ? QS_KW : lang === 'javascript' ? JS_KW : PY_KW, cm = lang === 'python' || lang === 'bash' ? '#' : '//';
    var re = cm === '#' ? /(#[^\n]*)|('''[\s\S]*?'''|"""[\s\S]*?"""|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")|(\b\d+\.?\d*(?:e[-+]?\d+)?\b)|(@\w+)|([^#'"\d@]+|.)/g
      : /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(\$?"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d+\.?\d*(?:e[-+]?\d+)?\b)|(@\w+|\bQG\b(?:\.\w+)*)|([^\/'"`\d@Q$]+|.)/g;
    var out = '', m;
    while ((m = re.exec(src))) {
      if (m[1]) out += '<span class="tok-c">' + ui.esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tok-s">' + ui.esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="tok-n">' + m[3] + '</span>';
      else if (m[4]) out += '<span class="tok-f">' + ui.esc(m[4]) + '</span>';
      else out += ui.esc(m[5]).replace(KW, '<span class="tok-k">$1</span>');
    }
    return out;
  }
  function codeBlock(src, lang) { return h('pre', { class: 'acode' }, h('code', { html: highlight(src, lang) })); }

  /* Minimal Markdown: headings, lists, quotes, tables, fences, emphasis, links, inline code and $math$ / \(math\). */
  function md(text) {
    var keep = [];
    function stash(html) { keep.push(html); return '\u0000' + (keep.length - 1) + '\u0000'; }
    function inline(s) {
      s = s.replace(/`([^`]+)`/g, function (_, c) { return stash('<code>' + ui.esc(c) + '</code>'); });
      s = s.replace(/\\\((.+?)\\\)/g, function (_, t) { return stash(QG.math.inline(t)); }).replace(/\$\$(.+?)\$\$/g, function (_, t) { return stash(QG.math.block(t)); }).replace(/(^|[^\\\w])\$([^$\n]+?)\$/g, function (_, p, t) { return p + stash(QG.math.inline(t)); });
      s = ui.esc(s);
      s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, function (_, t, u) { return stash('<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + ' ↗</a>'); });
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>').replace(/(^|\W)_([^_\n]+)_(?=\W|$)/g, '$1<em>$2</em>');
      return s;
    }
    var lines = String(text).replace(/\r\n/g, '\n').split('\n'), out = [], i = 0;
    while (i < lines.length) {
      var ln = lines[i], m;
      if (/^```/.test(ln)) {
        var lang = ln.slice(3).trim() || 'text', buf = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++; out.push(stash('<pre class="acode"><code>' + highlight(buf.join('\n'), lang) + '</code></pre>')); continue;
      }
      if (/^\$\$\s*$/.test(ln)) { var mb = []; i++; while (i < lines.length && !/^\$\$\s*$/.test(lines[i])) mb.push(lines[i++]); i++; out.push(stash(QG.math.block(mb.join(' ')))); continue; }
      if ((m = /^(#{1,6})\s+(.*)$/.exec(ln))) { var lv = Math.min(6, m[1].length + 1); out.push('<h' + lv + '>' + inline(m[2]) + '</h' + lv + '>'); i++; continue; }
      if (/^\s*(---|\*\*\*)\s*$/.test(ln)) { out.push('<hr>'); i++; continue; }
      if (/^\s*\|.*\|\s*$/.test(ln)) {
        var rows = []; while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(lines[i++]);
        var cells = rows.filter(function (r) { return !/^\s*\|[\s:|-]+\|\s*$/.test(r); }).map(function (r) { return r.trim().slice(1, -1).split('|').map(function (c) { return inline(c.trim()); }); });
        out.push('<table class="amp-table">' + cells.map(function (r, k) { return '<tr>' + r.map(function (c) { return k ? '<td>' + c + '</td>' : '<th>' + c + '</th>'; }).join('') + '</tr>'; }).join('') + '</table>'); continue;
      }
      if (/^\s*>/.test(ln)) { var q = []; while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, '')); out.push('<blockquote>' + inline(q.join(' ')) + '</blockquote>'); continue; }
      if (/^\s*([-*+]|\d+\.)\s+/.test(ln)) {
        var ordered = /^\s*\d+\./.test(ln), items = [];
        while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) { var it = lines[i++].replace(/^\s*([-*+]|\d+\.)\s+/, ''); while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+\.)\s+/.test(lines[i])) it += ' ' + lines[i++].trim(); items.push('<li>' + inline(it) + '</li>'); }
        out.push((ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>')); continue;
      }
      if (!ln.trim()) { i++; continue; }
      var para = []; while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*>|\s*([-*+]|\d+\.)\s+|\s*\|.*\|\s*$|\$\$)/.test(lines[i])) para.push(lines[i++]);
      out.push('<p>' + inline(para.join(' ')) + '</p>');
    }
    return out.join('\n').replace(/\u0000(\d+)\u0000/g, function (_, k) { return keep[+k]; }).replace(/\u0000(\d+)\u0000/g, function (_, k) { return keep[+k]; });
  }
  QG.academyMarkdown = md;

  function parseCSV(text) {
    var rows = [], row = [], f = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some(function (x) { return x !== ''; })) rows.push(row); row = []; }
      else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
  function parseGift(text) {
    var out = [], re = /::([^:]+)::\s*([\s\S]*?)\{([\s\S]*?)\}/g, m;
    while ((m = re.exec(text))) {
      var ans = m[3].split(/(?=[~=])/).map(function (a) { return a.replace(/^[~=](%-?\d+%)?/, '').trim(); }).filter(Boolean);
      out.push({ id: m[1].trim(), q: m[2].trim(), a: ans[0] || '', week: +((/W(\d+)/.exec(m[1]) || [])[1] || 0) });
    }
    return out;
  }
  QG.academyParse = { csv: parseCSV, gift: parseGift };
  function mcq() {
    var f = file('question_banks/MCQ_Question_Bank.csv'); if (!f) return [];
    var rows = parseCSV(f.text), head = rows.shift();
    return rows.map(function (r) { var o = {}; head.forEach(function (k, i) { o[k.trim()] = (r[i] || '').trim(); }); return { week: +o.week, q: o.question, options: [o.option_A, o.option_B, o.option_C, o.option_D], answer: 'ABCD'.indexOf(o.correct_option.toUpperCase()), why: o.explanation }; });
  }
  function slideTitles(n) { var f = file(A.files(n).slides), t = [], re = /^## Slide \d+:\s*(.+)$/gm, m; if (f) while ((m = re.exec(f.text))) t.push(m[1].trim()); return t; }

  /* Build the Composer-equivalent circuit for a Q# practical: [['h',[0]], ['ry',[0],[0.7]], ['measure',[0]]]. */
  function qsCircuit(w) {
    var nq = 1; w.qsEq.forEach(function (o) { o[1].forEach(function (q) { nq = Math.max(nq, q + 1); }); });
    var c = new QG.Circuit(nq, nq);
    w.qsEq.forEach(function (o) { if (o[0] === 'measure') c.measure(o[1][0], o[1][0]); else c[o[0]].apply(c, (o[2] || []).concat(o[1])); });
    return c;
  }
  QG.academyQsCircuit = qsCircuit;

  /* ---------------- shared pieces ---------------- */
  function subnav(cur) {
    return h('nav', { class: 'acad-nav', 'aria-label': 'Academy sections' }, PAGES.map(function (p) { return h('a', { href: '#/academy/' + p[0], class: p[0] === cur ? 'on' : null, 'aria-current': p[0] === cur ? 'page' : null }, p[1]); }));
  }
  function head(title, sub, crumbs) {
    var el = h('div', { class: 'acad-head' });
    if (crumbs) el.appendChild(h('div', { class: 'crumbs small' }, crumbs.map(function (c, i) { return [i ? ' › ' : '', c[1] ? link(c[1], c[0]) : c[0]]; })));
    el.appendChild(h('h1', null, title)); if (sub) el.appendChild(h('p', { class: 'lead muted' }, sub));
    return el;
  }
  function mountWidget(box, name, opts) { var ph = h('div', { 'data-widget': name, 'data-opts': JSON.stringify(opts || {}) }); box.appendChild(ph); QG.mountWidgets(box, null); }
  function runPanel(code, title) {
    var box = h('div', { class: 'card acad-run' }), con = h('div', { class: 'console', role: 'log', 'aria-live': 'polite' }), outs = h('div', { class: 'acad-outs' });
    var R = QG.makeOutputRenderer(con, outs), btn = h('button', { class: 'btn primary', onclick: run }, '▶ Run');
    function run() {
      con.innerHTML = ''; outs.innerHTML = ''; btn.disabled = true; var t0 = performance.now();
      QG.worker.code(code, R.onStream, 20000).then(function () { R.log('info', 'Done in ' + Math.round(performance.now() - t0) + ' ms, on your computer.'); btn.disabled = false; },
        function (e) { R.log('error', 'Error: ' + e.message + QG.codeLineHint(e)); btn.disabled = false; });
    }
    box.appendChild(h('div', { class: 'acad-run-head' }, h('p', { class: 'panel-title' }, title || 'QGiriBio equivalent (JavaScript, runs here)'), h('span', { class: 'spacer' }), btn,
      h('button', { class: 'btn small', onclick: function () { ui.store.set('codelab:draft', code); location.hash = '#/lab/code'; } }, 'Open in Code Lab')));
    box.appendChild(codeBlock(code, 'javascript')); box.appendChild(con); box.appendChild(outs);
    return box;
  }
  function weekNav(n, base) {
    return h('div', { class: 'btn-row acad-pager' }, n > 1 ? link(base + (n - 1), '← Week ' + (n - 1), 'btn') : null, h('span', { class: 'spacer' }), n < 12 ? link(base + (n + 1), 'Week ' + (n + 1) + ' →', 'btn') : null);
  }

  /* ---------------- Overview ---------------- */
  function pageOverview(el) {
    el.appendChild(h('section', { class: 'acad-hero' },
      h('div', null,
        h('span', { class: 'chip blue' }, '12-week programme · Python + Q#'),
        h('h1', { html: 'Quantum Computing <span class="c1">Academy</span>' }),
        h('p', { class: 'lead' }, A.meta.tagline),
        h('p', { class: 'muted' }, A.meta.intro),
        h('div', { class: 'btn-row' }, link('#/academy/curriculum', 'Explore the curriculum', 'btn primary'), link('#/academy/labs', 'Open the coding labs', 'btn'), link('#/academy/resources', 'Course library', 'btn'))),
      fig('bloch', 'hero-fig')));
    el.appendChild(h('div', { class: 'acad-stats' }, A.meta.stats.map(function (s, i) { return h('div', { class: 'acad-stat c' + i % 3 }, h('b', null, s[0]), h('span', null, s[1])); })));

    el.appendChild(h('h2', null, 'Three-phase learning journey'));
    var jr = h('div', { class: 'grid cols-3' });
    [['Foundations', 'Complex amplitudes, linear algebra, Hilbert spaces, Dirac notation, measurement and quantum gates.', 'hilbert', 'Weeks 1–3'], ['Programming', 'Python, Qiskit, Q#, circuit simulation, multi-qubit systems, entanglement and noise-aware workflows.', 'circuit', 'Weeks 4 and 11'], ['Algorithms', 'Grover, QFT, QPE, VQE, QAOA, quantum machine learning and scientific applications.', 'loop', 'Weeks 5–10']].forEach(function (c, i) {
      jr.appendChild(h('div', { class: 'card acad-card' }, fig(c[2]), h('span', { class: 'chip ' + ['blue', 'green', 'yellow'][i] }, c[3]), h('h3', null, c[0]), h('p', { class: 'small muted' }, c[1])));
    });
    el.appendChild(jr);

    el.appendChild(h('h2', null, 'Programme principle'));
    el.appendChild(h('p', { class: 'muted' }, 'Every week follows the same five steps. Click a step to see its picture.'));
    var pr = h('div', { class: 'acad-principle' }), pfig = h('div', { class: 'acad-principle-fig' }), ptext = h('p', { class: 'small' });
    A.meta.principle.forEach(function (p, i) {
      var b = h('button', { class: 'acad-step' + (i === 0 ? ' on' : ''), onclick: function () { ui.$$('.acad-step', pr).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); show(i); } }, h('b', null, String(i + 1)), h('span', null, p[0]));
      pr.appendChild(b);
    });
    function show(i) { pfig.innerHTML = QG.academyFig(A.meta.principle[i][2]); ptext.textContent = A.meta.principle[i][1]; }
    el.appendChild(pr); el.appendChild(h('div', { class: 'card acad-principle-card' }, pfig, ptext)); show(0);

    el.appendChild(h('h2', null, 'Science-first applications'));
    var ap = h('div', { class: 'grid cols-3' });
    [['Quantum chemistry', 'Map molecular Hamiltonians to qubits and estimate ground-state energies with VQE.', 'molecule', 9], ['Quantum materials', 'Study spin models, Ising systems and transverse-field dynamics with simulation baselines.', 'ising', 10], ['Quantum machine learning', 'Explore feature maps, quantum kernels and variational classifiers with strict classical benchmarks.', 'featuremap', 8]].forEach(function (c) {
      ap.appendChild(h('a', { class: 'card acad-card linkcard', href: '#/academy/curriculum/' + c[3] }, fig(c[2]), h('h3', null, c[0]), h('p', { class: 'small muted' }, c[1]), h('span', { class: 'small' }, 'Week ' + c[3] + ' →')));
    });
    el.appendChild(ap);

    el.appendChild(h('div', { class: 'card acad-note' },
      h('p', { class: 'panel-title' }, 'How the Academy fits QGiriBio'),
      h('p', { class: 'small' }, 'The Academy is the structured, assessed course: 12 weeks with lecture scripts, slides, Python notebooks, Q# practicals, quizzes and a capstone. QGiriBio supplies the interactive side: every week links to matching lessons and simulators, and every notebook and Q# practical has an equivalent you can run right here, offline.'),
      h('p', { class: 'small muted' }, 'Programme and course package from ', ext(A.meta.source, 'the Quantum Computing Academy site'), ', integrated into QGiriBio by its author. Figures, live equivalents and slide content added for QGiriBio.')));
  }

  /* ---------------- Curriculum ---------------- */
  function pageCurriculum(el) {
    el.appendChild(head('Curriculum', 'Twelve weeks from first principles to research communication. Tick a week when you finish it to track your certification progress.'));
    el.appendChild(fig('journey', 'wide-fig'));
    var done = weeksDone(), n = Object.keys(done).filter(function (k) { return done[k]; }).length;
    el.appendChild(h('div', { class: 'acad-progress' }, h('div', { class: 'meter' }, h('span', { style: { width: (n / 12 * 100) + '%' } })), h('span', { class: 'small muted' }, n + ' of 12 weeks completed')));
    A.phases.forEach(function (p) {
      el.appendChild(h('h2', { class: 'acad-phase' }, h('span', { class: 'chip ' + chipCol(p.col) }, p.icon + ' ' + p.title), ' ', h('span', { class: 'small muted' }, p.desc)));
      var g = h('div', { class: 'grid cols-3' });
      p.weeks.forEach(function (k) {
        var w = week(k);
        g.appendChild(h('a', { class: 'card acad-week linkcard' + (done[k] ? ' done' : ''), href: '#/academy/curriculum/' + k },
          h('div', { class: 'acad-week-top' }, h('span', { class: 'wk' }, 'Week ' + W2(k)), done[k] ? h('span', { class: 'chip green' }, '✓ done') : null),
          fig(w.fig), h('h3', null, w.title), h('p', { class: 'small muted' }, w.summary)));
      });
      el.appendChild(g);
    });
  }

  function pageWeek(el, n) {
    var w = week(n); if (!w) { el.appendChild(h('p', null, 'No such week.')); return; }
    var p = phaseOf(w), f = A.files(n), done = weeksDone();
    el.appendChild(head('Week ' + W2(n) + ': ' + w.title, w.summary, [['Curriculum', '#/academy/curriculum'], ['Week ' + n]]));
    var top = h('div', { class: 'acad-week-hero' });
    var left = h('div', null, h('div', { class: 'tag-row' }, h('span', { class: 'chip ' + chipCol(p.col) }, p.icon + ' ' + p.title), h('span', { class: 'chip' }, '6–8 guided hours')),
      h('h3', null, 'Learning outcomes'), h('ul', null, w.outcomes.map(function (o) { return h('li', null, o); })));
    var tick = h('input', { type: 'checkbox', checked: done[n] ? 'checked' : null });
    tick.addEventListener('change', function () { var d = weeksDone(); d[n] = tick.checked; ui.store.set('academy:weeks', d); ui.toast(tick.checked ? 'Week ' + n + ' marked complete' : 'Week ' + n + ' unmarked'); });
    left.appendChild(h('label', { class: 'acad-tick' }, tick, ' I have completed this week'));
    top.appendChild(left); top.appendChild(fig(w.fig)); el.appendChild(top);

    el.appendChild(h('h2', null, 'Course materials'));
    var mats = h('div', { class: 'grid cols-2 acad-mats' });
    [['Lecture notes', 'Instructor script, delivery plan and prompts', '#/academy/lectures/notes/' + n, '📖'], ['Slide deck', slideTitles(n).length + ' slides with key messages, equations and figures', '#/academy/lectures/deck/' + n, '🖥'], ['Python notebook', nbTitle(f.notebook), '#/academy/labs/notebook/' + n, '🐍'], ['Q# practical', 'QS_W' + W2(n) + '.qs, with a QGiriBio circuit equivalent', '#/academy/labs/qsharp/' + n, '⚛']].forEach(function (m) {
      mats.appendChild(h('a', { class: 'card linkcard acad-mat', href: m[2] }, h('span', { class: 'acad-mat-ic', 'aria-hidden': 'true' }, m[3]), h('span', null, h('b', null, m[0]), h('br'), h('span', { class: 'small muted' }, m[1]))));
    });
    el.appendChild(mats);

    el.appendChild(h('h2', null, 'Try it now'));
    var wb = h('div', { class: 'acad-widget' }); el.appendChild(wb); mountWidget(wb, w.widget[0], w.widget[1]);

    el.appendChild(h('h2', null, 'Go deeper in QGiriBio'));
    var g = h('div', { class: 'grid cols-2' });
    g.appendChild(h('div', { class: 'card' }, h('p', { class: 'panel-title' }, 'Lessons'), h('ul', { class: 'acad-links' }, w.lessons.map(function (id) { var l = QG.content.lessons[id]; return l ? h('li', null, link('#/learn/' + id, id + ' · ' + l.title), QG.progress.lessonDone(id) ? h('span', { class: 'ok-text small' }, ' ✓') : null) : null; }))));
    g.appendChild(h('div', { class: 'card' }, h('p', { class: 'panel-title' }, 'Simulators'), h('ul', { class: 'acad-links' }, w.labs.map(function (id) { var lab = QG.labList.filter(function (x) { return x.id === id; })[0]; return h('li', null, link('#/lab/' + id, lab ? lab.title : id)); }))));
    el.appendChild(g);
    el.appendChild(h('h2', null, 'References'));
    el.appendChild(h('ol', { class: 'acad-refs' }, w.refs.map(function (r) { return h('li', { html: r }); })));
    el.appendChild(weekNav(n, '#/academy/curriculum/'));
  }

  /* ---------------- Lecture Studio ---------------- */
  function pageLectures(el) {
    el.appendChild(head('Lecture Studio', 'Twelve weeks of lecture scripts and slide decks. Each week has 5–6 recorded segments of 8–12 minutes, a worked example after each concept and a short retrieval quiz.'));
    el.appendChild(h('div', { class: 'card acad-note' }, h('p', { class: 'small' }, h('b', null, 'Slides: '), 'the course package provides slide outlines (titles plus the placeholders "key message / diagram / worked example / speaker note"). QGiriBio fills each one with a key message, an equation, an original figure and a question, and keeps the original outline one click away.')));
    var g = h('div', { class: 'grid cols-3' });
    A.weeks.forEach(function (w) {
      var t = slideTitles(w.n);
      g.appendChild(h('div', { class: 'card acad-card' }, fig(w.fig), h('span', { class: 'wk' }, 'Week ' + W2(w.n)), h('h3', null, w.title),
        h('p', { class: 'small muted' }, t.join(' · ')),
        h('div', { class: 'btn-row' }, link('#/academy/lectures/deck/' + w.n, '▶ Slides (' + t.length + ')', 'btn primary small'), link('#/academy/lectures/notes/' + w.n, 'Notes', 'btn small'))));
    });
    el.appendChild(g);
  }

  function pageNotes(el, n) {
    var w = week(n), f = file(A.files(n).lecture);
    el.appendChild(head('Week ' + W2(n) + ' lecture notes', w.title, [['Lecture Studio', '#/academy/lectures'], ['Week ' + n + ' notes']]));
    var lay = h('div', { class: 'acad-two' }), main = h('div', { class: 'lesson-body acad-md' }), side = h('aside', { class: 'acad-side' });
    main.innerHTML = f ? md(f.text) : '<p>Missing file.</p>';
    main.appendChild(h('h2', null, 'QGiriBio additions'));
    main.appendChild(h('h3', null, 'Key ideas, slide by slide'));
    var ol = h('ol'); slideTitles(n).forEach(function (t, i) { var s = w.slides[i] || {}; ol.appendChild(h('li', { html: '<b>' + ui.esc(t) + '.</b> ' + QG.math.process(s.k || '') + (s.eq ? ' ' + QG.math.inline(s.eq) : '') })); }); main.appendChild(ol);
    main.appendChild(h('h3', null, 'References'));
    main.appendChild(h('ol', { class: 'acad-refs' }, w.refs.map(function (r) { return h('li', { html: r }); })));
    side.appendChild(fig(w.fig));
    side.appendChild(h('div', { class: 'btn-row' }, link('#/academy/lectures/deck/' + n, '▶ Present slides', 'btn primary'), h('button', { class: 'btn small', onclick: function () { ui.download(f.text, A.files(n).lecture.split('/').pop(), 'text/markdown'); } }, 'Download .md')));
    side.appendChild(h('p', { class: 'small muted' }, 'Outcomes'));
    side.appendChild(h('ul', { class: 'small' }, w.outcomes.map(function (o) { return h('li', null, o); })));
    side.appendChild(link('#/academy/curriculum/' + n, 'Week ' + n + ' overview →'));
    lay.appendChild(main); lay.appendChild(side); el.appendChild(lay);
    el.appendChild(weekNav(n, '#/academy/lectures/notes/'));
  }

  function pageDeck(el, n) {
    var w = week(n), titles = slideTitles(n), raw = file(A.files(n).slides);
    var slides = [{ title: 'Week ' + W2(n) + ': ' + w.title, k: w.summary, fig: w.fig, cover: true }].concat(titles.map(function (t, i) { return Object.assign({ title: t }, w.slides[i] || {}); }));
    slides.push({ title: 'Practical and next steps', k: 'Run the Week ' + W2(n) + ' notebook from a clean kernel, predict the output first, then explain the mathematics and the limitations.', fig: 'capstone', end: true });
    el.appendChild(head('Week ' + W2(n) + ' slides', w.title, [['Lecture Studio', '#/academy/lectures'], ['Week ' + n + ' slides']]));
    var i = 0, deck = h('div', { class: 'deck', tabindex: '0', 'aria-roledescription': 'slide deck', 'aria-label': 'Week ' + n + ' slides' }), stage = h('div', { class: 'deck-stage', 'aria-live': 'polite' });
    var count = h('span', { class: 'small muted' }), dots = h('div', { class: 'deck-dots' }), showOrig = false;
    var orig = h('button', { class: 'btn small', onclick: function () { showOrig = !showOrig; draw(); } }, 'Original outline');
    var bar = h('div', { class: 'deck-bar' },
      h('button', { class: 'btn', 'aria-label': 'Previous slide', onclick: function () { go(i - 1); } }, '←'), count,
      h('button', { class: 'btn', 'aria-label': 'Next slide', onclick: function () { go(i + 1); } }, '→'), h('span', { class: 'spacer' }), orig,
      h('button', { class: 'btn small', onclick: function () { if (document.fullscreenElement) document.exitFullscreen(); else if (deck.requestFullscreen) deck.requestFullscreen(); } }, '⛶ Full screen'));
    slides.forEach(function (_, k) { dots.appendChild(h('button', { class: 'deck-dot', 'aria-label': 'Slide ' + (k + 1), onclick: function () { go(k); } })); });
    deck.appendChild(stage); deck.appendChild(bar); deck.appendChild(dots); el.appendChild(deck);
    function go(k) { i = Math.max(0, Math.min(slides.length - 1, k)); draw(); }
    function draw() {
      var s = slides[i]; stage.innerHTML = '';
      var body = h('div', { class: 'deck-slide' + (s.cover ? ' cover' : '') });
      body.appendChild(h('div', { class: 'deck-kicker' }, s.cover ? 'Quantum Computing Academy' : s.end ? 'Week ' + W2(n) : 'Slide ' + i + ' of ' + titles.length));
      body.appendChild(h('h2', null, s.title));
      var cols = h('div', { class: 'deck-cols' }), txt = h('div');
      if (showOrig && !s.cover && !s.end) {
        txt.appendChild(h('p', { class: 'small muted' }, 'Original slide outline from the course package:'));
        txt.appendChild(h('ul', null, ['Key message', 'Diagram / equation to display', 'Worked example or question', 'Speaker note: connect this slide to the weekly practical.'].map(function (x) { return h('li', null, x); })));
      } else {
        if (s.k) txt.appendChild(h('p', { class: 'deck-key', html: QG.math.process(ui.esc(s.k).replace(/&#39;/g, "'")) }));
        if (s.eq) txt.appendChild(h('div', { class: 'deck-eq', html: QG.math.block(s.eq) }));
        if (s.q) txt.appendChild(h('p', { class: 'deck-q', html: '<b>Try:</b> ' + QG.math.process(s.q) }));
        if (s.end) txt.appendChild(h('div', { class: 'btn-row' }, link('#/academy/labs/notebook/' + n, 'Open the notebook', 'btn primary'), link('#/academy/curriculum/' + n, 'Week overview', 'btn')));
      }
      cols.appendChild(txt); if (s.fig) cols.appendChild(fig(s.fig)); body.appendChild(cols);
      if (!s.cover && !s.end && !showOrig) body.appendChild(h('p', { class: 'deck-note small muted' }, 'Speaker note: connect this slide to the weekly practical.'));
      stage.appendChild(body);
      count.textContent = (i + 1) + ' / ' + slides.length;
      ui.$$('.deck-dot', dots).forEach(function (d, k) { d.classList.toggle('on', k === i); });
      orig.classList.toggle('primary', showOrig);
    }
    deck.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(i + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(i - 1); }
      else if (e.key === 'Home') go(0); else if (e.key === 'End') go(slides.length - 1);
    });
    draw(); setTimeout(function () { deck.focus({ preventScroll: true }); }, 0);
    el.appendChild(h('p', { class: 'small muted' }, 'Keys: ← → to move, Home / End, F11 or "Full screen" to present. ', raw ? h('button', { class: 'btn small', onclick: function () { ui.download(raw.text, A.files(n).slides.split('/').pop(), 'text/markdown'); } }, 'Download the outline (.md)') : null));
    el.appendChild(weekNav(n, '#/academy/lectures/deck/'));
  }

  /* ---------------- Coding Labs ---------------- */
  function pageLabs(el) {
    el.appendChild(head('Coding Labs', 'Twelve Python notebooks and twelve Q# practicals. Read them here, download them for Jupyter or VS Code, or run the QGiriBio equivalent in this page with no installation.'));
    var g = h('div', { class: 'grid cols-2' });
    var req = file('requirements.txt');
    g.appendChild(h('div', { class: 'card' }, h('p', { class: 'panel-title' }, 'Environment setup (for the original notebooks)'),
      h('ol', { class: 'small' }, h('li', null, 'Install Python 3.10 or newer.'), h('li', null, 'Create a virtual environment and run ', h('code', null, 'pip install -r requirements.txt'), '.'), h('li', null, 'Install JupyterLab and open the notebooks.'), h('li', null, 'Install VS Code with the current Microsoft QDK extension for Q#.')),
      req ? codeBlock(req.text.trim(), 'bash') : null,
      h('p', { class: 'small muted' }, 'No setup is needed for the QGiriBio equivalents: they run in this page.')));
    g.appendChild(h('div', { class: 'card' }, h('p', { class: 'panel-title' }, 'Teaching workflow'),
      h('ol', { class: 'small acad-flow' }, ['Read the lecture notes before running code.', 'Run notebooks from a clean kernel.', 'Predict output before executing quantum circuits.', 'Complete a coding challenge and record observations.', 'Explain the mathematics and limitations of every result.'].map(function (s) { return h('li', null, s); }))));
    el.appendChild(g);
    el.appendChild(h('h2', null, 'Weekly practicals'));
    var t = h('div', { class: 'acad-table' });
    A.weeks.forEach(function (w) {
      var f = A.files(w.n);
      t.appendChild(h('div', { class: 'acad-row' },
        h('span', { class: 'wk' }, 'W' + W2(w.n)),
        h('span', { class: 'acad-row-main' }, h('b', null, nbTitle(f.notebook)), h('br'), h('span', { class: 'small muted' }, f.notebook.split('/').pop() + ' · QS_W' + W2(w.n) + '.qs')),
        h('span', { class: 'btn-row' }, link('#/academy/labs/notebook/' + w.n, 'Notebook', 'btn small primary'), link('#/academy/labs/qsharp/' + w.n, 'Q#', 'btn small'))));
    });
    el.appendChild(t);
    el.appendChild(h('div', { class: 'card acad-note' }, h('p', { class: 'small' }, h('b', null, 'Grading tests. '), 'The package includes pytest checks for automated grading. ', link('#/academy/assessment', 'Run them live on the Assessment page'), ' or ', link('#/academy/resources/file/' + encodeURIComponent('grading_tests/test_quantum_fundamentals.py'), 'read the Python file'), '.')));
  }

  function notebookView(path) {
    var f = file(path), box = h('div', { class: 'nb' });
    if (!f) { box.appendChild(h('p', null, 'Missing notebook.')); return box; }
    var nb = JSON.parse(f.text), k = 0;
    box.appendChild(h('div', { class: 'nb-meta small muted' }, 'Jupyter notebook · kernel ' + ((nb.metadata.kernelspec || {}).display_name || 'Python') + ' · nbformat ' + nb.nbformat + '.' + nb.nbformat_minor + ' · ' + nb.cells.length + ' cells'));
    nb.cells.forEach(function (c) {
      var src = Array.isArray(c.source) ? c.source.join('') : String(c.source || '');
      if (c.cell_type === 'markdown') box.appendChild(h('div', { class: 'nb-cell nb-md', html: md(src) }));
      else if (c.cell_type === 'code') { k++; box.appendChild(h('div', { class: 'nb-cell nb-code' }, h('span', { class: 'nb-in' }, 'In [' + k + ']:'), codeBlock(src, 'python'))); }
      else box.appendChild(h('pre', { class: 'nb-cell' }, src));
    });
    return box;
  }
  function pageNotebook(el, n) {
    var w = week(n), f = A.files(n), nbf = file(f.notebook);
    el.appendChild(head(nbTitle(f.notebook), 'Week ' + W2(n) + ' Python practical · ' + f.notebook.split('/').pop(), [['Coding Labs', '#/academy/labs'], ['Week ' + n + ' notebook']]));
    el.appendChild(h('div', { class: 'btn-row' },
      h('button', { class: 'btn', onclick: function () { ui.download(nbf.text, f.notebook.split('/').pop(), 'application/x-ipynb+json'); } }, '⬇ Download .ipynb'),
      link('#/academy/labs/qsharp/' + n, 'Q# practical', 'btn'), link('#/academy/curriculum/' + n, 'Week overview', 'btn')));
    var lay = h('div', { class: 'acad-nb-grid' });
    var left = h('div', null, h('p', { class: 'panel-title' }, 'Original notebook (Python · Qiskit)'), notebookView(f.notebook));
    var right = h('div', null, runPanel(w.code, 'QGiriBio equivalent · press Run'), h('p', { class: 'small muted' }, 'Same steps, written with the QGiriBio JavaScript API so it runs here without Python. Random seeds differ between engines, so sampled counts can differ slightly from Qiskit Aer.'));
    lay.appendChild(left); lay.appendChild(right); el.appendChild(lay);
    el.appendChild(weekNav(n, '#/academy/labs/notebook/'));
  }

  function qsharpView(path) { var f = file(path); return f ? codeBlock(f.text, 'qsharp') : h('p', null, 'Missing file.'); }
  function pageQsharp(el, n) {
    var w = week(n), path = A.files(n).qsharp, f = file(path), c = qsCircuit(w);
    el.appendChild(head('Q# practical, week ' + W2(n), w.title + ' · ' + path.split('/').pop(), [['Coding Labs', '#/academy/labs'], ['Week ' + n + ' Q#']]));
    el.appendChild(h('div', { class: 'btn-row' }, h('button', { class: 'btn', onclick: function () { ui.download(f.text, path.split('/').pop(), 'text/plain'); } }, '⬇ Download .qs'), link('#/academy/labs/notebook/' + n, 'Python notebook', 'btn')));
    var lay = h('div', { class: 'acad-nb-grid' });
    var left = h('div', null, h('p', { class: 'panel-title' }, 'Original Q# (Microsoft QDK)'), qsharpView(path),
      h('p', { class: 'small muted' }, 'Run it with the QDK in VS Code (Q#: Run) or from Python with the ', h('code', null, 'qsharp'), ' package.'));
    if (w.qsNote) left.appendChild(h('div', { class: 'card acad-warn small', html: '<b>Teaching note.</b> ' + w.qsNote }));
    var right = h('div', null, h('p', { class: 'panel-title' }, 'The same circuit in QGiriBio'));
    QG.Composer(right, { ops: c.ops, nq: c.nq, compact: true, fixedQubits: true, tabs: [['probs', 'Probabilities'], ['shots', 'Run shots'], ['bloch', 'Bloch sphere'], ['code', 'Code']], minCols: 4 });
    right.appendChild(h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', onclick: function () { ui.store.set('composer:import', { nq: c.nq, ops: c.ops }); location.hash = '#/lab/composer'; } }, 'Open in the Composer'),
      h('button', { class: 'btn small', onclick: function () { ui.codeModal('Q# exported by QGiriBio', QG.toQSharp(c), 'Week' + W2(n) + '.qs'); } }, 'Export as Q#'),
      h('button', { class: 'btn small', onclick: function () { ui.codeModal('Qiskit (Python)', QG.toQiskit(c), 'week' + W2(n) + '.py'); } }, 'Export as Qiskit')));
    lay.appendChild(left); lay.appendChild(right); el.appendChild(lay);
    el.appendChild(weekNav(n, '#/academy/labs/qsharp/'));
  }

  /* ---------------- Assessment ---------------- */
  function donut(items) {
    var r = 70, cx = 90, cy = 90, a0 = -Math.PI / 2, s = '<svg viewBox="0 0 180 180" class="donut" role="img" aria-label="Grade weights">';
    items.forEach(function (it) {
      var a1 = a0 + it[1] / 100 * 2 * Math.PI, large = a1 - a0 > Math.PI ? 1 : 0;
      s += '<path d="M' + (cx + r * Math.cos(a0)) + ' ' + (cy + r * Math.sin(a0)) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + (cx + r * Math.cos(a1)) + ' ' + (cy + r * Math.sin(a1)) + '" style="fill:none;stroke:var(' + it[2] + ');stroke-width:26"><title>' + it[0] + ': ' + it[1] + '%</title></path>';
      a0 = a1 + 0.02;
    });
    return s + '<text x="90" y="88" text-anchor="middle" style="fill:var(--text);font:600 20px var(--font)">100%</text><text x="90" y="106" text-anchor="middle" style="fill:var(--muted);font:11px var(--font)">final grade</text></svg>';
  }
  var GRADE_CHECKS = [
    ['test_hadamard_is_unitary', function () { var c = new QG.Circuit(1); c.h(0); var a = QG.state(c), b = new QG.Circuit(1); b.x(0).h(0); var s1 = QG.state(b); return Math.abs(a.fidelity(a) - 1) < 1e-12 && a.fidelity(s1) < 1e-12; }, 'H maps |0⟩ and |1⟩ to orthonormal states, so its columns are orthonormal: H†H = I.'],
    ['test_bell_state_probabilities', function () { var c = new QG.Circuit(2); c.h(0).cx(0, 1); var p = QG.state(c).probabilities(); return Math.abs(p[0] - 0.5) < 1e-12 && Math.abs(p[3] - 0.5) < 1e-12 && p[1] < 1e-12 && p[2] < 1e-12; }, '|Φ+⟩ gives [0.5, 0, 0, 0.5].'],
    ['test_tensor_product_normalization', function () { var c = new QG.Circuit(2); c.h(1); var p = QG.state(c).probabilities(), s = 0; for (var i = 0; i < p.length; i++) s += p[i]; return Math.abs(s - 1) < 1e-12; }, '‖|+⟩ ⊗ |0⟩‖ = 1.'],
    ['test_rotation_unitarity', function () { var m = QG.gates.matrix1('rx', [0.37]), n0 = m[0] * m[0] + m[1] * m[1] + m[4] * m[4] + m[5] * m[5], n1 = m[2] * m[2] + m[3] * m[3] + m[6] * m[6] + m[7] * m[7], off = m[0] * m[2] + m[1] * m[3] + m[4] * m[6] + m[5] * m[7]; return Math.abs(n0 - 1) < 1e-12 && Math.abs(n1 - 1) < 1e-12 && Math.abs(off) < 1e-12; }, 'Rx(0.37)†Rx(0.37) = I.']];
  QG.academyGradeChecks = GRADE_CHECKS;

  function pageAssessment(el) {
    el.appendChild(head('Assessment and certification', 'Quizzes, assignments, practicals and a capstone, with clear weights and a rubric. Practise with the question bank below; your best score is saved in this browser.'));
    var g = h('div', { class: 'grid cols-2' });
    var gl = h('div', { class: 'acad-legend' }); A.grades.forEach(function (it) { gl.appendChild(h('div', null, h('i', { style: { background: 'var(' + it[2] + ')' } }), h('span', null, it[0]), h('b', null, it[1] + '%'))); });
    g.appendChild(h('div', { class: 'card' }, h('p', { class: 'panel-title' }, 'Grade weights'), h('div', { class: 'acad-donut' }, h('div', { html: donut(A.grades) }), gl)));
    var rb = h('div', { class: 'card' }, h('p', { class: 'panel-title' }, 'Coding rubric (100 points)'));
    RUBRIC.forEach(function (r) { rb.appendChild(h('div', { class: 'acad-bar' }, h('span', null, r[0]), h('div', { class: 'meter' }, h('span', { style: { width: (r[1] / 35 * 100) + '%' } })), h('b', null, r[1]))); rb.appendChild(h('p', { class: 'small muted acad-bar-note' }, r[2])); });
    g.appendChild(rb); el.appendChild(g);

    el.appendChild(h('h2', null, 'Certification pathway'));
    var done = weeksDone(), capDone = (function () { var s = ui.store.get('check:academy-capstone', {}); return Object.keys(s).filter(function (k) { return s[k]; }).length === 8; })();
    var cg = h('div', { class: 'grid cols-3' });
    A.certs.forEach(function (c) {
      var n = c.weeks.filter(function (k) { return done[k]; }).length, tot = c.weeks.length + (c.capstone ? 1 : 0), got = n + (c.capstone && capDone ? 1 : 0), ok = got === tot;
      cg.appendChild(h('div', { class: 'card acad-cert' + (ok ? ' ok' : '') }, h('span', { class: 'chip ' + ['blue', 'green', 'yellow'][c.level - 1] }, 'Level ' + c.level), h('h3', null, c.title), h('p', { class: 'small muted' }, c.rule),
        h('div', { class: 'meter' }, h('span', { style: { width: (got / tot * 100) + '%' } })), h('p', { class: 'small' }, ok ? '✓ Requirements met in this browser' : got + ' of ' + tot + ' requirements ticked')));
    });
    el.appendChild(cg);
    el.appendChild(h('p', { class: 'small muted' }, 'Tick weeks on the ', link('#/academy/curriculum', 'Curriculum'), ' pages and the capstone checklist in ', link('#/academy/curriculum/12', 'Week 12'), '. Formal certificates are awarded by the course, not by this page.'));

    el.appendChild(h('h2', null, 'Practice quiz (MCQ question bank)'));
    el.appendChild(quiz());
    el.appendChild(h('h2', null, 'Flashcards (Moodle GIFT bank)'));
    el.appendChild(flashcards());

    el.appendChild(h('h2', null, 'Automated grading checks'));
    var gc = h('div', { class: 'card' }), list = h('div');
    gc.appendChild(h('p', { class: 'small' }, 'The package grades code with pytest (', link('#/academy/resources/file/' + encodeURIComponent('grading_tests/test_quantum_fundamentals.py'), 'test_quantum_fundamentals.py'), '). The same four checks, written with the QGiriBio engine:'));
    gc.appendChild(h('button', { class: 'btn primary', onclick: function () {
      list.innerHTML = '';
      GRADE_CHECKS.forEach(function (t) { var ok = false; try { ok = t[1](); } catch (e) { ok = false; } list.appendChild(h('div', { class: 'acad-test' }, h('span', { class: ok ? 'ok-text' : 'err-text' }, ok ? 'PASSED' : 'FAILED'), h('code', null, t[0]), h('span', { class: 'small muted' }, t[2]))); });
    } }, '▶ Run the 4 checks'));
    gc.appendChild(list); el.appendChild(gc);
  }

  function quiz() {
    var qs = mcq(), box = h('div', { class: 'card' }), sel = h('select', { 'aria-label': 'Choose questions' }), body = h('div'), best = ui.store.get('academy:quiz', null);
    sel.appendChild(h('option', { value: '0' }, 'All ' + qs.length + ' questions'));
    var wks = []; qs.forEach(function (q) { if (wks.indexOf(q.week) < 0) wks.push(q.week); }); wks.sort(function (a, b) { return a - b; });
    wks.forEach(function (k) { sel.appendChild(h('option', { value: k }, 'Week ' + k + ' (' + qs.filter(function (q) { return q.week === k; }).length + ')')); });
    var bestEl = h('span', { class: 'small muted' }, best ? 'Best full-bank score: ' + best.score + ' / ' + best.total : '');
    sel.addEventListener('change', draw);
    box.appendChild(h('div', { class: 'btn-row' }, sel, h('button', { class: 'btn small', onclick: draw }, 'Restart'), bestEl)); box.appendChild(body);
    function draw() {
      var wk = +sel.value, set = qs.filter(function (q) { return !wk || q.week === wk; }), score = 0, answered = 0, res = h('p', { class: 'small' });
      body.innerHTML = '';
      set.forEach(function (q, qi) {
        var wrap = h('div', { class: 'quiz-q' }, h('div', { html: '<strong>' + (qi + 1) + '.</strong> <span class="chip">W' + q.week + '</span> ' + QG.math.process(ui.esc(q.q)) }));
        var opts = h('div', { class: 'opts' }), why = h('div', { class: 'why', 'aria-live': 'polite' }), done = false;
        q.options.forEach(function (o, oi) {
          var b = h('button', { class: 'opt', onclick: function () {
            if (done) return; done = true; answered++; var right = oi === q.answer; if (right) score++;
            b.classList.add(right ? 'right' : 'wrong'); if (!right && opts.children[q.answer]) opts.children[q.answer].classList.add('right');
            why.innerHTML = (right ? '<span class="ok-text">Correct.</span> ' : '<span class="warn-text">Not quite.</span> ') + ui.esc(q.why);
            if (answered === set.length) {
              res.innerHTML = 'Score: <strong>' + score + ' / ' + set.length + '</strong>';
              if (!wk) { var b0 = ui.store.get('academy:quiz', null); if (!b0 || score > b0.score) { ui.store.set('academy:quiz', { score: score, total: set.length, at: Date.now() }); bestEl.textContent = 'Best full-bank score: ' + score + ' / ' + set.length; } }
            }
          } }, String.fromCharCode(65 + oi) + '. ' + o);
          opts.appendChild(b);
        });
        wrap.appendChild(opts); wrap.appendChild(why); body.appendChild(wrap);
      });
      body.appendChild(res);
    }
    draw(); return box;
  }

  function flashcards() {
    var f = file('question_banks/Quantum_Academy_Question_Bank.gift'), cards = f ? parseGift(f.text) : [], i = 0, flipped = false;
    var box = h('div', { class: 'card' }), card = h('button', { class: 'flash', 'aria-live': 'polite', onclick: function () { flipped = !flipped; draw(); } }), count = h('span', { class: 'small muted' });
    box.appendChild(card);
    box.appendChild(h('div', { class: 'btn-row' }, h('button', { class: 'btn', 'aria-label': 'Previous card', onclick: function () { i = (i - 1 + cards.length) % cards.length; flipped = false; draw(); } }, '←'), count, h('button', { class: 'btn', 'aria-label': 'Next card', onclick: function () { i = (i + 1) % cards.length; flipped = false; draw(); } }, '→'),
      h('span', { class: 'spacer' }), h('button', { class: 'btn small', onclick: function () { ui.download(f.text, 'Quantum_Academy_Question_Bank.gift', 'text/plain'); } }, 'Download GIFT for Moodle')));
    function draw() {
      var c = cards[i]; if (!c) { card.textContent = 'No cards.'; return; }
      card.className = 'flash' + (flipped ? ' back' : '');
      card.innerHTML = '<span class="flash-k">' + (flipped ? 'Answer' : 'Week ' + c.week + ' · question') + '</span><span class="flash-t">' + ui.esc(flipped ? c.a : c.q) + '</span><span class="small muted">' + (flipped ? 'click for the question' : 'click to reveal the answer') + '</span>';
      count.textContent = (i + 1) + ' / ' + cards.length;
    }
    draw(); return box;
  }

  /* ---------------- Projects ---------------- */
  function pageProjects(el) {
    el.appendChild(head('Research projects', 'Six capstone tracks. Each must define a scientific question, implement a quantum method, compare it with a classical baseline and explain its limitations.'));
    var g = h('div', { class: 'grid cols-2' });
    A.projects.forEach(function (p) {
      var lab = QG.labList.filter(function (x) { return x.id === p.lab; })[0], c = h('div', { class: 'card acad-card acad-proj' });
      c.appendChild(h('div', { class: 'acad-proj-top' }, h('span', { class: 'acad-proj-id' }, p.id), h('div', null, h('h3', null, 'Track ' + p.id + ': ' + p.title), h('span', { class: 'chip' }, p.level))));
      c.appendChild(fig(p.fig)); c.appendChild(h('p', { class: 'small' }, p.desc)); c.appendChild(h('p', { class: 'small muted' }, h('b', null, 'In QGiriBio: '), p.qg));
      c.appendChild(h('div', { class: 'btn-row' }, link('#/lab/' + p.lab, 'Open ' + (lab ? lab.title : 'the lab'), 'btn primary small'), link('#/learn/' + p.lesson, 'Lesson ' + p.lesson, 'btn small')));
      var cl = h('div'); c.appendChild(h('details', null, h('summary', { class: 'small' }, 'Project checklist'), cl));
      mountWidget(cl, 'checklist', { id: 'academy-proj-' + p.id, title: 'Track ' + p.id + ' milestones', items: ['Scientific question written down', 'Classical baseline implemented', 'Quantum method implemented and tested', 'Results compared with the baseline', 'Resources reported (qubits, depth, shots, noise)', 'Limitations and next steps written'] });
      g.appendChild(c);
    });
    el.appendChild(g);
    el.appendChild(h('h2', null, 'Mandatory capstone submission'));
    var sub = h('div'); el.appendChild(sub);
    mountWidget(sub, 'checklist', week(12).widget[1]);
    el.appendChild(h('div', { class: 'card acad-warn' }, h('p', { class: 'small' }, h('b', null, 'Scientific integrity. '), A.capstoneRules)));
  }

  /* ---------------- Operations ---------------- */
  function pageOperations(el) {
    el.appendChild(head('Faculty and delivery', 'The team, competencies, technology stack and launch plan needed to run the programme.'));
    var tot = A.team.reduce(function (s, t) { return s + t[1]; }, 0), tb = h('div', { class: 'card' }, h('p', { class: 'panel-title' }, 'Minimum academic team (' + tot + ' people)'));
    A.team.forEach(function (t) { tb.appendChild(h('div', { class: 'acad-team' }, h('span', { class: 'acad-heads', 'aria-label': t[1] + (t[1] > 1 ? ' people' : ' person') }, new Array(t[1] + 1).join('●')), h('span', null, h('b', null, t[0]), h('br'), h('span', { class: 'small muted' }, t[2])))); });
    var cp = h('div', { class: 'grid cols-2' });
    A.competencies.forEach(function (c, i) { cp.appendChild(h('div', { class: 'card acad-comp c' + i % 3 }, h('h3', null, c[0]), h('p', { class: 'small muted' }, c[1]))); });
    el.appendChild(h('div', { class: 'grid cols-2' }, tb, h('div', null, h('p', { class: 'panel-title' }, 'Core competencies'), cp)));

    el.appendChild(h('h2', null, 'Technology architecture'));
    el.appendChild(h('p', { class: 'muted small' }, 'Select a layer to see what it is for.'));
    var stack = h('div', { class: 'acad-stack' }), info = h('div', { class: 'card small' });
    A.stack.forEach(function (s, i) {
      var b = h('button', { class: 'acad-layer c' + i % 3 + (i === A.stack.length - 1 ? ' qg' : ''), onclick: function () { ui.$$('.acad-layer', stack).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); info.innerHTML = '<b>' + ui.esc(s[0]) + ':</b> ' + ui.esc(s[1]) + '<br><span class="muted">' + ui.esc(s[2]) + '</span>'; } }, h('span', null, s[0]), h('b', null, s[1]));
      stack.appendChild(b);
    });
    el.appendChild(h('div', { class: 'acad-stack-wrap' }, stack, info)); stack.firstChild.click();

    el.appendChild(h('h2', null, 'Eight-week pre-launch plan'));
    el.appendChild(h('ol', { class: 'acad-timeline' }, A.launch.map(function (s, i) { return h('li', null, h('span', { class: 'wk' }, 'Week ' + (i + 1)), h('span', null, s)); })));
    el.appendChild(h('div', { class: 'card acad-note' }, h('p', { class: 'small' }, h('b', null, 'Operational rule. '), A.opsRule, ' QGiriBio itself needs only a browser, so it satisfies this rule for every student.')));
  }

  /* ---------------- Resources ---------------- */
  var FILTERS = [['all', 'All'], ['notebook', 'Notebooks'], ['qsharp', 'Q#'], ['lectures', 'Lecture notes'], ['slides', 'Slides'], ['question_banks', 'Question banks'], ['docs', 'Guides'], ['moodle', 'Moodle'], ['grading_tests', 'Tests']];
  function pageResources(el) {
    el.appendChild(head('Resources', 'The complete course package, official documentation, textbooks, further reading and every reference used in the programme.'));
    el.appendChild(h('div', { class: 'card acad-note' }, h('div', { class: 'btn-row' },
      h('a', { class: 'btn primary', href: A.meta.zip, download: 'Quantum_Computing_Academy_Course_Production_Package.zip' }, '⬇ Download the full package (.zip)'),
      h('span', { class: 'small muted' }, Object.keys(QG.academyFiles || {}).length + ' files: notebooks, Q# practicals, lecture scripts, slide outlines, question banks, Moodle manifest, grading tests and guides.'))));

    el.appendChild(h('h2', null, 'Course library'));
    var q = h('input', { type: 'search', placeholder: 'Search files and their text…', 'aria-label': 'Search the course library' }), chips = h('div', { class: 'tag-row' }), list = h('div', { class: 'acad-table' }), cur = ui.store.get('academy:libfilter', 'all');
    FILTERS.forEach(function (f) { chips.appendChild(h('button', { class: 'chip-btn' + (f[0] === cur ? ' on' : ''), onclick: function () { cur = f[0]; ui.store.set('academy:libfilter', cur); ui.$$('.chip-btn', chips).forEach(function (b) { b.classList.toggle('on', b.textContent === f[1]); }); draw(); } }, f[1])); });
    q.addEventListener('input', ui.debounce(draw, 150));
    el.appendChild(h('div', { class: 'acad-lib-tools' }, q, chips)); el.appendChild(list);
    function draw() {
      var term = q.value.trim().toLowerCase(), keys = Object.keys(QG.academyFiles || {}).sort(), shown = 0;
      list.innerHTML = '';
      keys.forEach(function (k) {
        var f = file(k), dir = k.indexOf('/') > 0 ? k.split('/')[0] : '';
        if (cur !== 'all' && (cur === 'notebook' || cur === 'qsharp' ? f.type !== cur : dir !== cur)) return;
        if (term && k.toLowerCase().indexOf(term) < 0 && f.text.toLowerCase().indexOf(term) < 0) return;
        shown++;
        list.appendChild(h('div', { class: 'acad-row' }, h('span', { class: 'chip ' + (f.type === 'notebook' ? 'yellow' : f.type === 'qsharp' ? 'blue' : f.type === 'markdown' ? 'green' : '') }, TYPE_NAMES[f.type] || f.type),
          h('span', { class: 'acad-row-main' }, h('b', null, k.split('/').pop()), h('br'), h('span', { class: 'small muted' }, (dir || 'package root') + ' · ' + fmtSize(f.size))),
          h('span', { class: 'btn-row' }, link('#/academy/resources/file/' + encodeURIComponent(k), 'View', 'btn small primary'), h('button', { class: 'btn small', onclick: function () { ui.download(f.text, k.split('/').pop(), 'text/plain'); } }, 'Download'))));
      });
      if (!shown) list.appendChild(h('p', { class: 'muted small' }, 'No files match.'));
    }
    draw();

    el.appendChild(h('h2', null, 'Official documentation'));
    var dg = h('div', { class: 'grid cols-2' });
    A.docs.forEach(function (d) { dg.appendChild(h('div', { class: 'card' }, h('h3', null, ext(d.url, d.title)), h('p', { class: 'small muted' }, d.desc))); });
    el.appendChild(dg);
    el.appendChild(h('h2', null, 'Core textbooks'));
    el.appendChild(h('ol', { class: 'acad-refs' }, A.textbooks.map(function (t) { return h('li', { html: t }); })));
    el.appendChild(h('h2', null, 'Blogs and further reading'));
    el.appendChild(h('p', { class: 'small muted' }, 'These open external sites and need an internet connection. Everything else on this page works offline.'));
    var rg = h('div', { class: 'grid cols-3' });
    A.reading.forEach(function (r) { rg.appendChild(h('div', { class: 'card' }, h('span', { class: 'chip' }, r.kind), h('h3', null, ext(r.url, r.title)), h('p', { class: 'small muted' }, r.desc))); });
    el.appendChild(rg);
    el.appendChild(h('h2', null, 'All references, by week'));
    var refs = h('div');
    A.weeks.forEach(function (w) { refs.appendChild(h('details', { class: 'acad-refweek' }, h('summary', null, 'Week ' + W2(w.n) + ': ' + w.title + ' (' + w.refs.length + ')'), h('ol', { class: 'acad-refs' }, w.refs.map(function (r) { return h('li', { html: r }); })))); });
    el.appendChild(refs);
    el.appendChild(h('h2', null, 'Deployment notes'));
    el.appendChild(h('div', { class: 'card small' }, h('p', null, A.deploy), h('p', null, link('#/academy/resources/file/' + encodeURIComponent('moodle/MOODLE_IMPORT_GUIDE.md'), 'Moodle import guide'), ' · ', link('#/academy/resources/file/' + encodeURIComponent('docs/Student_Guide.md'), 'Student guide'), ' · ', link('#/academy/resources/file/' + encodeURIComponent('README.md'), 'Package README'))));
  }

  function pageFile(el, path) {
    var f = file(path);
    el.appendChild(head(path.split('/').pop(), path + (f ? ' · ' + fmtSize(f.size) : ''), [['Resources', '#/academy/resources'], [path.split('/').pop()]]));
    if (!f) { el.appendChild(h('p', null, 'File not found in the course package.')); return; }
    el.appendChild(h('div', { class: 'btn-row' }, h('button', { class: 'btn', onclick: function () { ui.download(f.text, path.split('/').pop(), 'text/plain'); } }, '⬇ Download'), h('button', { class: 'btn small', onclick: function () { ui.copy(f.text); } }, 'Copy text')));
    var n = +((/W(\d\d)/.exec(path) || [])[1] || 0);
    if (f.type === 'notebook') { el.appendChild(notebookView(path)); if (n) el.appendChild(link('#/academy/labs/notebook/' + n, 'Open with the runnable QGiriBio equivalent →', 'btn primary')); }
    else if (f.type === 'qsharp') { el.appendChild(qsharpView(path)); if (n) el.appendChild(link('#/academy/labs/qsharp/' + n, 'Open with the QGiriBio circuit →', 'btn primary')); }
    else if (f.type === 'markdown') el.appendChild(h('div', { class: 'lesson-body acad-md card', html: md(f.text) }));
    else if (f.type === 'csv') { var rows = parseCSV(f.text), t = h('table', { class: 'amp-table' }); rows.forEach(function (r, i) { t.appendChild(h('tr', null, r.map(function (c) { return h(i ? 'td' : 'th', null, c); }))); }); el.appendChild(h('div', { class: 'acad-scroll' }, t)); }
    else if (f.type === 'gift') { var gl = h('ol', { class: 'acad-gift' }); parseGift(f.text).forEach(function (c) { gl.appendChild(h('li', null, h('b', null, c.q), h('br'), h('span', { class: 'ok-text small' }, '✓ ' + c.a))); }); el.appendChild(gl); el.appendChild(h('details', null, h('summary', { class: 'small' }, 'Raw GIFT text'), h('pre', { class: 'acode' }, f.text))); }
    else el.appendChild(codeBlock(f.text, f.type === 'python' ? 'python' : 'text'));
  }

  /* ---------------- router ---------------- */
  QG.pages.academy = function (el, parts) {
    A = QG.academy; // content/academy.js loads after this file
    var pg = parts[0] || 'overview', sub = parts[1], arg = parts.slice(2).join('/');
    if (!PAGES.some(function (p) { return p[0] === pg; })) pg = 'overview';
    el.appendChild(subnav(pg));
    var body = h('div', { class: 'acad' }); el.appendChild(body);
    var n = Math.max(1, Math.min(12, parseInt(arg || sub, 10) || 1));
    if (pg === 'overview') pageOverview(body);
    else if (pg === 'curriculum') { if (sub) pageWeek(body, Math.max(1, Math.min(12, parseInt(sub, 10) || 1))); else pageCurriculum(body); }
    else if (pg === 'lectures') { if (sub === 'notes') pageNotes(body, n); else if (sub === 'deck') pageDeck(body, n); else pageLectures(body); }
    else if (pg === 'labs') { if (sub === 'notebook') pageNotebook(body, n); else if (sub === 'qsharp') pageQsharp(body, n); else pageLabs(body); }
    else if (pg === 'assessment') pageAssessment(body);
    else if (pg === 'projects') pageProjects(body);
    else if (pg === 'operations') pageOperations(body);
    else if (pg === 'resources') { if (sub === 'file' && arg) pageFile(body, decodeURIComponent(arg)); else pageResources(body); }
  };

  /* ---------------- Week 10 widget: transverse-field Ising explorer ---------------- */
  QG.widgets.ising = function (el, o) {
    var st = { ns: [2, 4, 6], J: 1 }, box = h('div', { class: 'card' }), plots = h('div', { class: 'grid cols-2' }), note = h('p', { class: 'small muted' });
    var chk = h('div', { class: 'btn-row' }, h('span', { class: 'small' }, 'Chain lengths:'));
    [2, 3, 4, 5, 6].forEach(function (n) {
      var cb = h('input', { type: 'checkbox', checked: st.ns.indexOf(n) >= 0 ? 'checked' : null, 'aria-label': n + ' spins' });
      cb.addEventListener('change', function () { if (cb.checked) st.ns.push(n); else st.ns = st.ns.filter(function (x) { return x !== n; }); st.ns.sort(); draw(); });
      chk.appendChild(h('label', { class: 'small' }, cb, ' ' + n));
    });
    box.appendChild(h('p', { class: 'panel-title' }, 'Transverse-field Ising chain: H = −J Σ ZᵢZᵢ₊₁ − h Σ Xᵢ (open ends, J = 1)'));
    box.appendChild(chk); box.appendChild(plots); box.appendChild(note); el.appendChild(box);
    function draw() {
      plots.innerHTML = '';
      if (!st.ns.length) { note.textContent = 'Pick at least one chain length.'; return; }
      var hs = [], k; for (k = 0; k <= 40; k++) hs.push(2 * k / 40);
      var eS = [], gS = [], cols = ['--blue', '--green', '--yellow', '--muted'];
      st.ns.forEach(function (n, i) {
        var e = [], g = [];
        hs.forEach(function (hx) { var v = QG.pauli.exact(QG.pauli.models.tfim(n, st.J, hx)).values; e.push(v[0] / n); g.push(v[1] - v[0]); });
        var col = QG.charts.cssVar(cols[i % 4]); eS.push({ name: n + ' spins', x: hs, y: e, color: col }); gS.push({ name: n + ' spins', x: hs, y: g, color: col });
      });
      plots.appendChild(QG.charts.line(eS, { title: 'Ground-state energy per spin', xLabel: 'field h / J', yLabel: 'E₀ / n', height: 230 }));
      plots.appendChild(QG.charts.line(gS, { title: 'Energy gap E₁ − E₀', xLabel: 'field h / J', yLabel: 'gap', height: 230 }));
      note.textContent = 'At h = 0 the two aligned states are degenerate (gap 0). As the chain grows, the gap stays near zero for h < 1 and opens for h > 1: the finite-size trace of the quantum phase transition at h = J. Exact diagonalisation of ' + Math.pow(2, st.ns[st.ns.length - 1]) + ' × ' + Math.pow(2, st.ns[st.ns.length - 1]) + ' matrices, on your computer.';
    }
    draw();
  };
})();
