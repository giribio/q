/* Minimal ab-initio quantum chemistry for two-centre, two-electron molecules (H2, HeH+) in the STO-3G basis.
 * Follows Szabo & Ostlund, "Modern Quantum Chemistry", ch. 3 and appendix A: closed-form integrals over
 * s-type Gaussians, restricted Hartree–Fock, MO transformation, then mapping to qubits.
 * Units: bohr and hartree internally; QG.chem.ANGSTROM converts. */
QG.module('chem', function (QG) {
  var PI = Math.PI, ANG = 1 / 0.52917721092; // bohr per angstrom
  // STO-3G contraction of a 1s Slater function with exponent zeta = 1 (scale exponents by zeta^2)
  var STO3G = { a: [2.227660584, 0.4057711562, 0.1098175104], d: [0.1543289673, 0.5353281423, 0.4446345422] };
  var ATOMS = { H: { Z: 1, zeta: 1.24 }, He: { Z: 2, zeta: 2.0925 } };

  /* High-accuracy erf: Taylor series for |x| < 3, complement asymptotics beyond. */
  function erf(x) {
    var ax = Math.abs(x), s;
    if (ax < 3) {
      var term = ax, sum = ax, n = 0, x2 = ax * ax;
      do { n++; term *= -x2 / n; var add = term / (2 * n + 1); sum += add; } while (Math.abs(add) > 1e-17 * Math.abs(sum) && n < 200);
      s = 2 / Math.sqrt(PI) * sum;
    } else { // erfc continued fraction (Lentz)
      var f = ax, C = ax, D = 0, tiny = 1e-300;
      for (var k = 1; k < 200; k++) {
        var an = k / 2; D = ax + an * D; D = Math.abs(D) < tiny ? tiny : D; C = ax + an / C; C = Math.abs(C) < tiny ? tiny : C; D = 1 / D; var del = C * D; f *= del; if (Math.abs(del - 1) < 1e-16) break;
      }
      s = 1 - Math.exp(-ax * ax) / Math.sqrt(PI) / f;
    }
    return x < 0 ? -s : s;
  }
  function F0(t) { return t < 1e-12 ? 1 - t / 3 : 0.5 * Math.sqrt(PI / t) * erf(Math.sqrt(t)); }
  function d2(A, B) { return (A[0] - B[0]) * (A[0] - B[0]) + (A[1] - B[1]) * (A[1] - B[1]) + (A[2] - B[2]) * (A[2] - B[2]); }

  /* Basis: list of contracted s functions {center:[x,y,z], a:[...], c:[...] (coefficients incl. normalisation)} */
  function sto3g(sym, center, zetaOverride) {
    var z = zetaOverride || ATOMS[sym].zeta;
    var a = STO3G.a.map(function (x) { return x * z * z; });
    return { center: center, a: a, c: a.map(function (x, i) { return STO3G.d[i] * Math.pow(2 * x / PI, 0.75); }), atom: sym };
  }

  function integrals(basis, nuclei) {
    var K = basis.length, S = [], T = [], V = [], i, j;
    for (i = 0; i < K; i++) { S.push(new Float64Array(K)); T.push(new Float64Array(K)); V.push(new Float64Array(K)); }
    for (i = 0; i < K; i++) for (j = 0; j < K; j++) {
      var A = basis[i], B = basis[j], AB = d2(A.center, B.center), s = 0, t = 0, v = 0;
      for (var p = 0; p < 3; p++) for (var q = 0; q < 3; q++) {
        var a = A.a[p], b = B.a[q], g = a + b, cc = A.c[p] * B.c[q], K0 = Math.exp(-a * b / g * AB), ov = Math.pow(PI / g, 1.5) * K0;
        s += cc * ov;
        t += cc * a * b / g * (3 - 2 * a * b / g * AB) * ov;
        var P = [0, 1, 2].map(function (k) { return (a * A.center[k] + b * B.center[k]) / g; });
        nuclei.forEach(function (nu) { v += cc * (-2 * PI / g) * nu.Z * K0 * F0(g * d2(P, nu.center)); });
      }
      S[i][j] = s; T[i][j] = t; V[i][j] = v;
    }
    var eri = {}; // (ij|kl) chemist notation, stored for all index combinations
    function key(i, j, k, l) { return ((i * K + j) * K + k) * K + l; }
    for (i = 0; i < K; i++) for (j = 0; j < K; j++) for (var k = 0; k < K; k++) for (var l = 0; l < K; l++) {
      var Ai = basis[i], Bj = basis[j], Ck = basis[k], Dl = basis[l], sum = 0;
      for (var p1 = 0; p1 < 3; p1++) for (var p2 = 0; p2 < 3; p2++) for (var p3 = 0; p3 < 3; p3++) for (var p4 = 0; p4 < 3; p4++) {
        var a1 = Ai.a[p1], a2 = Bj.a[p2], a3 = Ck.a[p3], a4 = Dl.a[p4], g1 = a1 + a2, g2 = a3 + a4;
        var P1 = [0, 1, 2].map(function (m) { return (a1 * Ai.center[m] + a2 * Bj.center[m]) / g1; }), Q1 = [0, 1, 2].map(function (m) { return (a3 * Ck.center[m] + a4 * Dl.center[m]) / g2; });
        sum += Ai.c[p1] * Bj.c[p2] * Ck.c[p3] * Dl.c[p4] * 2 * Math.pow(PI, 2.5) / (g1 * g2 * Math.sqrt(g1 + g2)) *
          Math.exp(-a1 * a2 / g1 * d2(Ai.center, Bj.center) - a3 * a4 / g2 * d2(Ck.center, Dl.center)) * F0(g1 * g2 / (g1 + g2) * d2(P1, Q1));
      }
      eri[key(i, j, k, l)] = sum;
    }
    var Enuc = 0;
    for (i = 0; i < nuclei.length; i++) for (j = i + 1; j < nuclei.length; j++) Enuc += nuclei[i].Z * nuclei[j].Z / Math.sqrt(d2(nuclei[i].center, nuclei[j].center));
    var Hc = S.map(function (r, a) { return r.map(function (_, b) { return T[a][b] + V[a][b]; }); });
    return { K: K, S: S, T: T, V: V, H: Hc, eri: function (i, j, k, l) { return eri[key(i, j, k, l)]; }, Enuc: Enuc };
  }

  function matMul(A, B) { var n = A.length, m = B[0].length, k = B.length, C = []; for (var i = 0; i < n; i++) { var r = new Float64Array(m); for (var j = 0; j < m; j++) { var s = 0; for (var t = 0; t < k; t++) s += A[i][t] * B[t][j]; r[j] = s; } C.push(r); } return C; }
  function transpose(A) { var n = A.length, m = A[0].length, T = []; for (var j = 0; j < m; j++) { var r = new Float64Array(n); for (var i = 0; i < n; i++) r[i] = A[i][j]; T.push(r); } return T; }

  /* Restricted Hartree–Fock (closed shell). Returns orbitals, energies and the iteration history. */
  function rhf(I, nElec, o) {
    o = o || {};
    var K = I.K, occ = nElec / 2, Es = I.eri, ES = QG.eigen.symmetric(I.S);
    // symmetric orthogonalisation X = S^-1/2
    var X = []; for (var i = 0; i < K; i++) { X.push(new Float64Array(K)); for (var j = 0; j < K; j++) { var s = 0; for (var k = 0; k < K; k++) s += ES.vectors[k][i] * ES.vectors[k][j] / Math.sqrt(ES.values[k]); X[i][j] = s; } }
    var P = []; for (i = 0; i < K; i++) P.push(new Float64Array(K));
    var hist = [], C = null, eps = null, E = 0, F = null;
    for (var it = 0; it < (o.maxIter || 100); it++) {
      F = I.H.map(function (r, a) { return r.map(function (h, b) { var g = 0; for (var c = 0; c < K; c++) for (var d = 0; d < K; d++) g += P[c][d] * (Es(a, b, d, c) - 0.5 * Es(a, c, d, b)); return h + g; }); });
      var Eel = 0; for (i = 0; i < K; i++) for (j = 0; j < K; j++) Eel += 0.5 * P[j][i] * (I.H[i][j] + F[i][j]);
      var Fp = matMul(transpose(X), matMul(F, X)), EF = QG.eigen.symmetric(Fp);
      eps = EF.values; var Cp = []; for (i = 0; i < K; i++) { Cp.push(new Float64Array(K)); for (j = 0; j < K; j++) Cp[i][j] = EF.vectors[j][i]; }
      C = matMul(X, Cp);
      var Pn = [], dP = 0;
      for (i = 0; i < K; i++) { Pn.push(new Float64Array(K)); for (j = 0; j < K; j++) { var v = 0; for (var a2 = 0; a2 < occ; a2++) v += 2 * C[i][a2] * C[j][a2]; Pn[i][j] = v; dP += (v - P[i][j]) * (v - P[i][j]); } }
      if (it > 0) hist.push({ iter: it, energy: Eel + I.Enuc, electronic: Eel, dP: Math.sqrt(dP / (K * K)) });
      P = Pn; E = Eel;
      if (it > 0 && Math.sqrt(dP / (K * K)) < (o.tol || 1e-11)) break;
    }
    // final energy with converged density
    F = I.H.map(function (r, a) { return r.map(function (h, b) { var g = 0; for (var c = 0; c < K; c++) for (var d = 0; d < K; d++) g += P[c][d] * (Es(a, b, d, c) - 0.5 * Es(a, c, d, b)); return h + g; }); });
    E = 0; for (i = 0; i < K; i++) for (j = 0; j < K; j++) E += 0.5 * P[j][i] * (I.H[i][j] + F[i][j]);
    // fix MO sign convention: largest coefficient positive
    for (j = 0; j < K; j++) { var mx = 0; for (i = 0; i < K; i++) if (Math.abs(C[i][j]) > Math.abs(mx)) mx = C[i][j]; if (mx < 0) for (i = 0; i < K; i++) C[i][j] = -C[i][j]; }
    return { C: C, eps: eps, P: P, electronic: E, energy: E + I.Enuc, history: hist };
  }

  /* MO integrals: h_pq and (pq|rs) */
  function moIntegrals(I, C) {
    var K = I.K, h = [], p, q, r, s;
    for (p = 0; p < K; p++) { h.push(new Float64Array(K)); for (q = 0; q < K; q++) { var v = 0; for (var a = 0; a < K; a++) for (var b = 0; b < K; b++) v += C[a][p] * C[b][q] * I.H[a][b]; h[p][q] = v; } }
    var g = {};
    for (p = 0; p < K; p++) for (q = 0; q < K; q++) for (r = 0; r < K; r++) for (s = 0; s < K; s++) {
      var t = 0;
      for (var a1 = 0; a1 < K; a1++) for (var b1 = 0; b1 < K; b1++) for (var c1 = 0; c1 < K; c1++) for (var d1 = 0; d1 < K; d1++) t += C[a1][p] * C[b1][q] * C[c1][r] * C[d1][s] * I.eri(a1, b1, c1, d1);
      g[((p * K + q) * K + r) * K + s] = t;
    }
    return { h: h, g: function (p, q, r, s) { return g[((p * K + q) * K + r) * K + s]; }, K: K };
  }

  /* Spin-orbital integrals, block ordering (alpha 0..K-1, beta K..2K-1). Physicist <ij|kl> = (ik|jl) * spin deltas. */
  function spinOrbitals(mo) {
    var K = mo.K, N = 2 * K, h = [];
    for (var i = 0; i < N; i++) { h.push(new Float64Array(N)); for (var j = 0; j < N; j++) h[i][j] = (i < K) === (j < K) ? mo.h[i % K][j % K] : 0; }
    var g = function (i, j, k, l) {
      if ((i < K) !== (k < K) || (j < K) !== (l < K)) return 0;
      return mo.g(i % K, k % K, j % K, l % K);
    };
    return { N: N, h: h, g: g };
  }

  var molecules = {
    H2: { label: 'H₂', atoms: ['H', 'H'], charge: 0, electrons: 2, eqAngstrom: 0.735 },
    HeH: { label: 'HeH⁺', atoms: ['He', 'H'], charge: 1, electrons: 2, eqAngstrom: 0.774 }
  };

  /* Full pipeline at bond length R (angstrom). */
  function molecule(name, Rang, o) {
    o = o || {};
    var M = molecules[name], R = Rang * ANG, centers = [[0, 0, 0], [0, 0, R]];
    var basis = M.atoms.map(function (s, i) { return sto3g(s, centers[i], o.zeta && o.zeta[s]); });
    var nuclei = M.atoms.map(function (s, i) { return { Z: ATOMS[s].Z, center: centers[i], atom: s }; });
    var I = integrals(basis, nuclei), hf = rhf(I, M.electrons), mo = moIntegrals(I, hf.C), so = spinOrbitals(mo);
    var out = { name: name, label: M.label, R: Rang, Rbohr: R, basis: basis, nuclei: nuclei, ints: I, hf: hf, mo: mo, so: so, Enuc: I.Enuc };
    // qubit Hamiltonians (electronic only; add Enuc for total energies)
    out.jw = QG.fermion.PS.toList(QG.fermion.mapHamiltonian(so.h, so.g, so.N, 'jw'));
    var par = QG.fermion.mapHamiltonian(so.h, so.g, so.N, 'parity');
    out.parity4 = QG.fermion.PS.toList(par);
    out.parity2 = QG.fermion.PS.toList(QG.fermion.twoQubitReduce(par, so.N, M.electrons / 2, M.electrons / 2));
    var fci = QG.fermion.sectorGround(out.jw, M.electrons);
    out.fci = { electronic: fci.energy, energy: fci.energy + I.Enuc };
    // 1-qubit model in the {|HF>, |doubly excited>} basis (exact for H2 by symmetry; an approximation otherwise)
    var H11 = 2 * mo.h[0][0] + mo.g(0, 0, 0, 0), H22 = 2 * mo.h[1][1] + mo.g(1, 1, 1, 1), H12 = mo.g(0, 1, 0, 1);
    out.oneQubit = [{ c: (H11 + H22) / 2, p: 'I' }, { c: (H11 - H22) / 2, p: 'Z' }, { c: H12, p: 'X' }];
    out.correlation = out.fci.energy - hf.energy;
    return out;
  }

  /* Particle-conserving 1-parameter ansatz for the 4-qubit (JW, block ordering) form:
   * cos(t)|0101> + sin(t)|1010>  (HF = orbitals 0alpha, 0beta occupied = qubits 0 and 2). */
  function doubleExcitationAnsatz() {
    return { nParams: 1, n: 4, build: function (t) { var c = new QG.Circuit(4); c.x(0).ry(-2 * t[0], 0).cx(0, 2).x(1).cx(0, 1).x(3).cx(0, 3); return c; } };
  }

  /* Closed-shell one-centre atom with one basis function (He): exact energy = 2 h + (11|11). */
  function atom(sym, zeta) {
    var b = [sto3g(sym, [0, 0, 0], zeta)], I = integrals(b, [{ Z: ATOMS[sym].Z, center: [0, 0, 0] }]);
    return 2 * I.H[0][0] + I.eri(0, 0, 0, 0);
  }

  QG.chem = { ANGSTROM: ANG, atom: atom, ATOMS: ATOMS, STO3G: STO3G, erf: erf, F0: F0, sto3g: sto3g, integrals: integrals, rhf: rhf, moIntegrals: moIntegrals, spinOrbitals: spinOrbitals, molecules: molecules, molecule: molecule, doubleExcitationAnsatz: doubleExcitationAnsatz };
});
