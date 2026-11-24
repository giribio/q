/* Pauli-sum algebra and fermion-to-qubit mappings (Jordan–Wigner and parity).
 * A PauliSum is a plain object {label: [re, im]}; labels are Qiskit-ordered (leftmost = highest qubit). */
QG.module('fermion', function (QG) {
  // single-qubit Pauli products: P*Q = phase * R
  var MUL = {
    II: [1, 0, 'I'], IX: [1, 0, 'X'], IY: [1, 0, 'Y'], IZ: [1, 0, 'Z'],
    XI: [1, 0, 'X'], XX: [1, 0, 'I'], XY: [0, 1, 'Z'], XZ: [0, -1, 'Y'],
    YI: [1, 0, 'Y'], YX: [0, -1, 'Z'], YY: [1, 0, 'I'], YZ: [0, 1, 'X'],
    ZI: [1, 0, 'Z'], ZX: [0, 1, 'Y'], ZY: [0, -1, 'X'], ZZ: [1, 0, 'I']
  };
  function mulStrings(a, b) {
    var re = 1, im = 0, out = '';
    for (var k = 0; k < a.length; k++) {
      var m = MUL[a[k] + b[k]], nr = re * m[0] - im * m[1], ni = re * m[1] + im * m[0];
      re = nr; im = ni; out += m[2];
    }
    return { re: re, im: im, p: out };
  }
  var PS = {
    zero: function () { return {}; },
    term: function (label, re, im) { var o = {}; o[label] = [re, im || 0]; return o; },
    add: function (A, B, sr, si) { // A += (sr + i si) B
      sr = sr === undefined ? 1 : sr; si = si || 0;
      Object.keys(B).forEach(function (k) {
        var b = B[k], cur = A[k] || (A[k] = [0, 0]);
        cur[0] += sr * b[0] - si * b[1]; cur[1] += sr * b[1] + si * b[0];
      });
      return A;
    },
    mul: function (A, B) {
      var C = {};
      Object.keys(A).forEach(function (ka) {
        var a = A[ka];
        Object.keys(B).forEach(function (kb) {
          var b = B[kb], m = mulStrings(ka, kb);
          var cr = a[0] * b[0] - a[1] * b[1], ci = a[0] * b[1] + a[1] * b[0];
          var rr = cr * m.re - ci * m.im, ri = cr * m.im + ci * m.re, cur = C[m.p] || (C[m.p] = [0, 0]);
          cur[0] += rr; cur[1] += ri;
        });
      });
      return C;
    },
    simplify: function (A, tol) {
      tol = tol || 1e-10; var o = {};
      Object.keys(A).forEach(function (k) { if (Math.abs(A[k][0]) > tol || Math.abs(A[k][1]) > tol) o[k] = A[k]; });
      return o;
    },
    /* Convert to the real-coefficient list used by QG.pauli ([{c, p}]), checking Hermiticity. */
    toList: function (A, tol) {
      tol = tol || 1e-9; var out = [];
      Object.keys(A).sort().forEach(function (k) {
        if (Math.abs(A[k][1]) > tol) throw new Error('Non-Hermitian term ' + k + ' (imaginary ' + A[k][1] + ')');
        if (Math.abs(A[k][0]) > tol) out.push({ c: A[k][0], p: k });
      });
      return out;
    }
  };

  function lab(N, ops) { var a = []; for (var i = 0; i < N; i++) a.push('I'); Object.keys(ops).forEach(function (q) { a[N - 1 - q] = ops[q]; }); return a.join(''); }

  /* Creation (dagger = true) or annihilation operator on spin-orbital j of N, as a PauliSum. */
  function jw(j, N, dagger) {
    var x = {}, y = {}; x[j] = 'X'; y[j] = 'Y';
    for (var k = 0; k < j; k++) { x[k] = 'Z'; y[k] = 'Z'; }
    var o = {}; o[lab(N, x)] = [0.5, 0]; o[lab(N, y)] = [0, dagger ? -0.5 : 0.5];
    return o;
  }
  function parity(j, N, dagger) {
    // a_j^dagger = 1/2 X_{N-1..j+1} (X_j Z_{j-1} - i Y_j)   (Seeley, Richard & Love 2012)
    var a = {}, b = {};
    for (var k = j + 1; k < N; k++) { a[k] = 'X'; b[k] = 'X'; }
    a[j] = 'X'; if (j > 0) a[j - 1] = 'Z';
    b[j] = 'Y';
    var o = {}; o[lab(N, a)] = [0.5, 0]; o[lab(N, b)] = [0, dagger ? -0.5 : 0.5];
    return o;
  }
  var MAPS = { jw: jw, parity: parity };

  /* Map a spin-orbital Hamiltonian  H = E0 + sum h_ij a+_i a_j + 1/2 sum g_ijkl a+_i a+_j a_l a_k
   * (g = physicist <ij|kl>) to a PauliSum. h: N x N, g: function(i,j,k,l) or 4D array. */
  function mapHamiltonian(h, g, N, mapping, e0) {
    var f = MAPS[mapping]; if (!f) throw new Error('Unknown mapping ' + mapping);
    var cr = [], an = [], i, j, k, l, H = PS.term(lab(N, {}), e0 || 0);
    for (i = 0; i < N; i++) { cr.push(f(i, N, true)); an.push(f(i, N, false)); }
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) if (Math.abs(h[i][j]) > 1e-12) PS.add(H, PS.mul(cr[i], an[j]), h[i][j]);
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) {
      if (i === j) continue;
      var cc = PS.mul(cr[i], cr[j]);
      for (k = 0; k < N; k++) for (l = 0; l < N; l++) {
        if (k === l) continue;
        var v = typeof g === 'function' ? g(i, j, k, l) : g[i][j][k][l];
        if (Math.abs(v) < 1e-12) continue;
        PS.add(H, PS.mul(cc, PS.mul(an[l], an[k])), 0.5 * v);
      }
    }
    return PS.simplify(H);
  }

  /* Parity "two-qubit reduction" (block spin ordering: alpha orbitals first). Qubit N/2-1 holds the parity of
   * the alpha electrons and qubit N-1 the total parity; both are fixed by the electron counts and removed. */
  function twoQubitReduce(Hps, N, nAlpha, nBeta) {
    var qa = N / 2 - 1, qt = N - 1, za = nAlpha % 2 ? -1 : 1, zt = (nAlpha + nBeta) % 2 ? -1 : 1, out = {};
    Object.keys(Hps).forEach(function (label) {
      var ca = label[N - 1 - qa], ct = label[N - 1 - qt], s = 1;
      if (ca === 'X' || ca === 'Y' || ct === 'X' || ct === 'Y') throw new Error('Term ' + label + ' does not commute with the parity symmetries');
      if (ca === 'Z') s *= za; if (ct === 'Z') s *= zt;
      var nl = ''; for (var p = 0; p < N; p++) { var q = N - 1 - p; if (q !== qa && q !== qt) nl += label[p]; }
      var cur = out[nl] || (out[nl] = [0, 0]); cur[0] += s * Hps[label][0]; cur[1] += s * Hps[label][1];
    });
    return PS.simplify(out);
  }

  /* Lowest eigenvalue of a qubit Hamiltonian restricted to basis states with a given number of 1s (electrons). */
  function sectorGround(H, nElec) {
    var M = QG.pauli.matrix(H), N = M.re.length, idx = [];
    for (var s = 0; s < N; s++) if (QG.popcount(s) === nElec) idx.push(s);
    var re = idx.map(function (a) { return idx.map(function (b) { return M.re[a][b]; }); }), im = idx.map(function (a) { return idx.map(function (b) { return M.im[a][b]; }); });
    var E = QG.eigen.hermitian(re, im);
    return { energy: E.values[0], values: E.values, basis: idx, vector: E.vectors[0] };
  }

  QG.fermion = { PS: PS, jw: jw, parity: parity, mapHamiltonian: mapHamiltonian, twoQubitReduce: twoQubitReduce, sectorGround: sectorGround, label: lab };
});
