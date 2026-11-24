/* Code Lab: write JavaScript against the QG API. Code runs in a background worker with a time limit. */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h;

  var EXAMPLES = {
    'Hello qubit': "// Your first circuit: one qubit in superposition\nconst qc = new QG.Circuit(1);\nqc.h(0);\n\nconsole.log('State:', QG.state(qc));      // (0.707)|0⟩ + (0.707)|1⟩\nQG.show.bloch(qc, 0, 'After H');\n\nqc.measure(0);\nconst r = QG.run(qc, { shots: 1000 });\nconsole.log('Counts:', r.counts);\nQG.show.histogram(r, '1000 shots');\n",
    'Bell state': "// Entangle two qubits\nconst qc = new QG.Circuit(2);\nqc.h(0).cx(0, 1);\n\nQG.show.circuit(qc, 'Bell circuit');\nQG.show.state(qc, 'Amplitudes');\n\n// Both qubits always agree: only 00 and 11 appear\nqc.measureAll();\nQG.show.histogram(QG.run(qc, { shots: 2000 }), 'Measured together');\n",
    'GHZ with n qubits': "// A GHZ state on n qubits: (|00…0⟩ + |11…1⟩)/√2\nconst n = 12;\nconst qc = new QG.Circuit(n);\nqc.h(0);\nfor (let i = 0; i < n - 1; i++) qc.cx(i, i + 1);\nqc.measureAll();\nconst r = QG.run(qc, { shots: 4096 });\nconsole.log(`${n} qubits = ${2 ** n} amplitudes, ran in ${r.ms} ms`);\nQG.show.histogram(r, 'Only two outcomes out of ' + 2 ** n);\n",
    'Measure in X basis': "// Measuring in a different basis: apply H before measuring\nconst plus = new QG.Circuit(1);\nplus.h(0);                 // |+⟩\nconsole.log('Z basis:', QG.run(plus.copy().measureAll(), { shots: 1000 }).counts);\n\nconst xb = plus.copy();\nxb.h(0).measureAll();      // rotate X basis onto Z basis\nconsole.log('X basis:', QG.run(xb, { shots: 1000 }).counts);  // always 0\n",
    'Expectation values': "// <Z>, <X>, <Y> for a rotated qubit\nconst out = [];\nfor (let k = 0; k <= 24; k++) {\n  const t = k * Math.PI / 12;\n  const qc = new QG.Circuit(1);\n  qc.ry(t, 0);\n  const s = QG.state(qc);\n  out.push([t, s.expectPauli('Z'), s.expectPauli('X')]);\n}\nQG.show.plot([\n  { name: '<Z>', x: out.map(r => r[0]), y: out.map(r => r[1]) },\n  { name: '<X>', x: out.map(r => r[0]), y: out.map(r => r[2]) }\n], { title: 'Ry(θ)|0⟩', xLabel: 'θ (radians)', yLabel: 'expectation' });\n",
    'Grover search (3 qubits)': "// Find the marked item |101⟩ among 8 with 2 Grover iterations\nconst n = 3, marked = 0b101;\nconst qc = new QG.Circuit(n);\nfor (let q = 0; q < n; q++) qc.h(q);\n\nfunction flipZeros() { for (let q = 0; q < n; q++) if (!((marked >> q) & 1)) qc.x(q); }\nfunction ccz() { qc.h(2).ccx(0, 1, 2).h(2); }\nfunction oracle() { flipZeros(); ccz(); flipZeros(); }\nfunction diffuser() {\n  for (let q = 0; q < n; q++) qc.h(q).x(q);\n  ccz();\n  for (let q = 0; q < n; q++) qc.x(q).h(q);\n}\nfor (let k = 0; k < 2; k++) { oracle(); diffuser(); }\n\nQG.show.probabilities(qc, 'After 2 iterations');\nconsole.log('P(101) =', QG.state(qc).probabilities()[marked].toFixed(4));\n",
    'Teleportation': "// Teleport a qubit state using mid-circuit measurement and classical control\nconst qc = new QG.Circuit(3, 3);\nqc.ry(1.1, 0);                         // the state to send\nqc.h(1).cx(1, 2);                      // shared Bell pair\nqc.cx(0, 1).h(0);                      // Alice's operations\nqc.measure(0, 0).measure(1, 1);\nqc.ifBit(1, 1, q => q.x(2));           // Bob's corrections\nqc.ifBit(0, 1, q => q.z(2));\nqc.measure(2, 2);\n\nconst r = QG.run(qc, { shots: 4000 });\nlet ones = 0;\nfor (const k in r.counts) if (k[0] === '1') ones += r.counts[k];\nconsole.log('P(Bob reads 1) =', (ones / r.shots).toFixed(3), ' expected', Math.sin(0.55) ** 2);\nQG.show.histogram(r, 'c2 c1 c0');\n",
    'Noisy Bell state': "// Density-matrix simulation with a noise model (Track 4)\nconst qc = new QG.Circuit(2);\nqc.h(0).cx(0, 1).measureAll();\nconst noise = { p1: 0.002, p2: 0.03, t1: 60, t2: 50, readout: 0.04 };\nconst r = QG.runNoisy(qc, noise, { shots: 4000 });\nconsole.log('noisy probabilities:', r.probs);\nconsole.log('fidelity with ideal:', r.dm.fidelity(QG.state(qc)).toFixed(4), ' purity:', r.dm.purity().toFixed(4));\nQG.show.histogram(r.counts, 'Noisy Bell state, 4000 shots');\nconsole.log(QG.noiseToQiskit(noise));\n",
    'Algorithm library': "// Built-in textbook algorithms (Track 3)\nconst g = QG.algorithms.grover(4, 11);            // n = 4 qubits, marked item 11\nconsole.log('stages:', g.stages.map(s => s.label).join(' → '));\nQG.show.probabilities(g.circuit, 'Grover after ' + g.iterations + ' iterations');\n\nconst q = QG.algorithms.phaseEstimation(4, 0.3);\nconst r = QG.run(q.circuit, { shots: 2000 });\nQG.show.histogram(r, 'Phase estimation of φ = 0.3 with 4 counting qubits');\n\nconst o = QG.algorithms.orderFinding(7, 15, 8);   // Shor's order finding\nconsole.log('period of 7^x mod 15 =', o.period);\n",
    'How big can I go?': "// Time a 20-qubit circuit on this computer\nconst n = 20;\nconst qc = new QG.Circuit(n);\nfor (let q = 0; q < n; q++) qc.h(q);\nfor (let q = 0; q < n - 1; q++) qc.cx(q, q + 1);\nfor (let q = 0; q < n; q++) qc.rz(0.1 * q, q);\nconst t0 = Date.now();\nconst s = QG.state(qc);\nconsole.log(`${qc.gateCount()} gates on ${n} qubits (${(2 ** n * 16 / 1048576).toFixed(0)} MB) took ${Date.now() - t0} ms`);\nconsole.log('<Z0> =', s.expectPauli('I'.repeat(n - 1) + 'Z').toFixed(4));\n"
  };

  var KW = /\b(const|let|var|function|return|for|if|else|while|of|in|new|true|false|null|undefined|class|this|async|await)\b/g;
  function highlight(src) {
    var out = '', re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|(\b\d+\.?\d*(?:e[-+]?\d+)?\b|\b0b[01]+\b)|(\bQG\b(?:\.\w+)*)|([^\/'"`\dQ]+|.)/g, m;
    while ((m = re.exec(src))) {
      if (m[1]) out += '<span class="tok-c">' + ui.esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tok-s">' + ui.esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="tok-n">' + m[3] + '</span>';
      else if (m[4]) out += '<span class="tok-f">' + m[4] + '</span>';
      else out += ui.esc(m[5]).replace(KW, '<span class="tok-k">$1</span>');
    }
    return out + '\n';
  }

  QG.labs.code = function (el) {
    el.appendChild(h('div', { class: 'lab-head' }, h('h1', null, 'Code Lab'), h('span', { class: 'muted small' }, 'JavaScript + the QG API · runs in a background thread · stops after 15 s')));
    var grid = h('div', { class: 'lab-grid' }), left = h('div'), right = h('div', { class: 'card' });
    grid.appendChild(left); grid.appendChild(right); el.appendChild(grid);
    var draft = ui.store.get('codelab:draft', null) || EXAMPLES['Hello qubit'];
    var ta = h('textarea', { spellcheck: 'false', 'aria-label': 'Code editor', autocapitalize: 'off', autocomplete: 'off' }), pre = h('pre', { 'aria-hidden': 'true' }), gutter = h('div', { class: 'gutter', 'aria-hidden': 'true' });
    ta.value = draft;
    var ed = h('div', { class: 'editor' }, pre, gutter, ta);
    function sync() {
      pre.innerHTML = highlight(ta.value); pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft;
      var n = ta.value.split('\n').length, s = ''; for (var i = 1; i <= n; i++) s += i + '\n'; gutter.textContent = s; gutter.scrollTop = ta.scrollTop;
    }
    var save = ui.debounce(function () { ui.store.set('codelab:draft', ta.value); }, 400);
    ta.addEventListener('input', function () { sync(); save(); });
    ta.addEventListener('scroll', function () { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; gutter.scrollTop = ta.scrollTop; });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); var s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end'); sync(); save(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    });
    var exSel = h('select', { 'aria-label': 'Load an example' }, h('option', { value: '' }, 'Examples…'), Object.keys(EXAMPLES).map(function (k) { return h('option', { value: k }, k); }));
    exSel.addEventListener('change', function () { if (!exSel.value) return; ta.value = EXAMPLES[exSel.value]; exSel.value = ''; sync(); save(); });
    var runBtn = h('button', { class: 'btn primary', onclick: run, title: 'Ctrl+Enter' }, '▶ Run');
    var stopBtn = h('button', { class: 'btn', disabled: true, onclick: function () { QG.worker.terminate(); log('info', 'Stopped.'); done(); } }, 'Stop');
    var slots = h('select', { 'aria-label': 'Saved programs' });
    function drawSlots() { var s = ui.store.get('codelab:slots', {}); slots.innerHTML = ''; slots.appendChild(h('option', { value: '' }, 'My saved code…')); Object.keys(s).sort().forEach(function (k) { slots.appendChild(h('option', { value: k }, k)); }); }
    slots.addEventListener('change', function () { var s = ui.store.get('codelab:slots', {}); if (s[slots.value] !== undefined) { ta.value = s[slots.value]; sync(); save(); } slots.value = ''; });
    drawSlots();
    left.appendChild(h('div', { class: 'btn-row' }, runBtn, stopBtn, exSel, slots,
      h('button', { class: 'btn small', onclick: function () { var name = prompt('Save as (name):', 'my circuit'); if (!name) return; var s = ui.store.get('codelab:slots', {}); s[name] = ta.value; ui.store.set('codelab:slots', s); drawSlots(); ui.toast('Saved "' + name + '"'); } }, 'Save as…'),
      h('button', { class: 'btn small', onclick: function () { ui.download(ta.value, 'qgiribio-code.js', 'text/javascript'); } }, 'Download')));
    left.appendChild(ed);
    left.appendChild(h('details', { class: 'card', style: { marginTop: '10px' } }, h('summary', { style: { cursor: 'pointer', fontWeight: 500 } }, 'API reference'), h('div', { class: 'small', html: API_HTML })));
    var con = h('div', { class: 'console', role: 'log', 'aria-live': 'polite' }), outs = h('div');
    right.appendChild(h('p', { class: 'panel-title' }, 'Console'));
    right.appendChild(con);
    right.appendChild(h('p', { class: 'panel-title', style: { marginTop: '14px' } }, 'Output'));
    right.appendChild(outs);
    sync();

    var R = QG.makeOutputRenderer(con, outs), log = R.log, onStream = R.onStream;
    function done() { runBtn.disabled = false; stopBtn.disabled = true; }
    function run() {
      con.innerHTML = ''; outs.innerHTML = ''; runBtn.disabled = true; stopBtn.disabled = false;
      var t0 = performance.now();
      log('info', 'Running in ' + (QG.worker.ensure() === 'worker' ? 'a background thread' : 'the page (no worker available)') + '…');
      QG.worker.code(ta.value, onStream, 15000).then(function () { log('info', 'Done in ' + Math.round(performance.now() - t0) + ' ms.'); done(); },
        function (e) { log('error', 'Error: ' + e.message + QG.codeLineHint(e)); done(); });
    }
  };

  /* Shared renderer for program output (console lines + QG.show.* drawings). Used by the Code Lab and the Academy. */
  QG.codeLineHint = function (e) { var m = /<anonymous>:(\d+):(\d+)/.exec(e.workerStack || e.stack || ''); return m ? '  (line ' + (m[1] - 3) + ')' : ''; };
  QG.makeOutputRenderer = function (con, outs) {
    function log(kind, text) { con.appendChild(h('div', { class: kind === 'error' ? 'err' : kind === 'warn' ? 'warn' : kind === 'info' ? 'info' : '' }, text)); con.scrollTop = con.scrollHeight; }
    function onStream(kind, p) {
      if (kind === 'log' || kind === 'warn' || kind === 'error') { log(kind, p); return; }
      var box = h('div', { class: 'out-item' }); outs.appendChild(box);
      if (kind === 'histogram') box.appendChild(QG.charts.histogram(p.counts, { title: p.title }));
      else if (kind === 'probabilities') box.appendChild(QG.charts.bars(p.probs, { title: p.title || 'Probabilities', ymax: 1 }));
      else if (kind === 'state') { if (p.title) box.appendChild(h('p', { class: 'panel-title' }, p.title)); box.appendChild(QG.charts.ampTable(p.n, p.re, p.im, {})); }
      else if (kind === 'bloch') { if (p.title) box.appendChild(h('p', { class: 'panel-title' }, p.title)); QG.Bloch(box, { size: 220, vector: p.v }); }
      else if (kind === 'plot') box.appendChild(QG.charts.line(p.series, p.opt));
      else if (kind === 'table') {
        if (p.title) box.appendChild(h('p', { class: 'panel-title' }, p.title));
        var t = h('table', { class: 'amp-table' }); (p.rows || []).forEach(function (r, i) { t.appendChild(h('tr', null, (Array.isArray(r) ? r : [r]).map(function (c) { return h(i === 0 ? 'th' : 'td', null, QG.fmt(c)); }))); }); box.appendChild(t);
      } else if (kind === 'circuit') {
        if (p.title) box.appendChild(h('p', { class: 'panel-title' }, p.title));
        var c = QG.Circuit.fromJSON(p.circuit);
        if (c.nq <= 10 && !c.ops.some(function (o) { return o.cond || o.g === 'reset' || o.g === 'diagonal'; })) QG.Composer(box, { ops: c.ops.filter(function (o) { return o.g !== 'barrier'; }), nq: c.nq, compact: true, fixedQubits: true, tabs: [['probs', 'Probabilities'], ['amps', 'Amplitudes'], ['code', 'Code']], minCols: 4 });
        else box.appendChild(h('p', { class: 'small muted' }, QG.fmt(c)));
        box.appendChild(h('div', { class: 'btn-row' },
          h('button', { class: 'btn small', onclick: function () { ui.codeModal('Qiskit (Python)', QG.toQiskit(c), 'circuit.py'); } }, 'Export Qiskit'),
          h('button', { class: 'btn small', onclick: function () { try { ui.codeModal('OpenQASM 2.0', QG.toQASM(c), 'circuit.qasm'); } catch (e) { ui.toast(e.message, 4000); } } }, 'Export QASM'),
          h('button', { class: 'btn small', onclick: function () { try { ui.codeModal('Q# (Microsoft QDK)', QG.toQSharp(c), 'Circuit.qs'); } catch (e) { ui.toast(e.message, 4000); } } }, 'Export Q#')));
      }
    }
    return { log: log, onStream: onStream };
  };

  var API_HTML = '<pre><code>' + ui.esc([
    'const qc = new QG.Circuit(nQubits, nClassicalBits?)',
    'qc.h(q) .x(q) .y(q) .z(q) .s(q) .sdg(q) .t(q) .tdg(q) .sx(q)',
    'qc.rx(θ, q) .ry(θ, q) .rz(θ, q) .p(λ, q) .u(θ, φ, λ, q)',
    'qc.cx(c, t) .cy .cz .ch .swap(a, b) .ccx(c1, c2, t) .mcx([c…], t)',
    'qc.cp(λ, c, t) .crx/.cry/.crz(θ, c, t) .rxx/.ryy/.rzz(θ, a, b)',
    'qc.measure(q, c) .measureAll() .reset(q) .barrier()',
    'qc.ifBit(c, 1, q => q.x(2))      // classical control',
    'qc.diagonal(phases, [qubits])    // diagonal unitary',
    'qc.copy() .append(other) .inverse() .depth() .gateCount()',
    '',
    'QG.run(qc, { shots: 1024, seed })  → { counts, statevector, ms }',
    'QG.state(qc)  → StateVector: .probabilities() .bloch(q) .expectPauli("ZZ") .fidelity(other)',
    'QG.ket("01")  → basis StateVector',
    'QG.toQiskit(qc)   QG.toQASM(qc)   QG.fromQASM(text)',
    '',
    'QG.runNoisy(qc, {p1, p2, t1, t2, readout}, {shots}) → { probs, counts, dm }',
    'QG.DensityMatrix.fromStateVector(s)  .bloch(q) .purity() .fidelity(s) .expectPauli("ZZ")',
    'QG.channels.depolarizing(rho, [q], λ) .bitFlip .phaseFlip .amplitudeDamping .phaseDamping .thermal',
    'QG.algorithms.grover(n, marked, iters) .deutschJozsa(n, type) .bernsteinVazirani(n, s)',
    'QG.algorithms.qft(n, x) .phaseEstimation(t, φ) .orderFinding(a, N, t) .repetitionCode("bit")',
    '',
    'QG.show.histogram(resultOrCounts, title)   QG.show.probabilities(qc)',
    'QG.show.state(qc)   QG.show.bloch(qc, q)   QG.show.circuit(qc)',
    'QG.show.plot([{name, x:[], y:[]}], {title, xLabel, yLabel})   QG.show.table(rows)',
    'console.log(...)   // bit strings read q(n-1)…q0, like Qiskit'
  ].join('\n')) + '</code></pre>';
})();
