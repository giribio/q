/* Small interactive widgets used inside Tracks 0–2 lessons. */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h, S = ui.svg, PI = Math.PI, W = QG.widgets;
  function card(el) { var c = h('div', { class: 'card' }); el.appendChild(c); return c; }
  function m(tex) { return QG.math.inline(tex); }

  /* ---- complex plane: drag z, see modulus/argument, multiply by i, conjugate ---- */
  W['complex-plane'] = function (el) {
    var c = card(el), z = { re: 0.6, im: 0.5 }, size = 280, R = 110, cx = size / 2, cy = size / 2;
    var svg = S('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, style: 'max-width:100%;touch-action:none', role: 'img', 'aria-label': 'Complex plane' });
    var info = h('div', { style: { flex: '1', minWidth: '220px' } });
    c.appendChild(h('div', { style: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' } }, svg, info));
    c.appendChild(h('div', { class: 'btn-row' },
      h('button', { class: 'btn small', onclick: function () { z = { re: -z.im, im: z.re }; draw(); } }, '× i  (rotate 90°)'),
      h('button', { class: 'btn small', onclick: function () { z = { re: z.re, im: -z.im }; draw(); } }, 'Conjugate z*'),
      h('button', { class: 'btn small', onclick: function () { var r = Math.hypot(z.re, z.im) || 1; z = { re: z.re / r, im: z.im / r }; draw(); } }, 'Normalise to |z| = 1'),
      h('button', { class: 'btn small', onclick: function () { z = { re: -z.re, im: -z.im }; draw(); } }, '× (−1)')));
    function toXY(v) { return [cx + v.re * R, cy - v.im * R]; }
    function draw() {
      svg.innerHTML = '';
      var col = QG.charts.cssVar('--blue'), mut = QG.charts.cssVar('--muted'), brd = QG.charts.cssVar('--border'), yel = QG.charts.cssVar('--yellow');
      svg.appendChild(S('circle', { cx: cx, cy: cy, r: R, fill: 'none', stroke: brd, 'stroke-dasharray': '3 4' }));
      svg.appendChild(S('line', { x1: 8, x2: size - 8, y1: cy, y2: cy, stroke: mut }));
      svg.appendChild(S('line', { x1: cx, x2: cx, y1: 8, y2: size - 8, stroke: mut }));
      svg.appendChild(S('text', { x: size - 22, y: cy - 6, fill: mut, 'font-size': 12, text: 'Re' }));
      svg.appendChild(S('text', { x: cx + 6, y: 18, fill: mut, 'font-size': 12, text: 'Im' }));
      var p = toXY(z), ang = Math.atan2(z.im, z.re), r = Math.hypot(z.re, z.im);
      var arcR = 28, large = 0, sweep = ang < 0 ? 1 : 0;
      if (r > 0.05) svg.appendChild(S('path', { d: 'M' + (cx + arcR) + ' ' + cy + ' A' + arcR + ' ' + arcR + ' 0 ' + large + ' ' + sweep + ' ' + (cx + arcR * Math.cos(ang)) + ' ' + (cy - arcR * Math.sin(ang)), fill: 'none', stroke: yel, 'stroke-width': 2 }));
      svg.appendChild(S('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: col, 'stroke-width': 3 }));
      svg.appendChild(S('line', { x1: p[0], y1: p[1], x2: p[0], y2: cy, stroke: mut, 'stroke-dasharray': '2 3' }));
      var dot = S('circle', { cx: p[0], cy: p[1], r: 9, fill: col, style: 'cursor:grab', tabindex: 0, role: 'slider', 'aria-label': 'z, use arrow keys to move' });
      dot.addEventListener('keydown', function (e) { var d = 0.05; if (e.key === 'ArrowLeft') z.re -= d; else if (e.key === 'ArrowRight') z.re += d; else if (e.key === 'ArrowUp') z.im += d; else if (e.key === 'ArrowDown') z.im -= d; else return; e.preventDefault(); draw(); svg.querySelector('circle[role=slider]').focus(); });
      svg.appendChild(dot);
      var deg = ang * 180 / PI;
      info.innerHTML = QG.math.process('<dl class="kv"><dt>z</dt><dd>' + QG.complexStr(z.re, z.im, 2) + '</dd><dt>modulus |z|</dt><dd>' + r.toFixed(3) + '</dd><dt>|z|²</dt><dd>' + (r * r).toFixed(3) + '</dd><dt>argument</dt><dd>' + deg.toFixed(1) + '°</dd></dl><p class="small">Polar form: $z = ' + r.toFixed(2) + '\\, e^{i\\,' + (ang).toFixed(2) + '}$. In quantum mechanics $|z|^2$ becomes a <b>probability</b> and the angle becomes a <b>phase</b>.</p>');
    }
    var drag = false;
    function pt(e) { var b = svg.getBoundingClientRect(), s = size / b.width; z = { re: Math.max(-1.25, Math.min(1.25, ((e.clientX - b.left) * s - cx) / R)), im: Math.max(-1.25, Math.min(1.25, (cy - (e.clientY - b.top) * s) / R)) }; draw(); }
    svg.addEventListener('pointerdown', function (e) { drag = true; svg.setPointerCapture(e.pointerId); pt(e); });
    svg.addEventListener('pointermove', function (e) { if (drag) pt(e); });
    svg.addEventListener('pointerup', function () { drag = false; });
    draw();
  };

  /* ---- matrix × vector for the common gates ---- */
  W['matrix-vector'] = function (el) {
    var c = card(el), s2 = '\\frac{1}{\\sqrt2}';
    var MATS = { X: [[1, 0, 0, 1], '\\begin{pmatrix}0&1\\\\1&0\\end{pmatrix}', [[0, 1], [1, 0]]], Z: [0, '\\begin{pmatrix}1&0\\\\0&-1\\end{pmatrix}', [[1, 0], [0, -1]]], H: [0, s2 + '\\begin{pmatrix}1&1\\\\1&-1\\end{pmatrix}', [[Math.SQRT1_2, Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2]]], I: [0, '\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}', [[1, 0], [0, 1]]] };
    var VECS = { '|0⟩': [1, 0], '|1⟩': [0, 1], '|+⟩': [Math.SQRT1_2, Math.SQRT1_2], '|−⟩': [Math.SQRT1_2, -Math.SQRT1_2] };
    var ms = h('select', { 'aria-label': 'Matrix' }, Object.keys(MATS).map(function (k) { return h('option', null, k); })), vs = h('select', { 'aria-label': 'Vector' }, Object.keys(VECS).map(function (k) { return h('option', null, k); }));
    var out = h('div');
    c.appendChild(h('div', { class: 'btn-row' }, h('label', { class: 'inline' }, 'Gate ', ms), h('label', { class: 'inline' }, 'acting on ', vs)));
    c.appendChild(out);
    function vtex(v) { return '\\begin{pmatrix}' + fmt(v[0]) + '\\\\' + fmt(v[1]) + '\\end{pmatrix}'; }
    function fmt(x) { if (Math.abs(Math.abs(x) - Math.SQRT1_2) < 1e-9) return (x < 0 ? '-' : '') + '\\frac{1}{\\sqrt2}'; return String(+x.toFixed(3)); }
    function name(v) { var best = null; Object.keys(VECS).forEach(function (k) { var w = VECS[k]; if (Math.abs(w[0] - v[0]) < 1e-9 && Math.abs(w[1] - v[1]) < 1e-9) best = k; if (Math.abs(w[0] + v[0]) < 1e-9 && Math.abs(w[1] + v[1]) < 1e-9) best = '−' + k; }); return best; }
    function draw() {
      var M = MATS[ms.value][2], v = VECS[vs.value], r = [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]], nm = name(r);
      out.innerHTML = QG.math.process('$$' + MATS[ms.value][1] + vtex(v) + ' = ' + vtex(r) + '$$' + '<p class="small" style="text-align:center">' + ms.value + ' ' + vs.value + ' = ' + (nm || 'a new state') + '. Each output entry is a row of the matrix dotted with the input column.</p>');
    }
    ms.addEventListener('change', draw); vs.addEventListener('change', draw); draw();
  };

  /* ---- measurement simulator: prepare cos(θ/2)|0> + sin(θ/2)|1>, measure many times ---- */
  W['measure-sim'] = function (el, o) {
    var c = card(el), th = o.theta !== undefined ? o.theta : PI / 3, counts = { '0': 0, '1': 0 }, rnd = QG.rng();
    var sl = h('input', { type: 'range', min: 0, max: PI, step: PI / 36, value: th, 'aria-label': 'Angle theta' }), so = h('output');
    var stat = h('div'), chart = h('div');
    c.appendChild(h('div', { class: 'ctrl-row' }, h('span', { class: 'm' }, 'θ'), sl, so));
    c.appendChild(stat);
    c.appendChild(h('div', { class: 'btn-row' }, [1, 10, 100, 1000].map(function (n) { return h('button', { class: 'btn small' + (n === 1 ? ' primary' : ''), onclick: function () { shoot(n); } }, 'Measure ×' + n); }), h('button', { class: 'btn small', onclick: function () { counts = { '0': 0, '1': 0 }; draw(); } }, 'Reset counts')));
    c.appendChild(chart);
    sl.addEventListener('input', function () { th = +sl.value; counts = { '0': 0, '1': 0 }; draw(); });
    var last = null;
    function shoot(n) { var p1 = Math.pow(Math.sin(th / 2), 2); for (var i = 0; i < n; i++) { last = rnd() < p1 ? '1' : '0'; counts[last]++; } draw(n === 1); }
    function draw(single) {
      var a = Math.cos(th / 2), b = Math.sin(th / 2), N = counts['0'] + counts['1'];
      so.textContent = Math.round(th * 180 / PI) + '°';
      stat.innerHTML = QG.math.process('$$\\ket{\\psi} = ' + a.toFixed(3) + '\\ket{0} + ' + b.toFixed(3) + '\\ket{1}$$<p class="small" style="text-align:center">Born rule: P(0) = ' + a.toFixed(3) + '² = <b>' + (a * a).toFixed(3) + '</b>, P(1) = <b>' + (b * b).toFixed(3) + '</b>' + (N ? ' · measured ' + N + ' times: ' + counts['0'] + ' zeros (' + (100 * counts['0'] / N).toFixed(1) + '%), ' + counts['1'] + ' ones' : '') + '</p>');
      chart.innerHTML = '';
      chart.appendChild(QG.charts.bars({ 'P(0) theory': a * a, 'P(1) theory': b * b, '0 measured': N ? counts['0'] / N : 0, '1 measured': N ? counts['1'] / N : 0 }, { ymax: 1, sort: 'value', height: 190, highlight: ['0 measured', '1 measured'] }));
      if (single) ui.toast('This measurement gave ' + last + '. The state collapsed to |' + last + '⟩.');
    }
    draw();
  };

  /* ---- tensor product builder ---- */
  W.tensor = function (el) {
    var c = card(el), r = Math.SQRT1_2;
    var ST = { '|0⟩': [[1, 0], [0, 0]], '|1⟩': [[0, 0], [1, 0]], '|+⟩': [[r, 0], [r, 0]], '|−⟩': [[r, 0], [-r, 0]], '|i⟩': [[r, 0], [0, r]] };
    var a = h('select', { 'aria-label': 'First qubit (q1)' }, Object.keys(ST).map(function (k) { return h('option', null, k); })), b = h('select', { 'aria-label': 'Second qubit (q0)' }, Object.keys(ST).map(function (k) { return h('option', null, k); }));
    b.value = '|+⟩';
    var out = h('div');
    c.appendChild(h('div', { class: 'btn-row' }, h('label', { class: 'inline' }, 'q1 = ', a), h('span', { class: 'm' }, '⊗'), h('label', { class: 'inline' }, 'q0 = ', b)));
    c.appendChild(out);
    function cm(x, y) { return [x[0] * y[0] - x[1] * y[1], x[0] * y[1] + x[1] * y[0]]; }
    function draw() {
      var A = ST[a.value], B = ST[b.value], v = [cm(A[0], B[0]), cm(A[0], B[1]), cm(A[1], B[0]), cm(A[1], B[1])];
      var rows = v.map(function (z, i) { return QG.complexStr(z[0], z[1], 3) + ' & \\ket{' + QG.bitstring(i, 2) + '}'; });
      out.innerHTML = QG.math.process('$$' + a.value.replace('|', '\\ket{').replace('⟩', '}') + '\\otimes' + b.value.replace('|', '\\ket{').replace('⟩', '}') + ' = \\begin{pmatrix}' + v.map(function (z) { return QG.complexStr(z[0], z[1], 3); }).join('\\\\') + '\\end{pmatrix}$$' +
        '<p class="small" style="text-align:center">Rows are the amplitudes of |00⟩, |01⟩, |10⟩, |11⟩ (written q1 q0). Every product state can be split back into two single-qubit states; a Bell state cannot.</p>');
    }
    a.addEventListener('change', draw); b.addEventListener('change', draw); draw();
  };

  /* ---- CHSH game: classical vs quantum strategy ---- */
  W.chsh = function (el) {
    var c = card(el), rnd = QG.rng(), stats = { classical: [0, 0], quantum: [0, 0] }, out = h('div');
    c.appendChild(h('p', { class: 'small', html: QG.math.process('The referee sends random bits $x$ to Alice and $y$ to Bob. They cannot talk. They win if $a \\oplus b = x \\cdot y$ (answers differ only when both bits are 1).') }));
    c.appendChild(h('div', { class: 'btn-row' },
      h('button', { class: 'btn', onclick: function () { play('classical', 1000); } }, 'Play 1000 rounds: classical (always answer 0)'),
      h('button', { class: 'btn primary', onclick: function () { play('quantum', 1000); } }, 'Play 1000 rounds: shared Bell pair'),
      h('button', { class: 'btn small', onclick: function () { stats = { classical: [0, 0], quantum: [0, 0] }; draw(); } }, 'Reset')));
    c.appendChild(out);
    // Optimal quantum strategy: Alice measures at angle 0 or π/4 (on the Bloch circle: 0 or π/2), Bob at π/8 or -π/8 (in half-angle units).
    function quantumRound(x, y) {
      var aAng = x ? PI / 4 : 0, bAng = y ? -PI / 8 : PI / 8;
      var qc = new QG.Circuit(2); qc.h(0).cx(0, 1).ry(-2 * aAng, 0).ry(-2 * bAng, 1);
      var p = qc.statevector().probabilities(), r = rnd(), k = 0, acc = p[0]; while (r > acc && k < 3) { k++; acc += p[k]; }
      return [k & 1, (k >> 1) & 1];
    }
    function play(kind, n) {
      for (var i = 0; i < n; i++) {
        var x = rnd() < 0.5 ? 1 : 0, y = rnd() < 0.5 ? 1 : 0, ab = kind === 'classical' ? [0, 0] : quantumRound(x, y);
        if ((ab[0] ^ ab[1]) === (x & y)) stats[kind][0]++; stats[kind][1]++;
      }
      draw();
    }
    function draw() {
      var o = {};
      ['classical', 'quantum'].forEach(function (k) { if (stats[k][1]) o[k + ' (' + stats[k][1] + ' rounds)'] = stats[k][0] / stats[k][1]; });
      out.innerHTML = '';
      out.appendChild(QG.charts.bars(Object.assign({ 'best classical limit': 0.75, 'quantum limit cos²(π/8)': Math.pow(Math.cos(PI / 8), 2) }, o), { ymax: 1, sort: 'value', height: 200, highlight: ['best classical limit', 'quantum limit cos²(π/8)'], valueFmt: function (v) { return (v * 100).toFixed(1) + '%'; } }));
      out.appendChild(h('p', { class: 'small muted' }, 'No classical strategy beats 75%. The entangled strategy wins about 85.4% of rounds. This gap is what experiments test to show nature is not "locally classical" (Nobel Prize in Physics, 2022).'));
    }
    draw();
  };

  /* ---- superdense coding: send 2 classical bits with 1 qubit ---- */
  W.superdense = function (el) {
    var c = card(el), out = h('div');
    c.appendChild(h('p', { class: 'small' }, 'Alice and Bob share a Bell pair. Alice picks a 2-bit message and applies a gate only to her qubit, then sends that one qubit to Bob.'));
    var row = h('div', { class: 'btn-row' });
    ['00', '01', '10', '11'].forEach(function (msg) { row.appendChild(h('button', { class: 'btn', onclick: function () { send(msg); } }, 'Send ' + msg)); });
    c.appendChild(row); c.appendChild(out);
    function send(msg) {
      var qc = new QG.Circuit(2); qc.h(0).cx(0, 1); // q0 = Alice, q1 = Bob
      var gates = { '00': 'I', '01': 'X', '10': 'Z', '11': 'Z·X' }[msg];
      if (msg[1] === '1') qc.x(0); if (msg[0] === '1') qc.z(0);
      qc.cx(0, 1).h(0);
      var p = qc.statevector().probabilities(), k = 0; for (var i = 0; i < 4; i++) if (p[i] > 0.5) k = i;
      var decoded = String(k & 1) + String((k >> 1) & 1); // message bit order: (z-bit, x-bit) = (q0, q1)
      out.innerHTML = QG.math.process('<p>Alice applies <b>' + gates + '</b> to her qubit. Bob applies CNOT then H and measures both qubits: he reads <b>' + decoded + '</b> with probability ' + p[k].toFixed(2) + '.</p>');
      out.appendChild(QG.charts.bars({ 'decoded 00': decoded === '00' ? 1 : 0, 'decoded 01': decoded === '01' ? 1 : 0, 'decoded 10': decoded === '10' ? 1 : 0, 'decoded 11': decoded === '11' ? 1 : 0 }, { ymax: 1, sort: 'label', height: 160, highlight: ['decoded ' + decoded] }));
    }
    send('10');
  };

  /* ---- probability amplitudes vs probabilities: interference demo ---- */
  W.interference = function (el) {
    var c = card(el), sl = h('input', { type: 'range', min: 0, max: 2 * PI, step: PI / 36, value: 0, 'aria-label': 'Phase phi' }), so = h('output'), out = h('div');
    c.appendChild(h('p', { class: 'small', html: QG.math.process('Circuit: H, then a phase $P(\\varphi)$, then H again. Classically, two coin flips would give 50/50. Quantum amplitudes can <b>cancel</b>.') }));
    c.appendChild(h('div', { class: 'ctrl-row' }, h('span', { class: 'm' }, 'φ'), sl, so)); c.appendChild(out);
    function draw() {
      var ph = +sl.value, qc = new QG.Circuit(1); qc.h(0).p(ph, 0).h(0); var sv = qc.statevector(), p = sv.probabilities();
      so.textContent = Math.round(ph * 180 / PI) + '°'; out.innerHTML = '';
      out.appendChild(QG.charts.bars({ 'P(0)': p[0], 'P(1)': p[1] }, { ymax: 1, height: 170 }));
      out.appendChild(h('p', { class: 'small', html: QG.math.process('P(0) = $\\cos^2(\\varphi/2)$ = ' + p[0].toFixed(3) + '. At φ = 0 the two paths to $\\ket{1}$ cancel exactly; at φ = 180° the paths to $\\ket{0}$ cancel instead.') }));
    }
    sl.addEventListener('input', draw); draw();
  };

  /* ---- no-cloning: a "copier" CNOT works for |0>,|1> but not |+> ---- */
  W.cloning = function (el) {
    var c = card(el), out = h('div'), r = Math.SQRT1_2;
    var IN = { '|0⟩': [], '|1⟩': [['x', 0]], '|+⟩': [['h', 0]], '|−⟩': [['x', 0], ['h', 0]] };
    var sel = h('select', { 'aria-label': 'Input state' }, Object.keys(IN).map(function (k) { return h('option', null, k); }));
    c.appendChild(h('div', { class: 'btn-row' }, h('label', { class: 'inline' }, 'Input on q0: ', sel), h('span', { class: 'small muted' }, 'q1 starts in |0⟩. "Copier" = CNOT(q0 → q1).')));
    c.appendChild(out);
    function draw() {
      var qc = new QG.Circuit(2); IN[sel.value].forEach(function (g) { qc[g[0]](g[1]); });
      var single = qc.statevector(); // q0 has psi, q1 = 0
      var want = new QG.Circuit(2); IN[sel.value].forEach(function (g) { want[g[0]](0); want[g[0]](1); });
      qc.cx(0, 1);
      var f = qc.statevector().fidelity(want.statevector());
      out.innerHTML = QG.math.process('<p>Result: $' + QG.describeState(qc.statevector()).replace(/\|(\d+)⟩/g, '\\ket{$1}') + '$</p><p>Wanted two copies $' + sel.value.replace('|', '\\ket{').replace('⟩', '}') + '\\otimes' + sel.value.replace('|', '\\ket{').replace('⟩', '}') + '$: fidelity <b>' + f.toFixed(3) + '</b> ' + (f > 0.999 ? '<span class="ok-text">copied</span>' : '<span class="warn-text">not a copy: the qubits became entangled instead</span>') + '</p>');
      void single; void r;
    }
    sel.addEventListener('change', draw); draw();
  };
})();
