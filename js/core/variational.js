/* Variational algorithms: ansatz circuits, VQE, QAOA for MaxCut, and small quantum-machine-learning models. */
QG.module('variational', function (QG) {
  var PI = Math.PI;

  /* ---------- ansatz circuits ---------- */
  /* type 'ry'     : layers of Ry on every qubit, separated by a CNOT chain  (params n*(L+1))
   * type 'ry-rz'  : Ry and Rz on every qubit per layer                     (params 2n*(L+1)) */
  function ansatz(type, n, L) {
    var per = type === 'ry-rz' ? 2 * n : n, nParams = per * (L + 1);
    return {
      type: type, n: n, layers: L, nParams: nParams,
      build: function (th, c) {
        c = c || new QG.Circuit(n); var k = 0;
        for (var l = 0; l <= L; l++) {
          for (var q = 0; q < n; q++) { c.ry(th[k++], q); if (type === 'ry-rz') c.rz(th[k++], q); }
          if (l < L) for (q = 0; q < n - 1; q++) c.cx(q, q + 1);
        }
        return c;
      }
    };
  }
  /* Parameter-shift gradient. Valid when each parameter enters exactly one gate of the form exp(-i theta P / 2). */
  function paramShift(f, th) {
    var g = [];
    for (var i = 0; i < th.length; i++) {
      var p = th.slice(), m = th.slice(); p[i] += PI / 2; m[i] -= PI / 2;
      g.push((f(p) - f(m)) / 2);
    }
    return g;
  }

  /* ---------- VQE ----------
   * opt: {H, ansatz, optimizer: 'nelder-mead'|'spsa'|'gd'|'adam', x0, maxIter, shots (0 = exact), seed, lr} */
  function vqe(opt) {
    var H = opt.H, A = opt.ansatz, rnd = QG.rng(opt.seed === undefined ? 7 : opt.seed);
    var energy = function (th) { var s = A.build(th).statevector(); return opt.shots ? QG.pauli.estimate(H, s, opt.shots, rnd) : QG.pauli.expect(H, s); };
    var x0 = opt.x0 || (function () { var r = QG.rng(opt.seed === undefined ? 3 : opt.seed + 1), a = []; for (var i = 0; i < A.nParams; i++) a.push((r() - 0.5) * 0.6); return a; })();
    var o = { maxIter: opt.maxIter, lr: opt.lr, seed: opt.seed };
    if (opt.optimizer === 'gd' || opt.optimizer === 'adam') o.grad = function (th) { return paramShift(energy, th); };
    var res = QG.optimize.run(opt.optimizer || 'nelder-mead', energy, x0, o);
    var exactE = null; try { exactE = QG.pauli.exact(H).values[0]; } catch (e) { }
    var finalExact = QG.pauli.expect(H, A.build(res.x).statevector());
    return { x: res.x, energy: finalExact, measuredEnergy: res.fx, exact: exactE, history: res.history, nfev: res.nfev, circuit: A.build(res.x) };
  }

  /* ---------- QAOA for (weighted) MaxCut ---------- graph = {n, edges: [[i, j, w?]]} */
  function cutValues(g) {
    var N = 1 << g.n, v = new Float64Array(N);
    for (var z = 0; z < N; z++) g.edges.forEach(function (e) { if (((z >> e[0]) & 1) !== ((z >> e[1]) & 1)) v[z] += e[2] === undefined ? 1 : e[2]; });
    return v;
  }
  function qaoaCircuit(g, gammas, betas) {
    var c = new QG.Circuit(g.n);
    for (var q = 0; q < g.n; q++) c.h(q);
    for (var l = 0; l < gammas.length; l++) {
      // exp(-i gamma C) with C = sum_edges w (1 - Z_i Z_j)/2  ->  rzz(-gamma*w) per edge (up to global phase)
      g.edges.forEach(function (e) { c.rzz(-gammas[l] * (e[2] === undefined ? 1 : e[2]), e[0], e[1]); });
      for (q = 0; q < g.n; q++) c.rx(2 * betas[l], q);
    }
    return c;
  }
  function qaoaExpect(g, params, cuts) {
    var p = params.length / 2, sv = qaoaCircuit(g, params.slice(0, p), params.slice(p)).statevector(), pr = sv.probabilities(), e = 0;
    cuts = cuts || cutValues(g);
    for (var z = 0; z < pr.length; z++) e += pr[z] * cuts[z];
    return e;
  }
  var qaoa = {
    cutValues: cutValues, circuit: qaoaCircuit, expect: qaoaExpect,
    bruteForce: function (g) { var v = cutValues(g), m = -Infinity, arg = []; for (var z = 0; z < v.length; z++) { if (v[z] > m + 1e-12) { m = v[z]; arg = [z]; } else if (Math.abs(v[z] - m) < 1e-12) arg.push(z); } return { max: m, argmax: arg }; },
    landscape: function (g, ng, nb) {
      var cuts = cutValues(g), grid = [];
      for (var b = 0; b < nb; b++) { var row = []; for (var a = 0; a < ng; a++) row.push(qaoaExpect(g, [a / (ng - 1) * PI, b / (nb - 1) * PI / 2], cuts)); grid.push(row); }
      return { grid: grid, gamma: [0, PI], beta: [0, PI / 2] };
    },
    optimize: function (g, p, o) {
      o = o || {}; var cuts = cutValues(g), rnd = QG.rng(o.seed === undefined ? 11 : o.seed), best = null;
      for (var s = 0; s < (o.starts || 4); s++) {
        var x0 = []; for (var i = 0; i < p; i++) x0.push(rnd() * PI); for (i = 0; i < p; i++) x0.push(rnd() * PI / 2);
        if (s === 0 && o.x0) x0 = o.x0.slice();
        var r = QG.optimize.nelderMead(function (x) { return -qaoaExpect(g, x, cuts); }, x0, { maxIter: o.maxIter || 150, step: 0.4 });
        if (!best || r.fx < best.fx) best = r;
      }
      return { params: best.x, expectation: -best.fx, history: best.history.map(function (h) { return { x: h.x, fx: -h.fx }; }) };
    }
  };

  /* ---------- quantum machine learning ---------- */
  function dataset(name, n, seed) {
    var r = QG.rng(seed === undefined ? 5 : seed), X = [], y = [];
    function gauss() { var u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * PI * v); }
    for (var i = 0; i < n; i++) {
      var a, b, lab;
      if (name === 'circles') { lab = i % 2 ? 1 : -1; var rad = lab > 0 ? 0.25 + 0.2 * r() : 0.65 + 0.25 * r(), ang = 2 * PI * r(); a = rad * Math.cos(ang); b = rad * Math.sin(ang); }
      else if (name === 'xor') { a = r() * 2 - 1; b = r() * 2 - 1; if (Math.abs(a) < 0.1) a += a < 0 ? -0.1 : 0.1; if (Math.abs(b) < 0.1) b += b < 0 ? -0.1 : 0.1; lab = a * b > 0 ? 1 : -1; }
      else if (name === 'moons') { lab = i % 2 ? 1 : -1; var t = PI * r(); a = lab > 0 ? Math.cos(t) * 0.7 - 0.3 : 0.3 - Math.cos(t) * 0.7; b = lab > 0 ? Math.sin(t) * 0.7 - 0.25 : 0.25 - Math.sin(t) * 0.7; a += gauss() * 0.06; b += gauss() * 0.06; }
      else { lab = i % 2 ? 1 : -1; a = lab * 0.45 + gauss() * 0.22; b = lab * 0.35 + gauss() * 0.22; }
      X.push([Math.max(-1, Math.min(1, a)), Math.max(-1, Math.min(1, b))]); y.push(lab);
    }
    return { X: X, y: y };
  }
  function split(d, frac) { var k = Math.round(d.X.length * frac); return { train: { X: d.X.slice(0, k), y: d.y.slice(0, k) }, test: { X: d.X.slice(k), y: d.y.slice(k) } }; }

  /* Variational classifier with data re-uploading on 2 qubits: [encode x, trainable Ry/Rz layer, CNOT] x L, output <Z0>. */
  function vqcModel(L) {
    var n = 2, nParams = 4 * L;
    function circuit(x, th) {
      var c = new QG.Circuit(n), k = 0;
      for (var l = 0; l < L; l++) {
        c.ry(PI / 2 * x[0] + PI / 2, 0).ry(PI / 2 * x[1] + PI / 2, 1);
        for (var q = 0; q < n; q++) { c.ry(th[k++], q); c.rz(th[k++], q); }
        c.cx(0, 1);
      }
      return c;
    }
    function predict(x, th) { return circuit(x, th).statevector().expectPauli('IZ'); }
    return {
      nParams: nParams, circuit: circuit, predict: predict,
      loss: function (th, D) { var s = 0; for (var i = 0; i < D.X.length; i++) { var d = predict(D.X[i], th) - D.y[i]; s += d * d; } return s / D.X.length; },
      train: function (D, o) {
        o = o || {}; var self = this, r = QG.rng(o.seed === undefined ? 2 : o.seed), x0 = [];
        for (var i = 0; i < nParams; i++) x0.push((r() - 0.5) * 2);
        // MSE loss: dL/dth = mean 2 (f(x) - y) df/dth, with df/dth from the parameter-shift rule (exact for expectation values)
        var f = function (th) { return self.loss(th, D); };
        var grad = function (th) {
          var g = new Array(nParams).fill(0);
          D.X.forEach(function (x, i) {
            var err = predict(x, th) - D.y[i], dg = paramShift(function (t) { return predict(x, t); }, th);
            for (var k = 0; k < nParams; k++) g[k] += 2 * err * dg[k] / D.X.length;
          });
          return g;
        };
        return QG.optimize.gradientDescent(f, x0, { adam: true, lr: o.lr || 0.15, maxIter: o.maxIter || 60, grad: grad });
      }
    };
  }

  /* ZZ feature map (Havlicek et al. 2019) on 2 qubits, repeated reps times. */
  function featureMap(x, reps) {
    var c = new QG.Circuit(2), a = PI / 2 * (x[0] + 1), b = PI / 2 * (x[1] + 1);
    for (var r = 0; r < (reps || 2); r++) { c.h(0).h(1).p(2 * a, 0).p(2 * b, 1).cx(0, 1).p(2 * (PI - a) * (PI - b), 1).cx(0, 1); }
    return c;
  }
  function kernelMatrix(XA, XB, reps) {
    var SA = XA.map(function (x) { return featureMap(x, reps).statevector(); }), SB = XB === XA ? SA : XB.map(function (x) { return featureMap(x, reps).statevector(); });
    return SA.map(function (s) { return SB.map(function (t) { return s.fidelity(t); }); });
  }
  function solve(A, b) { // Gaussian elimination with partial pivoting
    var n = b.length, M = A.map(function (r, i) { return r.slice().concat([b[i]]); });
    for (var c = 0; c < n; c++) {
      var p = c; for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      var t = M[c]; M[c] = M[p]; M[p] = t;
      for (r = 0; r < n; r++) { if (r === c) continue; var f = M[r][c] / M[c][c]; for (var k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map(function (row, i) { return row[n] / row[i]; });
  }
  function kernelModel(reps, lambda) {
    var Xtr = null, alpha = null;
    return {
      fit: function (D) { Xtr = D.X; var K = kernelMatrix(D.X, D.X, reps); for (var i = 0; i < K.length; i++) K[i][i] += lambda || 0.05; alpha = solve(K, D.y); return this; },
      decision: function (X) { var K = kernelMatrix(X, Xtr, reps); return K.map(function (row) { return row.reduce(function (s, k, i) { return s + alpha[i] * k; }, 0); }); },
      kernel: function (X) { return kernelMatrix(X, X, reps); }
    };
  }
  function logistic(D, o) { // classical baseline on raw features (linear boundary)
    o = o || {}; var w = [0, 0, 0];
    for (var it = 0; it < (o.maxIter || 400); it++) {
      var g = [0, 0, 0];
      D.X.forEach(function (x, i) { var z = w[0] + w[1] * x[0] + w[2] * x[1], p = 1 / (1 + Math.exp(-z)), t = D.y[i] > 0 ? 1 : 0, e = p - t; g[0] += e; g[1] += e * x[0]; g[2] += e * x[1]; });
      for (var k = 0; k < 3; k++) w[k] -= 0.5 * g[k] / D.X.length;
    }
    return { w: w, decision: function (X) { return X.map(function (x) { return w[0] + w[1] * x[0] + w[2] * x[1]; }); } };
  }
  function accuracy(scores, y) { var ok = 0; scores.forEach(function (s, i) { if ((s >= 0 ? 1 : -1) === y[i]) ok++; }); return ok / y.length; }

  /* Plain-data training call (safe to run in the worker): returns parameters and loss history. */
  function trainVQC(D, L, o) {
    var m = vqcModel(L), r = m.train(D, o || {});
    return { x: r.x, losses: r.history.map(function (h) { return h.fx; }), nfev: r.nfev };
  }

  QG.variational = { ansatz: ansatz, paramShift: paramShift, vqe: vqe };
  QG.vqe = vqe;
  QG.qaoa = qaoa;
  QG.qml = { dataset: dataset, split: split, vqc: vqcModel, trainVQC: trainVQC, featureMap: featureMap, kernelMatrix: kernelMatrix, kernelModel: kernelModel, logistic: logistic, accuracy: accuracy, solve: solve };
});
