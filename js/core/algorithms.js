/* Textbook algorithms as circuits split into labelled stages (used by the Algorithm Animator, lessons and Code Lab).
 * Each builder returns { circuit, stages: [{label, desc, end}], ... }, where `end` is the op index after the stage. */
QG.module('algorithms', function (QG) {
  function Builder(nq, nc) { this.c = new QG.Circuit(nq, nc === undefined ? nq : nc); this.stages = []; }
  Builder.prototype.stage = function (label, desc) { this.stages.push({ label: label, desc: desc, end: this.c.ops.length }); return this; };
  Builder.prototype.done = function (extra) { var o = { circuit: this.c, stages: this.stages }; for (var k in extra) o[k] = extra[k]; return o; };

  /* Multi-controlled Z on all listed qubits (phase -1 on |11..1>). */
  function mcz(c, qs) {
    if (qs.length === 1) { c.z(qs[0]); return; }
    if (qs.length === 2) { c.cz(qs[0], qs[1]); return; }
    var t = qs[qs.length - 1]; c.h(t); c.mcx(qs.slice(0, -1), t); c.h(t);
  }
  /* Phase oracle: flip the sign of basis state |m> on qubits 0..n-1. */
  function markOracle(c, n, m) {
    var qs = []; for (var q = 0; q < n; q++) qs.push(q);
    qs.forEach(function (q) { if (!((m >> q) & 1)) c.x(q); });
    mcz(c, qs);
    qs.forEach(function (q) { if (!((m >> q) & 1)) c.x(q); });
  }
  function diffuser(c, n) {
    var qs = []; for (var q = 0; q < n; q++) qs.push(q);
    qs.forEach(function (q) { c.h(q); c.x(q); });
    mcz(c, qs);
    qs.forEach(function (q) { c.x(q); c.h(q); });
  }
  function qft(c, qs, inverse) { // qs[0] = least significant
    var n = qs.length, ops = [];
    var tmp = new QG.Circuit(c.nq);
    for (var j = n - 1; j >= 0; j--) {
      tmp.h(qs[j]);
      for (var k = j - 1; k >= 0; k--) tmp.cp(Math.PI / Math.pow(2, j - k), qs[k], qs[j]);
    }
    for (var i = 0; i < Math.floor(n / 2); i++) tmp.swap(qs[i], qs[n - 1 - i]);
    if (inverse) tmp = tmp.inverse();
    tmp.ops.forEach(function (o) { c.ops.push(o); });
  }

  QG.algorithms = {
    mcz: mcz, markOracle: markOracle, diffuser: diffuser, qftOps: qft,

    /* Optimal number of Grover iterations for 1 marked item among 2^n. */
    groverIterations: function (n) { return Math.max(1, Math.floor(Math.PI / 4 * Math.sqrt(Math.pow(2, n)))); },

    grover: function (n, marked, iters) {
      if (iters === undefined) iters = QG.algorithms.groverIterations(n);
      var b = new Builder(n), c = b.c;
      b.stage('Start', 'All qubits start in $\\ket{0}$.');
      for (var q = 0; q < n; q++) c.h(q);
      b.stage('Superposition', 'H on every qubit: all $2^n$ states have the same amplitude $1/\\sqrt{2^n}$.');
      for (var k = 1; k <= iters; k++) {
        markOracle(c, n, marked);
        b.stage('Oracle ' + k, 'The oracle flips the sign of the marked state only. Probabilities do not change yet, because the amplitude just became negative.');
        diffuser(c, n);
        b.stage('Diffuser ' + k, 'Inversion about the mean: each amplitude $a$ becomes $2\\bar a - a$. The negative marked amplitude jumps far above the mean.');
      }
      return b.done({ marked: marked, iterations: iters, n: n });
    },

    /* Deutsch–Jozsa with a phase oracle. type: 'const0' | 'const1' | 'balanced-x0' | 'balanced-parity' | 'balanced-xn' */
    deutschJozsa: function (n, type) {
      var b = new Builder(n), c = b.c, q;
      b.stage('Start', 'n input qubits in $\\ket{0}$.');
      for (q = 0; q < n; q++) c.h(q);
      b.stage('Superposition', 'H on every qubit: an equal superposition of every input $x$.');
      if (type === 'const1') { var ph = []; for (var i = 0; i < (1 << n); i++) ph.push(Math.PI); c.diagonal(ph); }
      else if (type === 'balanced-x0') c.z(0);
      else if (type === 'balanced-parity') { for (q = 0; q < n; q++) c.z(q); }
      else if (type === 'balanced-xn') c.z(n - 1);
      b.stage('Oracle', 'Phase oracle: $\\ket{x} \\to (-1)^{f(x)}\\ket{x}$. ' + ({ const0: 'f(x) = 0 for every x: nothing changes.', const1: 'f(x) = 1 for every x: every sign flips (a global phase).', 'balanced-x0': 'f(x) = x₀: half the signs flip.', 'balanced-parity': 'f(x) = parity of x: half the signs flip.', 'balanced-xn': 'f(x) = the top bit: half the signs flip.' }[type] || ''));
      for (q = 0; q < n; q++) c.h(q);
      b.stage('Interfere', 'H again. If f is constant every path interferes back into $\\ket{0\\ldots0}$; if balanced, the $\\ket{0\\ldots0}$ amplitude cancels to exactly 0.');
      c.measureAll();
      b.stage('Measure', 'All zeros means constant; anything else means balanced. One query instead of $2^{n-1}+1$.');
      return b.done({ type: type, constant: type === 'const0' || type === 'const1' });
    },

    /* Bernstein–Vazirani: find secret s from f(x) = s·x mod 2 in one query. */
    bernsteinVazirani: function (n, secret) {
      var b = new Builder(n), c = b.c, q;
      b.stage('Start', 'n qubits in $\\ket{0}$.');
      for (q = 0; q < n; q++) c.h(q);
      b.stage('Superposition', 'Equal superposition of every input $x$.');
      for (q = 0; q < n; q++) if ((secret >> q) & 1) c.z(q);
      b.stage('Oracle', 'Phase oracle $(-1)^{s\\cdot x}$. For $f(x) = s \\cdot x$ this is just a Z on every qubit where $s_i = 1$.');
      for (q = 0; q < n; q++) c.h(q);
      b.stage('Interfere', 'H undoes the superposition and leaves exactly $\\ket{s}$.');
      c.measureAll();
      b.stage('Measure', 'The measurement reads the secret string directly.');
      return b.done({ secret: secret });
    },

    /* QFT of the basis state |x>. */
    qft: function (n, x) {
      var b = new Builder(n), c = b.c, q;
      b.stage('Start', 'All qubits in $\\ket{0}$.');
      for (q = 0; q < n; q++) if ((x >> q) & 1) c.x(q);
      b.stage('Input', 'Prepare the basis state $\\ket{' + x + '}$ (binary ' + QG.bitstring(x, n) + ').');
      for (var j = n - 1; j >= 0; j--) {
        c.h(j);
        for (var k = j - 1; k >= 0; k--) c.cp(Math.PI / Math.pow(2, j - k), k, j);
        b.stage('Qubit ' + j, 'H on qubit ' + j + ' then controlled phases from the lower qubits: qubit ' + j + ' now holds one "digit" of the Fourier phase.');
      }
      for (var i = 0; i < Math.floor(n / 2); i++) c.swap(i, n - 1 - i);
      b.stage('Swaps', 'Reverse the qubit order. Output amplitude of $\\ket{y}$ is $\\frac{1}{\\sqrt{N}} e^{2\\pi i x y / N}$ for input $\\ket{x}$.');
      return b.done({ x: x });
    },

    /* Phase estimation of the eigenphase phi of P(2*pi*phi) acting on |1>.  t counting qubits (0..t-1), target qubit t. */
    phaseEstimation: function (t, phi) {
      var b = new Builder(t + 1, t), c = b.c, qs = [], q;
      for (q = 0; q < t; q++) qs.push(q);
      b.stage('Start', 'Counting qubits $q_0\\ldots q_{' + (t - 1) + '}$ and a target qubit $q_' + t + '$.');
      c.x(t);
      b.stage('Eigenstate', 'Put the target in $\\ket{1}$, an eigenstate of $U = P(2\\pi\\varphi)$ with eigenvalue $e^{2\\pi i\\varphi}$.');
      for (q = 0; q < t; q++) c.h(q);
      b.stage('Superposition', 'H on the counting register.');
      for (q = 0; q < t; q++) c.cp(2 * Math.PI * phi * Math.pow(2, q), q, t);
      b.stage('Controlled-U', 'Counting qubit $j$ controls $U^{2^j}$. Phase kickback writes $e^{2\\pi i \\varphi 2^j}$ onto qubit $j$: the counting register now holds the Fourier transform of $\\varphi$.');
      qft(c, qs, true);
      b.stage('Inverse QFT', 'The inverse QFT turns those phases into the binary digits of $\\varphi$.');
      for (q = 0; q < t; q++) c.measure(q, q);
      b.stage('Measure', 'Read $y$; the estimate is $\\varphi \\approx y / 2^t$.');
      return b.done({ phi: phi, t: t });
    },

    /* Order finding for a^x mod N (Shor), simulated directly: returns probabilities of the t-qubit counting register. */
    orderFinding: function (a, Nmod, t) {
      var M = 1 << t, vals = [], r = 0, x;
      for (x = 0, r = 1; x < M; x++) { vals.push(r); r = (r * a) % Nmod; }
      var period = 1; while (period < M && vals[period] !== 1) period++;
      // state: (1/sqrt M) sum_x |x>|a^x mod N>. Measuring the work register gives some value v; the counting
      // register is then a periodic state. Output probabilities after inverse QFT, averaged over v:
      var probs = new Float64Array(M), groups = {};
      for (x = 0; x < M; x++) (groups[vals[x]] = groups[vals[x]] || []).push(x);
      Object.keys(groups).forEach(function (v) {
        var xs = groups[v], w = xs.length / M; // probability of this work-register value
        var sv = new QG.StateVector(t); sv.re[0] = 0;
        xs.forEach(function (xx) { sv.re[xx] = 1 / Math.sqrt(xs.length); });
        var c = new QG.Circuit(t), qs = []; for (var q = 0; q < t; q++) qs.push(q);
        qft(c, qs, true);
        c.ops.forEach(function (op) { sv.applyOp(op); });
        var p = sv.probabilities(); for (var y = 0; y < M; y++) probs[y] += w * p[y];
      });
      return { probs: probs, period: period, values: vals.slice(0, Math.min(M, 24)) };
    },

    /* Continued-fraction expansion of y / 2^t to find a denominator <= Nmax. */
    continuedFraction: function (y, M, Nmax) {
      if (y === 0) return { num: 0, den: 1, steps: [] };
      var h0 = 0, h1 = 1, k0 = 1, k1 = 0, a, num = y, den = M, steps = [], best = { num: 0, den: 1 };
      while (den !== 0) {
        a = Math.floor(num / den);
        var h2 = a * h1 + h0, k2 = a * k1 + k0;
        if (k2 > Nmax) break;
        steps.push(h2 + '/' + k2); best = { num: h2, den: k2 };
        h0 = h1; h1 = h2; k0 = k1; k1 = k2;
        var r = num - a * den; num = den; den = r;
      }
      best.steps = steps; return best;
    },
    gcd: function (a, b) { while (b) { var t = b; b = a % b; a = t; } return Math.abs(a); },
    modpow: function (a, e, m) { var r = 1; a %= m; while (e > 0) { if (e & 1) r = (r * a) % m; a = (a * a) % m; e >>= 1; } return r; },

    /* 3-qubit repetition code: encode q0 into q0,q1,q2, apply noise, decode by majority vote into q0. */
    repetitionCode: function (kind) {
      var b = new Builder(3, 1), c = b.c;
      b.stage('Input', 'The logical qubit starts on $q_0$; $q_1, q_2$ are fresh $\\ket{0}$ helpers.');
      if (kind === 'phase') { c.cx(0, 1).cx(0, 2).h(0).h(1).h(2); b.stage('Encode', 'CNOTs copy the basis value, then H on all three: $\\ket{0}\\to\\ket{+++}$, $\\ket{1}\\to\\ket{---}$. Phase flips now look like bit flips.'); }
      else { c.cx(0, 1).cx(0, 2); b.stage('Encode', 'Two CNOTs: $\\ket{0}\\to\\ket{000}$ and $\\ket{1}\\to\\ket{111}$. This is not cloning: a superposition becomes entangled.'); }
      c.barrier(); b.stage('Noise', 'Each qubit may be flipped independently with probability p.');
      if (kind === 'phase') { c.h(0).h(1).h(2); }
      c.cx(0, 1).cx(0, 2).ccx(2, 1, 0);
      b.stage('Decode', 'Undo the encoding; the Toffoli flips $q_0$ back when both helpers report an error: a majority vote.');
      return b.done({ kind: kind || 'bit', noiseAt: b.stages[2].end });
    }
  };
});
