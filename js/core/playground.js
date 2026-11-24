/* Playground engine: the same problem run three ways.
 *   cpu   = real JavaScript, one step at a time
 *   gpu   = a MODEL of ideal parallel hardware (P threads); counts parallel steps, nothing runs on a GPU
 *   qubit = exact simulation of the quantum circuit with the QGiriBio engine
 * Every result reports `cost` in the same unit for all three backends (stated in `unit`). */
QG.module('playground', function (QG) {
  var PI = Math.PI;

  /* 1. Random bits */
  function coin(shots, seed, P) {
    P = P || 1024; var rnd = QG.rng(seed), z = 0, i;
    for (i = 0; i < shots; i++) if (rnd() < 0.5) z++;
    var cpu = { zeros: z, ones: shots - z, cost: shots };
    z = 0; for (i = 0; i < shots; i++) if (rnd() < 0.5) z++;
    var gpu = { zeros: z, ones: shots - z, cost: Math.ceil(shots / P), threads: P };
    var c = new QG.Circuit(1); c.h(0).measure(0, 0);
    var r = QG.run(c, { shots: shots, seed: seed === undefined ? undefined : seed + 1 });
    var qubit = { zeros: r.counts['0'] || 0, ones: r.counts['1'] || 0, cost: shots, circuit: c, counts: r.counts };
    return { unit: 'time steps to make all the bits', cpu: cpu, gpu: gpu, qubit: qubit, shots: shots };
  }

  /* 2. Unsorted search over N = 2^n items (one marked) */
  function search(n, target, seed, P) {
    P = P || 64; var N = 1 << n, rnd = QG.rng(seed);
    if (target === undefined || target === null) target = Math.floor(rnd() * N);
    var checks = 0; for (var i = 0; i < N; i++) { checks++; if (i === target) break; }
    var cpu = { found: target, cost: checks, worst: N };
    var gpu = { found: target, cost: Math.ceil(N / P), threads: P, note: 'every thread scans its own slice of ' + Math.ceil(N / P) + ' items' };
    var k = QG.algorithms.groverIterations(n), g = QG.algorithms.grover(n, target, k), sv = g.circuit.statevector(), pr = sv.probabilities();
    var u = rnd(), acc = 0, meas = 0; for (i = 0; i < N; i++) { acc += pr[i]; if (u <= acc) { meas = i; break; } }
    var th = Math.asin(1 / Math.sqrt(N));
    var qubit = { iterations: k, cost: k, pSuccess: pr[target], theory: Math.pow(Math.sin((2 * k + 1) * th), 2), measured: meas, found: meas === target, probs: pr, circuit: g.circuit, gates: g.circuit.gateCount() };
    return { unit: 'checks of the list (oracle queries)', N: N, n: n, target: target, cpu: cpu, gpu: gpu, qubit: qubit };
  }
  function searchScaling(P) {
    P = P || 64; var xs = [], cpu = [], gpu = [], q = [];
    for (var n = 4; n <= 40; n += 2) { var N = Math.pow(2, n); xs.push(n); cpu.push(Math.log10(N)); gpu.push(Math.log10(Math.max(1, N / P))); q.push(Math.log10(Math.max(1, Math.floor(PI / 4 * Math.sqrt(N))))); }
    return { bits: xs, cpu: cpu, gpu: gpu, qubit: q };
  }

  /* 3. Entanglement: matching rate and the CHSH game */
  function bell(shots, seed) {
    var rnd = QG.rng(seed), m1 = 0, m2 = 0, i;
    for (i = 0; i < shots; i++) if ((rnd() < 0.5) === (rnd() < 0.5)) m1++;
    for (i = 0; i < shots; i++) if ((rnd() < 0.5) === (rnd() < 0.5)) m2++;
    var c = new QG.Circuit(2); c.h(0).cx(0, 1).measureAll();
    var r = QG.run(c, { shots: shots, seed: seed === undefined ? undefined : seed + 2 }), mq = (r.counts['00'] || 0) + (r.counts['11'] || 0);
    // CHSH: best classical strategy (always answer 0) vs the entangled strategy
    var cw = 0, qw = 0;
    for (i = 0; i < shots; i++) {
      var x = rnd() < 0.5 ? 1 : 0, y = rnd() < 0.5 ? 1 : 0;
      if (0 === (x & y)) cw++;
      var aA = x ? PI / 4 : 0, bA = y ? -PI / 8 : PI / 8, qc = new QG.Circuit(2); qc.h(0).cx(0, 1).ry(-2 * aA, 0).ry(-2 * bA, 1);
      var p = qc.statevector().probabilities(), u = rnd(), k = 0, acc = p[0]; while (u > acc && k < 3) { k++; acc += p[k]; }
      if (((k & 1) ^ ((k >> 1) & 1)) === (x & y)) qw++;
    }
    return {
      unit: 'fraction of rounds where the two bits agree',
      cpu: { match: m1 / shots, chsh: cw / shots, cost: 2 * shots },
      gpu: { match: m2 / shots, chsh: cw / shots, cost: 2 },
      qubit: { match: mq / shots, chsh: qw / shots, counts: r.counts, circuit: c, cost: shots },
      shots: shots
    };
  }

  /* 4. Factoring N: trial division vs Shor's order finding */
  function factor(N, seed, P) {
    P = P || 32; var rnd = QG.rng(seed), A = QG.algorithms;
    var tried = 0, f = 0; for (var d = 2; d * d <= N; d++) { tried++; if (N % d === 0) { f = d; break; } }
    var cpu = { factors: f ? [f, N / f] : null, cost: tried };
    var root = Math.floor(Math.sqrt(N)), gpu = { factors: cpu.factors, cost: Math.ceil((root - 1) / P), threads: P };
    var t = 2 * Math.ceil(Math.log2(N)), attempts = [], found = null;
    for (var at = 0; at < 12 && !found; at++) {
      var a = 2 + Math.floor(rnd() * (N - 3)), g0 = A.gcd(a, N), rec = { a: a };
      if (g0 > 1) { rec.note = 'lucky: gcd(' + a + ', ' + N + ') = ' + g0 + ' (no quantum step needed)'; found = [g0, N / g0]; attempts.push(rec); break; }
      var o = A.orderFinding(a, N, t), u = rnd(), acc = 0, y = 0;
      for (y = 0; y < o.probs.length; y++) { acc += o.probs[y]; if (u <= acc) break; }
      var cf = A.continuedFraction(y, 1 << t, N), r = cf.den; rec.y = y; rec.r = r; rec.truePeriod = o.period;
      if (y === 0 || A.modpow(a, r, N) !== 1) rec.note = 'measured y = ' + y + ': no usable period, try again';
      else if (r % 2) rec.note = 'period r = ' + r + ' is odd, pick another a';
      else {
        var h = A.modpow(a, r / 2, N), f1 = A.gcd(h - 1, N), f2 = A.gcd(h + 1, N);
        if (f1 > 1 && f1 < N) found = [f1, N / f1]; else if (f2 > 1 && f2 < N) found = [f2, N / f2];
        rec.note = found ? 'period r = ' + r + ' → gcd(' + a + '^' + (r / 2) + ' ± 1, ' + N + ') gives ' + found.join(' × ') : 'period r = ' + r + ' gives only trivial factors, try again';
      }
      attempts.push(rec);
    }
    var qubit = { factors: found ? found.slice().sort(function (p, q) { return p - q; }) : null, attempts: attempts, cost: attempts.length, qubits: t + Math.ceil(Math.log2(N)), countingQubits: t };
    return { unit: 'steps (divisions, or quantum runs)', N: N, cpu: cpu, gpu: gpu, qubit: qubit };
  }
  function factorScaling(P) { // log10 of rough step counts vs number of bits of N
    P = P || 32; var xs = [], cpu = [], gpu = [], q = [];
    for (var b = 8; b <= 2048; b *= 2) { xs.push(b); cpu.push(b / 2 * Math.log10(2)); gpu.push(Math.max(0, b / 2 * Math.log10(2) - Math.log10(P))); q.push(Math.log10(Math.pow(b, 3))); }
    return { bits: xs, cpu: cpu, gpu: gpu, qubit: q };
  }

  QG.playground = { coin: coin, search: search, searchScaling: searchScaling, bell: bell, factor: factor, factorScaling: factorScaling };
});
