/* Widgets for Track 3 (algorithms) and Track 4 (noise). */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h, W = QG.widgets, A = QG.algorithms, PI = Math.PI;
  function card(el) { var c = h('div', { class: 'card' }); el.appendChild(c); return c; }
  function row(label, input, out, cols) { return h('div', { class: 'ctrl-row', style: cols ? { gridTemplateColumns: cols } : null }, h('span', null, label), input, out); }
  function slider(min, max, step, value, label) { return h('input', { type: 'range', min: min, max: max, step: step, value: value, 'aria-label': label }); }

  /* ---- Shor: order finding for small N, with the classical post-processing ---- */
  W.shor = function (el) {
    var c = card(el), Ns = [15, 21, 33, 35], N = 15, a = 7, out = h('div'), rnd = QG.rng();
    var nSel = h('select', { 'aria-label': 'Number to factor' }, Ns.map(function (x) { return h('option', null, String(x)); }));
    var aSel = h('select', { 'aria-label': 'Base a' });
    function fillA() { aSel.innerHTML = ''; for (var x = 2; x < N; x++) if (A.gcd(x, N) === 1) aSel.appendChild(h('option', { selected: x === a ? 'selected' : null }, String(x))); a = +aSel.value; }
    nSel.addEventListener('change', function () { N = +nSel.value; a = 2; fillA(); draw(); });
    aSel.addEventListener('change', function () { a = +aSel.value; draw(); });
    c.appendChild(h('div', { class: 'btn-row' }, h('label', { class: 'inline' }, 'Factor N = ', nSel), h('label', { class: 'inline' }, 'random base a = ', aSel)));
    c.appendChild(out); fillA();
    function draw() {
      var t = 2 * Math.ceil(Math.log2(N)), M = 1 << t, o = A.orderFinding(a, N, t), r = o.period;
      out.innerHTML = '';
      out.appendChild(h('p', { class: 'small', html: QG.math.process('Powers $a^x \\bmod N$ for x = 0, 1, 2, …: <b>' + o.values.slice(0, 16).join(', ') + '…</b>. They repeat with period $r = ' + r + '$. A quantum computer finds $r$ with ' + t + ' counting qubits, giving outputs $y \\approx k\\cdot 2^t/r$:') }));
      var xs = [], ys = []; for (var y = 0; y < M; y++) { xs.push(y); ys.push(o.probs[y]); }
      out.appendChild(QG.charts.line([{ name: 'P(y)', x: xs, y: ys }], { height: 200, xLabel: 'measured y (0 … ' + (M - 1) + ')', yLabel: 'probability', ymin: 0 }));
      var res = h('div');
      out.appendChild(h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: function () {
        var u = rnd(), acc = 0, yy = 0; for (; yy < M; yy++) { acc += o.probs[yy]; if (u <= acc) break; }
        var cf = A.continuedFraction(yy, M, N), rr = cf.den, msg = 'Measured y = <b>' + yy + '</b>. Continued fractions of ' + yy + '/' + M + ': ' + (cf.steps.join(', ') || '0') + ' → guess r = <b>' + rr + '</b>. ';
        if (yy === 0) msg += 'y = 0 carries no information: run again.';
        else if (A.modpow(a, rr, N) !== 1) msg += 'Check: ' + a + '^' + rr + ' mod ' + N + ' ≠ 1, so this guess failed (it happens when k and r share a factor). Run again.';
        else if (rr % 2) msg += 'r is odd, so pick another a.';
        else {
          var half = A.modpow(a, rr / 2, N), f1 = A.gcd(half - 1, N), f2 = A.gcd(half + 1, N);
          msg += 'r is even: gcd(' + a + '^' + (rr / 2) + ' ± 1, ' + N + ') = ' + f1 + ', ' + f2 + '. ' + (f1 > 1 && f1 < N ? '<span class="ok-text">' + N + ' = ' + f1 + ' × ' + N / f1 + '</span>' : f2 > 1 && f2 < N ? '<span class="ok-text">' + N + ' = ' + f2 + ' × ' + N / f2 + '</span>' : 'Only trivial factors: pick another a.');
        }
        res.innerHTML = msg;
      } }, 'Run the quantum part once')));
      res.className = 'small'; res.setAttribute('aria-live', 'polite');
      out.appendChild(res);
    }
    draw();
  };

  /* ---- T1 / T2 decay with an animated Bloch vector ---- */
  W.decay = function (el) {
    var c = card(el), T1 = 60, T2 = 40, t = 0;
    var s1 = slider(5, 200, 1, T1, 'T1'), s2 = slider(2, 200, 1, T2, 'T2'), st = slider(0, 300, 1, 0, 'time'), o1 = h('output'), o2 = h('output'), ot = h('output');
    var plot = h('div'), side = h('div', { style: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' } }), bbox = h('div'), txt = h('div', { class: 'small', style: { flex: 1, minWidth: '200px' } });
    c.appendChild(row('T1 (µs)', s1, o1)); c.appendChild(row('T2 (µs)', s2, o2)); c.appendChild(row('time t (µs)', st, ot));
    side.appendChild(bbox); side.appendChild(txt); c.appendChild(side); c.appendChild(plot);
    var B = QG.Bloch(bbox, { size: 200, labels: false, trail: true });
    function draw(movedTime) {
      T1 = +s1.value; T2 = Math.min(+s2.value, 2 * T1); s2.value = T2; t = +st.value;
      o1.textContent = T1; o2.textContent = T2; ot.textContent = t;
      // start in |+>: x = e^{-t/T2}, z = 1 - e^{-t/T1}
      var v = { x: Math.exp(-t / T2), y: 0, z: 1 - Math.exp(-t / T1) };
      if (!movedTime) B.clearTrail(); B.set(v);
      txt.innerHTML = QG.math.process('Start in $\\ket{+}$ (on the equator). <b>T2</b> destroys the superposition: the x-component decays as $e^{-t/T_2}$ = ' + v.x.toFixed(3) + '. <b>T1</b> is energy loss: the qubit falls to $\\ket{0}$, so z grows as $1 - e^{-t/T_1}$ = ' + v.z.toFixed(3) + '. Always $T_2 \\le 2T_1$.');
      var xs = [], a = [], b = []; for (var k = 0; k <= 60; k++) { var tt = k * 5; xs.push(tt); a.push(Math.exp(-tt / T1)); b.push(Math.exp(-tt / T2)); }
      plot.innerHTML = ''; plot.appendChild(QG.charts.line([{ name: 'excited population e^(−t/T1)', x: xs, y: a }, { name: 'coherence e^(−t/T2)', x: xs, y: b }], { height: 200, xLabel: 't (µs)', ymin: 0, ymax: 1 }));
    }
    s1.addEventListener('input', function () { draw(); }); s2.addEventListener('input', function () { draw(); }); st.addEventListener('input', function () { draw(true); });
    draw();
  };

  /* ---- Pure vs mixed: density matrices ---- */
  W.mixed = function (el) {
    var c = card(el), sp = slider(0, 1, 0.01, 0.5, 'mixing'), op = h('output'), mode = h('select', { 'aria-label': 'Kind of state' }, h('option', { value: 'mix' }, 'Classical mixture: |0⟩ with prob 1−p, |1⟩ with prob p'), h('option', { value: 'sup' }, 'Superposition: √(1−p)|0⟩ + √p|1⟩'));
    var out = h('div', { style: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' } }), bbox = h('div'), txt = h('div', { style: { flex: 1, minWidth: '220px' } });
    c.appendChild(h('div', { class: 'btn-row' }, mode)); c.appendChild(row('p', sp, op)); out.appendChild(bbox); out.appendChild(txt); c.appendChild(out);
    var B = QG.Bloch(bbox, { size: 200, labels: false });
    function draw() {
      var p = +sp.value, sup = mode.value === 'sup'; op.textContent = p.toFixed(2);
      var r00 = 1 - p, r11 = p, r01 = sup ? Math.sqrt(p * (1 - p)) : 0, pur = r00 * r00 + r11 * r11 + 2 * r01 * r01;
      B.set({ x: 2 * r01, y: 0, z: r00 - r11 });
      txt.innerHTML = QG.math.process('$$\\rho = \\begin{pmatrix}' + r00.toFixed(2) + ' & ' + r01.toFixed(2) + '\\\\' + r01.toFixed(2) + ' & ' + r11.toFixed(2) + '\\end{pmatrix}$$<p class="small">Diagonal = probabilities (the same for both kinds!). Off-diagonal = <b>coherence</b>, present only in the superposition. Purity $\\mathrm{Tr}\\,\\rho^2$ = <b>' + pur.toFixed(3) + '</b> ' + (pur > 0.999 ? '(pure state: on the sphere surface)' : '(mixed: inside the sphere)') + '.</p>');
    }
    sp.addEventListener('input', draw); mode.addEventListener('change', draw); draw();
  };

  /* ---- What a channel does to the whole Bloch sphere ---- */
  W.channel = function (el, o) {
    var c = card(el), ch = h('select', { 'aria-label': 'Noise channel' }, [['bitFlip', 'Bit flip (X with prob p)'], ['phaseFlip', 'Phase flip (Z with prob p)'], ['depolarizing', 'Depolarizing'], ['amplitudeDamping', 'Amplitude damping (T1)'], ['phaseDamping', 'Phase damping (T2)']].map(function (x) { return h('option', { value: x[0] }, x[1]); }));
    if (o.channel) ch.value = o.channel;
    var sp = slider(0, 1, 0.01, 0.3, 'strength'), op = h('output'), out = h('div', { style: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' } }), bbox = h('div'), txt = h('div', { class: 'small', style: { flex: 1, minWidth: '200px' } });
    c.appendChild(h('div', { class: 'btn-row' }, ch)); c.appendChild(row('strength', sp, op)); out.appendChild(bbox); out.appendChild(txt); c.appendChild(out);
    var B = QG.Bloch(bbox, { size: 240, labels: false, caption: false }), pts = [];
    for (var i = 0; i < 14; i++) for (var j = 0; j < 7; j++) { var th = (j + 0.5) / 7 * PI, ph = i / 14 * 2 * PI; pts.push([th, ph]); }
    var DESC = { bitFlip: 'squashes the sphere onto the x axis (y and z shrink by 1−2p).', phaseFlip: 'squashes the sphere onto the z axis: superpositions lose their phase, but |0⟩ and |1⟩ are untouched.', depolarizing: 'shrinks the sphere uniformly towards the centre by (1−λ).', amplitudeDamping: 'shrinks the sphere and pulls it towards |0⟩ (the north pole): energy leaks out.', phaseDamping: 'shrinks the equator only (pure dephasing): the poles stay put.' };
    function draw() {
      var s = +sp.value; op.textContent = s.toFixed(2);
      var cloud = pts.map(function (a) {
        var c1 = new QG.Circuit(1); c1.ry(a[0], 0).rz(a[1], 0);
        var d = QG.DensityMatrix.fromStateVector(c1.statevector());
        if (ch.value === 'depolarizing') QG.channels.depolarizing(d, [0], s); else QG.channels[ch.value](d, 0, s);
        return d.bloch(0);
      });
      B.set([]); B.setPoints(cloud);
      txt.innerHTML = 'Each dot starts as a pure state on the surface. After the channel, the cloud shows where every state ends up. This channel ' + DESC[ch.value];
    }
    ch.addEventListener('change', draw); sp.addEventListener('input', draw); draw();
  };

  /* ---- GHZ fidelity vs size under noise ---- */
  W['ghz-noise'] = function (el) {
    var c = card(el), sp = slider(0, 0.1, 0.001, 0.02, '2-qubit error'), op = h('output'), plot = h('div');
    c.appendChild(row('2-qubit error', sp, op, '120px 1fr 70px')); c.appendChild(plot);
    var draw = ui.debounce(function () {
      var p2 = +sp.value, xs = [], ys = [], est = []; op.textContent = (p2 * 100).toFixed(1) + '%';
      for (var n = 2; n <= 7; n++) {
        var g = new QG.Circuit(n); g.h(0); for (var i = 0; i < n - 1; i++) g.cx(i, i + 1);
        var r = QG.runNoisy(g, { p1: p2 / 10, p2: p2 }); xs.push(n); ys.push(r.dm.fidelity(g.statevector()));
        est.push(Math.pow(1 - p2 * 0.8, n - 1) * (1 - p2 / 10 * 0.5));
      }
      plot.innerHTML = '';
      plot.appendChild(QG.charts.line([{ name: 'simulated GHZ fidelity', x: xs, y: ys, points: true }, { name: 'rule of thumb (1 − error)^gates', x: xs, y: est, dashed: true }], { height: 220, xLabel: 'number of qubits n (n−1 CNOTs)', yLabel: 'fidelity', ymin: 0, ymax: 1 }));
    }, 40);
    sp.addEventListener('input', draw); draw();
  };

  /* ---- Repetition code: logical vs physical error ---- */
  W.repetition = function (el, o) {
    var kind = o.kind || 'bit', c = card(el), sp = slider(0, 0.5, 0.005, 0.1, 'physical error'), op = h('output'), info = h('p', { class: 'small' }), plot = h('div');
    c.appendChild(row('error p per qubit', sp, op, '140px 1fr 60px')); c.appendChild(info); c.appendChild(plot);
    var a = A.repetitionCode(kind);
    c.insertBefore(QG.circuitView(a.circuit, { stages: a.stages, compact: true }), c.firstChild);
    function sim(p) {
      var d = new QG.DensityMatrix(3);
      a.circuit.ops.forEach(function (op2, i) { if (i === a.noiseAt) for (var q = 0; q < 3; q++) QG.channels[kind === 'phase' ? 'phaseFlip' : 'bitFlip'](d, q, p); d.applyOp(op2); });
      return (1 - d.bloch(0).z) / 2;
    }
    function draw() {
      var p = +sp.value, pl = sim(p); op.textContent = p.toFixed(3);
      info.innerHTML = 'Simulated logical error: <b>' + pl.toFixed(4) + '</b> (formula $3p^2 - 2p^3$ = ' + (3 * p * p - 2 * p * p * p).toFixed(4) + ') vs unprotected qubit: <b>' + p.toFixed(4) + '</b>. ' + (pl < p ? '<span class="ok-text">The code helps.</span>' : '<span class="warn-text">No gain at this error rate.</span>');
      info.innerHTML = QG.math.process(info.innerHTML);
      var xs = [], y1 = [], y2 = []; for (var k = 0; k <= 50; k++) { var x = k / 100; xs.push(x); y1.push(x); y2.push(3 * x * x - 2 * x * x * x); }
      plot.innerHTML = ''; plot.appendChild(QG.charts.line([{ name: 'unprotected qubit', x: xs, y: y1, dashed: true }, { name: 'encoded (3 qubits + majority vote)', x: xs, y: y2 }, { name: 'this p', x: [p], y: [pl], pointsOnly: true, color: QG.charts.cssVar('--yellow') }], { height: 210, xLabel: 'physical error p', yLabel: 'logical error', ymin: 0, ymax: 0.5 }));
    }
    sp.addEventListener('input', draw); draw();
  };

  /* ---- Readout error and its mitigation ---- */
  W.readout = function (el) {
    var c = card(el), sp = slider(0, 0.2, 0.005, 0.06, 'readout error'), op = h('output'), plot = h('div'), info = h('p', { class: 'small' }), rnd = QG.rng(7);
    c.appendChild(row('readout error', sp, op, '120px 1fr 60px')); c.appendChild(plot); c.appendChild(info);
    function draw() {
      var e = +sp.value; op.textContent = (e * 100).toFixed(1) + '%';
      var g = new QG.Circuit(2); g.h(0).cx(0, 1);
      var ideal = g.statevector().probabilities(), noisy = QG.applyReadout(ideal, 2, e), shots = 4000, cnt = QG.sampleProbs(noisy, shots, rnd), est = new Float64Array(4);
      Object.keys(cnt).forEach(function (k) { est[+k] = cnt[k] / shots; });
      var mit = QG.mitigateReadout(est, 2, e), S = function (arr) { var o = {}; for (var i = 0; i < 4; i++) o[QG.bitstring(i, 2)] = arr[i]; return o; };
      plot.innerHTML = ''; plot.appendChild(QG.charts.grouped([{ name: 'ideal', values: S(ideal) }, { name: 'measured (4000 shots)', values: S(est) }, { name: 'after mitigation', values: S(mit) }], { ymax: 0.6 }));
      info.innerHTML = 'Bell state measured with a ' + (e * 100).toFixed(1) + '% chance of misreading each bit. Calibrate the error by preparing |0⟩ and |1⟩, then invert the 2×2 confusion matrix of each qubit. The leftover differences are shot noise.';
    }
    sp.addEventListener('input', draw); draw();
  };

  /* ---- Zero-noise extrapolation ---- */
  W.zne = function (el) {
    var c = card(el), sp = slider(0, 0.1, 0.002, 0.04, 'base error'), op = h('output'), plot = h('div'), info = h('p', { class: 'small' });
    c.appendChild(row('2-qubit error', sp, op, '120px 1fr 60px')); c.appendChild(plot); c.appendChild(info);
    var g = new QG.Circuit(3); g.h(0).cx(0, 1).cx(1, 2).cx(1, 2).cx(1, 2); // GHZ with a redundant CNOT pair (depth for noise)
    function draw() {
      var p2 = +sp.value; op.textContent = (p2 * 100).toFixed(1) + '%';
      var scales = [1, 1.5, 2, 2.5, 3], ys = scales.map(function (s) { return QG.runNoisy(g, { p1: p2 / 10, p2: p2, scale: s }).dm.expectPauli('ZZI'); });
      var lin = QG.zeroNoiseExtrapolate(scales, ys, 1), quad = QG.zeroNoiseExtrapolate(scales, ys, 2), ideal = g.statevector().expectPauli('ZZI');
      var xs = [], yl = [], yq = []; for (var k = 0; k <= 30; k++) { var x = k / 10; xs.push(x); yl.push(lin.coef[0] + lin.coef[1] * x); yq.push(quad.coef[0] + quad.coef[1] * x + quad.coef[2] * x * x); }
      plot.innerHTML = ''; plot.appendChild(QG.charts.line([{ name: 'measured at noise scale s', x: scales, y: ys, pointsOnly: true }, { name: 'linear fit', x: xs, y: yl, dashed: true }, { name: 'quadratic fit', x: xs, y: yq }], { height: 220, xLabel: 'noise scale s (s = 0 means no noise)', yLabel: '⟨Z₁Z₀⟩', ymin: Math.min.apply(null, ys.concat(yl)) - 0.05, ymax: 1.02 }));
      info.innerHTML = 'Ideal ⟨Z₁Z₀⟩ = ' + ideal.toFixed(3) + '. Raw noisy value (s = 1): <b>' + ys[0].toFixed(3) + '</b>. Extrapolated to zero noise: linear <b>' + lin.value.toFixed(3) + '</b>, quadratic <b>' + quad.value.toFixed(3) + '</b>. On hardware the noise is amplified by "folding" gates (G → G G† G), not by turning a knob.';
    }
    sp.addEventListener('input', draw); draw();
  };
})();
