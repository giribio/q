/* Small dense eigen-solvers (Jacobi). Good for matrices up to ~64x64, which is all the teaching labs need.
 *   QG.eigen.symmetric(A)        A: array of rows (real symmetric)  -> {values, vectors (columns)}
 *   QG.eigen.hermitian(re, im)   re/im: arrays of rows              -> {values, vectors: [{re:[],im:[]}...]}  ascending */
QG.module('eigen', function (QG) {
  function symmetric(Ain, maxSweeps) {
    var n = Ain.length, A = Ain.map(function (r) { return Float64Array.from(r); }), V = [];
    for (var i = 0; i < n; i++) { V.push(new Float64Array(n)); V[i][i] = 1; }
    for (var sw = 0; sw < (maxSweeps || 100); sw++) {
      var off = 0;
      for (var p = 0; p < n; p++) for (var q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
      if (off < 1e-26) break;
      for (p = 0; p < n; p++) for (q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-300) continue;
        var th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        var t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (var k = 0; k < n; k++) { var akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
        for (k = 0; k < n; k++) { var apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
        for (k = 0; k < n; k++) { var vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
      }
    }
    var idx = []; for (i = 0; i < n; i++) idx.push(i);
    idx.sort(function (a, b) { return A[a][a] - A[b][b]; });
    return {
      values: idx.map(function (i) { return A[i][i]; }),
      vectors: idx.map(function (i) { var v = new Float64Array(n); for (var k = 0; k < n; k++) v[k] = V[k][i]; return v; })
    };
  }

  /* Hermitian H = R + iI  ->  real symmetric [[R, -I], [I, R]] (each eigenvalue appears twice). */
  function hermitian(re, im) {
    var n = re.length, B = [];
    for (var i = 0; i < 2 * n; i++) {
      var row = new Float64Array(2 * n);
      for (var j = 0; j < 2 * n; j++) {
        var a = i % n, b = j % n;
        if (i < n && j < n) row[j] = re[a][b];
        else if (i >= n && j >= n) row[j] = re[a][b];
        else if (i < n) row[j] = -im[a][b];
        else row[j] = im[a][b];
      }
      B.push(row);
    }
    var E = symmetric(B), vals = [], vecs = [];
    for (var k = 0; k < 2 * n && vecs.length < n; k++) {
      var ur = Array.prototype.slice.call(E.vectors[k], 0, n), ui = Array.prototype.slice.call(E.vectors[k], n);
      // Gram-Schmidt against complex vectors already chosen (the duplicate partner i*v is removed here)
      for (var m = 0; m < vecs.length; m++) {
        var v = vecs[m], pr = 0, pi = 0;
        for (var x = 0; x < n; x++) { pr += v.re[x] * ur[x] + v.im[x] * ui[x]; pi += v.re[x] * ui[x] - v.im[x] * ur[x]; }
        for (x = 0; x < n; x++) { ur[x] -= pr * v.re[x] - pi * v.im[x]; ui[x] -= pr * v.im[x] + pi * v.re[x]; }
      }
      var nr = 0; for (x = 0; x < n; x++) nr += ur[x] * ur[x] + ui[x] * ui[x];
      if (nr < 1e-8) continue;
      nr = Math.sqrt(nr);
      vecs.push({ re: ur.map(function (z) { return z / nr; }), im: ui.map(function (z) { return z / nr; }) });
      vals.push(E.values[k]);
    }
    return { values: vals, vectors: vecs };
  }

  QG.eigen = { symmetric: symmetric, hermitian: hermitian };
});
