/* Molecule Lab: H2 and HeH+ from STO-3G integrals -> Hartree–Fock -> qubit Hamiltonian -> VQE -> energy curves. */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h, S = ui.svg, C = QG.chem;
  var CHEM_ACC = 0.0016;
  var cache = {};
  function mol(name, R) { var k = name + ':' + R.toFixed(3); if (!cache[k]) { cache[k] = C.molecule(name, R); var keys = Object.keys(cache); if (keys.length > 400) delete cache[keys[0]]; } return cache[k]; }
  function f6(x) { return (+x).toFixed(6); }
  function css(v) { return QG.charts.cssVar(v); }

  function drawMolecule(m) {
    var W = 320, H = 110, scale = Math.min(70, 230 / Math.max(m.R, 0.3)), x0 = W / 2 - m.R * scale / 2, x1 = W / 2 + m.R * scale / 2;
    var col = { H: css('--blue'), He: css('--yellow') }, rad = { H: 18, He: 24 };
    var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'max-width:' + W + 'px', role: 'img', 'aria-label': m.label + ' with bond length ' + m.R.toFixed(2) + ' angstrom' });
    svg.appendChild(S('line', { x1: x0, x2: x1, y1: 50, y2: 50, stroke: css('--muted'), 'stroke-width': 4, 'stroke-dasharray': m.R > 1.6 ? '5 5' : null }));
    [[x0, m.nuclei[0].atom], [x1, m.nuclei[1].atom]].forEach(function (a) {
      svg.appendChild(S('circle', { cx: a[0], cy: 50, r: rad[a[1]], fill: col[a[1]], opacity: 0.9 }));
      svg.appendChild(S('text', { x: a[0], y: 55, 'text-anchor': 'middle', style: 'font:600 13px var(--font);fill:#202124', text: a[1] }));
    });
    svg.appendChild(S('text', { x: W / 2, y: 96, 'text-anchor': 'middle', style: 'font:12px var(--font);fill:var(--muted)', text: 'R = ' + m.R.toFixed(2) + ' Å = ' + m.Rbohr.toFixed(3) + ' bohr' }));
    return svg;
  }

  function orbitalPlot(m) {
    var zs = [], lo = -2.2, hi = m.Rbohr + 2.2, a0 = [], a1 = [], s1 = [], s2 = [];
    for (var k = 0; k <= 160; k++) {
      var z = lo + (hi - lo) * k / 160; zs.push(z);
      var phi = m.basis.map(function (b) { var v = 0; for (var i = 0; i < 3; i++) v += b.c[i] * Math.exp(-b.a[i] * Math.pow(z - b.center[2], 2)); return v; });
      a0.push(phi[0]); a1.push(phi[1]);
      s1.push(m.hf.C[0][0] * phi[0] + m.hf.C[1][0] * phi[1]); s2.push(m.hf.C[0][1] * phi[0] + m.hf.C[1][1] * phi[1]);
    }
    return QG.charts.line([
      { name: 'occupied MO σ₁ (bonding)', x: zs, y: s1 },
      { name: 'empty MO σ₂ (antibonding)', x: zs, y: s2 },
      { name: '1s on atom A', x: zs, y: a0, dashed: true, color: css('--muted') },
      { name: '1s on atom B', x: zs, y: a1, dashed: true, color: css('--border') }], { height: 240, xLabel: 'position along the bond (bohr); nuclei at 0 and ' + m.Rbohr.toFixed(2), yLabel: 'ψ(z)' });
  }

  function termTable(H, extra) {
    var t = h('table', { class: 'amp-table' }, h('tr', null, h('th', null, 'Pauli string'), h('th', null, 'coefficient (Ha)')));
    H.slice().sort(function (a, b) { return Math.abs(b.c) - Math.abs(a.c); }).forEach(function (x) { t.appendChild(h('tr', null, h('td', { class: 'mono' }, x.p), h('td', { class: 'mono' }, (x.c >= 0 ? '+' : '') + x.c.toFixed(6)))); });
    if (extra) t.appendChild(extra);
    return t;
  }

  function lab(el, opt) {
    opt = opt || {};
    var st = { name: opt.molecule || 'H2', R: opt.R || 0.735, tab: opt.tab || 'orbitals', form: '2', withNuc: false, optim: 'nelder-mead', shots: 0, curve: null };
    var top = h('div', { class: opt.compact ? '' : 'card' }), body = h('div', { class: opt.compact ? '' : 'card', style: { marginTop: '14px' } });
    el.appendChild(top); el.appendChild(body);
    var molBox = h('div'), stats = h('div'), tabs = h('div', { class: 'tabs', role: 'tablist' }), panel = h('div', { role: 'tabpanel' });
    var ms = h('select', { 'aria-label': 'Molecule' }, Object.keys(C.molecules).map(function (k) { return h('option', { value: k, selected: k === st.name ? 'selected' : null }, C.molecules[k].label); }));
    var rs = h('input', { type: 'range', min: 0.3, max: 3.5, step: 0.005, value: st.R, 'aria-label': 'Bond length in angstrom' }), ro = h('output');
    ms.addEventListener('change', function () { st.name = ms.value; st.R = C.molecules[st.name].eqAngstrom; rs.value = st.R; st.curve = null; update(true); });
    rs.addEventListener('input', ui.debounce(function () { st.R = +rs.value; update(false); }, 15));
    if (!opt.fixedMolecule) top.appendChild(h('div', { class: 'btn-row' }, h('label', { class: 'inline' }, 'Molecule ', ms), h('button', { class: 'btn small', onclick: function () { st.R = C.molecules[st.name].eqAngstrom; rs.value = st.R; update(false); } }, 'Equilibrium bond length')));
    top.appendChild(h('div', { class: 'ctrl-row', style: { gridTemplateColumns: '110px 1fr 70px' } }, h('span', null, 'Bond length'), rs, ro));
    top.appendChild(h('div', { style: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' } }, molBox, stats));
    var TABS = opt.tabs || [['orbitals', 'Orbitals & Hartree–Fock'], ['ints', 'Integrals'], ['ham', 'Qubit Hamiltonian'], ['vqe', 'VQE'], ['curve', 'Energy curve']];
    if (TABS.length > 1) body.appendChild(tabs);
    body.appendChild(panel);

    function update(full) {
      var m = mol(st.name, st.R); ro.textContent = st.R.toFixed(3) + ' Å';
      molBox.innerHTML = ''; molBox.appendChild(drawMolecule(m));
      stats.innerHTML = '';
      stats.appendChild(h('dl', { class: 'kv' },
        h('dt', null, 'Hartree–Fock energy'), h('dd', null, f6(m.hf.energy) + ' Ha'),
        h('dt', null, 'Exact (FCI) energy'), h('dd', null, f6(m.fci.energy) + ' Ha'),
        h('dt', null, 'Correlation energy'), h('dd', null, (m.correlation * 1000).toFixed(2) + ' mHa'),
        h('dt', null, 'Nuclear repulsion'), h('dd', null, f6(m.Enuc) + ' Ha')));
      tabs.innerHTML = '';
      TABS.forEach(function (t) { tabs.appendChild(h('button', { class: st.tab === t[0] ? 'on' : '', role: 'tab', 'aria-selected': st.tab === t[0] ? 'true' : 'false', onclick: function () { st.tab = t[0]; update(false); } }, t[1])); });
      if (st.tab === 'curve' && !full && panel.dataset.tab === 'curve') { markCurve(); return; }
      panel.innerHTML = ''; panel.dataset.tab = st.tab;
      ({ orbitals: tabOrbitals, ints: tabInts, ham: tabHam, vqe: tabVqe, curve: tabCurve })[st.tab](m);
    }

    function tabOrbitals(m) {
      panel.appendChild(h('p', { class: 'small', html: QG.math.process('Each atom contributes one 1s orbital (a fixed sum of 3 Gaussians: STO-3G). Hartree–Fock combines them into molecular orbitals $\\sigma = c_A\\,1s_A + c_B\\,1s_B$; both electrons occupy the lowest one.') }));
      panel.appendChild(orbitalPlot(m));
      var t = h('table', { class: 'amp-table', style: { maxWidth: '520px' } }, h('tr', null, h('th', null, 'MO'), h('th', null, 'energy ε (Ha)'), h('th', null, 'c on ' + m.nuclei[0].atom), h('th', null, 'c on ' + m.nuclei[1].atom), h('th', null, 'electrons')));
      [0, 1].forEach(function (k) { t.appendChild(h('tr', null, h('td', null, 'σ' + (k + 1)), h('td', { class: 'mono' }, m.hf.eps[k].toFixed(4)), h('td', { class: 'mono' }, m.hf.C[0][k].toFixed(4)), h('td', { class: 'mono' }, m.hf.C[1][k].toFixed(4)), h('td', null, k === 0 ? '2 (↑↓)' : '0'))); });
      panel.appendChild(t);
      panel.appendChild(h('p', { class: 'panel-title', style: { marginTop: '14px' } }, 'Self-consistent field iterations'));
      var hs = m.hf.history;
      panel.appendChild(QG.charts.line([{ name: 'Hartree–Fock energy', x: hs.map(function (x) { return x.iter; }), y: hs.map(function (x) { return x.energy; }), points: true }], { height: 180, xLabel: 'iteration', yLabel: 'energy (Ha)' }));
      panel.appendChild(h('p', { class: 'small muted' }, m.name === 'H2' ? 'For H₂ symmetry fixes the orbitals, so SCF converges at once. Try HeH⁺: the orbitals must be found iteratively.' : 'Each iteration builds the Fock matrix from the current electron density, diagonalises it, and refills the orbitals: converged in ' + hs.length + ' iterations.'));
    }

    function tabInts(m) {
      var I = m.ints, A = m.nuclei[0].atom, B = m.nuclei[1].atom;
      function mat2(M, title) { return h('div', null, h('p', { class: 'panel-title' }, title), h('table', { class: 'amp-table', style: { maxWidth: '300px' } }, h('tr', null, h('th'), h('th', null, A), h('th', null, B)), [0, 1].map(function (i) { return h('tr', null, h('th', null, i ? B : A), h('td', { class: 'mono' }, I_(M, i, 0)), h('td', { class: 'mono' }, I_(M, i, 1))); }))); }
      function I_(M, i, j) { return M[i][j].toFixed(5); }
      panel.appendChild(h('p', { class: 'small', html: QG.math.process('All the physics of the molecule enters through these numbers, computed in closed form for Gaussian functions (Szabo & Ostlund, appendix A).') }));
      panel.appendChild(h('div', { class: 'grid cols-2' }, mat2(I.S, 'Overlap S'), mat2(I.T, 'Kinetic energy T'), mat2(I.V, 'Nuclear attraction V'), mat2(I.H, 'Core Hamiltonian T + V')));
      var t = h('table', { class: 'amp-table', style: { maxWidth: '420px' } }, h('tr', null, h('th', null, 'Two-electron integral (chemist notation)'), h('th', null, 'value (Ha)')));
      [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 1, 1], [0, 1, 0, 1], [0, 0, 0, 1], [0, 1, 1, 1]].forEach(function (q) { var n = [A, B]; t.appendChild(h('tr', null, h('td', { class: 'mono' }, '(' + n[q[0]] + n[q[1]] + '|' + n[q[2]] + n[q[3]] + ')'), h('td', { class: 'mono' }, I.eri(q[0], q[1], q[2], q[3]).toFixed(5)))); });
      panel.appendChild(h('p', { class: 'panel-title', style: { marginTop: '12px' } }, 'Electron–electron repulsion'));
      panel.appendChild(t);
      panel.appendChild(h('p', { class: 'small' }, 'Nuclear repulsion Z_A Z_B / R = ' + f6(m.Enuc) + ' Ha. It is a constant for fixed nuclei, so it is added after the electronic problem is solved.'));
    }

    function forms(m) { return { '1': { H: m.oneQubit, label: '1 qubit (CI in |HF⟩, |doubly excited⟩)' }, '2': { H: m.parity2, label: '2 qubits (parity mapping + symmetry reduction)' }, '4': { H: m.jw, label: '4 qubits (Jordan–Wigner)' } }; }
    function tabHam(m) {
      var F = forms(m), fsel = h('select', { 'aria-label': 'Qubit encoding' }, Object.keys(F).map(function (k) { return h('option', { value: k, selected: k === st.form ? 'selected' : null }, F[k].label); }));
      var nuc = h('input', { type: 'checkbox', checked: st.withNuc ? 'checked' : null, 'aria-label': 'Include nuclear repulsion' });
      fsel.addEventListener('change', function () { st.form = fsel.value; update(false); }); nuc.addEventListener('change', function () { st.withNuc = nuc.checked; update(false); });
      panel.appendChild(h('div', { class: 'btn-row' }, fsel, h('label', { class: 'inline' }, nuc, 'Add nuclear repulsion to the identity term')));
      var Hq = F[st.form].H.map(function (t) { return { c: t.c + (st.withNuc && /^I+$/.test(t.p) ? m.Enuc : 0), p: t.p }; });
      var E0 = QG.pauli.exact(Hq).values[0], n = Hq[0].p.length;
      if (st.form === '4') E0 = QG.fermion.sectorGround(Hq, 2).energy;
      panel.appendChild(h('div', { style: { display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'flex-start' } }, termTable(Hq),
        h('div', { style: { flex: 1, minWidth: '220px' }, class: 'small', html: QG.math.process(
          '<p><b>' + Hq.length + ' Pauli terms on ' + n + ' qubit' + (n > 1 ? 's' : '') + '.</b> Lowest eigenvalue' + (st.form === '4' ? ' (2-electron sector)' : '') + ': <b>' + f6(E0) + ' Ha</b> ' + (st.withNuc ? '(total energy).' : '(electronic only; add $E_{nuc}$ = ' + f6(m.Enuc) + ' for the total ' + f6(E0 + m.Enuc) + ').') + '</p>' +
          { '1': '<p>For H₂, symmetry allows only two configurations to mix: both electrons in σ₁, or both in σ₂. One qubit holds that choice. ' + (m.name === 'HeH' ? '<b>For HeH⁺ this is only an approximation</b>, because the singly excited singlet can also mix in.' : 'Exact for H₂.') + '</p>',
            '2': '<p>Spin orbitals are mapped with the parity encoding, then two qubits are removed because they only store the (known) numbers of spin-up and spin-down electrons.</p>',
            '4': '<p>One qubit per spin orbital: $\\sigma_1\\!\\uparrow, \\sigma_2\\!\\uparrow, \\sigma_1\\!\\downarrow, \\sigma_2\\!\\downarrow$ (qubits 0–3). Hartree–Fock is $\\ket{0101}$. Each electron operator becomes a string of Z gates ending in X or Y (Jordan–Wigner).</p>' }[st.form]) })));
      panel.appendChild(h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onclick: function () { ui.codeModal('Qiskit SparsePauliOp', '# ' + m.label + ' STO-3G, R = ' + m.R + ' angstrom, ' + F[st.form].label + '\n' + QG.pauli.toQiskit(Hq) + 'import numpy as np\nprint("lowest eigenvalue:", min(np.linalg.eigvalsh(H.to_matrix())))\n', 'hamiltonian.py'); } }, 'Export to Qiskit')));
    }

    function tabVqe(m) {
      var F = forms(m), fsel = h('select', { 'aria-label': 'Encoding' }, Object.keys(F).map(function (k) { return h('option', { value: k, selected: k === st.form ? 'selected' : null }, F[k].label); }));
      var os = h('select', { 'aria-label': 'Optimiser' }, [['nelder-mead', 'Nelder–Mead'], ['spsa', 'SPSA'], ['adam', 'Adam (parameter shift)']].map(function (o) { return h('option', { value: o[0], selected: o[0] === st.optim ? 'selected' : null }, o[1]); }));
      var sh = h('select', { 'aria-label': 'Shots' }, [[0, 'exact energies'], [1000, '1,000 shots/term'], [20000, '20,000 shots/term']].map(function (o) { return h('option', { value: o[0], selected: o[0] === st.shots ? 'selected' : null }, o[1]); }));
      fsel.addEventListener('change', function () { st.form = fsel.value; }); os.addEventListener('change', function () { st.optim = os.value; }); sh.addEventListener('change', function () { st.shots = +sh.value; });
      var out = h('div');
      panel.appendChild(h('div', { class: 'btn-row' }, fsel, os, sh, h('button', { class: 'btn primary', onclick: run }, '▶ Run VQE')));
      panel.appendChild(h('p', { class: 'small muted', html: 'Ansatz: 1 qubit → R<sub>y</sub>(θ); 2 qubits → hardware-efficient R<sub>y</sub> layers with a CNOT (4 angles); 4 qubits → one-parameter, particle-conserving double excitation from |0101⟩ to |1010⟩ (chemistry-inspired).' }));
      panel.appendChild(out);
      function run() {
        var Hq = F[st.form].H, A, n = Hq[0].p.length;
        if (st.form === '4') A = C.doubleExcitationAnsatz();
        else if (st.form === '1') A = { nParams: 1, build: function (t) { var c = new QG.Circuit(1); c.ry(t[0], 0); return c; } };
        else A = QG.variational.ansatz('ry', 2, 1);
        var r = QG.vqe({ H: Hq, ansatz: A, optimizer: st.optim, maxIter: st.optim === 'nelder-mead' ? 300 : 200, shots: st.shots, lr: 0.1, seed: 3 });
        var E0 = m.fci.electronic, en = m.Enuc;
        out.innerHTML = '';
        var xs = r.history.map(function (s) { return s.nfev; }), ys = r.history.map(function (s) { return s.fx + en; });
        out.appendChild(QG.charts.line([{ name: 'VQE energy (total)', x: xs, y: ys }, { name: 'exact (FCI)', x: [xs[0], xs[xs.length - 1]], y: [E0 + en, E0 + en], dashed: true, color: css('--muted') }], { height: 220, xLabel: 'energy evaluations', yLabel: 'energy (Ha)', band: { y0: E0 + en - CHEM_ACC, y1: E0 + en + CHEM_ACC } }));
        var err = r.energy - E0, okc = Math.abs(err) < CHEM_ACC;
        out.appendChild(h('dl', { class: 'kv' },
          h('dt', null, 'VQE total energy'), h('dd', null, f6(r.energy + en) + ' Ha'),
          h('dt', null, 'FCI total energy'), h('dd', null, f6(E0 + en) + ' Ha'),
          h('dt', null, 'Error'), h('dd', { html: (err * 1000).toFixed(3) + ' mHa ' + (okc ? '<span class="ok-text">within chemical accuracy (green band)</span>' : '<span class="warn-text">outside chemical accuracy</span>') }),
          h('dt', null, 'Hartree–Fock error'), h('dd', null, ((m.hf.energy - m.fci.energy) * 1000).toFixed(3) + ' mHa'),
          h('dt', null, 'Circuit runs'), h('dd', null, r.nfev + ' energy evaluations × ' + Hq.length + ' terms' + (st.shots ? ' × ' + st.shots.toLocaleString() + ' shots' : ''))));
        out.appendChild(QG.circuitView(A.build(r.x), { compact: true }));
        out.appendChild(h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onclick: function () { ui.codeModal('Qiskit: VQE circuit + Hamiltonian', QG.pauli.toQiskit(Hq) + 'from qiskit.primitives import StatevectorEstimator\n' + QG.toQiskit(A.build(r.x)).split('\n').filter(function (l) { return !/print|Statevector\(|quantum_info import Statevector$/.test(l); }).join('\n') + '\nE = StatevectorEstimator().run([(qc, H)]).result()[0].data.evs\nprint("electronic energy:", E, " total:", E + ' + en.toFixed(8) + ')\n', 'vqe_' + m.name.toLowerCase() + '.py'); } }, 'Export to Qiskit')));
      }
    }

    var curveChart = null;
    function tabCurve(m) {
      var vq = h('input', { type: 'checkbox', 'aria-label': 'Also run VQE at each bond length' }), out = h('div');
      panel.appendChild(h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: scan }, st.curve ? 'Recompute curve' : '▶ Compute energy curve'), h('label', { class: 'inline' }, vq, 'also run VQE (2 qubits) at each point')));
      panel.appendChild(out);
      curveChart = out;
      if (st.curve) drawCurve(); else out.appendChild(h('p', { class: 'small muted' }, 'Computes Hartree–Fock and exact energies for 70 bond lengths from 0.3 to 3.5 Å (about a second).'));
      function scan() {
        var Rs = [], hf = [], fci = [], v = [], x0 = null;
        for (var k = 0; k < 70; k++) {
          var R = 0.3 + 3.2 * k / 69, mm = mol(st.name, +R.toFixed(3)); Rs.push(R); hf.push(mm.hf.energy); fci.push(mm.fci.energy);
          if (vq.checked) { var r = QG.vqe({ H: mm.parity2, ansatz: QG.variational.ansatz('ry', 2, 1), optimizer: 'nelder-mead', maxIter: 300, x0: x0 }); x0 = r.x; v.push(r.energy + mm.Enuc); }
        }
        st.curve = { name: st.name, R: Rs, hf: hf, fci: fci, vqe: v.length ? v : null };
        drawCurve();
      }
    }
    function drawCurve() {
      var c = st.curve, out = curveChart; out.innerHTML = '';
      var series = [{ name: 'Hartree–Fock', x: c.R, y: c.hf }, { name: 'exact (FCI)', x: c.R, y: c.fci }];
      if (c.vqe) series.push({ name: 'VQE (2 qubits)', x: c.R, y: c.vqe, pointsOnly: true, color: css('--yellow') });
      var m = mol(st.name, st.R); series.push({ name: 'current R', x: [st.R], y: [m.fci.energy], pointsOnly: true, color: css('--text') });
      out.appendChild(QG.charts.line(series, { height: 280, xLabel: 'bond length R (Å)', yLabel: 'total energy (Ha)', ymax: Math.min(Math.max.apply(null, c.fci) + 0.4, 0.5) }));
      var imin = 0; c.fci.forEach(function (e, i) { if (e < c.fci[imin]) imin = i; });
      var ihf = 0; c.hf.forEach(function (e, i) { if (e < c.hf[ihf]) ihf = i; });
      var corr = c.R.map(function (_, i) { return (c.fci[i] - c.hf[i]) * 1000; });
      out.appendChild(QG.charts.line([{ name: 'correlation energy E(FCI) − E(HF)', x: c.R, y: corr }].concat(c.vqe ? [{ name: 'VQE error (mHa)', x: c.R, y: c.vqe.map(function (e, i) { return (e - c.fci[i]) * 1000; }), pointsOnly: true, color: css('--yellow') }] : []), { height: 180, xLabel: 'bond length R (Å)', yLabel: 'mHa' }));
      out.appendChild(h('p', { class: 'small', html: 'Minimum (exact): R ≈ <b>' + c.R[imin].toFixed(2) + ' Å</b>, E = <b>' + f6(c.fci[imin]) + ' Ha</b> (Hartree–Fock minimum at ' + c.R[ihf].toFixed(2) + ' Å). ' + (c.name === 'H2' ? 'Stretch the bond: Hartree–Fock keeps both electrons paired in one orbital and its energy rises far too high, while the exact curve levels off at two hydrogen atoms (2 × −0.4666 Ha). That missing energy is <b>static correlation</b>, exactly what quantum computers are expected to handle well.' : 'At large R, HeH⁺ separates into a He atom and a bare proton: both electrons stay on helium.') }));
    }
    function markCurve() { if (st.curve && st.curve.name === st.name) drawCurve(); }

    update(true);
  }

  QG.labs.molecule = function (el) {
    el.appendChild(h('div', { class: 'lab-head' }, h('h1', null, 'Molecule Lab'), h('span', { class: 'muted small' }, 'H₂ and HeH⁺ from first principles · STO-3G integrals computed live · Hartree–Fock · qubit Hamiltonians · VQE')));
    lab(el, {});
    el.appendChild(h('div', { class: 'callout reality', style: { marginTop: '16px' } }, h('strong', null, 'Toy model vs reality'), 'STO-3G is the smallest possible basis set, so these energies are far from experiment (the real H₂ bond energy is 4.75 eV; exact STO-3G gives about 5.55 eV). Real calculations use much larger basis sets, which need many more qubits. The value here is that every step, from integrals to qubits, is visible and checkable.'));
  };
  QG.widgets.molecule = function (el, o) { lab(el, Object.assign({ compact: false }, o)); };
  QG.moleculeCache = mol;
})();
