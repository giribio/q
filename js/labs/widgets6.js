/* Track 6 (chemistry) widgets. */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h, W = QG.widgets, PI = Math.PI;
  function card(el) { var c = h('div', { class: 'card' }); el.appendChild(c); return c; }
  function css(v) { return QG.charts.cssVar(v); }

  /* Slater 1s orbital vs its STO-nG Gaussian fits */
  W['sto3g-fit'] = function (el) {
    var c = card(el), zs = h('input', { type: 'range', min: 0.8, max: 2.4, step: 0.01, value: 1.24, 'aria-label': 'Slater exponent zeta' }), zo = h('output'), plot = h('div'), txt = h('p', { class: 'small' });
    c.appendChild(h('div', { class: 'ctrl-row' }, h('span', { class: 'm' }, 'ζ (exponent)'), zs, zo)); c.appendChild(plot); c.appendChild(txt);
    // STO-1G and STO-2G fits (Szabo & Ostlund table 3.8), STO-3G from the engine
    var FITS = { 1: { a: [0.270950], d: [1.0] }, 2: { a: [0.151623, 0.851819], d: [0.678914, 0.430129] }, 3: { a: QG.chem.STO3G.a, d: QG.chem.STO3G.d } };
    function draw() {
      var z = +zs.value; zo.textContent = z.toFixed(2);
      var rs = [], sl = [], series = [];
      for (var k = 0; k <= 120; k++) { var r = 4 * k / 120; rs.push(r); sl.push(Math.pow(z * z * z / PI, 0.5) * Math.exp(-z * r)); }
      series.push({ name: 'Slater 1s: e^(−ζr)', x: rs, y: sl });
      [1, 3].forEach(function (n) {
        var f = FITS[n], ys = rs.map(function (r) { var v = 0; for (var i = 0; i < f.a.length; i++) { var a = f.a[i] * z * z; v += f.d[i] * Math.pow(2 * a / PI, 0.75) * Math.exp(-a * r * r); } return v; });
        series.push({ name: 'STO-' + n + 'G (' + n + ' Gaussian' + (n > 1 ? 's' : '') + ')', x: rs, y: ys, dashed: n === 1 });
      });
      plot.innerHTML = ''; plot.appendChild(QG.charts.line(series, { height: 230, xLabel: 'distance from the nucleus r (bohr)', yLabel: 'φ(r)', ymin: 0 }));
      txt.innerHTML = QG.math.process('Slater functions $e^{-\\zeta r}$ have the right shape (a cusp at the nucleus) but their two-electron integrals are hard. Gaussians $e^{-\\alpha r^2}$ are easy to integrate, because the product of two Gaussians is another Gaussian. STO-3G fits each Slater orbital with 3 Gaussians: close everywhere except right at the nucleus. Hydrogen in molecules uses ζ = 1.24; helium in HeH⁺ uses 2.0925.');
    }
    zs.addEventListener('input', draw); draw();
  };

  /* Why classical simulation is hard: Hilbert-space dimension vs number of orbitals */
  W.scaling = function (el) {
    var c = card(el), plot = h('div'); c.appendChild(plot);
    function choose(n, k) { var r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }
    var xs = [], det = [], qb = [];
    for (var K = 2; K <= 50; K += 2) { xs.push(K); det.push(Math.log10(Math.pow(choose(K, K / 2), 2))); qb.push(Math.log10(2 * K)); }
    plot.appendChild(QG.charts.line([{ name: 'log₁₀(number of configurations), half-filled', x: xs, y: det }, { name: 'log₁₀(qubits needed = 2 × orbitals)', x: xs, y: qb }], { height: 230, xLabel: 'number of spatial orbitals K', yLabel: 'log₁₀' }));
    c.appendChild(h('p', { class: 'small', html: QG.math.process('With $K$ orbitals and $K$ electrons, exact (full CI) needs $\\binom{K}{K/2}^2$ configurations: about $10^{28}$ for $K = 50$, more than any computer could store. A quantum computer needs only $2K$ = 100 qubits to hold the same state. That gap is the main motivation for quantum chemistry on quantum computers.') }));
  };

  /* How many shots for chemical accuracy? */
  W.precision = function (el) {
    var c = card(el), es = h('input', { type: 'range', min: -4, max: -1, step: 0.05, value: Math.log10(0.0016), 'aria-label': 'Target precision' }), eo = h('output'), out = h('div');
    c.appendChild(h('div', { class: 'ctrl-row', style: { gridTemplateColumns: '130px 1fr 90px' } }, h('span', null, 'target precision ε'), es, eo)); c.appendChild(out);
    var m = QG.chem.molecule('H2', 0.735), lam = m.parity2.filter(function (t) { return !/^I+$/.test(t.p); }).reduce(function (s, t) { return s + Math.abs(t.c); }, 0);
    function draw() {
      var eps = Math.pow(10, +es.value), N = Math.pow(lam / eps, 2); eo.textContent = (eps * 1000).toFixed(2) + ' mHa';
      out.innerHTML = QG.math.process('<p>Each energy is a sum of measured averages, so its statistical error falls only as $1/\\sqrt{\\text{shots}}$. A safe estimate: $N \\approx (\\lambda/\\varepsilon)^2$ with $\\lambda = \\sum_k |c_k|$ (excluding the identity).</p>' +
        '<dl class="kv"><dt>λ for H₂ (2 qubits)</dt><dd>' + lam.toFixed(4) + ' Ha</dd><dt>shots per energy evaluation</dt><dd>≈ ' + Math.round(N).toLocaleString() + '</dd><dt>at 10,000 shots per second</dt><dd>' + (N / 1e4 < 60 ? (N / 1e4).toFixed(1) + ' s' : (N / 6e5).toFixed(1) + ' min') + ' per evaluation, and VQE needs hundreds of evaluations</dd></dl>' +
        '<p class="small">For real molecules λ grows to hundreds of hartree with thousands of terms. Measurement cost is one of the biggest practical obstacles for VQE, which is why grouping commuting terms and smarter estimators are active research.</p>');
    }
    es.addEventListener('input', draw); draw();
  };
})();
