/* Drug-discovery toy models: QAOA on a diagonal (QUBO/HUBO) cost, molecular docking as weighted max clique,
 * HP lattice protein folding, a synthetic compound dataset, Grover search over a small library,
 * and a binding energy (helium proton affinity) from the chemistry engine. */
QG.module('drug', function (QG) {
  var PI = Math.PI;

  /* ---------- QAOA for any cost given as a vector over bit strings (to MAXIMISE) ---------- */
  function normalise(v) { var lo = Infinity, hi = -Infinity; for (var i = 0; i < v.length; i++) { if (v[i] < lo) lo = v[i]; if (v[i] > hi) hi = v[i]; } var s = hi > lo ? 1 / (hi - lo) : 1, o = new Float64Array(v.length); for (i = 0; i < v.length; i++) o[i] = (v[i] - lo) * s; return o; }
  function qaoaState(vn, n, params) {
    var p = params.length / 2, sv = new QG.StateVector(n), h = QG.gates.matrix1('h'), q, i;
    for (q = 0; q < n; q++) sv.apply1(q, h);
    var all = []; for (q = 0; q < n; q++) all.push(q);
    for (var l = 0; l < p; l++) {
      var ph = new Float64Array(vn.length); for (i = 0; i < vn.length; i++) ph[i] = -params[l] * vn[i]; // exp(-i gamma C)
      sv.applyDiagonalPhases(all, ph);
      var rx = QG.gates.matrix1('rx', [2 * params[p + l]]);
      for (q = 0; q < n; q++) sv.apply1(q, rx);
    }
    return sv;
  }
  function qaoaCircuit(vn, n, params) {
    var p = params.length / 2, c = new QG.Circuit(n), q, all = [];
    for (q = 0; q < n; q++) { c.h(q); all.push(q); }
    for (var l = 0; l < p; l++) { c.diagonal(Array.from(vn).map(function (x) { return -params[l] * x; }), all); for (q = 0; q < n; q++) c.rx(2 * params[p + l], q); }
    return c;
  }
  /* Maximise the cost vector `values` with depth-p QAOA. Returns probabilities, the best angles and diagnostics. */
  function qaoaMax(values, n, p, o) {
    o = o || {}; var vn = normalise(values), rnd = QG.rng(o.seed === undefined ? 3 : o.seed), best = null;
    var f = function (x) { var pr = qaoaState(vn, n, x).probabilities(), e = 0; for (var i = 0; i < pr.length; i++) e += pr[i] * vn[i]; return -e; };
    for (var s = 0; s < (o.starts || 4); s++) {
      var x0 = []; for (var i = 0; i < p; i++) x0.push(rnd() * 2 * PI); for (i = 0; i < p; i++) x0.push(rnd() * PI / 2);
      var r = QG.optimize.nelderMead(f, x0, { maxIter: o.maxIter || 200, step: 0.5 });
      if (!best || r.fx < best.fx) best = r;
    }
    var pr = qaoaState(vn, n, best.x).probabilities(), mx = -Infinity, arg = [];
    for (i = 0; i < values.length; i++) { if (values[i] > mx + 1e-12) { mx = values[i]; arg = [i]; } else if (Math.abs(values[i] - mx) < 1e-12) arg.push(i); }
    var pOpt = arg.reduce(function (a, z) { return a + pr[z]; }, 0), top = 0; for (i = 0; i < pr.length; i++) if (pr[i] > pr[top]) top = i;
    return { params: best.x, probs: pr, optimum: mx, argmax: arg, pOpt: pOpt, mostLikely: top, uniformP: arg.length / values.length, circuit: function () { return qaoaCircuit(vn, n, best.x); } };
  }

  /* ---------- docking as weighted maximum clique (after Banchi et al., Sci. Adv. 6, eaax1950, 2020) ---------- */
  var PHARM = { donor: 'H-bond donor', acceptor: 'H-bond acceptor', aromatic: 'aromatic ring', positive: 'positive charge', negative: 'negative charge', hydrophobic: 'hydrophobic' };
  var PAIR_W = { 'donor|acceptor': 1.0, 'acceptor|donor': 1.0, 'aromatic|aromatic': 0.8, 'positive|negative': 1.4, 'hydrophobic|hydrophobic': 0.6 };
  var DOCK_SETS = {
    A: {
      label: 'Ligand A (4 features)',
      ligand: [{ id: 'L1', t: 'donor', p: [0, 0] }, { id: 'L2', t: 'acceptor', p: [3.0, 0] }, { id: 'L3', t: 'aromatic', p: [1.5, 2.6] }, { id: 'L4', t: 'positive', p: [4.5, 2.6] }],
      pocket: [{ id: 'P1', t: 'acceptor', p: [0, 0] }, { id: 'P2', t: 'donor', p: [3.1, 0.2] }, { id: 'P3', t: 'aromatic', p: [1.4, 2.7] }, { id: 'P4', t: 'negative', p: [4.6, 2.4] }, { id: 'P5', t: 'donor', p: [-2.0, 1.5] }, { id: 'P6', t: 'aromatic', p: [6.0, -1.0] }]
    },
    B: {
      label: 'Ligand B (5 features, harder)',
      ligand: [{ id: 'L1', t: 'donor', p: [0, 0] }, { id: 'L2', t: 'acceptor', p: [2.8, 0.4] }, { id: 'L3', t: 'aromatic', p: [1.2, 2.5] }, { id: 'L4', t: 'hydrophobic', p: [3.8, 2.9] }, { id: 'L5', t: 'acceptor', p: [-1.6, 2.2] }],
      pocket: [{ id: 'P1', t: 'acceptor', p: [0.1, 0] }, { id: 'P2', t: 'donor', p: [2.9, 0.3] }, { id: 'P3', t: 'aromatic', p: [1.3, 2.6] }, { id: 'P4', t: 'hydrophobic', p: [3.6, 3.1] }, { id: 'P5', t: 'donor', p: [-1.5, 2.4] }, { id: 'P6', t: 'hydrophobic', p: [5.5, 0.5] }]
    }
  };
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  /* Build the binding interaction graph: vertices = compatible (ligand, pocket) pairs; edges = geometrically consistent pairs. */
  function dockingGraph(set, tau) {
    var V = [], E = [];
    set.ligand.forEach(function (l) { set.pocket.forEach(function (pk) { var w = PAIR_W[l.t + '|' + pk.t]; if (w) V.push({ l: l, p: pk, w: w, label: l.id + '–' + pk.id }); }); });
    for (var i = 0; i < V.length; i++) for (var j = i + 1; j < V.length; j++) {
      var a = V[i], b = V[j];
      if (a.l === b.l || a.p === b.p) continue;
      if (Math.abs(dist(a.l.p, b.l.p) - dist(a.p.p, b.p.p)) <= tau) E.push([i, j]);
    }
    return { V: V, E: E, n: V.length };
  }
  /* QUBO value for a vertex selection z: total weight minus penalty for every selected pair that is NOT an edge. */
  function cliqueValues(G, penalty) {
    var N = 1 << G.n, val = new Float64Array(N), adj = {};
    G.E.forEach(function (e) { adj[e[0] + ',' + e[1]] = 1; });
    for (var z = 0; z < N; z++) {
      var s = 0, viol = 0;
      for (var i = 0; i < G.n; i++) if ((z >> i) & 1) { s += G.V[i].w; for (var j = i + 1; j < G.n; j++) if ((z >> j) & 1 && !adj[i + ',' + j]) viol++; }
      val[z] = s - penalty * viol;
    }
    return val;
  }
  function isClique(G, z) { var adj = {}; G.E.forEach(function (e) { adj[e[0] + ',' + e[1]] = 1; }); for (var i = 0; i < G.n; i++) for (var j = i + 1; j < G.n; j++) if ((z >> i) & 1 && (z >> j) & 1 && !adj[i + ',' + j]) return false; return true; }

  /* ---------- HP lattice protein folding (2D square lattice, relative-turn encoding) ----------
   * N residues, N-1 bonds; bond 1 points right; each later bond is straight / left / right relative to the previous one,
   * encoded in 2 qubits (00 straight, 01 left, 10 right, 11 invalid). Qubits: 2(N-2). */
  function foldWalk(seq, z) {
    var N = seq.length, pos = [[0, 0], [1, 0]], d = [1, 0], invalid = 0;
    for (var k = 0; k < N - 2; k++) {
      var code = ((z >> (2 * k)) & 1) | (((z >> (2 * k + 1)) & 1) << 1);
      if (code === 1) d = [-d[1], d[0]]; else if (code === 2) d = [d[1], -d[0]]; else if (code === 3) invalid++;
      var last = pos[pos.length - 1]; pos.push([last[0] + d[0], last[1] + d[1]]);
    }
    var seen = {}, overlaps = 0, contacts = [];
    pos.forEach(function (p) { var key = p[0] + ',' + p[1]; if (seen[key] !== undefined) overlaps++; else seen[key] = 1; });
    for (var i = 0; i < N; i++) for (var j = i + 2; j < N; j++) if (seq[i] === 'H' && seq[j] === 'H' && Math.abs(pos[i][0] - pos[j][0]) + Math.abs(pos[i][1] - pos[j][1]) === 1) contacts.push([i, j]);
    return { pos: pos, overlaps: overlaps, invalid: invalid, contacts: contacts, energy: -contacts.length };
  }
  function foldValues(seq, lam) { // value to MAXIMISE = -(energy + penalties)
    lam = lam || 2; var q = 2 * (seq.length - 2), N = 1 << q, v = new Float64Array(N);
    for (var z = 0; z < N; z++) { var w = foldWalk(seq, z); v[z] = -(w.energy + lam * (w.overlaps + w.invalid)); }
    return { values: v, qubits: q };
  }

  /* ---------- synthetic compound dataset (clearly NOT real measurements) ----------
   * Descriptors: logP and molecular weight. "Active" compounds cluster in a drug-like window (rule-of-five inspired). */
  function compounds(n, seed) {
    var r = QG.rng(seed === undefined ? 11 : seed), out = [];
    function gauss() { var u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * PI * v); }
    for (var i = 0; i < n; i++) {
      var active = i % 2 === 0, logP, mw;
      if (active) { logP = 2.2 + gauss() * 0.7; mw = 360 + gauss() * 55; }
      else { var ang = 2 * PI * r(), rad = 1.1 + 0.4 * r(); logP = 2.2 + rad * 2.4 * Math.cos(ang); mw = 360 + rad * 150 * Math.sin(ang); }
      logP = Math.max(-1.5, Math.min(6.5, logP)); mw = Math.max(150, Math.min(650, mw));
      out.push({ id: 'SYN-' + String(i + 1).padStart(3, '0'), logP: +logP.toFixed(2), mw: Math.round(mw), active: active });
    }
    return out;
  }
  function featurise(c) { return [(c.logP - 2.5) / 4, (c.mw - 400) / 250]; }
  function compoundData(n, seed) { var cs = compounds(n || 48, seed); return { compounds: cs, X: cs.map(featurise), y: cs.map(function (c) { return c.active ? 1 : -1; }) }; }

  /* ---------- Grover search over a small library with several marked items ---------- */
  function groverMarked(n, marked, iters) {
    var c = new QG.Circuit(n), N = 1 << n, ph = new Array(N).fill(0), q;
    marked.forEach(function (m) { ph[m] = PI; });
    for (q = 0; q < n; q++) c.h(q);
    for (var k = 0; k < iters; k++) { c.diagonal(ph); QG.algorithms.diffuser(c, n); }
    return c;
  }

  /* ---------- binding energy: proton affinity of helium (He + H+ -> HeH+) in a consistent STO-3G basis ---------- */
  function protonAffinityCurve(Rs, zeta) {
    zeta = zeta || 1.6875; var EHe = QG.chem.atom('He', zeta);
    return { EHe: EHe, points: Rs.map(function (R) { var m = QG.chem.molecule('HeH', R, { zeta: { He: zeta } }); return { R: R, hf: m.hf.energy - EHe, fci: m.fci.energy - EHe, mol: m }; }) };
  }

  QG.drug = { qaoaMax: qaoaMax, qaoaState: qaoaState, qaoaCircuit: qaoaCircuit, normalise: normalise, PHARM: PHARM, PAIR_W: PAIR_W, DOCK_SETS: DOCK_SETS, dockingGraph: dockingGraph, cliqueValues: cliqueValues, isClique: isClique, foldWalk: foldWalk, foldValues: foldValues, compounds: compounds, featurise: featurise, compoundData: compoundData, groverMarked: groverMarked, protonAffinityCurve: protonAffinityCurve };
});
