/* State-vector simulator. Amplitudes are kept in two Float64Arrays (real, imaginary).
 * Gates are applied in place with bit-index loops (no 2^n x 2^n matrices). */
QG.module('statevector', function (QG) {
  // Small seeded random number generator (mulberry32) so results can be reproduced and graded.
  QG.rng = function (seed) {
    var a = (seed === undefined || seed === null) ? (Math.random() * 4294967296) >>> 0 : (seed >>> 0);
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  function StateVector(n, re, im) {
    if (n > 30) throw new Error('Too many qubits for a state vector: ' + n);
    this.n = n; this.N = 1 << n;
    this.re = re || new Float64Array(this.N);
    this.im = im || new Float64Array(this.N);
    if (!re) this.re[0] = 1;
  }
  var P = StateVector.prototype;

  P.clone = function () { return new StateVector(this.n, Float64Array.from(this.re), Float64Array.from(this.im)); };

  /* Apply a 1-qubit matrix m to target t, only where all bits in cmask are 1. */
  P.apply1 = function (t, m, cmask) {
    var N = this.N, re = this.re, im = this.im, st = 1 << t; cmask = cmask || 0;
    var ar = m[0], ai = m[1], br = m[2], bi = m[3], cr = m[4], ci = m[5], dr = m[6], di = m[7];
    for (var base = 0; base < N; base += st << 1) {
      for (var off = 0; off < st; off++) {
        var i = base + off;
        if ((i & cmask) !== cmask) continue;
        var j = i | st;
        var xr = re[i], xi = im[i], yr = re[j], yi = im[j];
        re[i] = ar * xr - ai * xi + br * yr - bi * yi;
        im[i] = ar * xi + ai * xr + br * yi + bi * yr;
        re[j] = cr * xr - ci * xi + dr * yr - di * yi;
        im[j] = cr * xi + ci * xr + dr * yi + di * yr;
      }
    }
  };

  /* Apply a 4x4 matrix to qubits (q0 = low basis bit, q1 = high basis bit). */
  P.apply2 = function (q0, q1, m, cmask) {
    var N = this.N, re = this.re, im = this.im, b0 = 1 << q0, b1 = 1 << q1; cmask = cmask || 0;
    var idx = [0, 0, 0, 0], vr = [0, 0, 0, 0], vi = [0, 0, 0, 0];
    for (var i = 0; i < N; i++) {
      if ((i & b0) || (i & b1)) continue;
      if ((i & cmask) !== cmask) continue;
      idx[0] = i; idx[1] = i | b0; idx[2] = i | b1; idx[3] = i | b0 | b1;
      for (var k = 0; k < 4; k++) { vr[k] = re[idx[k]]; vi[k] = im[idx[k]]; }
      for (var r = 0; r < 4; r++) {
        var sr = 0, si = 0;
        for (var c = 0; c < 4; c++) {
          var o = (r * 4 + c) * 2, mr = m[o], mi = m[o + 1];
          if (mr === 0 && mi === 0) continue;
          sr += mr * vr[c] - mi * vi[c]; si += mr * vi[c] + mi * vr[c];
        }
        re[idx[r]] = sr; im[idx[r]] = si;
      }
    }
  };

  /* Multiply every amplitude by exp(i*phase[k]) (diagonal unitary on the listed qubits). */
  P.applyDiagonalPhases = function (qubits, phases) {
    var N = this.N, re = this.re, im = this.im, nq = qubits.length;
    for (var i = 0; i < N; i++) {
      var k = 0;
      for (var b = 0; b < nq; b++) if (i & (1 << qubits[b])) k |= (1 << b);
      var ph = phases[k], c = Math.cos(ph), s = Math.sin(ph), xr = re[i], xi = im[i];
      re[i] = c * xr - s * xi; im[i] = c * xi + s * xr;
    }
  };

  /* Apply a circuit operation {g, q, p}. Measurement/reset/barrier handled by the runner. */
  P.applyOp = function (op) {
    var g = op.g;
    if (g === 'barrier') return;
    if (g === 'diagonal') { this.applyDiagonalPhases(op.q, op.phases); return; }
    var d = QG.gates.defs[g];
    if (!d) throw new Error('Unknown gate: ' + g);
    var q = op.q, nc = d.nc === -1 ? q.length - 1 : d.nc, cmask = 0;
    for (var c = 0; c < nc; c++) cmask |= 1 << q[c];
    if (d.nt === 2) this.apply2(q[nc], q[nc + 1], QG.gates.matrix2(d.base2, op.p), cmask);
    else this.apply1(q[nc], QG.gates.matrix1(d.base, op.p), cmask);
  };

  P.probabilities = function () {
    var p = new Float64Array(this.N);
    for (var i = 0; i < this.N; i++) p[i] = this.re[i] * this.re[i] + this.im[i] * this.im[i];
    return p;
  };
  P.norm = function () { var s = 0; for (var i = 0; i < this.N; i++) s += this.re[i] * this.re[i] + this.im[i] * this.im[i]; return s; };

  /* Probability that qubit q reads 1. */
  P.probOne = function (q) {
    var st = 1 << q, s = 0;
    for (var i = 0; i < this.N; i++) if (i & st) s += this.re[i] * this.re[i] + this.im[i] * this.im[i];
    return s;
  };

  /* Measure one qubit, collapse the state, return 0 or 1. */
  P.measure = function (q, rnd) {
    var p1 = this.probOne(q), out = rnd() < p1 ? 1 : 0, st = 1 << q;
    var keep = out ? p1 : 1 - p1, f = keep > 0 ? 1 / Math.sqrt(keep) : 0;
    for (var i = 0; i < this.N; i++) {
      if (((i & st) ? 1 : 0) === out) { this.re[i] *= f; this.im[i] *= f; }
      else { this.re[i] = 0; this.im[i] = 0; }
    }
    return out;
  };
  P.reset = function (q, rnd) { if (this.measure(q, rnd) === 1) this.apply1(q, QG.gates.matrix1('x')); };

  /* Draw `shots` samples of the full register. Returns counts keyed by basis index. */
  P.sample = function (shots, rnd) {
    var p = this.probabilities(), N = this.N, cdf = new Float64Array(N), acc = 0, counts = {};
    for (var i = 0; i < N; i++) { acc += p[i]; cdf[i] = acc; }
    for (var s = 0; s < shots; s++) {
      var r = rnd() * acc, lo = 0, hi = N - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid; }
      counts[lo] = (counts[lo] || 0) + 1;
    }
    return counts;
  };

  /* Bloch vector of one qubit from its reduced density matrix. Length < 1 means it is entangled. */
  P.bloch = function (q) {
    var st = 1 << q, r00 = 0, r11 = 0, xr = 0, xi = 0, re = this.re, im = this.im;
    for (var i = 0; i < this.N; i++) {
      if (i & st) continue;
      var j = i | st;
      r00 += re[i] * re[i] + im[i] * im[i];
      r11 += re[j] * re[j] + im[j] * im[j];
      // rho01 = sum a_i * conj(a_j)
      xr += re[i] * re[j] + im[i] * im[j];
      xi += im[i] * re[j] - re[i] * im[j];
    }
    return { x: 2 * xr, y: -2 * xi, z: r00 - r11 };
  };

  /* |<this|other>|^2 */
  P.fidelity = function (o) {
    var sr = 0, si = 0;
    for (var i = 0; i < this.N; i++) { sr += this.re[i] * o.re[i] + this.im[i] * o.im[i]; si += this.re[i] * o.im[i] - this.im[i] * o.re[i]; }
    return sr * sr + si * si;
  };

  /* Expectation value of a Pauli string like "ZZI" (leftmost char = highest qubit, Qiskit order). */
  P.expectPauli = function (label) {
    var n = this.n, xm = 0, zm = 0, ny = 0;
    if (label.length !== n) throw new Error('Pauli label length must equal qubit count');
    for (var k = 0; k < n; k++) {
      var ch = label[n - 1 - k];
      if (ch === 'X' || ch === 'Y') xm |= 1 << k;
      if (ch === 'Z' || ch === 'Y') zm |= 1 << k;
      if (ch === 'Y') ny++;
    }
    // P|i> = i^ny * (-1)^{popcount(i & zm)} |i ^ xm>   (Y = iXZ)
    var re = this.re, im = this.im, sr = 0, si = 0;
    for (var i = 0; i < this.N; i++) {
      var j = i ^ xm, sign = popcount(i & zm) & 1 ? -1 : 1;
      // <j| P |i> contribution: conj(a_j) * phase * a_i
      var ar = re[i] * sign, ai = im[i] * sign, pr, pi;
      switch (ny & 3) { case 0: pr = ar; pi = ai; break; case 1: pr = -ai; pi = ar; break; case 2: pr = -ar; pi = -ai; break; default: pr = ai; pi = -ar; }
      sr += re[j] * pr + im[j] * pi; si += re[j] * pi - im[j] * pr;
    }
    return sr;
  };
  function popcount(x) { var c = 0; while (x) { x &= x - 1; c++; } return c; }
  QG.popcount = popcount;

  QG.StateVector = StateVector;
  QG.bitstring = function (i, n) { var s = ''; for (var k = n - 1; k >= 0; k--) s += (i >> k) & 1; return s; };
});
