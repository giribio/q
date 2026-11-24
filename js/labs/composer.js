/* Circuit Composer: click a gate in the palette, then click a wire to place it.
 * Used as a full simulator (#/lab/composer) and embedded in lessons (data-widget="composer"). */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h, S = ui.svg;
  var CW = 54, RH = 54, LEFT = 64, TOP = 16, BOX = 38;
  var PI = Math.PI;

  var GROUPS = [
    { name: 'Basic', gates: ['h', 'x', 'y', 'z'] },
    { name: 'Phase', gates: ['s', 'sdg', 't', 'tdg', 'p'] },
    { name: 'Rotation', gates: ['rx', 'ry', 'rz', 'u', 'sx'] },
    { name: 'Multi-qubit', gates: ['cx', 'cz', 'cp', 'swap', 'ch', 'crz', 'ccx', 'rzz'] },
    { name: 'Measure', gates: ['measure'] }
  ];
  function gateClass(g) {
    if (g === 'measure') return 'g-meas';
    if (g === 'h') return 'g-h';
    if (['x', 'y', 'z', 'id'].indexOf(g) >= 0) return 'g-pauli';
    if (['s', 'sdg', 't', 'tdg', 'p'].indexOf(g) >= 0) return 'g-phase';
    if (['rx', 'ry', 'rz', 'u', 'sx', 'sxdg'].indexOf(g) >= 0) return 'g-rot';
    return 'g-multi';
  }
  var BASE_LABEL = { x: 'X', y: 'Y', z: 'Z', h: 'H', p: 'P', rx: 'Rx', ry: 'Ry', rz: 'Rz', u: 'U' };
  function nArgs(g) { if (g === 'measure') return 1; var d = QG.gates.defs[g]; return (d.nc > 0 ? d.nc : 0) + d.nt; }
  function nParams(g) { return g === 'measure' ? 0 : QG.gates.defs[g].np; }
  function defaultParams(g) { var n = nParams(g); if (g === 'u') return [PI / 2, 0, PI]; var a = []; for (var i = 0; i < n; i++) a.push(PI / 2); return a; }
  function gateDesc(g) { return g === 'measure' ? 'Measure: reads the qubit as 0 or 1 and collapses its state' : QG.gates.defs[g].desc; }
  function gateLabel(g) { return g === 'measure' ? 'M' : QG.gates.defs[g].label; }

  var PRESETS = {
    bell: { title: 'Bell state |Φ+⟩', nq: 2, ops: [['h', [0]], ['cx', [0, 1]]] },
    ghz: { title: 'GHZ state (3 qubits)', nq: 3, ops: [['h', [0]], ['cx', [0, 1]], ['cx', [1, 2]]] },
    plus: { title: 'Uniform superposition', nq: 3, ops: [['h', [0]], ['h', [1]], ['h', [2]]] },
    interference: { title: 'Interference: H then H', nq: 1, ops: [['h', [0]], ['h', [0]]] },
    kickback: { title: 'Phase kickback', nq: 2, ops: [['x', [1]], ['h', [0]], ['h', [1]], ['cx', [0, 1]], ['h', [0]]] },
    teleport: { title: 'Teleportation (deferred measurement)', nq: 3, ops: [['ry', [0], [1.1]], ['h', [1]], ['cx', [1, 2]], ['cx', [0, 1]], ['h', [0]], ['cx', [1, 2]], ['cz', [0, 2]]] },
    grover2: { title: 'Grover search, 2 qubits, marks |11⟩', nq: 2, ops: [['h', [0]], ['h', [1]], ['cz', [0, 1]], ['h', [0]], ['h', [1]], ['x', [0]], ['x', [1]], ['cz', [0, 1]], ['x', [0]], ['x', [1]], ['h', [0]], ['h', [1]]] },
    deutsch: { title: 'Deutsch: is f(x)=x constant?', nq: 2, ops: [['x', [1]], ['h', [0]], ['h', [1]], ['cx', [0, 1]], ['h', [0]], ['measure', [0]]] }
  };
  QG.composerPresets = PRESETS;

  /* Put a list of ops into columns as early as possible (ASAP layering). */
  function layer(ops, nq) {
    var level = new Array(nq).fill(0), items = [];
    ops.forEach(function (o) {
      if (o.g === 'barrier') return;
      var lo = Math.min.apply(null, o.q), hi = Math.max.apply(null, o.q), c = 0;
      for (var q = lo; q <= hi; q++) c = Math.max(c, level[q]);
      for (q = lo; q <= hi; q++) level[q] = c + 1;
      items.push({ g: o.g, q: o.q.slice(), p: (o.p || []).slice(), col: c });
    });
    return items;
  }

  QG.Composer = function (container, opt) {
    opt = opt || {};
    var st = { nq: opt.nq || 2, items: [], tool: null, pending: [], pendingCol: null, sel: null, step: null, undo: [], shots: 1024, lastRun: null, tab: opt.tab || 'probs' };
    var maxQ = opt.maxQubits || 10, allowed = opt.gates || null;
    var root = h('div', { class: 'composer' }), svgWrap = h('div', { class: 'composer-wrap', tabindex: '-1' }), hint = h('div', { class: 'hint', 'aria-live': 'polite' });
    var editor = h('div', { class: 'card', style: { marginTop: '10px', display: 'none', padding: '10px 14px' } });
    var results = h('div'), stepRow = h('div', { class: 'btn-row' }), challengeBox = h('div');
    container.appendChild(root);

    function snapshot() { st.undo.push(JSON.stringify({ nq: st.nq, items: st.items })); if (st.undo.length > 60) st.undo.shift(); }
    function loadOps(nq, ops) { st.nq = nq; st.items = layer(ops, nq); st.sel = null; st.step = null; st.lastRun = null; }
    function loadPreset(name) {
      var p = PRESETS[name]; if (!p) return;
      loadOps(p.nq, p.ops.map(function (o) { return { g: o[0], q: o[1], p: o[2] || defaultParams(o[0]).map(function () { return 0; }) }; }).map(function (o) { if (nParams(o.g) && (!o.p || !o.p.length)) o.p = defaultParams(o.g); return o; }));
    }
    if (opt.preset) loadPreset(opt.preset);
    if (opt.ops) loadOps(st.nq, opt.ops.map(function (o) { return Array.isArray(o) ? { g: o[0], q: o[1], p: o[2] || defaultParams(o[0]) } : o; }));

    function ncols() { var m = -1; st.items.forEach(function (it) { if (it.col > m) m = it.col; }); return m + 1; }
    function span(it) { return [Math.min.apply(null, it.q), Math.max.apply(null, it.q)]; }
    function occupied(col, lo, hi, except) { return st.items.some(function (it) { if (it === except || it.col !== col) return false; var s = span(it); return !(s[1] < lo || s[0] > hi); }); }
    function compact() { // remove empty columns
      var used = {}; st.items.forEach(function (it) { used[it.col] = 1; });
      var map = {}, k = 0; Object.keys(used).map(Number).sort(function (a, b) { return a - b; }).forEach(function (c) { map[c] = k++; });
      st.items.forEach(function (it) { it.col = map[it.col]; });
    }
    function toCircuit(upto) {
      var c = new QG.Circuit(st.nq);
      st.items.slice().sort(function (a, b) { return a.col - b.col; }).forEach(function (it) {
        if (upto !== undefined && upto !== null && it.col >= upto) return;
        if (it.g === 'measure') c.measure(it.q[0], it.q[0]); else c.ops.push({ g: it.g, q: it.q.slice(), p: it.p.slice() });
      });
      return c;
    }

    function place(q, col) {
      if (!st.tool) return;
      if (st.pending.indexOf(q) >= 0) { setHint('Pick a different qubit.'); return; }
      if (!st.pending.length) st.pendingCol = col;
      st.pending.push(q);
      var need = nArgs(st.tool);
      if (st.pending.length < need) {
        var d = QG.gates.defs[st.tool], role = st.pending.length < (d.nc > 0 ? d.nc : 0) ? 'next control' : (d.nt === 2 && d.nc <= 0 ? 'second' : 'target');
        setHint(gateLabel(st.tool) + ': now click the ' + role + ' qubit.'); draw(); return;
      }
      snapshot();
      var it = { g: st.tool, q: st.pending.slice(), p: defaultParams(st.tool), col: st.pendingCol }, s = span(it);
      if (occupied(it.col, s[0], s[1])) st.items.forEach(function (o) { if (o.col >= it.col) o.col++; });
      st.items.push(it); compact();
      st.pending = []; st.pendingCol = null;
      if (nParams(it.g)) st.sel = it;
      st.step = null;
      setHint(gateLabel(st.tool) + ' placed. Click again to add another, or press Esc to stop.');
      changed();
    }
    function remove(it) { snapshot(); st.items.splice(st.items.indexOf(it), 1); compact(); if (st.sel === it) st.sel = null; changed(); }
    function setHint(t) { hint.textContent = t || ''; }

    /* ---------- palette ---------- */
    var palette = h('div');
    function drawPalette() {
      palette.innerHTML = '';
      GROUPS.forEach(function (gr) {
        var gs = gr.gates.filter(function (g) { return !allowed || allowed.indexOf(g) >= 0; });
        if (!gs.length) return;
        var row = h('div', { class: 'palette', role: 'toolbar', 'aria-label': gr.name + ' gates', style: { marginBottom: '6px' } });
        gs.forEach(function (g) {
          row.appendChild(h('button', { class: 'gate-btn ' + gateClass(g) + (st.tool === g ? ' sel' : ''), title: gateDesc(g), 'aria-pressed': st.tool === g ? 'true' : 'false', onclick: function () {
            st.tool = st.tool === g ? null : g; st.pending = [];
            setHint(st.tool ? gateDesc(g) + '. Click a wire to place it' + (nArgs(g) > 1 ? ' (first click = ' + (QG.gates.defs[g].nc > 0 ? 'control' : 'first qubit') + ')' : '') + '.' : '');
            drawPalette(); draw();
          } }, gateLabel(g)));
        });
        palette.appendChild(row);
      });
    }

    /* ---------- circuit drawing ---------- */
    function draw() {
      var nc = Math.max(opt.minCols || 8, ncols() + 2), W = LEFT + nc * CW + 10, H = TOP + st.nq * RH + 6;
      var svg = S('svg', { class: 'composer-svg', width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': 'Circuit with ' + st.nq + ' qubits and ' + st.items.length + ' operations' });
      function cx(col) { return LEFT + col * CW + CW / 2; }
      function cy(q) { return TOP + q * RH + RH / 2; }
      if (st.step !== null && st.step > 0) svg.appendChild(S('rect', { class: 'col-marker', x: LEFT, y: TOP - 6, width: st.step * CW, height: st.nq * RH + 6, rx: 6 }));
      for (var q = 0; q < st.nq; q++) {
        svg.appendChild(S('text', { class: 'qlabel', x: 8, y: cy(q) + 4, text: 'q' + q + ' |0⟩' }));
        svg.appendChild(S('line', { class: 'wire', x1: LEFT - 4, x2: W - 6, y1: cy(q), y2: cy(q) }));
      }
      // clickable cells
      for (var c = 0; c < nc; c++) for (q = 0; q < st.nq; q++) (function (c, q) {
        var pend = st.pending.indexOf(q) >= 0 && st.pendingCol === c;
        var r = S('rect', { class: 'cell' + (pend ? ' pending' : ''), x: LEFT + c * CW + 2, y: TOP + q * RH + 2, width: CW - 4, height: RH - 4, rx: 6, tabindex: st.tool ? 0 : -1, role: 'button', 'aria-label': 'Place on qubit ' + q + ', step ' + (c + 1) });
        r.addEventListener('click', function () { place(q, c); });
        r.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); place(q, c); } });
        svg.appendChild(r);
      })(c, q);
      // gates
      st.items.forEach(function (it) {
        var g = S('g', { class: 'gbox', tabindex: 0, role: 'button', 'aria-label': gateLabel(it.g) + ' on qubit' + (it.q.length > 1 ? 's ' : ' ') + it.q.join(', ') + (st.sel === it ? ' (selected)' : '') });
        var x = cx(it.col), d = QG.gates.defs[it.g], s = span(it);
        if (it.q.length > 1) g.appendChild(S('line', { class: 'link', x1: x, x2: x, y1: cy(s[0]), y2: cy(s[1]) }));
        var nc2 = it.g === 'measure' ? 0 : (d.nc > 0 ? d.nc : d.nc === -1 ? it.q.length - 1 : 0);
        for (var k = 0; k < nc2; k++) g.appendChild(S('circle', { class: 'ctrl', cx: x, cy: cy(it.q[k]), r: 6 }));
        var targets = it.q.slice(nc2), base = it.g === 'measure' ? null : (d.base || d.base2);
        targets.forEach(function (tq) {
          var y = cy(tq);
          if (nc2 > 0 && base === 'x') { g.appendChild(S('circle', { cx: x, cy: y, r: 13, fill: '#1967d2' })); g.appendChild(S('path', { d: 'M' + (x - 8) + ' ' + y + 'H' + (x + 8) + 'M' + x + ' ' + (y - 8) + 'V' + (y + 8), stroke: '#fff', 'stroke-width': 2.2 })); }
          else if (nc2 > 0 && base === 'z') g.appendChild(S('circle', { class: 'ctrl', cx: x, cy: y, r: 6 }));
          else if (base === 'swap') g.appendChild(S('path', { d: 'M' + (x - 7) + ' ' + (y - 7) + 'L' + (x + 7) + ' ' + (y + 7) + 'M' + (x + 7) + ' ' + (y - 7) + 'L' + (x - 7) + ' ' + (y + 7), stroke: '#1967d2', 'stroke-width': 2.6 }));
          else {
            var lab = nc2 > 0 ? (BASE_LABEL[base] || gateLabel(it.g)) : gateLabel(it.g);
            var fill = { 'g-meas': '#5f6368', 'g-h': '#188038', 'g-pauli': '#1a73e8', 'g-phase': '#e37400', 'g-rot': '#7b61ff', 'g-multi': '#1967d2' }[gateClass(nc2 > 0 ? base : it.g)] || '#1967d2';
            g.appendChild(S('rect', { x: x - BOX / 2, y: y - BOX / 2, width: BOX, height: BOX, rx: 5, fill: fill, stroke: st.sel === it ? 'var(--text)' : 'none', 'stroke-width': 2.5 }));
            if (it.g === 'measure') { g.appendChild(S('path', { d: 'M' + (x - 11) + ' ' + (y + 6) + 'A12 12 0 0 1 ' + (x + 11) + ' ' + (y + 6) + 'M' + x + ' ' + (y + 6) + 'L' + (x + 8) + ' ' + (y - 8), stroke: '#fff', fill: 'none', 'stroke-width': 1.8 })); }
            else g.appendChild(S('text', { class: 'gl', x: x, y: y + (it.p.length ? 0 : 4), 'text-anchor': 'middle', text: lab }));
            if (it.p.length && it.g !== 'measure') g.appendChild(S('text', { class: 'gl', x: x, y: y + 12, 'text-anchor': 'middle', style: 'font-size:9px;font-weight:400', text: it.p.length === 1 ? ui.fmtAngle(it.p[0]) : '…' }));
          }
        });
        if (st.sel === it && (nc2 > 0 && (base === 'x' || base === 'z') || base === 'swap')) g.appendChild(S('rect', { x: x - 20, y: cy(s[0]) - 20, width: 40, height: cy(s[1]) - cy(s[0]) + 40, rx: 8, fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
        function act(e) { if (st.tool) { var bb = svg.getBoundingClientRect(), qy = Math.floor((e.clientY - bb.top - TOP) / RH); place(Math.max(0, Math.min(st.nq - 1, qy)), it.col); } else { st.sel = st.sel === it ? null : it; draw(); drawEditor(); } }
        g.addEventListener('click', act);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); st.sel = it; draw(); drawEditor(); } if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(it); } });
        svg.appendChild(g);
      });
      svgWrap.innerHTML = ''; svgWrap.appendChild(svg);
    }

    /* ---------- selected-gate editor ---------- */
    function drawEditor() {
      var it = st.sel; editor.innerHTML = '';
      if (!it || st.items.indexOf(it) < 0) { editor.style.display = 'none'; return; }
      editor.style.display = '';
      editor.appendChild(h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
        h('div', null, h('strong', null, gateLabel(it.g)), ' on q' + it.q.join(', q'), h('span', { class: 'small muted' }, ' — ' + gateDesc(it.g))),
        h('div', { class: 'btn-row', style: { margin: 0 } },
          h('button', { class: 'btn small', onclick: function () { if (it.col > 0) { var s = span(it); if (!occupied(it.col - 1, s[0], s[1], it)) { snapshot(); it.col--; compact(); changed(); } } } }, '← Earlier'),
          h('button', { class: 'btn small', onclick: function () { var s = span(it); snapshot(); if (occupied(it.col + 1, s[0], s[1], it)) st.items.forEach(function (o) { if (o !== it && o.col > it.col) o.col++; }); it.col++; compact(); changed(); } }, 'Later →'),
          h('button', { class: 'btn small', onclick: function () { remove(it); } }, 'Delete'))));
      var names = it.g === 'u' ? ['θ', 'φ', 'λ'] : it.g === 'p' || it.g === 'cp' ? ['λ'] : ['θ'];
      it.p.forEach(function (val, k) {
        var out = h('input', { type: 'text', value: QG.formatNumber(val), 'aria-label': names[k] + ' value', style: { width: '90px', fontFamily: 'var(--mono)' } });
        var rng = h('input', { type: 'range', min: -2 * PI, max: 2 * PI, step: PI / 32, value: val, 'aria-label': names[k] + ' slider' });
        rng.addEventListener('input', function () { it.p[k] = +rng.value; out.value = QG.formatNumber(it.p[k]); st.step = null; changed(true); });
        out.addEventListener('change', function () { try { var v = QG.evalExpr(out.value); snapshot(); it.p[k] = v; rng.value = v; out.style.borderColor = ''; changed(true); } catch (e) { out.style.borderColor = 'var(--red)'; setHint('Could not read "' + out.value + '": try pi/2, 0.5 or -pi/4'); } });
        editor.appendChild(h('div', { class: 'ctrl-row', style: { gridTemplateColumns: '30px 1fr 100px' } }, h('span', { class: 'm' }, names[k]), rng, out));
      });
    }

    /* ---------- results ---------- */
    function stepCount() { return ncols(); }
    function drawSteps() {
      stepRow.innerHTML = '';
      var K = stepCount(), cur = st.step === null ? K : st.step;
      var rng = h('input', { type: 'range', min: 0, max: K, step: 1, value: cur, 'aria-label': 'Step through the circuit', style: { flex: '1', minWidth: '140px' } });
      rng.addEventListener('input', function () { st.step = +rng.value === K ? null : +rng.value; draw(); drawResults(); lbl.textContent = label(); });
      function label() { var c = st.step === null ? K : st.step; return c === K ? 'Final state (all ' + K + ' steps)' : 'State after step ' + c + ' of ' + K; }
      var lbl = h('span', { class: 'small muted', style: { minWidth: '170px' } }, label());
      var play = h('button', { class: 'btn small', onclick: function () {
        var k = 0; st.step = 0; draw(); drawResults(); rng.value = 0; lbl.textContent = label();
        var timer = setInterval(function () { k++; if (k >= K) { clearInterval(timer); st.step = null; } else st.step = k; rng.value = k; lbl.textContent = label(); draw(); drawResults(); }, 650);
      } }, '▶ Play');
      stepRow.appendChild(h('span', { class: 'small muted' }, 'Step'));
      stepRow.appendChild(rng); stepRow.appendChild(lbl); stepRow.appendChild(play);
    }

    var TABS = opt.tabs || [['probs', 'Probabilities'], ['amps', 'Amplitudes'], ['bloch', 'Bloch spheres'], ['shots', 'Run shots'], ['code', 'Code']];
    function drawResults() {
      results.innerHTML = '';
      var tabs = h('div', { class: 'tabs', role: 'tablist' });
      TABS.forEach(function (t) { tabs.appendChild(h('button', { class: st.tab === t[0] ? 'on' : '', role: 'tab', 'aria-selected': st.tab === t[0] ? 'true' : 'false', onclick: function () { st.tab = t[0]; drawResults(); } }, t[1])); });
      results.appendChild(tabs);
      var c = toCircuit(st.step), sv = c.statevector(), panel = h('div', { role: 'tabpanel' });
      if (st.tab === 'probs') {
        var p = sv.probabilities(), o = {};
        for (var i = 0; i < p.length; i++) if (st.nq <= 4 || p[i] > 1e-9) o[QG.bitstring(i, st.nq)] = p[i];
        panel.appendChild(QG.charts.bars(o, { title: 'Exact probabilities of each outcome (q' + (st.nq - 1) + '…q0)', ymax: 1, valueFmt: function (v) { return (+v.toFixed(3)).toString(); } }));
        panel.appendChild(h('p', { class: 'small muted' }, 'Read bit strings right to left: the rightmost bit is q0 (the same order as Qiskit).'));
      } else if (st.tab === 'amps') {
        panel.appendChild(QG.charts.ampTable(st.nq, sv.re, sv.im, { showZero: st.nq <= 3 }));
        panel.appendChild(h('p', { class: 'small muted', html: QG.math.process('State: $' + ketString(sv) + '$') }));
      } else if (st.tab === 'bloch') {
        var row = h('div', { class: 'bloch-row' });
        for (var q = 0; q < st.nq; q++) { var fig = h('figure'); row.appendChild(fig); QG.Bloch(fig, { size: st.nq > 4 ? 130 : 170, vector: sv.bloch(q), labels: false, caption: false }); var b = sv.bloch(q), len = Math.hypot(b.x, b.y, b.z); fig.appendChild(h('figcaption', null, 'q' + q + (len < 0.98 ? ' · entangled (|r| = ' + len.toFixed(2) + ')' : ''))); }
        panel.appendChild(row);
        panel.appendChild(h('p', { class: 'small muted' }, 'A qubit that is entangled with others has no pure state of its own: its arrow shrinks inside the sphere.'));
      } else if (st.tab === 'shots') {
        var sel = h('select', { 'aria-label': 'Number of shots' }, [1, 10, 100, 1024, 8192].map(function (n) { return h('option', { value: n, selected: n === st.shots ? 'selected' : null }, n + ' shots'); }));
        sel.addEventListener('change', function () { st.shots = +sel.value; });
        var out = h('div');
        panel.appendChild(h('div', { class: 'btn-row' }, sel, h('button', { class: 'btn primary', onclick: function () {
          var full = toCircuit(st.step), r = QG.run(full, { shots: st.shots }); st.lastRun = r;
          out.innerHTML = ''; out.appendChild(QG.charts.histogram(r.counts, { title: r.shots + ' shots' + (r.implicitMeasure ? ' (no measure gates, so every qubit was read out)' : '') }));
          out.appendChild(h('p', { class: 'small muted' }, 'Each shot runs the circuit once and measures. Probabilities appear only after many shots; run again and the numbers change slightly.'));
        } }, 'Run')));
        panel.appendChild(out);
        if (st.lastRun) out.appendChild(QG.charts.histogram(st.lastRun.counts, { title: st.lastRun.shots + ' shots (previous run)' }));
      } else if (st.tab === 'code') {
        var full = toCircuit(), py = QG.toQiskit(full), qasm;
        try { qasm = QG.toQASM(full); } catch (e) { qasm = '// ' + e.message; }
        panel.appendChild(h('div', { class: 'btn-row' },
          h('button', { class: 'btn', onclick: function () { ui.codeModal('Qiskit (Python)', py, 'circuit.py'); } }, 'Qiskit Python'),
          h('button', { class: 'btn', onclick: function () { ui.codeModal('OpenQASM 2.0', qasm, 'circuit.qasm'); } }, 'OpenQASM'),
          h('button', { class: 'btn', onclick: function () { var qs; try { qs = QG.toQSharp(full); } catch (e) { qs = '// ' + e.message; } ui.codeModal('Q# (Microsoft QDK)', qs, 'Circuit.qs'); } }, 'Q#'),
          h('button', { class: 'btn', onclick: function () { ui.store.set('codelab:draft', jsFor(full)); location.hash = '#/lab/code'; } }, 'Open in Code Lab')));
        panel.appendChild(h('pre', null, h('code', null, py)));
        panel.appendChild(h('p', { class: 'small muted' }, 'Bridge to real tools: paste this into a Python notebook with Qiskit installed to run the same circuit, or on real IBM Quantum hardware with an account.'));
      }
      results.appendChild(panel);
    }
    function ketString(sv) {
      var terms = [];
      for (var i = 0; i < sv.N; i++) { var a = sv.re[i], b = sv.im[i]; if (a * a + b * b < 1e-9) continue; terms.push('(' + QG.complexStr(a, b) + ')\\ket{' + QG.bitstring(i, sv.n) + '}'); if (terms.length > 12) { terms.push('\\ldots'); break; } }
      return terms.join(' + ');
    }
    function jsFor(c) {
      var L = ['// Circuit exported from the Composer', 'const qc = new QG.Circuit(' + c.nq + ');'];
      c.ops.forEach(function (o) {
        if (o.g === 'measure') L.push('qc.measure(' + o.q[0] + ', ' + o.c[0] + ');');
        else L.push('qc.' + o.g + '(' + (o.p || []).map(function (x) { return QG.formatNumber(x).replace('pi', 'Math.PI'); }).concat(o.q).join(', ') + ');');
      });
      L.push('', 'QG.show.circuit(qc);', 'QG.show.probabilities(qc);', 'console.log(QG.state(qc));');
      return L.join('\n');
    }

    /* ---------- challenge ---------- */
    function checkChallenge() {
      var ch = opt.challenge; if (!ch) return;
      challengeBox.innerHTML = '';
      var sv = toCircuit().statevector(), okk = false, score = 0;
      if (ch.state) { var t = new QG.StateVector(st.nq); t.re[0] = 0; ch.state.forEach(function (a, i) { t.re[i] = a[0] || 0; t.im[i] = a[1] || 0; }); score = st.nq === t.n ? sv.fidelity(t) : 0; okk = score > 0.99; }
      else if (ch.probs) { var p = sv.probabilities(), tv = 0; for (var i = 0; i < p.length; i++) tv += Math.abs(p[i] - (ch.probs[QG.bitstring(i, st.nq)] || 0)); score = 1 - tv / 2; okk = tv / 2 < 0.01; }
      if (ch.maxGates && st.items.filter(function (x) { return x.g !== 'measure'; }).length > ch.maxGates) okk = false;
      var box = h('div', { class: 'callout ' + (okk ? 'green' : 'yellow'), role: 'status' },
        h('strong', null, okk ? '✓ Challenge solved!' : 'Challenge'), h('span', { html: QG.math.process(ch.text) }),
        h('div', { class: 'small muted', style: { marginTop: '4px' } }, (ch.state ? 'Fidelity with the target: ' : 'Match with the target distribution: ') + (score * 100).toFixed(1) + '%' + (ch.maxGates ? ' · gate limit ' + ch.maxGates : '')));
      if (!okk && ch.hint) { var hb = h('button', { class: 'btn small', style: { marginTop: '6px' }, onclick: function () { hb.replaceWith(h('div', { class: 'small', html: QG.math.process('Hint: ' + ch.hint) })); } }, 'Show a hint'); box.appendChild(hb); }
      challengeBox.appendChild(box);
      if (okk && ch.id && QG.progress.markChallenge(ch.id)) ui.toast('Challenge solved: well done!');
    }

    function changed(light) {
      draw(); if (!light) drawEditor(); drawSteps(); drawResults(); checkChallenge();
      if (opt.onChange) opt.onChange(toCircuit());
    }

    /* ---------- toolbar ---------- */
    var presetSel = opt.compact ? null : h('select', { 'aria-label': 'Load an example circuit' }, h('option', { value: '' }, 'Examples…'), Object.keys(PRESETS).map(function (k) { return h('option', { value: k }, PRESETS[k].title); }));
    if (presetSel) presetSel.addEventListener('change', function () { if (!presetSel.value) return; snapshot(); loadPreset(presetSel.value); presetSel.value = ''; changed(); });
    var tools = h('div', { class: 'btn-row' },
      opt.fixedQubits ? null : h('button', { class: 'btn small', title: 'Add a qubit', onclick: function () { if (st.nq < maxQ) { snapshot(); st.nq++; changed(); } else ui.toast('The Composer shows up to ' + maxQ + ' qubits. Use the Code Lab for more.'); } }, '+ Qubit'),
      opt.fixedQubits ? null : h('button', { class: 'btn small', title: 'Remove the last qubit', onclick: function () { if (st.nq > 1) { snapshot(); var q = st.nq - 1; st.items = st.items.filter(function (it) { return it.q.indexOf(q) < 0; }); st.nq--; compact(); st.sel = null; changed(); } } }, '− Qubit'),
      h('button', { class: 'btn small', onclick: function () { var u = st.undo.pop(); if (u) { var o = JSON.parse(u); st.nq = o.nq; st.items = o.items; st.sel = null; changed(); } } }, 'Undo'),
      h('button', { class: 'btn small', onclick: function () { snapshot(); st.items = []; st.sel = null; st.step = null; st.lastRun = null; changed(); } }, 'Clear'),
      presetSel,
      opt.compact ? null : h('button', { class: 'btn small', onclick: importQasm }, 'Import QASM'));
    function importQasm() {
      var ta = h('textarea', { rows: 12, style: { width: '100%', fontFamily: 'var(--mono)' }, placeholder: 'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\nh q[0];\ncx q[0],q[1];' });
      ui.modal('Import OpenQASM 2.0', h('div', null, h('p', { class: 'small muted' }, 'Paste a circuit exported from Qiskit (qc.qasm() or qasm2.dumps(qc)) or from IBM Quantum Composer.'), ta), [{ label: 'Import', primary: true, onclick: function () {
        try { var c = QG.fromQASM(ta.value); if (c.nq > maxQ) throw new Error('This circuit has ' + c.nq + ' qubits; the Composer shows up to ' + maxQ + '.'); if (c.ops.some(function (o) { return o.cond || o.g === 'reset'; })) throw new Error('Classical conditions and reset are not shown in the Composer; open it in the Code Lab instead.'); snapshot(); loadOps(c.nq, c.ops); changed(); ui.toast('Imported ' + c.ops.length + ' operations'); }
        catch (e) { ui.toast('Import failed: ' + e.message, 4000); return false; }
      } }]);
    }

    document.addEventListener('keydown', function esc(e) {
      if (!document.body.contains(root)) { document.removeEventListener('keydown', esc); return; }
      if (e.key === 'Escape' && (st.tool || st.pending.length)) { st.tool = null; st.pending = []; setHint(''); drawPalette(); draw(); }
    });

    if (opt.title) root.appendChild(h('p', { class: 'panel-title' }, opt.title));
    root.appendChild(palette); root.appendChild(tools); root.appendChild(hint); root.appendChild(svgWrap); root.appendChild(editor); root.appendChild(challengeBox);
    var resWrap = h('div', { style: { marginTop: '12px' } }, stepRow, results);
    if (opt.resultsInto) opt.resultsInto.appendChild(resWrap); else root.appendChild(resWrap);
    drawPalette(); changed();
    return { circuit: toCircuit, load: function (name) { loadPreset(name); changed(); }, state: st };
  };

  /* ---------- full-page lab ---------- */
  QG.labs.composer = function (el) {
    el.appendChild(h('div', { class: 'lab-head' }, h('h1', null, 'Circuit Composer'), h('span', { class: 'muted small' }, 'Up to 10 qubits · exact state + simulated shots · exports to Qiskit and OpenQASM')));
    var grid = h('div', { class: 'lab-grid' }), left = h('div', { class: 'card' }), right = h('div', { class: 'card' });
    grid.appendChild(left); grid.appendChild(right); el.appendChild(grid);
    // A circuit handed over from another page (for example the Playground) is opened once, then forgotten.
    var imp = ui.store.get('composer:import', null);
    if (imp && imp.nq && imp.ops) { ui.store.remove('composer:import'); QG.Composer(left, { nq: imp.nq, ops: imp.ops, resultsInto: right }); }
    else QG.Composer(left, { nq: 2, preset: 'bell', resultsInto: right });
    el.appendChild(h('div', { class: 'card', style: { marginTop: '16px' } }, h('p', { class: 'panel-title' }, 'How to use'), h('ul', { class: 'small', style: { margin: 0 } },
      h('li', null, 'Click a gate in the palette, then click a wire to place it. Two-qubit gates need two clicks: the control first, then the target.'),
      h('li', null, 'Click a placed gate to select it: change its angle, move it, or delete it (Delete key).'),
      h('li', null, 'Use the Step slider to watch the state change gate by gate.'),
      h('li', null, 'The Code tab shows the same circuit as Qiskit Python and OpenQASM, ready for real quantum hardware.'))));
  };
  QG.widgets.composer = function (el, opts) {
    QG.Composer(el, Object.assign({ compact: true, minCols: 6 }, opts));
  };
})();
