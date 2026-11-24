/* Plain-data packing of results (so they can cross the worker boundary) and the QG.show.* API
 * used by student code. QG.show sends drawing commands to the page, which renders them. */
QG.module('results', function (QG) {
  QG.packResult = function (r, opt) {
    var o = { nq: r.nq, nc: r.nc, shots: r.shots, counts: r.counts, mode: r.mode, ms: r.ms, implicitMeasure: !!r.implicitMeasure };
    var sv = r.statevector;
    if (sv) {
      if (sv.n <= (opt.maxAmpQubits || 12)) { o.re = Array.from(sv.re); o.im = Array.from(sv.im); }
      if (sv.n <= 16) { o.bloch = []; for (var q = 0; q < sv.n; q++) o.bloch.push(sv.bloch(q)); }
      else { // top amplitudes only
        var p = sv.probabilities(), idx = [];
        for (var i = 0; i < p.length; i++) if (p[i] > 1e-6) idx.push(i);
        idx.sort(function (a, b) { return p[b] - p[a]; }); idx = idx.slice(0, 64);
        o.top = idx.map(function (i) { return { i: i, p: p[i] }; });
      }
    }
    return o;
  };

  function fmt(x) {
    if (x === null || x === undefined) return String(x);
    if (typeof x === 'number') return String(+x.toPrecision(6));
    if (typeof x === 'string') return x;
    if (x instanceof QG.StateVector) return QG.describeState(x);
    if (x instanceof QG.Circuit) return 'Circuit(' + x.nq + ' qubits, ' + x.gateCount() + ' gates, depth ' + x.depth() + ')';
    if (ArrayBuffer.isView(x)) return '[' + Array.from(x).map(fmt).join(', ') + ']';
    if (Array.isArray(x)) return '[' + x.map(fmt).join(', ') + ']';
    if (typeof x === 'object' && 're' in x && 'im' in x && Object.keys(x).length === 2) return QG.complexStr(x.re, x.im);
    try { return JSON.stringify(x, function (k, v) { return typeof v === 'number' ? +v.toPrecision(6) : v; }); } catch (e) { return String(x); }
  }
  QG.fmt = fmt;
  QG.complexStr = function (re, im, d) {
    d = d === undefined ? 3 : d;
    var r = +re.toFixed(d), i = +im.toFixed(d);
    if (Math.abs(i) < Math.pow(10, -d)) return String(r);
    if (Math.abs(r) < Math.pow(10, -d)) return (i === 1 ? '' : i === -1 ? '-' : i) + 'i';
    return r + (i < 0 ? ' − ' : ' + ') + Math.abs(i) + 'i';
  };
  QG.describeState = function (sv, maxTerms) {
    var terms = [], n = sv.n;
    for (var i = 0; i < sv.N; i++) {
      var a = sv.re[i], b = sv.im[i];
      if (a * a + b * b < 1e-10) continue;
      terms.push('(' + QG.complexStr(a, b) + ')|' + QG.bitstring(i, n) + '⟩');
      if (terms.length >= (maxTerms || 16)) { terms.push('…'); break; }
    }
    return terms.join(' + ') || '0';
  };

  /* Helpers for student code */
  QG.state = function (c) { return c.statevector(); };
  QG.ket = function (bits) { var n = bits.length, sv = new QG.StateVector(n); sv.re[0] = 0; sv.re[parseInt(bits, 2)] = 1; return sv; };
  QG.fidelity = function (a, b) { return a.fidelity(b); };

  QG.makeShow = function (send) {
    function countsOf(x, shots) {
      if (x instanceof QG.Circuit) return QG.run(x, { shots: shots || 1024 }).counts;
      if (x && x.counts) return x.counts;
      return x;
    }
    return {
      histogram: function (x, title) { send('histogram', { counts: countsOf(x), title: title || '' }); },
      probabilities: function (x, title) {
        var sv = x instanceof QG.Circuit ? x.statevector() : x, p = sv.probabilities(), o = {};
        for (var i = 0; i < p.length; i++) if (p[i] > 1e-12) o[QG.bitstring(i, sv.n)] = p[i];
        send('probabilities', { probs: o, title: title || '' });
      },
      state: function (x, title) {
        var sv = x instanceof QG.Circuit ? x.statevector() : x;
        if (sv.n > 8) { send('log', 'show.state: showing the text form for more than 8 qubits: ' + QG.describeState(sv)); return; }
        send('state', { n: sv.n, re: Array.from(sv.re), im: Array.from(sv.im), title: title || '' });
      },
      bloch: function (x, q, title) {
        var sv = x instanceof QG.Circuit ? x.statevector() : x;
        send('bloch', { v: sv.bloch(q || 0), q: q || 0, title: title || '' });
      },
      circuit: function (c, title) { send('circuit', { circuit: c.toJSON(), title: title || '' }); },
      plot: function (series, opt) { send('plot', { series: series, opt: opt || {} }); },
      table: function (rows, title) { send('table', { rows: rows, title: title || '' }); },
      text: function (s) { send('log', String(s)); }
    };
  };
  QG.show = QG.makeShow(function () {});
});
