/* Circuit model + runner.
 *   var qc = new QG.Circuit(2); qc.h(0).cx(0, 1).measureAll();
 *   var r = QG.run(qc, { shots: 1024, seed: 7 });   // r.counts['00'] ...
 * Gate argument order matches Qiskit: parameters first, then qubits (qc.rx(theta, q), qc.cp(lam, c, t)). */
QG.module('circuit', function (QG) {
  function Circuit(nq, nc) {
    if (!(nq >= 1)) throw new Error('A circuit needs at least 1 qubit');
    this.nq = nq; this.nc = nc === undefined ? nq : nc; this.ops = []; this._cond = null; this.name = '';
  }
  var P = Circuit.prototype;

  P._checkQ = function (q) {
    if (typeof q !== 'number' || q < 0 || q >= this.nq || (q | 0) !== q) throw new Error('Qubit index ' + q + ' is out of range (0..' + (this.nq - 1) + ')');
  };
  P._push = function (op) {
    if (this._cond) op.cond = { bit: this._cond.bit, val: this._cond.val };
    this.ops.push(op); return this;
  };

  // Generate one builder method per gate.
  Object.keys(QG.gates.defs).forEach(function (name) {
    var d = QG.gates.defs[name];
    if (name === 'mcx') return;
    var nqArgs = (d.nc > 0 ? d.nc : 0) + d.nt;
    P[name] = function () {
      var a = Array.prototype.slice.call(arguments);
      if (a.length !== d.np + nqArgs) throw new Error(name + '() expects ' + (d.np ? d.np + ' parameter(s) then ' : '') + nqArgs + ' qubit(s)');
      var p = a.slice(0, d.np).map(Number), q = a.slice(d.np);
      for (var i = 0; i < q.length; i++) this._checkQ(q[i]);
      for (var x = 0; x < q.length; x++) for (var y = x + 1; y < q.length; y++) if (q[x] === q[y]) throw new Error(name + '(): qubits must be different');
      p.forEach(function (v) { if (!isFinite(v)) throw new Error(name + '(): parameter is not a number'); });
      return this._push({ g: name, q: q, p: p });
    };
  });
  P.mcx = function (controls, target) {
    var q = controls.concat([target]), self = this;
    q.forEach(function (x) { self._checkQ(x); });
    return this._push({ g: 'mcx', q: q, p: [] });
  };
  P.toffoli = P.ccx; P.cnot = P.cx; P.i = P.id;
  P.measure = function (q, c) {
    if (c === undefined) c = q;
    this._checkQ(q);
    if (c < 0 || c >= this.nc) throw new Error('Classical bit ' + c + ' out of range');
    return this._push({ g: 'measure', q: [q], c: [c] });
  };
  P.measureAll = function () { for (var i = 0; i < this.nq; i++) this.measure(i, i); return this; };
  P.reset = function (q) { this._checkQ(q); return this._push({ g: 'reset', q: [q] }); };
  P.barrier = function () { var q = []; for (var i = 0; i < this.nq; i++) q.push(i); return this._push({ g: 'barrier', q: q }); };
  /* Diagonal unitary: phases[k] applied to basis state k of the listed qubits (qubits[0] = lowest bit). */
  P.diagonal = function (phases, qubits) {
    var self = this; qubits = qubits || Array.from({ length: this.nq }, function (_, i) { return i; });
    qubits.forEach(function (x) { self._checkQ(x); });
    if (phases.length !== (1 << qubits.length)) throw new Error('diagonal(): need 2^k phases');
    return this._push({ g: 'diagonal', q: qubits.slice(), phases: Array.from(phases) });
  };
  /* Classical control: ops added inside fn only run if classical bit `bit` equals val. */
  P.ifBit = function (bit, val, fn) { this._cond = { bit: bit, val: val ? 1 : 0 }; try { fn(this); } finally { this._cond = null; } return this; };

  P.copy = function () { var c = new Circuit(this.nq, this.nc); c.ops = JSON.parse(JSON.stringify(this.ops)); c.name = this.name; return c; };
  P.append = function (other) { if (other.nq > this.nq) throw new Error('append(): circuit too wide'); this.ops = this.ops.concat(JSON.parse(JSON.stringify(other.ops))); return this; };
  P.inverse = function () {
    var c = new Circuit(this.nq, this.nc);
    for (var i = this.ops.length - 1; i >= 0; i--) {
      var op = this.ops[i];
      if (op.g === 'measure' || op.g === 'reset') throw new Error('inverse(): circuit contains measurement/reset');
      if (op.g === 'barrier') { c.ops.push({ g: 'barrier', q: op.q.slice() }); continue; }
      if (op.g === 'diagonal') { c.ops.push({ g: 'diagonal', q: op.q.slice(), phases: op.phases.map(function (x) { return -x; }) }); continue; }
      c.ops.push(QG.gates.inverse(op));
    }
    return c;
  };
  P.gateCount = function () { return this.ops.filter(function (o) { return o.g !== 'barrier' && o.g !== 'measure'; }).length; };
  P.depth = function () {
    var level = new Array(this.nq).fill(0), d = 0;
    this.ops.forEach(function (op) {
      if (op.g === 'barrier') return;
      var m = 0; op.q.forEach(function (q) { m = Math.max(m, level[q]); });
      op.q.forEach(function (q) { level[q] = m + 1; }); d = Math.max(d, m + 1);
    });
    return d;
  };
  P.toJSON = function () { return { nq: this.nq, nc: this.nc, ops: this.ops, name: this.name }; };
  Circuit.fromJSON = function (o) { var c = new Circuit(o.nq, o.nc); c.ops = JSON.parse(JSON.stringify(o.ops || [])); c.name = o.name || ''; return c; };

  /* Final state of the unitary part (measurements/resets are skipped). */
  P.statevector = function (upto) {
    var sv = new QG.StateVector(this.nq), end = upto === undefined ? this.ops.length : upto;
    for (var i = 0; i < end; i++) { var op = this.ops[i]; if (op.g !== 'measure' && op.g !== 'reset' && op.g !== 'barrier') sv.applyOp(op); }
    return sv;
  };

  function isSimple(c) {
    var measured = {};
    for (var i = 0; i < c.ops.length; i++) {
      var op = c.ops[i];
      if (op.cond || op.g === 'reset') return false;
      if (op.g === 'measure') { measured[op.q[0]] = true; continue; }
      if (op.g === 'barrier') continue;
      for (var k = 0; k < op.q.length; k++) if (measured[op.q[k]]) return false;
    }
    return true;
  }

  function keyFor(cbits, nc) { var s = ''; for (var k = nc - 1; k >= 0; k--) s += cbits[k]; return s; }

  /* Run a circuit. options: shots (default 1024), seed, maxShotsSlow. */
  QG.run = function (c, opt) {
    opt = opt || {};
    var shots = opt.shots === undefined ? 1024 : opt.shots, rnd = QG.rng(opt.seed), t0 = Date.now();
    var meas = c.ops.filter(function (o) { return o.g === 'measure'; });
    var out = { nq: c.nq, nc: c.nc, shots: shots, counts: {}, mode: '' };
    if (isSimple(c)) {
      var sv = c.statevector();
      out.mode = 'statevector';
      out.statevector = sv;
      if (shots > 0) {
        var raw = sv.sample(shots, rnd);
        if (meas.length === 0) { // no measurement: read out every qubit (stated in UI)
          out.implicitMeasure = true;
          Object.keys(raw).forEach(function (k) { out.counts[QG.bitstring(+k, c.nq)] = raw[k]; });
        } else {
          Object.keys(raw).forEach(function (k) {
            var idx = +k, cb = new Array(c.nc).fill(0);
            meas.forEach(function (m) { cb[m.c[0]] = (idx >> m.q[0]) & 1; });
            var key = keyFor(cb, c.nc); out.counts[key] = (out.counts[key] || 0) + raw[k];
          });
        }
      }
    } else {
      out.mode = 'per-shot';
      var cap = opt.maxShotsSlow || 4096; if (shots > cap) shots = out.shots = cap;
      for (var s = 0; s < shots; s++) {
        var st = new QG.StateVector(c.nq), cb = new Array(c.nc).fill(0);
        for (var i = 0; i < c.ops.length; i++) {
          var op = c.ops[i];
          if (op.cond && cb[op.cond.bit] !== op.cond.val) continue;
          if (op.g === 'measure') cb[op.c[0]] = st.measure(op.q[0], rnd);
          else if (op.g === 'reset') st.reset(op.q[0], rnd);
          else st.applyOp(op);
        }
        var key = keyFor(cb, c.nc); out.counts[key] = (out.counts[key] || 0) + 1;
        if (s === shots - 1) out.statevector = st; // one sample of the post-measurement state
      }
    }
    out.ms = Date.now() - t0;
    return out;
  };

  QG.Circuit = Circuit;
});
