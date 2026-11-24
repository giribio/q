/* Variational Playground (2-parameter landscapes + optimiser paths) and the full VQE runner. */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h, PI = Math.PI;

  var PROBLEMS = {
    one: { label: '1 qubit: H = X + Z', H: [{ c: 1, p: 'X' }, { c: 1, p: 'Z' }], n: 1, ans: 'Ry(θ₁) then Rz(θ₂)', build: function (t) { var c = new QG.Circuit(1); c.ry(t[0], 0).rz(t[1], 0); return c; } },
    h2: { label: 'H₂ molecule (2 qubits, 0.735 Å)', H: QG.pauli.models.h2(), n: 2, ans: 'Ry(θ₁) on q0, Ry(θ₂) on q1, then CNOT', build: two },
    tfim: { label: 'Transverse-field Ising, 2 spins', H: QG.pauli.models.tfim(2, 1, 1), n: 2, ans: 'Ry(θ₁) on q0, Ry(θ₂) on q1, then CNOT', build: two },
    heis: { label: 'Heisenberg pair (XX+YY+ZZ)', H: QG.pauli.models.heisenberg(2, 1), n: 2, ans: 'Ry(θ₁) on q0, Ry(θ₂) on q1, then CNOT', build: two }
  };
  function two(t) { var c = new QG.Circuit(2); c.ry(t[0], 0).ry(t[1], 1).cx(0, 1); return c; }
  var OPTS = [['gd', 'Gradient descent (parameter shift)'], ['adam', 'Adam (parameter shift)'], ['spsa', 'SPSA (2 evaluations per step)'], ['nelder-mead', 'Nelder–Mead (no gradients)']];

  function playground(el, opt) {
    opt = opt || {};
    var st = { prob: opt.problem || 'h2', optim: opt.optimizer || 'gd', lr: 0.3, shots: 0, start: [2.4, -2.2], iters: 60 };
    var wrap = h('div', { class: opt.compact ? '' : 'lab-grid' }), left = h('div', { class: opt.compact ? '' : 'card' }), right = h('div', { class: opt.compact ? '' : 'card' });
    wrap.appendChild(left); wrap.appendChild(right); el.appendChild(wrap);
    var ctl = h('div'), mapBox = h('div'), conv = h('div'), info = h('div', { class: 'small' }), hm = null, grid = null, timer = null;
    left.appendChild(ctl); left.appendChild(mapBox);
    right.appendChild(h('p', { class: 'panel-title' }, 'Convergence')); right.appendChild(conv); right.appendChild(info);

    function P() { return PROBLEMS[st.prob]; }
    function energyExact(t) { return QG.pauli.expect(P().H, P().build(t).statevector()); }
    function controls() {
      ctl.innerHTML = '';
      var ps = h('select', { 'aria-label': 'Problem' }, Object.keys(PROBLEMS).map(function (k) { return h('option', { value: k, selected: k === st.prob ? 'selected' : null }, PROBLEMS[k].label); }));
      ps.addEventListener('change', function () { st.prob = ps.value; landscape(); });
      var os = h('select', { 'aria-label': 'Optimiser' }, OPTS.map(function (o) { return h('option', { value: o[0], selected: o[0] === st.optim ? 'selected' : null }, o[1]); }));
      os.addEventListener('change', function () { st.optim = os.value; });
      var lr = h('input', { type: 'range', min: 0.02, max: 1, step: 0.02, value: st.lr, 'aria-label': 'Learning rate' }), lro = h('output', null, st.lr);
      lr.addEventListener('input', function () { st.lr = +lr.value; lro.textContent = st.lr.toFixed(2); });
      var sh = h('select', { 'aria-label': 'Shots per energy estimate' }, [[0, 'exact (no shot noise)'], [100, '100 shots'], [1000, '1,000 shots'], [10000, '10,000 shots']].map(function (o) { return h('option', { value: o[0], selected: o[0] === st.shots ? 'selected' : null }, o[1]); }));
      sh.addEventListener('change', function () { st.shots = +sh.value; });
      if (!opt.fixedProblem) ctl.appendChild(h('div', { class: 'ctrl-row', style: { gridTemplateColumns: '110px 1fr' } }, h('span', null, 'Problem'), ps));
      ctl.appendChild(h('div', { class: 'ctrl-row', style: { gridTemplateColumns: '110px 1fr' } }, h('span', null, 'Optimiser'), os));
      ctl.appendChild(h('div', { class: 'ctrl-row', style: { gridTemplateColumns: '110px 1fr 50px' } }, h('span', null, 'Step size'), lr, lro));
      ctl.appendChild(h('div', { class: 'ctrl-row', style: { gridTemplateColumns: '110px 1fr' } }, h('span', null, 'Measurement'), sh));
      ctl.appendChild(h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: run }, '▶ Optimise'), h('span', { class: 'small muted' }, 'Click the map to choose a starting point.')));
      ctl.appendChild(h('p', { class: 'small', html: QG.math.process('$H = ' + QG.pauli.toString(P().H).replace(/·/g, '\\,') + '$ · ansatz: ' + P().ans) }));
    }
    function landscape() {
      controls();
      var N = 61; grid = [];
      for (var j = 0; j < N; j++) { var row = []; for (var i = 0; i < N; i++) row.push(energyExact([-PI + 2 * PI * i / (N - 1), -PI + 2 * PI * j / (N - 1)])); grid.push(row); }
      hm = QG.charts.heatmapPlot(grid, { size: opt.compact ? 260 : 320, x: [-PI, PI], y: [-PI, PI], xLabel: 'θ₁', yLabel: 'θ₂', invert: true, title: 'Energy landscape', onPick: function (x, y) { st.start = [x, y]; hm.draw([st.start]); } });
      mapBox.innerHTML = ''; mapBox.appendChild(h('p', { class: 'panel-title' }, 'Energy landscape E(θ₁, θ₂): bright = low energy')); mapBox.appendChild(hm.el);
      hm.draw([st.start]);
      conv.innerHTML = ''; info.innerHTML = QG.math.process('Exact ground energy $E_0$ = <b>' + QG.pauli.exact(P().H).values[0].toFixed(5) + '</b>. The variational principle guarantees $E(\\theta) \\ge E_0$ for every θ.');
    }
    function run() {
      if (timer) clearInterval(timer);
      var rnd = QG.rng(5), f = function (t) { return st.shots ? QG.pauli.estimate(P().H, P().build(t).statevector(), st.shots, rnd) : energyExact(t); };
      var o = { maxIter: st.optim === 'nelder-mead' ? 80 : st.iters, lr: st.lr, seed: 4, step: 0.6, a: st.lr };
      if (st.optim === 'gd' || st.optim === 'adam') o.grad = function (t) { return QG.variational.paramShift(f, t); };
      var res = QG.optimize.run(st.optim, f, st.start.slice(), o), H = res.history, E0 = QG.pauli.exact(P().H).values[0], k = 0;
      timer = setInterval(function () {
        if (!document.body.contains(el)) { clearInterval(timer); return; }
        k = Math.min(H.length, k + Math.max(1, Math.ceil(H.length / 40)));
        var path = H.slice(0, k).map(function (s) { return [wrapA(s.x[0]), wrapA(s.x[1])]; });
        hm.draw(path);
        drawConv(H.slice(0, k), E0, res);
        if (k >= H.length) clearInterval(timer);
      }, 40);
    }
    function wrapA(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
    function drawConv(H, E0, res) {
      conv.innerHTML = '';
      var xs = H.map(function (s) { return s.nfev; }), ys = H.map(function (s) { return s.fx; }), ex = H.map(function (s) { return energyExact(s.x); });
      var series = [{ name: st.shots ? 'measured energy (' + st.shots + ' shots)' : 'energy', x: xs, y: ys }];
      if (st.shots) series.push({ name: 'true energy at those θ', x: xs, y: ex });
      series.push({ name: 'exact ground energy', x: [xs[0], xs[xs.length - 1]], y: [E0, E0], dashed: true, color: QG.charts.cssVar('--muted') });
      conv.appendChild(QG.charts.line(series, { height: 230, xLabel: 'energy evaluations (circuit runs)', yLabel: 'energy (Ha or units of J)' }));
      var last = H[H.length - 1], e = energyExact(last.x);
      info.innerHTML = 'After <b>' + last.nfev + '</b> energy evaluations: E = <b>' + e.toFixed(5) + '</b>, exact E₀ = ' + E0.toFixed(5) + ', error = <b>' + (e - E0).toExponential(2) + '</b>' + (Math.abs(e - E0) < 1.6e-3 && st.prob === 'h2' ? ' <span class="ok-text">(chemical accuracy)</span>' : '') + '. θ = (' + last.x.map(function (v) { return v.toFixed(3); }).join(', ') + ').';
    }
    landscape();
  }

  /* ---------- full VQE runner: more qubits, layers and Hamiltonians ---------- */
  function vqeRunner(el, opt) {
    opt = opt || {};
    var st = { model: opt.model || 'tfim', n: opt.n || 3, layers: 2, optim: 'adam', hx: 1 };
    var box = h('div', { class: opt.compact ? '' : 'card' }), ctl = h('div'), out = h('div'); el.appendChild(box); box.appendChild(ctl); box.appendChild(out);
    function controls() {
      ctl.innerHTML = '';
      var ms = h('select', { 'aria-label': 'Hamiltonian' }, [['tfim', 'Transverse-field Ising chain'], ['heis', 'Heisenberg chain'], ['h2', 'H₂ (2 qubits)']].map(function (o) { return h('option', { value: o[0], selected: o[0] === st.model ? 'selected' : null }, o[1]); }));
      ms.addEventListener('change', function () { st.model = ms.value; controls(); });
      var row = h('div', { class: 'btn-row' }, h('label', { class: 'inline' }, 'Hamiltonian ', ms));
      if (st.model !== 'h2') {
        var ns = h('select', { 'aria-label': 'Qubits' }, [2, 3, 4, 5, 6].map(function (n) { return h('option', { value: n, selected: n === st.n ? 'selected' : null }, n + ' qubits'); }));
        ns.addEventListener('change', function () { st.n = +ns.value; }); row.appendChild(ns);
      }
      var ls = h('select', { 'aria-label': 'Ansatz layers' }, [1, 2, 3, 4].map(function (n) { return h('option', { value: n, selected: n === st.layers ? 'selected' : null }, n + ' entangling layer' + (n > 1 ? 's' : '')); }));
      ls.addEventListener('change', function () { st.layers = +ls.value; });
      var os = h('select', { 'aria-label': 'Optimiser' }, OPTS.map(function (o) { return h('option', { value: o[0], selected: o[0] === st.optim ? 'selected' : null }, o[1]); }));
      os.addEventListener('change', function () { st.optim = os.value; });
      row.appendChild(ls); row.appendChild(os);
      ctl.appendChild(row);
      if (st.model === 'tfim') {
        var hx = h('input', { type: 'range', min: 0, max: 2, step: 0.05, value: st.hx, 'aria-label': 'Transverse field h' }), ho = h('output', null, st.hx);
        hx.addEventListener('input', function () { st.hx = +hx.value; ho.textContent = st.hx.toFixed(2); });
        ctl.appendChild(h('div', { class: 'ctrl-row' }, h('span', null, 'field h (J = 1)'), hx, ho));
      }
      ctl.appendChild(h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: run }, '▶ Run VQE'), h('span', { class: 'small muted' }, 'Runs in a background thread')));
    }
    function H() { return st.model === 'h2' ? QG.pauli.models.h2() : st.model === 'heis' ? QG.pauli.models.heisenberg(st.n, 1) : QG.pauli.models.tfim(st.n, 1, st.hx); }
    function run() {
      var n = st.model === 'h2' ? 2 : st.n, Hm = H(), A = QG.variational.ansatz('ry-rz', n, st.layers);
      out.innerHTML = '<p class="small muted">Optimising ' + A.nParams + ' parameters…</p>';
      var code = 'const H = ' + JSON.stringify(Hm) + ';\nconst A = QG.variational.ansatz("ry-rz", ' + n + ', ' + st.layers + ');\nconst r = QG.vqe({ H: H, ansatz: A, optimizer: ' + JSON.stringify(st.optim) + ', maxIter: ' + (st.optim === 'nelder-mead' ? 1500 : st.optim === 'spsa' ? 400 : 200) + ', lr: 0.1 });\nQG.show.table([["x"], [JSON.stringify({ energy: r.energy, exact: r.exact, nfev: r.nfev, x: r.x, hist: r.history.map(h => [h.nfev, h.fx]) })]]);';
      var t0 = performance.now(), payload = null;
      QG.worker.code(code, function (kind, p) { if (kind === 'table') payload = JSON.parse(p.rows[1][0]); }, 60000).then(function () {
        if (!payload) { out.textContent = 'No result.'; return; }
        var r = payload, c = A.build(r.x);
        out.innerHTML = '';
        out.appendChild(QG.charts.line([{ name: 'VQE energy', x: r.hist.map(function (a) { return a[0]; }), y: r.hist.map(function (a) { return a[1]; }) }, { name: 'exact ground energy', x: [0, r.nfev], y: [r.exact, r.exact], dashed: true, color: QG.charts.cssVar('--muted') }], { height: 220, xLabel: 'energy evaluations', yLabel: 'energy' }));
        var rel = Math.abs((r.energy - r.exact) / r.exact);
        out.appendChild(h('dl', { class: 'kv' },
          h('dt', null, 'VQE energy'), h('dd', null, r.energy.toFixed(6)), h('dt', null, 'Exact (diagonalisation)'), h('dd', null, r.exact.toFixed(6)),
          h('dt', null, 'Error'), h('dd', null, (r.energy - r.exact).toExponential(2) + ' (' + (rel * 100).toFixed(2) + '%)'),
          h('dt', null, 'Parameters / evaluations'), h('dd', null, A.nParams + ' / ' + r.nfev), h('dt', null, 'Time'), h('dd', null, Math.round(performance.now() - t0) + ' ms')));
        out.appendChild(QG.circuitView(c, { compact: true }));
        out.appendChild(h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onclick: function () { ui.codeModal('Qiskit: ansatz + Hamiltonian', QG.pauli.toQiskit(Hm) + '\nfrom qiskit.primitives import StatevectorEstimator\n' + QG.toQiskit(c).split('\n').filter(function (l) { return !/print|Statevector\(|quantum_info import Statevector$/.test(l); }).join('\n') + '\nprint(StatevectorEstimator().run([(qc, H)]).result()[0].data.evs)\n', 'vqe.py'); } }, 'Export to Qiskit')));
      }, function (e) { out.innerHTML = '<p class="err-text">' + ui.esc(e.message) + '</p>'; });
    }
    controls();
  }

  /* ---------- small widgets ---------- */
  function paramShiftWidget(el) {
    var c = h('div', { class: 'card' }); el.appendChild(c);
    var sl = h('input', { type: 'range', min: -PI, max: PI, step: PI / 48, value: 0.7, 'aria-label': 'theta' }), so = h('output'), plot = h('div'), txt = h('p', { class: 'small' });
    c.appendChild(h('div', { class: 'ctrl-row' }, h('span', { class: 'm' }, 'θ'), sl, so)); c.appendChild(plot); c.appendChild(txt);
    function draw() {
      var t = +sl.value, f = function (x) { var q = new QG.Circuit(1); q.ry(x, 0); return q.statevector().expectPauli('Z'); };
      so.textContent = t.toFixed(2);
      var xs = [], ys = []; for (var k = 0; k <= 80; k++) { var x = -PI + 2 * PI * k / 80; xs.push(x); ys.push(f(x)); }
      var g = (f(t + PI / 2) - f(t - PI / 2)) / 2, tl = [t - 0.8, t + 0.8];
      plot.innerHTML = '';
      plot.appendChild(QG.charts.line([{ name: '⟨Z⟩ = f(θ)', x: xs, y: ys }, { name: 'shifted points θ ± π/2', x: [t - PI / 2, t + PI / 2], y: [f(t - PI / 2), f(t + PI / 2)], pointsOnly: true, color: QG.charts.cssVar('--yellow') }, { name: 'tangent from the shift rule', x: tl, y: tl.map(function (x) { return f(t) + g * (x - t); }), color: QG.charts.cssVar('--green') }], { height: 220, xLabel: 'θ', ymin: -1.3, ymax: 1.3 }));
      txt.innerHTML = QG.math.process('Shift rule: $\\frac{f(\\theta+\\pi/2) - f(\\theta-\\pi/2)}{2}$ = <b>' + g.toFixed(4) + '</b>; true derivative $-\\sin\\theta$ = <b>' + (-Math.sin(t)).toFixed(4) + '</b>. Exact, using two ordinary circuit runs, with no small step size.');
    }
    sl.addEventListener('input', draw); draw();
  }

  function barrenWidget(el) {
    var c = h('div', { class: 'card' }); el.appendChild(c);
    var out = h('div'), btn = h('button', { class: 'btn primary' }, 'Sample random circuits');
    c.appendChild(h('p', { class: 'small' }, 'For random hardware-efficient circuits (depth = number of qubits), estimate the variance of one gradient component ∂⟨Z₀Z₁⟩/∂θ₁ over 40 random parameter settings.'));
    c.appendChild(h('div', { class: 'btn-row' }, btn)); c.appendChild(out);
    btn.addEventListener('click', function () {
      btn.disabled = true; out.innerHTML = '<p class="small muted">Sampling… (runs in a background thread)</p>';
      var code = 'const res = [];\nfor (let n = 2; n <= 10; n += 1) {\n  const A = QG.variational.ansatz("ry-rz", n, n), r = QG.rng(n), H = [{ c: 1, p: "I".repeat(n - 2) + "ZZ" }];\n  const g = [];\n  for (let s = 0; s < 40; s++) {\n    const th = Array.from({ length: A.nParams }, () => r() * 2 * Math.PI);\n    const f = t => QG.pauli.expect(H, A.build(t).statevector());\n    const p = th.slice(), m = th.slice(); p[0] += Math.PI / 2; m[0] -= Math.PI / 2;\n    g.push((f(p) - f(m)) / 2);\n  }\n  const mean = g.reduce((a, b) => a + b, 0) / g.length;\n  res.push([n, g.reduce((a, b) => a + (b - mean) ** 2, 0) / g.length]);\n}\nQG.show.table([["x"], [JSON.stringify(res)]]);';
      var data = null;
      QG.worker.code(code, function (k, p) { if (k === 'table') data = JSON.parse(p.rows[1][0]); }, 60000).then(function () {
        btn.disabled = false; out.innerHTML = '';
        out.appendChild(QG.charts.line([{ name: 'log₁₀ Var[∂E/∂θ]', x: data.map(function (d) { return d[0]; }), y: data.map(function (d) { return Math.log10(d[1]); }), points: true }], { height: 220, xLabel: 'number of qubits', yLabel: 'log₁₀ variance' }));
        out.appendChild(h('p', { class: 'small' }, 'The variance shrinks roughly exponentially with the number of qubits: the landscape becomes flat almost everywhere (a "barren plateau"), so gradients vanish in the noise. Shallow, problem-inspired circuits and local cost functions avoid this.'));
      }, function (e) { btn.disabled = false; out.textContent = e.message; });
    });
  }

  QG.labs.variational = function (el) {
    el.appendChild(h('div', { class: 'lab-head' }, h('h1', null, 'Variational Playground'), h('span', { class: 'muted small' }, 'Energy landscapes, optimisers, shot noise and VQE')));
    playground(el, {});
    el.appendChild(h('h2', null, 'Scale up: full VQE'));
    el.appendChild(h('p', { class: 'muted' }, 'More qubits and parameters: the landscape can no longer be drawn, so we watch the energy fall and compare it with exact diagonalisation.'));
    vqeRunner(el, {});
  };
  QG.widgets.vplay = function (el, o) { playground(el, Object.assign({ compact: true }, o)); };
  QG.widgets.vqe = function (el, o) { vqeRunner(el, Object.assign({ compact: false }, o)); };
  QG.widgets['param-shift'] = paramShiftWidget;
  QG.widgets.barren = barrenWidget;
})();
