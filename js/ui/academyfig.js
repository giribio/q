/* Academy figures: original SVG illustrations in the Google palette (theme-aware through CSS variables).
 * QG.academyFig(name) returns an SVG string with viewBox 0 0 320 200. Page only. */
(function () {
  var QG = window.QG;
  function st(fill, stroke, sw, extra) { return ' style="fill:' + (fill ? 'var(' + fill + ')' : 'none') + ';stroke:' + (stroke ? 'var(' + stroke + ')' : 'none') + ';stroke-width:' + (sw || 0) + (extra ? ';' + extra : '') + '"'; }
  function T(x, y, s, o) { o = o || {}; return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.a || 'middle') + '" style="fill:var(' + (o.c || '--text') + ');font:' + (o.w || 400) + ' ' + (o.s || 12) + 'px var(--font)' + (o.i ? ';font-style:italic' : '') + '">' + s + '</text>'; }
  function L(x1, y1, x2, y2, c, w, dash) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' + st(null, c || '--muted', w || 1.5, dash ? 'stroke-dasharray:' + dash : '') + '/>'; }
  function C(x, y, r, f, s, w) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"' + st(f, s, w) + '/>'; }
  function R(x, y, w, hh, f, s, sw, rx) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" rx="' + (rx === undefined ? 6 : rx) + '"' + st(f, s, sw) + '/>'; }
  function P(d, f, s, w, extra) { return '<path d="' + d + '"' + st(f, s, w, extra) + '/>'; }
  function arrow(x1, y1, x2, y2, c, w) {
    var a = Math.atan2(y2 - y1, x2 - x1), k = 7;
    return L(x1, y1, x2, y2, c, w || 2) + P('M' + x2 + ' ' + y2 + 'L' + (x2 - k * Math.cos(a - 0.45)) + ' ' + (y2 - k * Math.sin(a - 0.45)) + 'L' + (x2 - k * Math.cos(a + 0.45)) + ' ' + (y2 - k * Math.sin(a + 0.45)) + 'Z', c || '--muted', null, 0);
  }
  function svg(body, label) { return '<svg class="afig" viewBox="0 0 320 200" role="img" aria-label="' + label + '" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>'; }
  function sphere(cx, cy, r, th, ph, col) {
    var x = cx + r * Math.sin(th) * Math.sin(ph) * 0.9, y = cy - r * Math.cos(th) * 0.95 + r * Math.sin(th) * Math.cos(ph) * 0.25;
    return C(cx, cy, r, '--blue-soft', '--blue', 1.5) + '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r + '" ry="' + r * 0.3 + '"' + st(null, '--blue', 1, 'stroke-dasharray:3 3') + '/>' +
      L(cx, cy - r - 4, cx, cy + r + 4, '--muted', 1) + T(cx, cy - r - 8, '|0⟩', { s: 11 }) + T(cx, cy + r + 16, '|1⟩', { s: 11 }) +
      arrow(cx, cy, x, y, col || '--yellow', 2.5) + C(x, y, 3.5, col || '--yellow');
  }
  function gate(x, y, s, col) { return R(x - 13, y - 13, 26, 26, col || '--blue', null, 0, 5) + '<text x="' + x + '" y="' + (y + 4.5) + '" text-anchor="middle" style="fill:#fff;font:600 13px var(--font)">' + s + '</text>'; }
  function wire(y, x1, x2, lab) { return L(x1, y, x2, y, '--muted', 1.5) + (lab ? T(x1 - 6, y + 4, lab, { a: 'end', s: 11, c: '--muted' }) : ''); }
  function bars(x, y0, w, gap, vals, cols, scale) { var s = ''; vals.forEach(function (v, i) { var hh = Math.abs(v) * scale; s += R(x + i * (w + gap), v >= 0 ? y0 - hh : y0, w, Math.max(hh, 1), cols[i] || '--blue', null, 0, 2); }); return s; }

  var F = {};
  F.bitqubit = function () {
    return svg(T(80, 22, 'Classical bit', { w: 600 }) + T(240, 22, 'Qubit', { w: 600 }) +
      R(30, 50, 40, 40, '--surface-2', '--border', 1) + T(50, 76, '0', { s: 18, w: 600 }) + T(50, 110, 'or', { c: '--muted' }) + R(90, 50, 40, 40, '--yellow-soft', '--yellow', 1.5) + T(110, 76, '1', { s: 18, w: 600 }) +
      T(80, 150, 'one definite value', { s: 11, c: '--muted' }) + L(160, 40, 160, 170, '--border', 1) + sphere(240, 92, 50, 1.0, 0.8, '--yellow') +
      T(240, 175, 'α|0⟩ + β|1⟩, a point on a sphere', { s: 11, c: '--muted' }), 'A classical bit has value 0 or 1; a qubit state is a point on the Bloch sphere');
  };
  F.hilbert = function () {
    return svg(arrow(60, 160, 60, 30, '--muted', 1.5) + arrow(60, 160, 200, 160, '--muted', 1.5) + T(48, 34, '|1⟩', { a: 'end' }) + T(206, 176, '|0⟩') +
      P('M60 160 A 110 110 0 0 1 170 50', null, '--border', 1, 'stroke-dasharray:4 4') + arrow(60, 160, 150, 70, '--blue', 3) + T(160, 64, '|ψ⟩', { c: '--blue', w: 600, s: 14 }) +
      L(150, 70, 150, 160, '--green', 1.2, '3 3') + L(150, 70, 60, 70, '--yellow', 1.2, '3 3') + T(150, 176, 'α', { c: '--green', w: 600 }) + T(48, 74, 'β', { c: '--yellow-ink', w: 600, a: 'end' }) +
      T(258, 70, '|α|² + |β|² = 1', { s: 12 }) + T(258, 92, 'unit length', { s: 11, c: '--muted' }) + T(258, 130, 'n qubits →', { s: 11, c: '--muted' }) + T(258, 146, '2ⁿ amplitudes', { s: 12, w: 600 }), 'A qubit state as a unit vector with amplitudes alpha and beta');
  };
  F.bloch = function () {
    return svg(sphere(110, 100, 70, 0.9, 0.9, '--blue') + T(32, 104, '|−⟩', { s: 11, c: '--muted' }) + T(190, 104, '|+⟩', { s: 11, c: '--muted' }) +
      T(255, 50, 'θ: how much |1⟩', { s: 11 }) + T(255, 70, '(sets probabilities)', { s: 10, c: '--muted' }) + T(255, 110, 'φ: relative phase', { s: 11 }) + T(255, 130, '(causes interference)', { s: 10, c: '--muted' }) +
      T(255, 170, 'P(0) = cos²(θ/2)', { s: 11, c: '--blue', w: 600 }), 'Bloch sphere with polar angle theta and phase phi');
  };
  F.gates = function () {
    var s = '', gs = [['X', '--blue', 'bit flip'], ['Z', '--green', 'phase flip'], ['H', '--yellow', 'superposition'], ['S', '--blue', 'quarter phase'], ['T', '--green', 'eighth phase'], ['Ry', '--yellow', 'any angle']];
    gs.forEach(function (g, i) { var x = 40 + (i % 3) * 120, y = 50 + Math.floor(i / 3) * 80; s += R(x - 24, y - 22, 48, 44, g[1], null, 0, 8) + '<text x="' + x + '" y="' + (y + 6) + '" text-anchor="middle" style="fill:' + (g[1] === '--yellow' ? '#202124' : '#fff') + ';font:600 16px var(--font)">' + g[0] + '</text>' + T(x, y + 38, g[2], { s: 11, c: '--muted' }); });
    return svg(s, 'Common single-qubit gates X, Z, H, S, T and Ry');
  };
  F.circuit = function () {
    return svg(wire(60, 50, 300, 'q0') + wire(120, 50, 300, 'q1') + gate(90, 60, 'H', '--yellow') + C(150, 60, 5, '--blue') + L(150, 60, 150, 120, '--blue', 2) + C(150, 120, 11, null, '--blue', 2) + L(139, 120, 161, 120, '--blue', 2) + L(150, 109, 150, 131, '--blue', 2) +
      R(205, 47, 34, 26, '--surface-2', '--border', 1, 4) + P('M211 66 A11 11 0 0 1 233 66', null, '--text', 1.4) + L(222, 66, 230, 54, '--text', 1.4) + R(205, 107, 34, 26, '--surface-2', '--border', 1, 4) + P('M211 126 A11 11 0 0 1 233 126', null, '--text', 1.4) + L(222, 126, 230, 114, '--text', 1.4) +
      T(90, 30, 'H', { s: 11, c: '--muted' }) + T(150, 30, 'CNOT', { s: 11, c: '--muted' }) + T(222, 30, 'measure', { s: 11, c: '--muted' }) + T(160, 175, 'time flows left → right · results read q1 q0', { s: 11, c: '--muted' }), 'A circuit: H on q0, CNOT to q1, then measurement');
  };
  F.entangle = function () {
    return svg(C(80, 90, 32, '--blue-soft', '--blue', 2) + C(240, 90, 32, '--green-soft', '--green', 2) + T(80, 96, 'A', { s: 18, w: 600, c: '--blue' }) + T(240, 96, 'B', { s: 18, w: 600, c: '--green' }) +
      P('M112 90 C 150 50, 170 130, 208 90', null, '--yellow', 2.5, 'stroke-dasharray:6 4') + T(160, 40, '(|00⟩ + |11⟩)/√2', { s: 13, w: 600 }) +
      T(80, 150, 'measure A: 0 or 1', { s: 11, c: '--muted' }) + T(240, 150, 'B always agrees', { s: 11, c: '--muted' }) + T(160, 180, 'correlations, not messages: no faster-than-light signalling', { s: 10.5, c: '--muted' }), 'Two entangled qubits A and B whose outcomes always agree');
  };
  F.grover = function () {
    var N = 8, a0 = 1 / Math.sqrt(N), s = '', stages = [[a0, a0], [-a0, a0], [5 / (4 * Math.sqrt(2)) * 0.9, a0 / 2]], labs = ['start: equal', 'oracle: flip sign', 'diffuse: amplify'];
    stages.forEach(function (st2, k) {
      var x = 20 + k * 102, vals = []; for (var i = 0; i < N; i++) vals.push(i === 5 ? st2[0] : st2[1]);
      s += L(x - 4, 110, x + 92, 110, '--border', 1) + bars(x, 110, 9, 2.5, vals, vals.map(function (_, i) { return i === 5 ? '--yellow' : '--blue'; }), 95) + T(x + 44, 180, labs[k], { s: 11, c: '--muted' });
      if (k < 2) s += arrow(x + 94, 60, x + 100, 60, '--muted', 1.5);
    });
    return svg(T(160, 22, 'Amplitude amplification (N = 8, one marked item)', { s: 11.5, w: 600 }) + s, 'Grover search bars: equal amplitudes, oracle flips the marked one, diffuser amplifies it');
  };
  F.phasewheel = function () {
    var s = C(100, 100, 70, null, '--border', 1.5) + L(20, 100, 180, 100, '--border', 1) + L(100, 20, 100, 180, '--border', 1), th = Math.PI / 3;
    s += arrow(100, 100, 100 + 70 * Math.cos(th), 100 - 70 * Math.sin(th), '--blue', 3) + P('M130 100 A30 30 0 0 0 ' + (100 + 30 * Math.cos(th)) + ' ' + (100 - 30 * Math.sin(th)), null, '--yellow', 2) + T(140, 88, 'θ', { c: '--yellow-ink', w: 600 }) +
      T(190, 104, 'Re', { a: 'start', s: 11, c: '--muted' }) + T(104, 16, 'Im', { a: 'start', s: 11, c: '--muted' });
    return svg(s + T(250, 70, 'z = |z| e^{iθ}'.replace('^{iθ}', '<tspan baseline-shift="super" font-size="9">iθ</tspan>'), { s: 13 }) + T(250, 100, 'size |z|: probability', { s: 11, c: '--muted' }) + T(250, 120, 'angle θ: phase', { s: 11, c: '--muted' }), 'A complex amplitude as an arrow with size and phase angle');
  };
  F.qft = function () {
    var s = '', n = 8;
    for (var k = 0; k < n; k++) { var cx = 30 + k * 37, ang = 2 * Math.PI * 3 * k / n; s += C(cx, 80, 15, '--blue-soft', '--blue', 1) + arrow(cx, 80, cx + 13 * Math.cos(ang), 80 - 13 * Math.sin(ang), '--blue', 1.8) + T(cx, 112, '|' + k + '⟩', { s: 10, c: '--muted' }); }
    return svg(T(160, 30, 'QFT|3⟩: equal sizes, phases wind 3 turns', { s: 12, w: 600 }) + s + T(160, 150, 'phase of |k⟩ = 2π·3k/8', { s: 12, c: '--blue' }) + T(160, 175, 'information lives in the phases, not the probabilities', { s: 10.5, c: '--muted' }), 'Quantum Fourier transform output phases winding around a circle');
  };
  F.qpe = function () {
    var s = wire(40, 60, 290, 'c0') + wire(75, 60, 290, 'c1') + wire(110, 60, 290, 'c2') + wire(155, 60, 290, '|u⟩');
    [40, 75, 110].forEach(function (y, i) { s += gate(85, y, 'H', '--yellow') + C(125 + i * 40, y, 4.5, '--blue') + L(125 + i * 40, y, 125 + i * 40, 142, '--blue', 1.5) + R(108 + i * 40, 142, 34, 26, '--green', null, 0, 4) + '<text x="' + (125 + i * 40) + '" y="159" text-anchor="middle" style="fill:#fff;font:600 10px var(--font)">U' + (i ? '<tspan baseline-shift="super" font-size="7">' + (1 << i) + '</tspan>' : '') + '</text>'; });
    s += R(245, 26, 36, 98, '--blue', null, 0, 5) + '<text x="263" y="80" text-anchor="middle" style="fill:#fff;font:600 10px var(--font)">QFT†</text>';
    return svg(s + T(160, 192, 'kickback writes φ into the counting register', { s: 10.5, c: '--muted' }), 'Phase estimation circuit with controlled powers of U and an inverse QFT');
  };
  F.loop = function () {
    var s = R(20, 60, 110, 70, '--blue-soft', '--blue', 1.5, 10) + T(75, 88, 'Quantum', { w: 600, c: '--blue' }) + T(75, 106, 'prepare U(θ)|0⟩', { s: 10.5 }) + T(75, 121, 'measure ⟨H⟩', { s: 10.5 }) +
      R(190, 60, 110, 70, '--yellow-soft', '--yellow', 1.5, 10) + T(245, 88, 'Classical', { w: 600, c: '--yellow-ink' }) + T(245, 106, 'optimiser', { s: 10.5 }) + T(245, 121, 'updates θ', { s: 10.5 });
    s += P('M130 78 C 150 50, 170 50, 190 78', null, '--muted', 1.8) + arrow(184, 72, 190, 78, '--muted', 1.8) + T(160, 46, 'E(θ)', { s: 11, c: '--muted' }) + P('M190 112 C 170 140, 150 140, 130 112', null, '--muted', 1.8) + arrow(136, 118, 130, 112, '--muted', 1.8) + T(160, 154, 'new θ', { s: 11, c: '--muted' }) +
      T(160, 186, 'repeat until the energy stops falling (E(θ) ≥ E₀)', { s: 10.5, c: '--muted' });
    return svg(T(160, 22, 'Variational loop (VQE, QAOA, QML)', { s: 12, w: 600 }) + s, 'Hybrid quantum-classical variational loop');
  };
  F.featuremap = function () {
    var s = '', pts = [[40, 60, 1], [55, 90, 1], [70, 50, 1], [90, 130, 0], [60, 140, 0], [100, 110, 0], [45, 115, 0], [85, 70, 1]];
    pts.forEach(function (p) { s += C(p[0], p[1] + 10, 6, p[2] ? '--blue' : '--yellow', null, 0); });
    s += R(20, 35, 100, 130, null, '--border', 1, 6) + T(70, 182, 'data x', { s: 11, c: '--muted' }) + arrow(130, 100, 175, 100, '--muted', 2) + T(152, 90, 'φ(x)', { s: 11, w: 600 }) + sphere(240, 100, 52, 1.2, 0.5, '--blue') +
      T(240, 182, 'quantum state |φ(x)⟩', { s: 11, c: '--muted' });
    return svg(T(160, 20, 'Feature map: k(x, x′) = |⟨φ(x)|φ(x′)⟩|²', { s: 12, w: 600 }) + s, 'Classical data points mapped into quantum states by a feature map');
  };
  F.molecule = function () {
    var s = C(60, 90, 22, '--blue-soft', '--blue', 2) + C(120, 90, 22, '--blue-soft', '--blue', 2) + L(82, 90, 98, 90, '--blue', 3) + T(60, 95, 'H', { w: 600, c: '--blue' }) + T(120, 95, 'H', { w: 600, c: '--blue' }) + T(90, 135, 'H₂ molecule', { s: 11, c: '--muted' }) +
      arrow(150, 90, 190, 90, '--muted', 2) + T(170, 80, 'map', { s: 10, c: '--muted' });
    ['II', 'Z0', 'Z1', 'Z0Z1', 'X0X1'].forEach(function (p, i) { s += R(205, 30 + i * 26, 90, 20, i % 2 ? '--green-soft' : '--yellow-soft', null, 0, 4) + T(250, 44 + i * 26, p + ' term', { s: 10.5 }); });
    return svg(s + T(160, 185, 'electrons → spin orbitals → Pauli strings on qubits', { s: 10.5, c: '--muted' }), 'A hydrogen molecule mapped to a sum of Pauli strings on qubits');
  };
  F.ising = function () {
    var s = '', ups = [1, 1, 0, 1, 1, 1];
    for (var i = 0; i < 6; i++) { var x = 40 + i * 48; s += C(x, 80, 16, '--blue-soft', '--blue', 1.5) + (ups[i] ? arrow(x, 94, x, 64, '--blue', 2.5) : arrow(x - 12, 80, x + 12, 80, '--yellow', 2.5)); if (i < 5) s += L(x + 16, 80, x + 32, 80, '--green', 2, '3 2'); }
    return svg(T(160, 30, 'Transverse-field Ising chain', { s: 12, w: 600 }) + s + T(160, 130, '−J Σ ZᵢZᵢ₊₁ : neighbours want to align', { s: 11, c: '--green' }) + T(160, 152, '−h Σ Xᵢ : the field tips spins sideways', { s: 11, c: '--yellow-ink' }) + T(160, 180, 'order (h < J) gives way to disorder (h > J)', { s: 10.5, c: '--muted' }), 'A chain of spins with Ising couplings and a transverse field');
  };
  F.decoherence = function () {
    var p1 = 'M30 40', p2 = 'M30 40', s = '';
    for (var k = 0; k <= 60; k++) { var t = k / 60, x = 30 + t * 260; p1 += ' L' + x.toFixed(1) + ' ' + (160 - 120 * Math.exp(-t * 2)).toFixed(1); p2 += ' L' + x.toFixed(1) + ' ' + (160 - 120 * Math.exp(-t * 3.5) * (0.5 + 0.5 * Math.cos(t * 30))).toFixed(1); }
    s = L(30, 160, 295, 160, '--border', 1) + L(30, 30, 30, 160, '--border', 1) + P(p2, null, '--green', 1.6) + P(p1, null, '--blue', 2.5) +
      T(250, 60, 'T1: energy decay', { s: 11, c: '--blue' }) + T(250, 78, 'T2: lost phase (Ramsey)', { s: 11, c: '--green' }) + T(160, 182, 'time →', { s: 11, c: '--muted' });
    return svg(T(160, 20, 'Decoherence: T₂ ≤ 2T₁', { s: 12, w: 600 }) + s, 'Energy relaxation T1 and dephasing T2 decay curves');
  };
  F.hardware = function () {
    var rows = [['Superconducting', '--blue', 'fast gates, ~100 µs coherence'], ['Trapped ions', '--green', 'high fidelity, all-to-all'], ['Neutral atoms', '--yellow', 'large arrays, movable'], ['Photons', '--blue', 'room temperature, networking'], ['Spins in silicon', '--green', 'tiny, chip-compatible']], s = '';
    rows.forEach(function (r, i) { var y = 30 + i * 34; s += C(28, y + 8, 9, r[1]) + T(46, y + 6, r[0], { a: 'start', w: 600, s: 12 }) + T(46, y + 21, r[2], { a: 'start', s: 10.5, c: '--muted' }); });
    return svg(s, 'Five qubit hardware platforms and their strengths');
  };
  F.scaling = function () {
    var s = L(40, 165, 300, 165, '--border', 1) + L(40, 20, 40, 165, '--border', 1), p = 'M40 163', q = 'M40 163';
    for (var n = 0; n <= 30; n++) { var x = 40 + n * 8.6; p += ' L' + x.toFixed(1) + ' ' + Math.max(20, 165 - Math.pow(2, n / 2.2) * 0.9).toFixed(1); q += ' L' + x.toFixed(1) + ' ' + (165 - n * 2).toFixed(1); }
    s += P(p, null, '--yellow', 2.5) + P(q, null, '--blue', 2.5) + T(205, 40, 'exact simulation: 2ⁿ memory', { s: 10.5, c: '--yellow-ink' }) + T(220, 125, 'qubits: grow with n', { s: 10.5, c: '--blue' }) + T(170, 185, 'qubits n →', { s: 11, c: '--muted' }) + T(32, 30, 'cost', { s: 10, c: '--muted', a: 'end' });
    return svg(s + R(42, 140, 70, 18, '--green-soft', null, 0, 3) + T(77, 153, 'your laptop', { s: 10, c: '--green' }), 'Classical simulation cost grows exponentially with qubits');
  };
  F.capstone = function () {
    var steps = [['Question', '--blue'], ['Method', '--green'], ['Baseline', '--yellow'], ['Results', '--blue'], ['Limits', '--green']], s = '';
    steps.forEach(function (st2, i) { var x = 18 + i * 60; s += R(x, 70, 50, 50, st2[1], null, 0, 25) + '<text x="' + (x + 25) + '" y="100" text-anchor="middle" style="fill:' + (st2[1] === '--yellow' ? '#202124' : '#fff') + ';font:600 13px var(--font)">' + (i + 1) + '</text>' + T(x + 25, 140, st2[0], { s: 11 }); if (i < 4) s += arrow(x + 51, 95, x + 59, 95, '--muted', 1.5); });
    return svg(T(160, 36, 'A reproducible research workflow', { s: 12, w: 600 }) + s + T(160, 178, 'versions · seeds · tests · honest claims', { s: 10.5, c: '--muted' }), 'Capstone workflow from question to limitations');
  };
  F.journey = function () {
    var s = '', ph = QG.academy ? QG.academy.phases : [];
    ph.forEach(function (p, i) { var x = 32 + i * 64; s += C(x, 90, 22, p.col, null, 0) + '<text x="' + x + '" y="96" text-anchor="middle" style="fill:' + (p.col === '--yellow' ? '#202124' : '#fff') + ';font:600 15px var(--font)">' + p.icon + '</text>' + T(x, 132, p.title, { s: 10.5, w: 600 }) + T(x, 148, 'W' + p.weeks[0] + (p.weeks.length > 1 ? '–' + p.weeks[p.weeks.length - 1] : ''), { s: 10, c: '--muted' }); if (i < ph.length - 1) s += L(x + 22, 90, x + 42, 90, '--border', 2); });
    return svg(s, 'The five phases of the 12-week journey');
  };
  QG.academyFig = function (name) { return F[name] ? F[name]() : ''; };
  QG.academyFigNames = Object.keys(F);
})();
