/* Quantum-biology models (teaching scale):
 *   QG.bio.fft                       radix-2 complex FFT
 *   QG.bio.tridiagEigen              lowest eigenpairs of a symmetric tridiagonal matrix
 *   QG.bio.tunnel.*                  proton in a double well: eigenstates, dynamics, WKB, isotope effects
 *   QG.bio.fmo.*                     7-site FMO exciton transport with dephasing (Lindblad), efficiency
 *   QG.bio.radicalPair.*             2 electron spins + 1 nuclear spin: singlet yield vs field direction
 * Units: tunnelling uses angstrom, kcal/mol, amu, fs. FMO uses cm^-1 and ps. Radical pair uses mT and microseconds. */
QG.module('biology', function (QG) {
  var PI = Math.PI;

  /* ---------- FFT (in place, re/im Float64Arrays, length power of 2) ---------- */
  function fft(re, im, inverse) {
    var n = re.length, i, j, k;
    for (i = 1, j = 0; i < n; i++) { var bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (var len = 2; len <= n; len <<= 1) {
      var ang = 2 * PI / len * (inverse ? 1 : -1), wr = Math.cos(ang), wi = Math.sin(ang);
      for (i = 0; i < n; i += len) {
        var cr = 1, ci = 0;
        for (k = 0; k < len / 2; k++) {
          var ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
          var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
    if (inverse) for (i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }

  /* LU factorisation of (T - shift I) with partial pivoting (LAPACK dgttrf), T tridiagonal with diagonal d and off-diagonal e. */
  function luTridiag(d, e, shift) {
    var n = d.length, D = new Float64Array(n), DL = Float64Array.from(e), DU = Float64Array.from(e), DU2 = new Float64Array(Math.max(1, n - 2)), piv = new Int32Array(n), i;
    for (i = 0; i < n; i++) { D[i] = d[i] - shift; piv[i] = i; }
    for (i = 0; i < n - 1; i++) {
      if (Math.abs(D[i]) >= Math.abs(DL[i])) {
        if (D[i] !== 0) { var f = DL[i] / D[i]; DL[i] = f; D[i + 1] -= f * DU[i]; }
      } else {
        var f2 = D[i] / DL[i]; D[i] = DL[i]; DL[i] = f2;
        var tmp = DU[i]; DU[i] = D[i + 1]; D[i + 1] = tmp - f2 * D[i + 1];
        if (i < n - 2) { DU2[i] = DU[i + 1]; DU[i + 1] = -f2 * DU[i + 1]; }
        piv[i] = i + 1;
      }
    }
    for (i = 0; i < n; i++) if (Math.abs(D[i]) < 1e-300) D[i] = 1e-300;
    return { n: n, D: D, DL: DL, DU: DU, DU2: DU2, piv: piv };
  }
  function solveTridiag(F, b) { // overwrite b with (T - shift)^-1 b  (LAPACK dgtts2)
    var n = F.n, i;
    for (i = 0; i < n - 1; i++) {
      if (F.piv[i] === i) b[i + 1] -= F.DL[i] * b[i];
      else { var t = b[i]; b[i] = b[i + 1]; b[i + 1] = t - F.DL[i] * b[i]; }
    }
    b[n - 1] /= F.D[n - 1];
    if (n > 1) b[n - 2] = (b[n - 2] - F.DU[n - 2] * b[n - 1]) / F.D[n - 2];
    for (i = n - 3; i >= 0; i--) b[i] = (b[i] - F.DU[i] * b[i + 1] - F.DU2[i] * b[i + 2]) / F.D[i];
  }

  /* ---------- symmetric tridiagonal eigenproblem: bisection (Sturm counts) + inverse iteration ---------- */
  function tridiagEigen(d, e, count) { // d: diagonal (n), e: off-diagonal (n-1)
    var n = d.length, lo = Infinity, hi = -Infinity, i;
    for (i = 0; i < n; i++) { var r = (i > 0 ? Math.abs(e[i - 1]) : 0) + (i < n - 1 ? Math.abs(e[i]) : 0); lo = Math.min(lo, d[i] - r); hi = Math.max(hi, d[i] + r); }
    function below(x) { var c = 0, q = 1; for (var k = 0; k < n; k++) { q = d[k] - x - (k > 0 ? e[k - 1] * e[k - 1] / (q === 0 ? 1e-300 : q) : 0); if (q < 0) c++; } return c; }
    var vals = [], vecs = [];
    for (var m = 0; m <= Math.min(count, n - 1); m++) {
      var a = lo, b = hi;
      for (var it = 0; it < 200 && b - a > 1e-15 * Math.max(1, Math.abs(a) + Math.abs(b)); it++) { var mid = (a + b) / 2; if (below(mid) > m) b = mid; else a = mid; }
      vals.push((a + b) / 2);
    }
    for (m = 0; m < count; m++) {
      var lam = vals[m], gap = Math.min(m > 0 ? lam - vals[m - 1] : Infinity, vals[m + 1] !== undefined ? vals[m + 1] - lam : Infinity);
      if (!(gap > 0) || !isFinite(gap)) gap = 1e-12;
      // inverse iteration (Thomas algorithm), shifted by 1% of the gap to the nearest other eigenvalue
      var rnd = QG.rng(1234 + m), v = new Float64Array(n); for (i = 0; i < n; i++) v[i] = rnd() - 0.5;
      var sh = lam - 0.01 * gap, LU = luTridiag(d, e, sh);
      for (var pass = 0; pass < 4; pass++) {
        solveTridiag(LU, v);
        // orthogonalise against earlier vectors (degenerate pairs) and normalise
        for (var q = 0; q < vecs.length; q++) { var s = 0; for (i = 0; i < n; i++) s += v[i] * vecs[q][i]; for (i = 0; i < n; i++) v[i] -= s * vecs[q][i]; }
        var nr = 0; for (i = 0; i < n; i++) nr += v[i] * v[i]; nr = Math.sqrt(nr); for (i = 0; i < n; i++) v[i] /= nr;
      }
      vecs.push(v);
    }
    return { values: vals.slice(0, count), vectors: vecs };
  }

  /* ---------- proton tunnelling in a double well ---------- */
  var HB2M = 0.0481764;   // hbar^2 / (2 * 1 amu) in kcal/mol * angstrom^2
  var HBAR = 15.17765;    // hbar in kcal/mol * fs
  var KB = 0.0019872;     // Boltzmann constant in kcal/mol/K
  var MASS = { H: 1.00783, D: 2.01410, T: 3.01605 };
  /* p: {Vb barrier kcal/mol, a half-distance between minima (angstrom), eps asymmetry kcal/mol, mass amu, N grid, L half-width} */
  function grid(p) {
    var N = p.N || 512, L = p.L || Math.max(1.2, 3 * p.a), dx = 2 * L / (N - 1), x = new Float64Array(N), V = new Float64Array(N);
    for (var i = 0; i < N; i++) { x[i] = -L + i * dx; var u = x[i] / p.a; V[i] = p.Vb * Math.pow(u * u - 1, 2) + (p.eps || 0) * 0.5 * u * (u * u > 1 ? 1 / Math.abs(u) : 1); }
    return { N: N, L: L, dx: dx, x: x, V: V, a: p.a };
  }
  function eigenstates(p, count) {
    var g = grid(p), t = HB2M / p.mass / (g.dx * g.dx), d = new Float64Array(g.N), e = new Float64Array(g.N - 1);
    for (var i = 0; i < g.N; i++) d[i] = g.V[i] + 2 * t;
    for (i = 0; i < g.N - 1; i++) e[i] = -t;
    var E = tridiagEigen(d, e, count || 6);
    E.vectors.forEach(function (v) { var s = 0; for (var k = 0; k < v.length; k++) s += v[k]; if (s < 0) for (k = 0; k < v.length; k++) v[k] = -v[k]; for (k = 0; k < v.length; k++) v[k] /= Math.sqrt(g.dx); });
    return { grid: g, energies: E.values, states: E.vectors };
  }
  /* Left-localised start (phi0 -/+ phi1)/sqrt2 and its exact time evolution from the eigen-expansion. */
  function dynamics(es, nStates) {
    var g = es.grid, M = Math.min(nStates || es.states.length, es.states.length), c = new Float64Array(M);
    var pL = 0; for (var i = 0; i < g.N; i++) if (g.x[i] < 0) pL += Math.pow(es.states[0][i] + es.states[1][i], 2) * g.dx / 2;
    var sgn = pL > 0.5 ? 1 : -1; c[0] = Math.SQRT1_2; c[1] = sgn * Math.SQRT1_2;
    return {
      at: function (tfs) { // returns {re, im, prob, pRight}
        var re = new Float64Array(g.N), im = new Float64Array(g.N), pr = 0;
        for (var n = 0; n < M; n++) { if (!c[n]) continue; var ph = -es.energies[n] * tfs / HBAR, cr = c[n] * Math.cos(ph), ci = c[n] * Math.sin(ph); for (var k = 0; k < g.N; k++) { re[k] += cr * es.states[n][k]; im[k] += ci * es.states[n][k]; } }
        var prob = new Float64Array(g.N); for (k = 0; k < g.N; k++) { prob[k] = re[k] * re[k] + im[k] * im[k]; if (g.x[k] > 0) pr += prob[k] * g.dx; }
        return { re: re, im: im, prob: prob, pRight: pr };
      }
    };
  }
  /* Split-operator propagation exp(-iH dt/hbar) for nSteps (FFT kinetic step). */
  function splitOperator(g, mass, re, im, dt, nSteps) {
    var N = g.N, k = new Float64Array(N), dk = 2 * PI / (N * g.dx);
    for (var i = 0; i < N; i++) k[i] = (i < N / 2 ? i : i - N) * dk;
    var hv = [], tk = [];
    for (i = 0; i < N; i++) { var a = -g.V[i] * dt / (2 * HBAR); hv.push([Math.cos(a), Math.sin(a)]); var b = -HB2M / mass * k[i] * k[i] * dt / HBAR; tk.push([Math.cos(b), Math.sin(b)]); }
    function mul(ph) { for (var j = 0; j < N; j++) { var r = re[j] * ph[j][0] - im[j] * ph[j][1], s = re[j] * ph[j][1] + im[j] * ph[j][0]; re[j] = r; im[j] = s; } }
    for (var s = 0; s < nSteps; s++) { mul(hv); fft(re, im, false); mul(tk); fft(re, im, true); mul(hv); }
  }
  /* WKB tunnelling probability at energy E through the barrier between the wells. */
  function wkb(g, mass, E) {
    // only the barrier between the two wells (|x| < a), not the outer walls
    var a = g.a || 0.3, s = 0; for (var i = 0; i < g.N; i++) if (Math.abs(g.x[i]) < a && g.V[i] > E) s += Math.sqrt((g.V[i] - E) * mass / HB2M) * g.dx;
    return Math.exp(-2 * s);
  }
  /* Isotope comparison for one well: splitting, tunnelling time, zero-point energy, KIE estimates at temperature T. */
  function isotopes(p, T) {
    T = T || 300; var out = {};
    Object.keys(MASS).forEach(function (iso) {
      var q = Object.assign({}, p, { mass: MASS[iso] }), es = eigenstates(q, 2), dE = es.energies[1] - es.energies[0];
      var Vmin = Math.min.apply(null, es.grid.V), zpe = es.energies[0] - Vmin;
      out[iso] = { splitting: dE, tunnelTimeFs: PI * HBAR / dE, zpe: zpe, wkb: wkb(es.grid, MASS[iso], es.energies[0]), ground: es.energies[0] };
    });
    out.kieClassical = Math.exp((out.H.zpe - out.D.zpe) / (KB * T)); // over-barrier rate with reactant zero-point energy only
    out.kieTunnel = (out.H.wkb * Math.sqrt(MASS.D / MASS.H)) / out.D.wkb;  // ground-state tunnelling: attempt frequency ~ 1/sqrt(m)
    return out;
  }

  /* ---------- FMO light-harvesting complex ----------
   * 7-site Hamiltonian (cm^-1) of Chlorobaculum tepidum FMO, site energies and couplings from Adolphs & Renger,
   * Biophys. J. 91, 2778 (2006), (site energies 12410, 12530, 12210, 12320, 12480, 12630, 12440 cm^-1), widely reproduced e.g. by Ishizaki & Fleming, PNAS 106, 17255 (2009); a constant 12000 cm^-1 is subtracted. */
  var FMO_H = [
    [410, -87.7, 5.5, -5.9, 6.7, -13.7, -9.9],
    [-87.7, 530, 30.8, 8.2, 0.7, 11.8, 4.3],
    [5.5, 30.8, 210, -53.5, -2.2, -9.6, 6.0],
    [-5.9, 8.2, -53.5, 320, -70.7, -17.0, -63.3],
    [6.7, 0.7, -2.2, -70.7, 480, 81.1, -1.3],
    [-13.7, 11.8, -9.6, -17.0, 81.1, 630, 39.7],
    [-9.9, 4.3, 6.0, -63.3, -1.3, 39.7, 440]];
  var CM_TO_RADPS = 2 * PI * 2.99792458e-2; // 1 cm^-1 = 0.18836 rad/ps
  /* d rho/dt for the single-excitation density matrix. opt: {gamma (dephasing, cm^-1), kTrap (1/ps), trap (site index), kLoss (1/ps)} */
  function fmoDeriv(H, o) {
    var n = H.length, g = (o.gamma || 0) * CM_TO_RADPS, kt = o.kTrap || 0, kl = o.kLoss || 0, trap = o.trap === undefined ? 2 : o.trap;
    var w = H.map(function (r) { return r.map(function (v) { return v * CM_TO_RADPS; }); });
    return function (R, I, dR, dI) { // R, I: n x n arrays (flattened)
      for (var j = 0; j < n; j++) for (var k = 0; k < n; k++) {
        // -i [H, rho]_jk = -i sum_m (H_jm rho_mk - rho_jm H_mk)
        var sr = 0, si = 0;
        for (var m = 0; m < n; m++) { var a = w[j][m], b = w[m][k]; sr += a * R[m * n + k] - R[j * n + m] * b; si += a * I[m * n + k] - I[j * n + m] * b; }
        var vr = si, vi = -sr; // multiply by -i
        var dec = kl + (j !== k ? g : 0) + 0.5 * kt * ((j === trap ? 1 : 0) + (k === trap ? 1 : 0));
        dR[j * n + k] = vr - dec * R[j * n + k]; dI[j * n + k] = vi - dec * I[j * n + k];
      }
    };
  }
  function fmoEvolve(o) { // RK4; returns populations over time and trapped/lost totals
    var H = o.H || FMO_H, n = H.length, f = fmoDeriv(H, o), R = new Float64Array(n * n), I = new Float64Array(n * n), dt = o.dt || 0.002, T = o.tMax || 2, every = o.every || 10;
    R[(o.start || 0) * (n + 1)] = 1;
    var t = 0, out = { t: [], pops: [], trapped: [], trapAcc: 0 }, trap = o.trap === undefined ? 2 : o.trap;
    var k1r = new Float64Array(n * n), k1i = new Float64Array(n * n), k2r = new Float64Array(n * n), k2i = new Float64Array(n * n), k3r = new Float64Array(n * n), k3i = new Float64Array(n * n), k4r = new Float64Array(n * n), k4i = new Float64Array(n * n), tr = new Float64Array(n * n), ti = new Float64Array(n * n);
    function rec() { out.t.push(t); var p = []; for (var j = 0; j < n; j++) p.push(R[j * (n + 1)]); out.pops.push(p); out.trapped.push(out.trapAcc); }
    rec();
    for (var s = 1; t < T - 1e-12; s++) {
      f(R, I, k1r, k1i);
      for (var q = 0; q < n * n; q++) { tr[q] = R[q] + 0.5 * dt * k1r[q]; ti[q] = I[q] + 0.5 * dt * k1i[q]; } f(tr, ti, k2r, k2i);
      for (q = 0; q < n * n; q++) { tr[q] = R[q] + 0.5 * dt * k2r[q]; ti[q] = I[q] + 0.5 * dt * k2i[q]; } f(tr, ti, k3r, k3i);
      for (q = 0; q < n * n; q++) { tr[q] = R[q] + dt * k3r[q]; ti[q] = I[q] + dt * k3i[q]; } f(tr, ti, k4r, k4i);
      var p3a = R[trap * (n + 1)];
      for (q = 0; q < n * n; q++) { R[q] += dt / 6 * (k1r[q] + 2 * k2r[q] + 2 * k3r[q] + k4r[q]); I[q] += dt / 6 * (k1i[q] + 2 * k2i[q] + 2 * k3i[q] + k4i[q]); }
      out.trapAcc += (o.kTrap || 0) * dt * 0.5 * (p3a + R[trap * (n + 1)]);
      t += dt; if (s % every === 0) rec();
    }
    return out;
  }
  /* Exact transfer efficiency eta = kTrap * integral rho_trap dt, from the Liouvillian: L x = -rho0. */
  function fmoEfficiency(o) {
    var H = o.H || FMO_H, n = H.length, f = fmoDeriv(H, o), D = 2 * n * n, A = [], b = new Array(D).fill(0), trap = o.trap === undefined ? 2 : o.trap;
    var R = new Float64Array(n * n), I = new Float64Array(n * n), dR = new Float64Array(n * n), dI = new Float64Array(n * n);
    for (var c = 0; c < D; c++) { // column c of L
      R.fill(0); I.fill(0); if (c < n * n) R[c] = 1; else I[c - n * n] = 1;
      f(R, I, dR, dI);
      for (var r = 0; r < D; r++) { if (!A[r]) A[r] = new Array(D); A[r][c] = r < n * n ? dR[r] : dI[r - n * n]; }
    }
    b[(o.start || 0) * (n + 1)] = -1;
    var x = QG.qml.solve(A, b);
    return (o.kTrap || 0) * x[trap * (n + 1)];
  }
  function fmoExcitons(H) { var E = QG.eigen.symmetric(H || FMO_H); return E; }

  /* ---------- radical-pair compass ----------
   * Electron 1 couples to one spin-1/2 nucleus with an axial hyperfine tensor; electron 2 has none.
   * Spins: electron1 (x) electron2 (x) nucleus (8 states). Field B (mT) at angle theta from the hyperfine axis. */
  var GAMMA_E = 176.0859; // rad / microsecond / mT
  function spinOps() {
    var I2 = [[1, 0], [0, 1]], sx = [[0, .5], [.5, 0]], sz = [[.5, 0], [0, -.5]], syI = [[0, -.5], [.5, 0]]; // sy = i * syI
    function kron(A, B) { var a = A.length, b = B.length, C = []; for (var i = 0; i < a * b; i++) C.push(new Array(a * b).fill(0)); for (i = 0; i < a; i++) for (var j = 0; j < a; j++) for (var k = 0; k < b; k++) for (var l = 0; l < b; l++) C[i * b + k][j * b + l] = A[i][j] * B[k][l]; return C; }
    function k3(A, B, Cm) { return kron(kron(A, B), Cm); }
    return { I2: I2, sx: sx, sz: sz, syI: syI, k3: k3 };
  }
  function rpHamiltonian(o) {
    var S = spinOps(), w = GAMMA_E * (o.B === undefined ? 0.05 : o.B), th = o.theta || 0, A = o.A || [0, 0, 1], N = 8;
    var re = [], im = []; for (var i = 0; i < N; i++) { re.push(new Array(N).fill(0)); im.push(new Array(N).fill(0)); }
    function addR(M, c) { for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) re[i][j] += c * M[i][j]; }
    function addI(M, c) { for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) im[i][j] += c * M[i][j]; }
    // Zeeman on both electrons: w (sin th Sx + cos th Sz)
    [[S.sx, S.I2, S.I2], [S.I2, S.sx, S.I2]].forEach(function (t) { addR(S.k3(t[0], t[1], t[2]), w * Math.sin(th)); });
    [[S.sz, S.I2, S.I2], [S.I2, S.sz, S.I2]].forEach(function (t) { addR(S.k3(t[0], t[1], t[2]), w * Math.cos(th)); });
    // hyperfine: Axx Sx Ix + Ayy Sy Iy + Azz Sz Iz (electron 1, nucleus), A in mT
    addR(S.k3(S.sx, S.I2, S.sx), GAMMA_E * A[0]);
    addR(S.k3(S.syI, S.I2, S.syI), -GAMMA_E * A[1]); // (i a)(x)(i b) = -(a x b): Sy x Iy is real
    addR(S.k3(S.sz, S.I2, S.sz), GAMMA_E * A[2]);
    return { re: re, im: im };
  }
  function singletProjector() {
    var S = spinOps(), N = 8, P = [];
    for (var i = 0; i < N; i++) { P.push(new Array(N).fill(0)); P[i][i] = 0.25; }
    // P_S = 1/4 - S1.S2  (real: Sx Sx + Sz Sz real, Sy Sy = -(syI syI) real)
    var xx = S.k3(S.sx, S.sx, S.I2), yy = S.k3(S.syI, S.syI, S.I2), zz = S.k3(S.sz, S.sz, S.I2);
    for (i = 0; i < N; i++) for (var j = 0; j < N; j++) P[i][j] -= xx[i][j] - yy[i][j] + zz[i][j];
    return P;
  }
  var PS_CACHE = null;
  /* Singlet yield Phi_S = (1/Tr P_S) sum_mn |<m|P_S|n>|^2 k^2 / (k^2 + w_mn^2)   (Haberkorn recombination, rate k in 1/us) */
  function singletYield(o) {
    var Hm = rpHamiltonian(o), E = QG.eigen.hermitian(Hm.re, Hm.im), P = PS_CACHE || (PS_CACHE = singletProjector()), k = o.k === undefined ? 1 : o.k, N = 8, Y = 0;
    var M = []; // <m|P|n>
    for (var m = 0; m < N; m++) { M.push([]); for (var n = 0; n < N; n++) { var sr = 0, si = 0; for (var a = 0; a < N; a++) for (var b = 0; b < N; b++) { if (!P[a][b]) continue; var vr = E.vectors[n].re[b], vi = E.vectors[n].im[b], ur = E.vectors[m].re[a], ui = E.vectors[m].im[a]; sr += P[a][b] * (ur * vr + ui * vi); si += P[a][b] * (ur * vi - ui * vr); } M[m].push(sr * sr + si * si); } }
    for (m = 0; m < N; m++) for (n = 0; n < N; n++) { var dw = E.values[m] - E.values[n]; Y += M[m][n] * k * k / (k * k + dw * dw); }
    return { yield: Y / 2, M: M, E: E.values };
  }
  function singletTrace(o, ts) { // P_S(t) without recombination, from the eigen decomposition
    var r = singletYield(Object.assign({}, o, { k: 1 })), N = 8;
    return ts.map(function (t) { var s = 0; for (var m = 0; m < N; m++) for (var n = 0; n < N; n++) s += r.M[m][n] * Math.cos((r.E[m] - r.E[n]) * t); return s / 2; });
  }
  function angularYield(o, nAngles) {
    var th = [], y = []; nAngles = nAngles || 91;
    for (var i = 0; i < nAngles; i++) { var t = PI * i / (nAngles - 1); th.push(t); y.push(singletYield(Object.assign({}, o, { theta: t })).yield); }
    return { theta: th, yield: y, anisotropy: Math.max.apply(null, y) - Math.min.apply(null, y) };
  }

  QG.bio = {
    fft: fft, tridiagEigen: tridiagEigen,
    tunnel: { HB2M: HB2M, HBAR: HBAR, KB: KB, MASS: MASS, grid: grid, eigenstates: eigenstates, dynamics: dynamics, splitOperator: splitOperator, wkb: wkb, isotopes: isotopes },
    fmo: { H: FMO_H, CM_TO_RADPS: CM_TO_RADPS, evolve: fmoEvolve, efficiency: fmoEfficiency, excitons: fmoExcitons },
    radicalPair: { GAMMA_E: GAMMA_E, hamiltonian: rpHamiltonian, singletYield: singletYield, singletTrace: singletTrace, angularYield: angularYield }
  };
});
