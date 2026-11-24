/* Drug-discovery labs: Docking (max-clique QUBO + QAOA), Protein Folding (HP lattice + QAOA), QML Activity Classifier,
 * plus lesson widgets: Grover screening, binding energy, pipeline, capstone starter code and checklists. */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h, S = ui.svg, D = QG.drug, PI = Math.PI;
  function css(v) { return QG.charts.cssVar(v); }
  function slider(min, max, step, value, label) { return h('input', { type: 'range', min: min, max: max, step: step, value: value, 'aria-label': label }); }
  function row(label, input, out, cols) { return h('div', { class: 'ctrl-row', style: cols ? { gridTemplateColumns: cols } : null }, h('span', null, label), input, out); }
  function cols(el, compact) { var w = h('div', { class: compact ? '' : 'lab-grid' }), a = h('div', { class: compact ? '' : 'card' }), b = h('div', { class: compact ? '' : 'card' }); w.appendChild(a); w.appendChild(b); el.appendChild(w); return [a, b]; }
  var TYPE_COL = { donor: '#1a73e8', acceptor: '#188038', aromatic: '#7b61ff', positive: '#e37400', negative: '#12b5cb', hydrophobic: '#f9ab00' };

  /* ============ Docking ============ */
  function align(pairs) { // 2D rigid fit (Kabsch) of ligand points onto pocket points
    var n = pairs.length, cl = [0, 0], cp = [0, 0];
    pairs.forEach(function (q) { cl[0] += q[0][0] / n; cl[1] += q[0][1] / n; cp[0] += q[1][0] / n; cp[1] += q[1][1] / n; });
    var sxy = 0, sdot = 0; pairs.forEach(function (q) { var a = [q[0][0] - cl[0], q[0][1] - cl[1]], b = [q[1][0] - cp[0], q[1][1] - cp[1]]; sdot += a[0] * b[0] + a[1] * b[1]; sxy += a[0] * b[1] - a[1] * b[0]; });
    var th = n > 1 ? Math.atan2(sxy, sdot) : 0, c = Math.cos(th), s = Math.sin(th);
    return function (p) { var x = p[0] - cl[0], y = p[1] - cl[1]; return [c * x - s * y + cp[0], s * x + c * y + cp[1]]; };
  }
  function dockLab(el, opt) {
    opt = opt || {};
    var st = { set: opt.set || 'A', tau: 0.6, pen: 2, p: 2, res: null }, c2 = cols(el, opt.compact), left = c2[0], right = c2[1];
    var ctl = h('div'), pose = h('div'), graph = h('div'), out = h('div');
    left.appendChild(ctl); left.appendChild(h('p', { class: 'panel-title', style: { marginTop: '10px' } }, 'Binding pocket and ligand pose')); left.appendChild(pose);
    right.appendChild(h('p', { class: 'panel-title' }, 'Binding interaction graph')); right.appendChild(graph); right.appendChild(out);
    var ss = h('select', { 'aria-label': 'Ligand' }, Object.keys(D.DOCK_SETS).map(function (k) { return h('option', { value: k, selected: k === st.set ? 'selected' : null }, D.DOCK_SETS[k].label); }));
    var ts = slider(0.1, 1.5, 0.05, st.tau, 'Flexibility tolerance'), to = h('output'), pp = slider(0, 3, 0.1, st.pen, 'Clique penalty'), po = h('output');
    var ds = h('select', { 'aria-label': 'QAOA depth' }, [1, 2, 3].map(function (k) { return h('option', { value: k, selected: k === st.p ? 'selected' : null }, 'QAOA depth p = ' + k); }));
    ss.addEventListener('change', function () { st.set = ss.value; st.res = null; draw(); });
    ts.addEventListener('input', function () { st.tau = +ts.value; st.res = null; draw(); });
    pp.addEventListener('input', function () { st.pen = +pp.value; st.res = null; draw(); });
    ds.addEventListener('change', function () { st.p = +ds.value; st.res = null; draw(); });
    ctl.appendChild(h('div', { class: 'btn-row' }, ss, ds, h('button', { class: 'btn primary', onclick: function () { run(); } }, '▶ Run QAOA')));
    ctl.appendChild(row('Flexibility τ', ts, to, '120px 1fr 70px')); ctl.appendChild(row('Clique penalty', pp, po, '120px 1fr 70px'));
    function run() { var G = D.dockingGraph(D.DOCK_SETS[st.set], st.tau), v = D.cliqueValues(G, st.pen); st.res = { G: G, v: v, q: D.qaoaMax(v, G.n, st.p, { starts: 4 }) }; draw(); }
    function draw() {
      to.textContent = st.tau.toFixed(2) + ' Å'; po.textContent = st.pen.toFixed(1);
      var set = D.DOCK_SETS[st.set], G = D.dockingGraph(set, st.tau), v = D.cliqueValues(G, st.pen), best = 0;
      for (var z = 0; z < v.length; z++) if (v[z] > v[best]) best = z;
      var shown = st.res ? st.res.q.mostLikely : best, sel = G.V.filter(function (_, i) { return (shown >> i) & 1; });
      drawPose(set, sel); drawGraph(G, shown);
      out.innerHTML = '';
      out.appendChild(h('dl', { class: 'kv', style: { marginTop: '8px' } },
        h('dt', null, 'Qubits (graph vertices)'), h('dd', null, String(G.n)),
        h('dt', null, 'Best pose (brute force)'), h('dd', null, G.V.filter(function (_, i) { return (best >> i) & 1; }).map(function (x) { return x.label; }).join(', ') + ' · score ' + v[best].toFixed(2) + (D.isClique(G, best) ? '' : ' (not a clique!)'))));
      if (!st.res) { out.appendChild(h('p', { class: 'small muted' }, 'The map shows the brute-force best pose. Press "Run QAOA" to search with a quantum circuit instead.')); return; }
      var r = st.res.q, top = []; for (z = 0; z < r.probs.length; z++) top.push(z); top.sort(function (a, b) { return r.probs[b] - r.probs[a]; }); top = top.slice(0, 8);
      var data = {}; top.forEach(function (zz) { data[(G.V.filter(function (_, i) { return (zz >> i) & 1; }).map(function (x) { return x.label; }).join(' ') || '(none)') + ' · ' + v[zz].toFixed(1)] = r.probs[zz]; });
      out.appendChild(h('dl', { class: 'kv' },
        h('dt', null, 'QAOA most likely'), h('dd', null, sel.map(function (x) { return x.label; }).join(', ') + (r.argmax.indexOf(r.mostLikely) >= 0 ? ' ✓ optimal' : ' (not optimal)')),
        h('dt', null, 'P(optimal pose)'), h('dd', null, (r.pOpt * 100).toFixed(1) + '% vs ' + (r.uniformP * 100).toFixed(1) + '% for random guessing')));
      out.appendChild(QG.charts.bars(data, { title: 'Most likely selections (score after penalties)', sort: 'value', ymax: Math.min(1, Math.ceil(r.probs[top[0]] * 10) / 10 + 0.1), height: 200 }));
      var circ = r.circuit();
      out.appendChild(QG.circuitView(circ, { compact: true, diagLabel: 'e^{-iγC}' }));
      out.appendChild(h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onclick: function () { ui.codeModal('Qiskit (Python)', QG.toQiskit(circ.copy().measureAll()), 'docking_qaoa.py'); } }, 'Export to Qiskit')));
    }
    function drawPose(set, sel) {
      var W = 340, Hh = 240, xs = [], ys = [];
      set.pocket.forEach(function (p) { xs.push(p.p[0]); ys.push(p.p[1]); });
      var x0 = Math.min.apply(null, xs) - 1.5, x1 = Math.max.apply(null, xs) + 1.5, y0 = Math.min.apply(null, ys) - 1.5, y1 = Math.max.apply(null, ys) + 1.5, sc = Math.min(W / (x1 - x0), Hh / (y1 - y0));
      function X(x) { return (x - x0) * sc; } function Y(y) { return Hh - (y - y0) * sc; }
      var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + Hh, width: W, style: 'max-width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px', role: 'img', 'aria-label': 'Pocket features and the aligned ligand' });
      set.pocket.forEach(function (p) { svg.appendChild(S('circle', { cx: X(p.p[0]), cy: Y(p.p[1]), r: 13, fill: 'none', stroke: TYPE_COL[p.t], 'stroke-width': 3 })); svg.appendChild(S('text', { x: X(p.p[0]), y: Y(p.p[1]) - 17, 'text-anchor': 'middle', style: 'font:10px var(--font);fill:var(--muted)', text: p.id + ' ' + p.t })); });
      if (sel.length >= 2) {
        var f = align(sel.map(function (x) { return [x.l.p, x.p.p]; })), L = set.ligand.map(function (l) { return { l: l, q: f(l.p) }; });
        for (var i = 0; i < L.length - 1; i++) svg.appendChild(S('line', { x1: X(L[i].q[0]), y1: Y(L[i].q[1]), x2: X(L[i + 1].q[0]), y2: Y(L[i + 1].q[1]), stroke: css('--muted'), 'stroke-width': 2, 'stroke-dasharray': '3 3' }));
        L.forEach(function (o) { svg.appendChild(S('rect', { x: X(o.q[0]) - 7, y: Y(o.q[1]) - 7, width: 14, height: 14, rx: 3, fill: TYPE_COL[o.l.t] })); svg.appendChild(S('text', { x: X(o.q[0]), y: Y(o.q[1]) + 22, 'text-anchor': 'middle', style: 'font:600 10px var(--font);fill:var(--text)', text: o.l.id })); });
      }
      pose.innerHTML = ''; pose.appendChild(svg);
      pose.appendChild(h('div', { class: 'legend' }, Object.keys(TYPE_COL).map(function (t) { return h('span', null, h('i', { style: { background: TYPE_COL[t] } }), D.PHARM[t]); })));
      pose.appendChild(h('p', { class: 'small muted' }, 'Rings: pocket features. Filled squares: ligand features, rigidly aligned onto the pocket using the selected matches.'));
    }
    function drawGraph(G, z) {
      var W = 300, svg = S('svg', { viewBox: '0 0 ' + W + ' ' + W * 0.75, width: W, style: 'max-width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px', role: 'img', 'aria-label': 'Binding interaction graph' });
      var P = G.V.map(function (_, i) { var a = 2 * PI * i / G.n - PI / 2; return [W / 2 + 105 * Math.cos(a), W * 0.375 + 85 * Math.sin(a)]; });
      G.E.forEach(function (e) { var on = ((z >> e[0]) & 1) && ((z >> e[1]) & 1); svg.appendChild(S('line', { x1: P[e[0]][0], y1: P[e[0]][1], x2: P[e[1]][0], y2: P[e[1]][1], stroke: on ? css('--yellow') : css('--border'), 'stroke-width': on ? 3.5 : 1.5 })); });
      G.V.forEach(function (v, i) { var on = (z >> i) & 1; svg.appendChild(S('circle', { cx: P[i][0], cy: P[i][1], r: 15, fill: on ? css('--green') : css('--card'), stroke: css('--muted') })); svg.appendChild(S('text', { x: P[i][0], y: P[i][1] + 3, 'text-anchor': 'middle', style: 'font:600 8.5px var(--font);fill:' + (on ? '#fff' : 'var(--text)'), text: v.label })); });
      graph.innerHTML = ''; graph.appendChild(svg);
      graph.appendChild(h('p', { class: 'small', html: QG.math.process('Vertex = a possible contact (ligand feature, pocket feature), weighted by interaction strength. Edge = two contacts that fit together geometrically (distances agree within τ). A consistent pose is a <b>clique</b>; the best pose is the <b>maximum-weight clique</b>. As a QUBO: maximise $\\sum_v w_v x_v - P\\sum_{(u,v)\\notin E} x_u x_v$.') }));
    }
    draw();
  }

  /* ============ Protein folding ============ */
  function foldLab(el, opt) {
    opt = opt || {};
    var st = { seq: opt.seq || 'HPPHPH', lam: 2, p: 2, res: null, show: null }, c2 = cols(el, opt.compact), left = c2[0], right = c2[1];
    var ctl = h('div'), fold = h('div'), out = h('div');
    left.appendChild(ctl); left.appendChild(fold); right.appendChild(out);
    var inp = h('input', { type: 'text', value: st.seq, 'aria-label': 'Sequence of H and P', style: { width: '120px', fontFamily: 'var(--mono)', textTransform: 'uppercase' } });
    var pre = h('select', { 'aria-label': 'Example sequences' }, h('option', { value: '' }, 'Examples…'), ['HPPH', 'HPPHPH', 'HHPPHH', 'HPHPPHH', 'PHPPHPH'].map(function (s) { return h('option', null, s); }));
    var ds = h('select', { 'aria-label': 'QAOA depth' }, [1, 2, 3].map(function (k) { return h('option', { value: k, selected: k === st.p ? 'selected' : null }, 'p = ' + k); }));
    var msg = h('span', { class: 'small muted' });
    function setSeq(s) { s = s.toUpperCase().replace(/[^HP]/g, ''); if (s.length < 4 || s.length > 7) { msg.textContent = 'Use 4–7 letters H/P (up to 10 qubits).'; return; } st.seq = s; inp.value = s; st.res = null; st.show = null; msg.textContent = ''; draw(); }
    inp.addEventListener('change', function () { setSeq(inp.value); }); pre.addEventListener('change', function () { if (pre.value) setSeq(pre.value); pre.value = ''; });
    ds.addEventListener('change', function () { st.p = +ds.value; st.res = null; draw(); });
    ctl.appendChild(h('div', { class: 'btn-row' }, h('label', { class: 'inline' }, 'Sequence ', inp), pre, ds, h('button', { class: 'btn primary', onclick: function () { var f = D.foldValues(st.seq, st.lam); st.res = D.qaoaMax(f.values, f.qubits, st.p, { starts: 3 }); st.show = st.res.mostLikely; draw(); } }, '▶ Run QAOA'), msg));
    function draw() {
      var f = D.foldValues(st.seq, st.lam), N = f.values.length, best = 0, valid = 0, byE = {};
      for (var z = 0; z < N; z++) { if (f.values[z] > f.values[best]) best = z; var w = D.foldWalk(st.seq, z); if (!w.overlaps && !w.invalid) { valid++; byE[w.energy] = (byE[w.energy] || 0) + 1; } }
      var zShow = st.show === null ? best : st.show, wk = D.foldWalk(st.seq, zShow);
      drawFold(wk, st.show === null ? 'Lowest-energy fold (brute force)' : 'QAOA most likely fold');
      out.innerHTML = '';
      out.appendChild(h('dl', { class: 'kv' },
        h('dt', null, 'Residues / qubits'), h('dd', null, st.seq.length + ' / ' + f.qubits + ' (2 per turn)'),
        h('dt', null, 'Encodings / valid folds'), h('dd', null, N + ' / ' + valid),
        h('dt', null, 'Best energy'), h('dd', null, D.foldWalk(st.seq, best).energy + ' (H–H contacts: ' + D.foldWalk(st.seq, best).contacts.length + ')')));
      var data = {}; Object.keys(byE).sort(function (a, b) { return a - b; }).forEach(function (e) { data['E = ' + e] = byE[e]; });
      out.appendChild(QG.charts.bars(data, { title: 'Number of valid folds at each energy', height: 170, valueFmt: function (v) { return String(Math.round(v)); } }));
      if (st.res) {
        var r = st.res, pE = {};
        for (z = 0; z < r.probs.length; z++) { var ww = D.foldWalk(st.seq, z), k = ww.overlaps || ww.invalid ? 'invalid' : 'E = ' + ww.energy; pE[k] = (pE[k] || 0) + r.probs[z]; }
        out.appendChild(QG.charts.bars(pE, { title: 'QAOA: probability of each outcome type', ymax: 1, height: 170 }));
        out.appendChild(h('p', { class: 'small', html: 'P(best fold) = <b>' + (r.pOpt * 100).toFixed(1) + '%</b> vs ' + (r.uniformP * 100).toFixed(1) + '% for random bit strings. ' + (r.argmax.indexOf(r.mostLikely) >= 0 ? 'The most likely outcome is an optimal fold.' : 'The most likely outcome is <b>not</b> optimal: try a larger depth p.') }));
        var circ = r.circuit();
        out.appendChild(h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onclick: function () { st.show = null; draw(); } }, 'Show brute-force best'), h('button', { class: 'btn small', onclick: function () { ui.codeModal('Qiskit (Python)', QG.toQiskit(circ.copy().measureAll()), 'folding_qaoa.py'); } }, 'Export to Qiskit')));
      } else out.appendChild(h('p', { class: 'small muted' }, 'Energy = −1 per H–H contact between residues that are not neighbours in the chain. Overlapping residues and the invalid turn code are penalised.'));
    }
    function drawFold(w, title) {
      var xs = w.pos.map(function (p) { return p[0]; }), ys = w.pos.map(function (p) { return p[1]; }), x0 = Math.min.apply(null, xs) - 1, y0 = Math.min.apply(null, ys) - 1, span = Math.max(Math.max.apply(null, xs) - x0 + 1, Math.max.apply(null, ys) - y0 + 1, 4), W = 280, sc = W / span;
      function X(x) { return (x - x0) * sc; } function Y(y) { return W - (y - y0) * sc; }
      var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + W, width: W, style: 'max-width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px', role: 'img', 'aria-label': title + ': energy ' + w.energy });
      for (var g = 0; g <= span; g++) { svg.appendChild(S('line', { x1: g * sc, x2: g * sc, y1: 0, y2: W, stroke: css('--border'), 'stroke-width': 0.6 })); svg.appendChild(S('line', { y1: g * sc, y2: g * sc, x1: 0, x2: W, stroke: css('--border'), 'stroke-width': 0.6 })); }
      w.contacts.forEach(function (c) { svg.appendChild(S('line', { x1: X(w.pos[c[0]][0]), y1: Y(w.pos[c[0]][1]), x2: X(w.pos[c[1]][0]), y2: Y(w.pos[c[1]][1]), stroke: css('--green'), 'stroke-width': 3, 'stroke-dasharray': '4 4' })); });
      for (var i = 0; i < w.pos.length - 1; i++) svg.appendChild(S('line', { x1: X(w.pos[i][0]), y1: Y(w.pos[i][1]), x2: X(w.pos[i + 1][0]), y2: Y(w.pos[i + 1][1]), stroke: css('--text'), 'stroke-width': 3 }));
      w.pos.forEach(function (p, k) { var hyd = st.seq[k] === 'H'; svg.appendChild(S('circle', { cx: X(p[0]), cy: Y(p[1]), r: sc * 0.28, fill: hyd ? css('--yellow') : css('--blue'), stroke: css('--text') })); svg.appendChild(S('text', { x: X(p[0]), y: Y(p[1]) + 4, 'text-anchor': 'middle', style: 'font:600 11px var(--font);fill:#202124', text: st.seq[k] + (k + 1) })); });
      fold.innerHTML = ''; fold.appendChild(h('p', { class: 'panel-title', style: { marginTop: '10px' } }, title + ' · energy ' + w.energy + (w.overlaps ? ' · overlaps!' : ''))); fold.appendChild(svg);
      fold.appendChild(h('div', { class: 'legend' }, h('span', null, h('i', { style: { background: css('--yellow') } }), 'H: hydrophobic'), h('span', null, h('i', { style: { background: css('--blue') } }), 'P: polar'), h('span', null, h('i', { style: { background: css('--green') } }), 'H–H contact (−1)')));
    }
    draw();
  }

  /* ============ QML activity classifier ============ */
  function activityLab(el, opt) {
    opt = opt || {};
    var st = { model: 'kernel', layers: 3 }, c2 = cols(el, opt.compact), left = c2[0], right = c2[1];
    var cd = D.compoundData(48), data = QG.qml.split(cd, 0.7), comps = cd.compounds, ntr = data.train.X.length;
    var ctl = h('div', { class: 'btn-row' }), plot = h('div'), side = h('div'), screen = h('div', { class: 'card', style: { marginTop: '12px' } });
    left.appendChild(ctl); left.appendChild(plot); right.appendChild(side); right.appendChild(screen);
    var ms = h('select', { 'aria-label': 'Model' }, [['kernel', 'Quantum kernel'], ['vqc', 'Variational quantum classifier'], ['logistic', 'Classical logistic regression']].map(function (x) { return h('option', { value: x[0] }, x[1]); }));
    var go = h('button', { class: 'btn primary' }, '▶ Train'); ms.addEventListener('change', function () { st.model = ms.value; }); go.addEventListener('click', train);
    ctl.appendChild(ms); ctl.appendChild(go);
    var model = null;
    function axes(wrap) {
      return h('div', { class: 'small muted', style: { display: 'flex', justifyContent: 'space-between', maxWidth: '300px' } }, h('span', null, 'logP −1.5'), h('span', null, '→ logP (lipophilicity) →'), h('span', null, '6.5'));
    }
    function show(fn) {
      plot.innerHTML = ''; plot.appendChild(QG.qmlDecisionPlot(fn, data, 300)); plot.appendChild(axes());
      plot.appendChild(h('p', { class: 'small muted' }, 'Vertical axis: molecular weight 150 (bottom) to 650 Da (top). Green = active, blue = inactive; filled = training, hollow = test. Synthetic data, not real measurements.'));
    }
    function train() {
      go.disabled = true;
      var done = function (fn, extra) {
        model = fn; show(fn);
        var te = fn(data.test.X), tp = 0, tn = 0, fp = 0, fn2 = 0;
        te.forEach(function (s, i) { var p = s >= 0, a = data.test.y[i] > 0; if (p && a) tp++; else if (!p && !a) tn++; else if (p) fp++; else fn2++; });
        side.innerHTML = '';
        side.appendChild(h('dl', { class: 'kv' }, h('dt', null, 'Training accuracy'), h('dd', null, (QG.qml.accuracy(fn(data.train.X), data.train.y) * 100).toFixed(0) + '%'), h('dt', null, 'Test accuracy'), h('dd', null, ((tp + tn) / te.length * 100).toFixed(0) + '%')));
        side.appendChild(h('table', { class: 'amp-table', style: { maxWidth: '320px', marginTop: '8px' } }, h('tr', null, h('th', null, 'Test set'), h('th', null, 'predicted active'), h('th', null, 'predicted inactive')), h('tr', null, h('th', null, 'truly active'), h('td', null, String(tp)), h('td', null, String(fn2))), h('tr', null, h('th', null, 'truly inactive'), h('td', null, String(fp)), h('td', null, String(tn)))));
        if (extra) side.appendChild(extra);
        go.disabled = false; drawScreen();
      };
      if (st.model === 'logistic') { var lg = QG.qml.logistic(data.train); done(lg.decision, h('p', { class: 'small' }, 'A linear boundary cannot describe a "drug-like window" (activity drops for both too-low and too-high values).')); return; }
      if (st.model === 'kernel') { var km = QG.qml.kernelModel(2, 0.05).fit(data.train); done(km.decision, h('p', { class: 'small' }, 'Quantum kernel (ZZ feature map, 2 qubits) + classical kernel ridge regression.')); return; }
      side.innerHTML = '<p class="small muted">Training the variational classifier in a background thread…</p>';
      QG.worker.call('qml.trainVQC', [data.train, st.layers, { maxIter: 60 }], 60000).then(function (r) { var m = QG.qml.vqc(st.layers); done(function (X) { return X.map(function (x) { return m.predict(x, r.x); }); }, h('p', { class: 'small' }, 'Variational classifier with data re-uploading (' + 4 * st.layers + ' parameters).')); }, function (e) { side.textContent = e.message; go.disabled = false; });
    }
    function drawScreen() {
      screen.innerHTML = '';
      screen.appendChild(h('p', { class: 'panel-title' }, 'Screen a new (hypothetical) compound'));
      var lp = slider(-1.5, 6.5, 0.1, 2.5, 'logP'), lpo = h('output'), mw = slider(150, 650, 5, 380, 'Molecular weight'), mwo = h('output'), res = h('p', { class: 'small' });
      function upd() { lpo.textContent = (+lp.value).toFixed(1); mwo.textContent = mw.value + ' Da'; if (!model) { res.textContent = 'Train a model first.'; return; } var s = model([D.featurise({ logP: +lp.value, mw: +mw.value })])[0]; res.innerHTML = 'Model score ' + s.toFixed(2) + ' → predicted <b>' + (s >= 0 ? 'ACTIVE' : 'inactive') + '</b>. ' + (+lp.value > 5 || +mw.value > 500 ? 'Note: this violates Lipinski\'s rule of five (logP ≤ 5, MW ≤ 500).' : ''); }
      lp.addEventListener('input', upd); mw.addEventListener('input', upd);
      screen.appendChild(row('logP', lp, lpo, '60px 1fr 60px')); screen.appendChild(row('MW', mw, mwo, '60px 1fr 70px')); screen.appendChild(res); upd();
      var t = h('table', { class: 'amp-table small', style: { marginTop: '8px' } }, h('tr', null, h('th', null, 'ID'), h('th', null, 'logP'), h('th', null, 'MW'), h('th', null, 'label')));
      comps.slice(0, 6).forEach(function (c) { t.appendChild(h('tr', null, h('td', { class: 'mono' }, c.id), h('td', null, String(c.logP)), h('td', null, String(c.mw)), h('td', null, c.active ? 'active' : 'inactive'))); });
      screen.appendChild(h('details', null, h('summary', { class: 'small', style: { cursor: 'pointer' } }, 'First 6 of ' + comps.length + ' synthetic compounds (' + ntr + ' for training)'), t));
    }
    show(function (X) { return X.map(function () { return 0; }); }); side.innerHTML = '<p class="small">Each point is a <b>synthetic</b> compound described by two numbers: lipophilicity (logP) and molecular weight. "Actives" sit in a drug-like window. Choose a model and press Train.</p>'; drawScreen();
  }

  QG.labs.docking = function (el) {
    el.appendChild(h('div', { class: 'lab-head' }, h('h1', null, 'Docking Lab'), h('span', { class: 'muted small' }, 'Ligand pose as a maximum-weight clique · QUBO · QAOA vs brute force')));
    dockLab(el, {});
    el.appendChild(h('div', { class: 'callout reality', style: { marginTop: '16px' } }, h('strong', null, 'Toy model vs reality'), 'Real docking scores thousands of poses of flexible 3D molecules with physics-based or learned scoring functions, in seconds on a laptop. The graph formulation follows Banchi et al. (Sci. Adv. 2020), who mapped docking to max-clique for Gaussian boson samplers. Here 6–8 vertices = 6–8 qubits. No quantum advantage exists at this scale.'));
  };
  QG.labs.folding = function (el) {
    el.appendChild(h('div', { class: 'lab-head' }, h('h1', null, 'Protein Folding Lab'), h('span', { class: 'muted small' }, 'HP lattice model · 2 qubits per turn · QAOA vs brute force')));
    foldLab(el, {});
    el.appendChild(h('div', { class: 'callout reality', style: { marginTop: '16px' } }, h('strong', null, 'Toy model vs reality'), 'The HP model keeps only "hydrophobic residues like to touch". Real structure prediction (AlphaFold, 2020 onward) uses deep learning on evolutionary data and is extremely accurate for many proteins. Quantum lattice-folding studies (for example on 7–10 residues) are proofs of concept. The cost function here is a high-order polynomial in the qubits; it is applied as a diagonal phase, which hardware would need to compile into many gates.'));
  };
  QG.labs.qml = function (el) {
    el.appendChild(h('div', { class: 'lab-head' }, h('h1', null, 'QML Activity Classifier'), h('span', { class: 'muted small' }, 'Synthetic compounds (logP, MW) · quantum kernel, variational classifier, classical baseline')));
    activityLab(el, {});
    el.appendChild(h('div', { class: 'callout reality', style: { marginTop: '16px' } }, h('strong', null, 'Toy model vs reality'), 'Real activity models (QSAR) use hundreds of descriptors or learned molecular representations and thousands of measured compounds, for example from ChEMBL. A classical non-linear model (RBF-kernel SVM, random forest, graph neural network) would solve this 2-feature problem easily. The lab shows how quantum models work, not that they are better.'));
  };
  QG.widgets.dock = function (el, o) { dockLab(el, Object.assign({ compact: true }, o)); };
  QG.widgets.fold = function (el, o) { foldLab(el, Object.assign({ compact: true }, o)); };
  QG.widgets.activity = function (el, o) { activityLab(el, Object.assign({ compact: true }, o)); };

  /* ---- Grover screening of a small library ---- */
  QG.widgets['grover-screen'] = function (el) {
    var c = h('div', { class: 'card' }); el.appendChild(c);
    var lib = D.compounds(16, 13), marked = []; lib.forEach(function (cm, i) { if (cm.active && cm.logP <= 5 && cm.mw <= 500 && cm.logP > 2) marked.push(i); });
    var it = slider(0, 4, 1, 1, 'Grover iterations'), io = h('output'), out = h('div');
    c.appendChild(h('p', { class: 'small', html: QG.math.process('A library of 16 synthetic compounds is held in 4 qubits. The oracle marks the <b>' + marked.length + '</b> that are active, drug-like and have logP &gt; 2. Optimal iterations: $\\frac{\\pi}{4}\\sqrt{N/M}$ ≈ ' + (PI / 4 * Math.sqrt(16 / marked.length)).toFixed(2) + '.') }));
    c.appendChild(row('Iterations', it, io, '90px 1fr 40px')); c.appendChild(out);
    function draw() {
      var k = +it.value; io.textContent = k;
      var p = D.groverMarked(4, marked, k).statevector().probabilities(), o = {}, hl = [];
      lib.forEach(function (cm, i) { o[cm.id] = p[i]; if (marked.indexOf(i) >= 0) hl.push(cm.id); });
      var pm = marked.reduce(function (s, m) { return s + p[m]; }, 0);
      out.innerHTML = ''; out.appendChild(QG.charts.bars(o, { ymax: 1, height: 190, highlight: hl, sort: 'label' }));
      out.appendChild(h('p', { class: 'small', html: 'P(measure a hit) = <b>' + (pm * 100).toFixed(1) + '%</b> (yellow bars are hits). Too many iterations overshoot. <b>Reality check:</b> the oracle has to <i>compute</i> activity inside a quantum circuit. For a list you can read, a classical scan of 16 entries is instant, so Grover only pays off for huge, implicitly defined search spaces with cheap coherent oracles.' }));
    }
    it.addEventListener('input', draw); draw();
  };

  /* ---- binding energy: proton affinity of helium ---- */
  QG.widgets.binding = function (el) {
    var c = h('div', { class: 'card' }); el.appendChild(c);
    var btn = h('button', { class: 'btn primary' }, '▶ Compute binding curve (with VQE)'), out = h('div');
    c.appendChild(h('p', { class: 'small', html: QG.math.process('Binding energy of a proton to helium: $\\Delta E(R) = E(\\text{HeH}^+, R) - E(\\text{He}) - E(\\text{H}^+)$, with $E(\\text{H}^+) = 0$. Same STO-3G basis on both sides (He exponent 1.6875), so the curve goes to exactly 0 at large R.') }));
    c.appendChild(h('div', { class: 'btn-row' }, btn)); c.appendChild(out);
    btn.addEventListener('click', function () {
      var Rs = []; for (var k = 0; k <= 30; k++) Rs.push(0.5 + 2.5 * k / 30);
      var cur = D.protonAffinityCurve(Rs), vqeY = [], x0 = null;
      cur.points.forEach(function (pt) { var r = QG.vqe({ H: pt.mol.parity2, ansatz: QG.variational.ansatz('ry', 2, 1), optimizer: 'nelder-mead', maxIter: 300, x0: x0 }); x0 = r.x; vqeY.push((r.energy + pt.mol.Enuc - cur.EHe) * 2625.5); });
      var kj = function (a) { return a * 2625.5; }, fci = cur.points.map(function (p) { return kj(p.fci); }), hf = cur.points.map(function (p) { return kj(p.hf); });
      var imin = fci.indexOf(Math.min.apply(null, fci));
      out.innerHTML = '';
      out.appendChild(QG.charts.line([{ name: 'exact (FCI)', x: Rs, y: fci }, { name: 'Hartree–Fock', x: Rs, y: hf, dashed: true }, { name: 'VQE (2 qubits)', x: Rs, y: vqeY, pointsOnly: true, color: css('--yellow') }, { name: 'experiment −178 kJ/mol', x: [Rs[0], Rs[Rs.length - 1]], y: [-177.8, -177.8], dashed: true, color: css('--muted') }], { height: 240, xLabel: 'He–H distance R (Å)', yLabel: 'binding energy (kJ/mol)' }));
      out.appendChild(h('p', { class: 'small', html: 'Minimum at R ≈ ' + Rs[imin].toFixed(2) + ' Å: binding (proton affinity) ≈ <b>' + (-fci[imin]).toFixed(0) + ' kJ/mol</b> in STO-3G, vs 178 kJ/mol measured. VQE reproduces the exact basis-set result; the remaining gap is the basis set, not the quantum algorithm. That is typical: accuracy needs both a good algorithm <i>and</i> a large basis (many more qubits).' }));
    });
  };

  /* ---- the drug discovery pipeline ---- */
  QG.widgets.pipeline = function (el) {
    var steps = [['Target identification', 'Which protein drives the disease?', '1–2 yr', ''], ['Hit discovery', 'Screen millions of compounds (experiment + docking/ML)', '1–2 yr', 'Grover-type search, QML, docking (QUBO)'], ['Lead optimisation', 'Improve potency, selectivity, ADMET', '2–3 yr', 'Accurate binding energies (VQE/QPE on active sites)'], ['Preclinical', 'Cells and animals: safety, dosing', '1–2 yr', ''], ['Clinical trials I–III', 'Safety and efficacy in humans', '5–7 yr', ''], ['Approval', 'Regulators review all data', '1 yr', '']];
    var c = h('div', { class: 'card' }); el.appendChild(c);
    var grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '8px' } });
    steps.forEach(function (s, i) { grid.appendChild(h('div', { style: { border: '1px solid var(--border)', borderTop: '4px solid ' + (s[3] ? 'var(--green)' : 'var(--blue)'), borderRadius: '8px', padding: '8px 10px' } }, h('div', { class: 'small muted' }, (i + 1) + ' · ' + s[2]), h('strong', null, s[0]), h('div', { class: 'small' }, s[1]), s[3] ? h('div', { class: 'small', style: { color: 'var(--green)', marginTop: '4px' } }, '⚛ ' + s[3]) : null)); });
    c.appendChild(grid);
    c.appendChild(h('p', { class: 'small muted' }, 'Typical: 10–15 years and over a billion US dollars per approved drug, with roughly 90% of clinical candidates failing. Green-topped stages are where quantum computing has been proposed to help; none is in routine use today.'));
  };

  /* ---- capstone helpers: starter code and saved checklists ---- */
  QG.widgets.starter = function (el, o) {
    var c = h('div', { class: 'card' }); el.appendChild(c);
    c.appendChild(h('p', { class: 'panel-title' }, o.title || 'Starter code'));
    c.appendChild(h('pre', null, h('code', null, o.code)));
    c.appendChild(h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: function () { ui.store.set('codelab:draft', o.code); location.hash = '#/lab/code'; } }, 'Open in Code Lab'), h('button', { class: 'btn small', onclick: function () { ui.copy(o.code); } }, 'Copy')));
  };
  QG.widgets.checklist = function (el, o) {
    var key = 'check:' + (o.id || o.lessonId), saved = ui.store.get(key, {}), c = h('div', { class: 'card' }); el.appendChild(c);
    c.appendChild(h('p', { class: 'panel-title' }, o.title || 'Deliverables'));
    var done = h('p', { class: 'small' });
    function upd() { var n = Object.keys(saved).filter(function (k) { return saved[k]; }).length; done.innerHTML = n + ' of ' + o.items.length + ' done' + (n === o.items.length ? ' · <span class="ok-text">project complete!</span>' : ''); if (n === o.items.length && o.lessonId) { QG.progress.markLesson(o.lessonId); } }
    o.items.forEach(function (it, i) {
      var cb = h('input', { type: 'checkbox', checked: saved[i] ? 'checked' : null });
      cb.addEventListener('change', function () { saved[i] = cb.checked; ui.store.set(key, saved); upd(); });
      c.appendChild(h('label', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start', margin: '6px 0' } }, cb, h('span', { html: QG.math.process(it) })));
    });
    c.appendChild(done); upd();
  };
})();
