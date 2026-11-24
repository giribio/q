/* Hamiltonians as weighted sums of Pauli strings.
 *   H = [{c: -1.05, p: 'II'}, {c: 0.39, p: 'IZ'}, ...]   (label: leftmost char = highest qubit, Qiskit order)
 *   QG.pauli.expect(H, sv)       exact expectation value
 *   QG.pauli.estimate(H, sv, shots, rnd)   estimate from simulated measurements (shot noise)
 *   QG.pauli.matrix(H)           dense matrix {re, im} (arrays of rows)
 *   QG.pauli.exact(H)            {values, vectors}: exact diagonalisation (n <= 6) */
QG.module('pauli', function (QG) {
  function nOf(H) { return H[0].p.length; }
  function parse(label) {
    var n = label.length, xm = 0, zm = 0, ny = 0;
    for (var k = 0; k < n; k++) {
      var ch = label[n - 1 - k];
      if ('IXYZ'.indexOf(ch) < 0) throw new Error('Bad Pauli label: ' + label);
      if (ch === 'X' || ch === 'Y') xm |= 1 << k;
      if (ch === 'Z' || ch === 'Y') zm |= 1 << k;
      if (ch === 'Y') ny++;
    }
    return { xm: xm, zm: zm, ny: ny };
  }
  function expect(H, s) { var e = 0; for (var i = 0; i < H.length; i++) e += H[i].c * s.expectPauli(H[i].p); return e; }

  /* Estimate <P> by rotating into the Pauli's eigenbasis and sampling. */
  function estimateTerm(label, sv, shots, rnd) {
    if (/^I+$/.test(label)) return 1;
    var s = sv.clone(), n = label.length, support = 0;
    for (var k = 0; k < n; k++) {
      var ch = label[n - 1 - k];
      if (ch === 'I') continue;
      support |= 1 << k;
      if (ch === 'X') s.apply1(k, QG.gates.matrix1('h'));
      if (ch === 'Y') { s.apply1(k, QG.gates.matrix1('sdg')); s.apply1(k, QG.gates.matrix1('h')); }
    }
    var counts = s.sample(shots, rnd), tot = 0;
    Object.keys(counts).forEach(function (i) { tot += (QG.popcount(+i & support) & 1 ? -1 : 1) * counts[i]; });
    return tot / shots;
  }
  function estimate(H, sv, shots, rnd) {
    var e = 0; rnd = rnd || QG.rng();
    for (var i = 0; i < H.length; i++) e += H[i].c * estimateTerm(H[i].p, sv, shots, rnd);
    return e;
  }

  function matrix(H) {
    var n = nOf(H), N = 1 << n, re = [], im = [];
    for (var i = 0; i < N; i++) { re.push(new Float64Array(N)); im.push(new Float64Array(N)); }
    H.forEach(function (t) {
      var q = parse(t.p);
      for (var k = 0; k < N; k++) {
        // P|k> = i^ny (-1)^{popcount(k & zm)} |k ^ xm>
        var sign = QG.popcount(k & q.zm) & 1 ? -1 : 1, r = 0, m = 0;
        switch (q.ny & 3) { case 0: r = sign; break; case 1: m = sign; break; case 2: r = -sign; break; default: m = -sign; }
        re[k ^ q.xm][k] += t.c * r; im[k ^ q.xm][k] += t.c * m;
      }
    });
    return { re: re, im: im, n: n };
  }
  function exact(H) {
    var n = nOf(H); if (n > 6) throw new Error('Exact diagonalisation is limited to 6 qubits here');
    var M = matrix(H), allReal = M.im.every(function (r) { return r.every(function (v) { return Math.abs(v) < 1e-14; }); });
    if (allReal) {
      var E = QG.eigen.symmetric(M.re);
      return { values: E.values, vectors: E.vectors.map(function (v) { return { re: Array.from(v), im: new Array(v.length).fill(0) }; }) };
    }
    return QG.eigen.hermitian(M.re, M.im);
  }
  /* Is the Hamiltonian diagonal (only I and Z)? Then its energies are a simple vector. */
  function diagonal(H) {
    var n = nOf(H), N = 1 << n, d = new Float64Array(N);
    H.forEach(function (t) { var q = parse(t.p); if (q.xm) throw new Error('not diagonal'); for (var k = 0; k < N; k++) d[k] += t.c * (QG.popcount(k & q.zm) & 1 ? -1 : 1); });
    return d;
  }
  function toString(H) { return H.map(function (t, i) { return (t.c < 0 ? ' − ' : i ? ' + ' : '') + Math.abs(+t.c.toPrecision(6)) + '·' + t.p; }).join(''); }
  function toQiskit(H) { return 'from qiskit.quantum_info import SparsePauliOp\nH = SparsePauliOp.from_list([' + H.map(function (t) { return '("' + t.p + '", ' + t.c + ')'; }).join(', ') + '])\n'; }

  /* ---------- model Hamiltonians ---------- */
  function lab(n, ops) { var a = []; for (var i = 0; i < n; i++) a.push('I'); Object.keys(ops).forEach(function (q) { a[n - 1 - q] = ops[q]; }); return a.join(''); }
  var models = {
    /* Transverse-field Ising chain: H = -J sum Z_i Z_{i+1} - h sum X_i (open boundary) */
    tfim: function (n, J, hx) {
      var H = [];
      for (var i = 0; i < n - 1; i++) { var o = {}; o[i] = 'Z'; o[i + 1] = 'Z'; H.push({ c: -J, p: lab(n, o) }); }
      for (i = 0; i < n; i++) { var x = {}; x[i] = 'X'; H.push({ c: -hx, p: lab(n, x) }); }
      return H;
    },
    /* Heisenberg chain: H = J sum (XX + YY + ZZ) */
    heisenberg: function (n, J) {
      var H = [];
      for (var i = 0; i < n - 1; i++) ['X', 'Y', 'Z'].forEach(function (P) { var o = {}; o[i] = P; o[i + 1] = P; H.push({ c: J, p: lab(n, o) }); });
      return H;
    },
    /* H2 in STO-3G at 0.735 Å, 2-qubit parity-reduced form (published coefficients; electronic energy only:
     * add the nuclear repulsion 1/R = 0.71997 Ha for the total). Track 6 computes these from scratch. */
    h2: function () { return [{ c: -1.052373245772859, p: 'II' }, { c: 0.39793742484318045, p: 'IZ' }, { c: -0.39793742484318045, p: 'ZI' }, { c: -0.01128010425623538, p: 'ZZ' }, { c: 0.18093119978423156, p: 'XX' }]; },
    label: lab
  };

  QG.pauli = { parse: parse, expect: expect, estimate: estimate, estimateTerm: estimateTerm, matrix: matrix, exact: exact, diagonal: diagonal, toString: toString, toQiskit: toQiskit, models: models };
});
