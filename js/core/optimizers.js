/* Classical optimisers used by variational algorithms. All minimise f(x) and record a history.
 *   QG.optimize.nelderMead(f, x0, {maxIter, step, tol})
 *   QG.optimize.spsa(f, x0, {maxIter, a, c, seed})
 *   QG.optimize.gradientDescent(f, x0, {grad, lr, maxIter, adam})
 * Each returns {x, fx, history: [{x, fx, nfev}], nfev}. */
QG.module('optimizers', function (QG) {
  function counted(f) { var g = function (x) { g.n++; return f(x); }; g.n = 0; return g; }
  function snap(hist, x, fx, nfev) { hist.push({ x: Array.from(x), fx: fx, nfev: nfev }); }

  function nelderMead(f0, x0, o) {
    o = o || {}; var f = counted(f0), n = x0.length, maxIter = o.maxIter || 200, step = o.step || 0.5, tol = o.tol || 1e-8, hist = [];
    var S = [Array.from(x0)];
    for (var i = 0; i < n; i++) { var p = Array.from(x0); p[i] += step; S.push(p); }
    var F = S.map(f);
    function order() { var idx = S.map(function (_, i) { return i; }).sort(function (a, b) { return F[a] - F[b]; }); S = idx.map(function (i) { return S[i]; }); F = idx.map(function (i) { return F[i]; }); }
    order(); snap(hist, S[0], F[0], f.n);
    for (var it = 0; it < maxIter; it++) {
      if (Math.abs(F[n] - F[0]) < tol) break;
      var c = new Array(n).fill(0);
      for (i = 0; i < n; i++) for (var j = 0; j < n; j++) c[j] += S[i][j] / n;
      var xr = c.map(function (v, j) { return v + (v - S[n][j]); }), fr = f(xr);
      if (fr < F[0]) {
        var xe = c.map(function (v, j) { return v + 2 * (v - S[n][j]); }), fe = f(xe);
        if (fe < fr) { S[n] = xe; F[n] = fe; } else { S[n] = xr; F[n] = fr; }
      } else if (fr < F[n - 1]) { S[n] = xr; F[n] = fr; }
      else {
        var xc = fr < F[n] ? c.map(function (v, j) { return v + 0.5 * (xr[j] - v); }) : c.map(function (v, j) { return v + 0.5 * (S[n][j] - v); }), fc = f(xc);
        if (fc < Math.min(fr, F[n])) { S[n] = xc; F[n] = fc; }
        else { for (i = 1; i <= n; i++) { S[i] = S[i].map(function (v, j) { return S[0][j] + 0.5 * (v - S[0][j]); }); F[i] = f(S[i]); } }
      }
      order(); snap(hist, S[0], F[0], f.n);
    }
    return { x: S[0], fx: F[0], history: hist, nfev: f.n };
  }

  function spsa(f0, x0, o) {
    o = o || {}; var f = counted(f0), n = x0.length, maxIter = o.maxIter || 150, a = o.a || 0.25, c = o.c || 0.15, A = o.A || maxIter / 10, alpha = 0.602, gamma = 0.101, rnd = QG.rng(o.seed === undefined ? 1 : o.seed), x = Array.from(x0), hist = [];
    snap(hist, x, f(x), f.n);
    for (var k = 0; k < maxIter; k++) {
      var ak = a / Math.pow(k + 1 + A, alpha), ck = c / Math.pow(k + 1, gamma), d = [];
      for (var i = 0; i < n; i++) d.push(rnd() < 0.5 ? -1 : 1);
      var fp = f(x.map(function (v, i) { return v + ck * d[i]; })), fm = f(x.map(function (v, i) { return v - ck * d[i]; })), g = (fp - fm) / (2 * ck);
      x = x.map(function (v, i) { return v - ak * g * d[i]; });
      snap(hist, x, o.evalEach === false ? (fp + fm) / 2 : f(x), f.n);
    }
    var best = hist.reduce(function (b, h) { return h.fx < b.fx ? h : b; }, hist[0]);
    return { x: hist[hist.length - 1].x, fx: hist[hist.length - 1].fx, best: best, history: hist, nfev: f.n };
  }

  function gradientDescent(f0, x0, o) {
    o = o || {}; var f = counted(f0), n = x0.length, maxIter = o.maxIter || 100, lr = o.lr || 0.2, x = Array.from(x0), hist = [], m = new Array(n).fill(0), v = new Array(n).fill(0);
    var grad = o.grad || function (y) { var h = 1e-5, g = []; for (var i = 0; i < n; i++) { var p = y.slice(), q = y.slice(); p[i] += h; q[i] -= h; g.push((f(p) - f(q)) / (2 * h)); } return g; };
    snap(hist, x, f(x), f.n);
    for (var k = 1; k <= maxIter; k++) {
      var g = grad(x); if (o.grad) f.n += 2 * n; // parameter shift costs 2 evaluations per parameter
      if (o.adam) {
        for (var i = 0; i < n; i++) { m[i] = 0.9 * m[i] + 0.1 * g[i]; v[i] = 0.999 * v[i] + 0.001 * g[i] * g[i]; x[i] -= lr * (m[i] / (1 - Math.pow(0.9, k))) / (Math.sqrt(v[i] / (1 - Math.pow(0.999, k))) + 1e-8); }
      } else for (i = 0; i < n; i++) x[i] -= lr * g[i];
      snap(hist, x, f(x), f.n);
      var gn = Math.sqrt(g.reduce(function (s, z) { return s + z * z; }, 0));
      if (gn < (o.gtol || 1e-7)) break;
    }
    return { x: x, fx: hist[hist.length - 1].fx, history: hist, nfev: f.n };
  }

  QG.optimize = { nelderMead: nelderMead, spsa: spsa, gradientDescent: gradientDescent,
    run: function (name, f, x0, o) { o = o || {}; if (name === 'nelder-mead') return nelderMead(f, x0, o); if (name === 'spsa') return spsa(f, x0, o); if (name === 'adam') return gradientDescent(f, x0, Object.assign({ adam: true, lr: o.lr || 0.1 }, o)); return gradientDescent(f, x0, o); } };
});
