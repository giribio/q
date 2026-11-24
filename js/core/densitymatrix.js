/* Density-matrix simulator with noise channels (up to 10 qubits: 4^10 complex entries = 16 MB).
 * rho is stored flat: entry (i, j) at index (i << n) | j, i.e. as a 2n-qubit "state vector" whose
 * high n bits are the row and low n bits the column. Then  rho -> U rho U^dagger  is
 * "apply U on the row bits, conj(U) on the column bits", re-using the state-vector kernels. */
QG.module('densitymatrix', function (QG) {
  var MAXQ = 10;
  function conj1(m) { return Float64Array.of(m[0], -m[1], m[2], -m[3], m[4], -m[5], m[6], -m[7]); }
  function conjN(m) { var c = Float64Array.from(m); for (var i = 1; i < c.length; i += 2) c[i] = -c[i]; return c; }

  function DensityMatrix(n, re, im) {
    if (n > MAXQ) throw new Error('Density-matrix mode supports up to ' + MAXQ + ' qubits (this circuit has ' + n + ').');
    this.n = n; this.N = 1 << n;
    var M = this.N * this.N;
    this.re = re || new Float64Array(M); this.im = im || new Float64Array(M);
    if (!re) this.re[0] = 1;
  }
  var P = DensityMatrix.prototype;
  DensityMatrix.fromStateVector = function (sv) {
    var d = new DensityMatrix(sv.n, new Float64Array(sv.N * sv.N), new Float64Array(sv.N * sv.N)), N = sv.N;
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
      // rho_ij = a_i conj(a_j)
      d.re[i * N + j] = sv.re[i] * sv.re[j] + sv.im[i] * sv.im[j];
      d.im[i * N + j] = sv.im[i] * sv.re[j] - sv.re[i] * sv.im[j];
    }
    return d;
  };
  P.clone = function () { return new DensityMatrix(this.n, Float64Array.from(this.re), Float64Array.from(this.im)); };
  P._view = function () { return new QG.StateVector(2 * this.n, this.re, this.im); };

  /* Unitary gate (same op format as circuits). */
  P.applyOp = function (op) {
    var g = op.g, n = this.n, v = this._view();
    if (g === 'barrier') return;
    if (g === 'measure') { this.dephase(op.q[0]); return; }
    if (g === 'reset') { this.applyKraus1(op.q[0], [Float64Array.of(1, 0, 0, 0, 0, 0, 0, 0), Float64Array.of(0, 0, 1, 0, 0, 0, 0, 0)]); return; }
    if (g === 'diagonal') {
      v.applyDiagonalPhases(op.q.map(function (q) { return q + n; }), op.phases);
      v.applyDiagonalPhases(op.q, op.phases.map(function (x) { return -x; }));
      return;
    }
    var d = QG.gates.defs[g];
    if (!d) throw new Error('Unknown gate: ' + g);
    var q = op.q, nc = d.nc === -1 ? q.length - 1 : d.nc, cmask = 0;
    for (var c = 0; c < nc; c++) cmask |= 1 << q[c];
    if (d.nt === 2) {
      var M = QG.gates.matrix2(d.base2, op.p);
      v.apply2(q[nc] + n, q[nc + 1] + n, M, cmask << n);
      v.apply2(q[nc], q[nc + 1], conjN(M), cmask);
    } else {
      var m = QG.gates.matrix1(d.base, op.p);
      v.apply1(q[nc] + n, m, cmask << n);
      v.apply1(q[nc], conj1(m), cmask);
    }
  };

  /* rho -> sum_k K rho K^dagger for single-qubit Kraus operators (Float64Array(8) each). */
  P.applyKraus1 = function (q, Ks) {
    var n = this.n, accR = new Float64Array(this.re.length), accI = new Float64Array(this.im.length);
    for (var k = 0; k < Ks.length; k++) {
      var t = this.clone(), v = t._view();
      v.apply1(q + n, Ks[k], 0); v.apply1(q, conj1(Ks[k]), 0);
      for (var i = 0; i < accR.length; i++) { accR[i] += t.re[i]; accI[i] += t.im[i]; }
    }
    this.re = accR; this.im = accI;
  };
  /* Pauli channel on a list of qubits: terms = [{p: weight, ops: ['x','z',...] one per qubit}] */
  P.applyPauliChannel = function (qubits, terms) {
    var n = this.n, accR = new Float64Array(this.re.length), accI = new Float64Array(this.im.length);
    for (var k = 0; k < terms.length; k++) {
      var tm = terms[k]; if (tm.p === 0) continue;
      var t = this.clone(), v = t._view();
      for (var a = 0; a < qubits.length; a++) {
        if (tm.ops[a] === 'id') continue;
        var m = QG.gates.matrix1(tm.ops[a]);
        v.apply1(qubits[a] + n, m, 0); v.apply1(qubits[a], conj1(m), 0);
      }
      for (var i = 0; i < accR.length; i++) { accR[i] += tm.p * t.re[i]; accI[i] += tm.p * t.im[i]; }
    }
    this.re = accR; this.im = accI;
  };
  /* Non-selective measurement of qubit q: remove coherences between its 0 and 1 parts. */
  P.dephase = function (q) {
    var N = this.N, st = 1 << q;
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) if ((i & st) !== (j & st)) { this.re[i * N + j] = 0; this.im[i * N + j] = 0; }
  };

  /* ---------- noise channels ---------- */
  var PAULI = ['id', 'x', 'y', 'z'];
  QG.channels = {
    /* Qiskit convention: E(rho) = (1 - lam) rho + lam * I / 2^k   (k = number of qubits) */
    depolarizing: function (dm, qubits, lam) {
      if (!(lam > 0)) return;
      var k = qubits.length, terms = [], total = Math.pow(4, k);
      for (var idx = 0; idx < total; idx++) {
        var ops = []; for (var a = 0; a < k; a++) ops.push(PAULI[(idx >> (2 * a)) & 3]);
        terms.push({ p: idx === 0 ? 1 - lam + lam / total : lam / total, ops: ops });
      }
      dm.applyPauliChannel(qubits, terms);
    },
    bitFlip: function (dm, q, p) { if (p > 0) dm.applyPauliChannel([q], [{ p: 1 - p, ops: ['id'] }, { p: p, ops: ['x'] }]); },
    phaseFlip: function (dm, q, p) { if (p > 0) dm.applyPauliChannel([q], [{ p: 1 - p, ops: ['id'] }, { p: p, ops: ['z'] }]); },
    amplitudeDamping: function (dm, q, g) {
      if (!(g > 0)) return;
      dm.applyKraus1(q, [Float64Array.of(1, 0, 0, 0, 0, 0, Math.sqrt(1 - g), 0), Float64Array.of(0, 0, Math.sqrt(g), 0, 0, 0, 0, 0)]);
    },
    phaseDamping: function (dm, q, l) {
      if (!(l > 0)) return;
      dm.applyKraus1(q, [Float64Array.of(1, 0, 0, 0, 0, 0, Math.sqrt(1 - l), 0), Float64Array.of(0, 0, 0, 0, 0, 0, Math.sqrt(l), 0)]);
    },
    /* T1/T2 relaxation for a time t (same units as T1, T2). Requires T2 <= 2 T1 (clamped). */
    thermal: function (dm, q, t1, t2, time) {
      if (!(time > 0) || !(t1 > 0)) return;
      t2 = Math.min(t2 || 2 * t1, 2 * t1);
      var g = 1 - Math.exp(-time / t1), l = 1 - Math.exp(-2 * time / t2 + time / t1);
      QG.channels.amplitudeDamping(dm, q, g);
      QG.channels.phaseDamping(dm, q, Math.max(0, Math.min(1, l)));
    }
  };

  /* ---------- read-outs ---------- */
  P.probabilities = function () { var p = new Float64Array(this.N); for (var i = 0; i < this.N; i++) p[i] = Math.max(0, this.re[i * this.N + i]); return p; };
  P.trace = function () { var s = 0; for (var i = 0; i < this.N; i++) s += this.re[i * this.N + i]; return s; };
  P.purity = function () { var s = 0; for (var i = 0; i < this.re.length; i++) s += this.re[i] * this.re[i] + this.im[i] * this.im[i]; return s; };
  P.entry = function (i, j) { return { re: this.re[i * this.N + j], im: this.im[i * this.N + j] }; };
  P.bloch = function (q) {
    var N = this.N, st = 1 << q, r00 = 0, r11 = 0, xr = 0, xi = 0;
    for (var i = 0; i < N; i++) {
      if (i & st) { r11 += this.re[i * N + i]; continue; }
      r00 += this.re[i * N + i];
      xr += this.re[i * N + (i | st)]; xi += this.im[i * N + (i | st)];
    }
    return { x: 2 * xr, y: -2 * xi, z: r00 - r11 };
  };
  /* <psi| rho |psi> for a pure state vector */
  P.fidelity = function (sv) {
    var N = this.N, s = 0;
    for (var i = 0; i < N; i++) {
      var ar = sv.re[i], ai = sv.im[i]; if (ar === 0 && ai === 0) continue;
      for (var j = 0; j < N; j++) {
        var br = sv.re[j], bi = sv.im[j]; if (br === 0 && bi === 0) continue;
        var rr = this.re[i * N + j], ri = this.im[i * N + j];
        // conj(a_i) * rho_ij * b_j  (real part)
        var tr = rr * br - ri * bi, ti = rr * bi + ri * br;
        s += ar * tr + ai * ti;
      }
    }
    return s;
  };
  P.expectPauli = function (label) {
    var n = this.n, N = this.N, xm = 0, zm = 0, ny = 0;
    if (label.length !== n) throw new Error('Pauli label length must equal qubit count');
    for (var k = 0; k < n; k++) { var ch = label[n - 1 - k]; if (ch === 'X' || ch === 'Y') xm |= 1 << k; if (ch === 'Z' || ch === 'Y') zm |= 1 << k; if (ch === 'Y') ny++; }
    var s = 0;
    for (var kk = 0; kk < N; kk++) {
      var sign = QG.popcount(kk & zm) & 1 ? -1 : 1, rr = this.re[kk * N + (kk ^ xm)], ri = this.im[kk * N + (kk ^ xm)];
      // Tr(P rho) = sum_k phase(k) * rho[k, k^xm],  phase = i^ny * sign
      var r; switch (ny & 3) { case 0: r = rr; break; case 1: r = -ri; break; case 2: r = -rr; break; default: r = ri; }
      s += sign * r;
    }
    return s;
  };
  QG.DensityMatrix = DensityMatrix;
  QG.DM_MAX_QUBITS = MAXQ;

  /* ---------- noisy circuit runner ----------
   * noise = { p1: depolarizing after 1-qubit gates, p2: depolarizing after 2-qubit gates,
   *           t1, t2 (microseconds), time1, time2 (gate times in ns), readout: flip probability or {p01, p10},
   *           scale: multiply every error (for zero-noise extrapolation) }  */
  QG.applyGateNoise = function (dm, op, noise) {
    if (!noise || op.g === 'barrier' || op.g === 'measure' || op.g === 'reset' || op.g === 'diagonal') return;
    var s = noise.scale === undefined ? 1 : noise.scale, k = op.q.length;
    if (k === 1 && noise.p1) QG.channels.depolarizing(dm, op.q, Math.min(1, noise.p1 * s));
    if (k === 2 && noise.p2) QG.channels.depolarizing(dm, op.q, Math.min(16 / 15, noise.p2 * s));
    if (k > 2 && noise.p2) op.q.forEach(function (q) { QG.channels.depolarizing(dm, [q], Math.min(1, noise.p2 * s)); });
    if (noise.t1 > 0) {
      var tns = (k === 1 ? noise.time1 || 50 : noise.time2 || 300) * s;
      op.q.forEach(function (q) { QG.channels.thermal(dm, q, noise.t1 * 1000, (noise.t2 || 2 * noise.t1) * 1000, tns); });
    }
  };

  /* Apply readout error to a probability vector over n bits. */
  QG.applyReadout = function (probs, n, ro) {
    if (!ro) return probs;
    var p01 = typeof ro === 'number' ? ro : ro.p01 || 0, p10 = typeof ro === 'number' ? ro : ro.p10 || 0, p = Float64Array.from(probs);
    for (var q = 0; q < n; q++) {
      var st = 1 << q, out = new Float64Array(p.length);
      for (var i = 0; i < p.length; i++) {
        if (i & st) { out[i] += p[i] * (1 - p10); out[i ^ st] += p[i] * p10; }
        else { out[i] += p[i] * (1 - p01); out[i ^ st] += p[i] * p01; }
      }
      p = out;
    }
    return p;
  };

  /* Undo readout error by inverting each qubit's 2x2 confusion matrix (may give small negative values: clipped and renormalised). */
  QG.mitigateReadout = function (probs, n, ro, noClip) {
    var p01 = typeof ro === 'number' ? ro : ro.p01 || 0, p10 = typeof ro === 'number' ? ro : ro.p10 || 0, det = 1 - p01 - p10, p = Float64Array.from(probs);
    // confusion A = [[1-p01, p10],[p01, 1-p10]] (columns = true value); inverse = 1/det [[1-p10, -p10],[-p01, 1-p01]]
    for (var q = 0; q < n; q++) {
      var st = 1 << q, out = new Float64Array(p.length);
      for (var i = 0; i < p.length; i++) {
        if (i & st) continue;
        var a = p[i], b = p[i | st];
        out[i] = ((1 - p10) * a - p10 * b) / det;
        out[i | st] = (-p01 * a + (1 - p01) * b) / det;
      }
      p = out;
    }
    if (!noClip) { var s = 0; for (var k = 0; k < p.length; k++) { if (p[k] < 0) p[k] = 0; s += p[k]; } for (k = 0; k < p.length; k++) p[k] /= s || 1; }
    return p;
  };
  /* Zero-noise extrapolation: fit values measured at noise scales xs and return the value at scale 0.
   * order 1 = straight line (least squares), order 2 = quadratic (Richardson for three points). */
  QG.zeroNoiseExtrapolate = function (xs, ys, order) {
    order = order || 1;
    var m = order + 1, A = [], b = [];
    for (var r = 0; r < m; r++) { A.push(new Array(m).fill(0)); b.push(0); }
    xs.forEach(function (x, i) { for (var r = 0; r < m; r++) { b[r] += ys[i] * Math.pow(x, r); for (var c = 0; c < m; c++) A[r][c] += Math.pow(x, r + c); } });
    for (var col = 0; col < m; col++) { // Gaussian elimination
      var piv = col; for (r = col + 1; r < m; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
      var t = A[col]; A[col] = A[piv]; A[piv] = t; var tb = b[col]; b[col] = b[piv]; b[piv] = tb;
      for (r = 0; r < m; r++) { if (r === col) continue; var f = A[r][col] / A[col][col]; for (var c2 = col; c2 < m; c2++) A[r][c2] -= f * A[col][c2]; b[r] -= f * b[col]; }
    }
    var coef = b.map(function (v, i) { return v / A[i][i]; });
    return { value: coef[0], coef: coef };
  };

  function sampleProbs(p, shots, rnd) {
    var cdf = new Float64Array(p.length), acc = 0, counts = {};
    for (var i = 0; i < p.length; i++) { acc += p[i]; cdf[i] = acc; }
    for (var s = 0; s < shots; s++) {
      var r = rnd() * acc, lo = 0, hi = p.length - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid; }
      counts[lo] = (counts[lo] || 0) + 1;
    }
    return counts;
  }
  QG.sampleProbs = sampleProbs;

  /* Run a circuit with noise. Measurements are read at the end (mid-circuit measurements act as dephasing);
   * classical conditions are not supported in noisy mode. Returns exact noisy probabilities + sampled counts. */
  QG.runNoisy = function (c, noise, opt) {
    opt = opt || {};
    var t0 = Date.now(), dm = new DensityMatrix(c.nq), meas = [];
    c.ops.forEach(function (op) {
      if (op.cond) throw new Error('Classical conditions are not supported in noisy simulation. Use deferred measurement (controlled gates) instead.');
      if (op.g === 'measure') { meas.push(op); return; }
      dm.applyOp(op);
      QG.applyGateNoise(dm, op, noise);
    });
    var pq = QG.applyReadout(dm.probabilities(), c.nq, noise && noise.readout ? (typeof noise.readout === 'number' ? Math.min(0.5, noise.readout * (noise.scale || 1)) : noise.readout) : 0);
    var out = { dm: dm, nq: c.nq, nc: c.nc, probsQubits: pq, counts: {}, shots: opt.shots || 0 };
    // probabilities of classical register outcomes
    var probs = {};
    for (var i = 0; i < pq.length; i++) {
      if (pq[i] < 1e-15) continue;
      var key;
      if (meas.length) { var cb = new Array(c.nc).fill(0); meas.forEach(function (m) { cb[m.c[0]] = (i >> m.q[0]) & 1; }); key = ''; for (var k = c.nc - 1; k >= 0; k--) key += cb[k]; }
      else key = QG.bitstring(i, c.nq);
      probs[key] = (probs[key] || 0) + pq[i];
    }
    out.probs = probs;
    if (opt.shots) {
      var raw = sampleProbs(pq, opt.shots, QG.rng(opt.seed));
      Object.keys(raw).forEach(function (kk) {
        var idx = +kk, key;
        if (meas.length) { var cb = new Array(c.nc).fill(0); meas.forEach(function (m) { cb[m.c[0]] = (idx >> m.q[0]) & 1; }); key = ''; for (var b = c.nc - 1; b >= 0; b--) key += cb[b]; }
        else key = QG.bitstring(idx, c.nq);
        out.counts[key] = (out.counts[key] || 0) + raw[kk];
      });
    }
    out.ms = Date.now() - t0;
    return out;
  };

  /* Qiskit Aer code for a noise model (bridge to real tools). */
  QG.noiseToQiskit = function (noise) {
    var L = ['from qiskit_aer import AerSimulator', 'from qiskit_aer.noise import NoiseModel, depolarizing_error, thermal_relaxation_error, ReadoutError', '', 'noise = NoiseModel()'];
    var one = ['x', 'y', 'z', 'h', 's', 'sdg', 't', 'tdg', 'sx', 'rx', 'ry', 'rz', 'p', 'u'], two = ['cx', 'cz', 'cp', 'swap', 'crz', 'rzz'];
    if (noise.p1) L.push('noise.add_all_qubit_quantum_error(depolarizing_error(' + noise.p1 + ', 1), ' + JSON.stringify(one) + ')');
    if (noise.p2) L.push('noise.add_all_qubit_quantum_error(depolarizing_error(' + noise.p2 + ', 2), ' + JSON.stringify(two) + ')');
    if (noise.t1) {
      L.push('T1, T2 = ' + noise.t1 + 'e3, ' + (noise.t2 || 2 * noise.t1) + 'e3   # nanoseconds');
      L.push('noise.add_all_qubit_quantum_error(thermal_relaxation_error(T1, T2, ' + (noise.time1 || 50) + '), ' + JSON.stringify(one) + ')');
      L.push('noise.add_all_qubit_quantum_error(thermal_relaxation_error(T1, T2, ' + (noise.time2 || 300) + ').expand(thermal_relaxation_error(T1, T2, ' + (noise.time2 || 300) + ')), ' + JSON.stringify(two) + ')');
    }
    if (noise.readout) { var r = typeof noise.readout === 'number' ? { p01: noise.readout, p10: noise.readout } : noise.readout; L.push('noise.add_all_qubit_readout_error(ReadoutError([[' + (1 - r.p01) + ', ' + r.p01 + '], [' + r.p10 + ', ' + (1 - r.p10) + ']]))'); }
    L.push('', 'sim = AerSimulator(noise_model=noise)', '# from qiskit import transpile', '# result = sim.run(transpile(qc, sim), shots=4096).result(); print(result.get_counts())');
    return L.join('\n') + '\n';
  };
});
