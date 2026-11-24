/* Quantum-biology labs: Tunnelling (enzymes, isotopes, DNA), Light-Harvesting (FMO), Radical-Pair Compass. */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h, B = QG.bio, PI = Math.PI;
  function css(v) { return QG.charts.cssVar(v); }
  function row(label, input, out, cols) { return h('div', { class: 'ctrl-row', style: cols ? { gridTemplateColumns: cols } : null }, h('span', null, label), input, out); }
  function slider(min, max, step, value, label) { return h('input', { type: 'range', min: min, max: max, step: step, value: value, 'aria-label': label }); }
  function fmtTime(fs) { return fs < 1e3 ? fs.toFixed(0) + ' fs' : fs < 1e6 ? (fs / 1e3).toFixed(1) + ' ps' : fs < 1e9 ? (fs / 1e6).toFixed(1) + ' ns' : fs < 1e12 ? (fs / 1e9).toFixed(1) + ' µs' : fs < 1e15 ? (fs / 1e12).toFixed(1) + ' ms' : (fs / 1e15).toExponential(1) + ' s'; }

  /* =================== Tunnelling =================== */
  var TUNNEL_PRESETS = {
    enzyme: { label: 'Enzyme C–H → O proton transfer', Vb: 12, a: 0.35, eps: 0 },
    shallow: { label: 'Low, thin barrier', Vb: 6, a: 0.3, eps: 0 },
    wide: { label: 'Wide barrier', Vb: 12, a: 0.5, eps: 0 },
    dna: { label: 'DNA base pair: canonical ⇌ tautomer (illustrative)', Vb: 15, a: 0.45, eps: 6 }
  };
  function tunnelLab(el, opt) {
    opt = opt || {};
    var pr = TUNNEL_PRESETS[opt.preset || 'shallow'], st = { Vb: pr.Vb, a: pr.a, eps: pr.eps, iso: 'H', T: 300, t: 0, playing: false };
    var wrap = h('div', { class: opt.compact ? '' : 'lab-grid' }), left = h('div', { class: opt.compact ? '' : 'card' }), right = h('div', { class: opt.compact ? '' : 'card' });
    wrap.appendChild(left); wrap.appendChild(right); el.appendChild(wrap);
    var ctl = h('div'), cv = h('canvas', { style: { width: '100%', maxWidth: '560px', height: 'auto', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }, role: 'img', 'aria-label': 'Double-well potential with the proton probability density' });
    var timeRow = h('div', { class: 'btn-row' }), qbox = h('div', { style: { display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' } }), pchart = h('div'), isoBox = h('div'), sweep = h('div');
    left.appendChild(ctl); left.appendChild(cv); left.appendChild(timeRow); left.appendChild(qbox);
    right.appendChild(h('p', { class: 'panel-title' }, 'Probability of finding the proton on the right')); right.appendChild(pchart);
    right.appendChild(h('p', { class: 'panel-title', style: { marginTop: '12px' } }, 'Isotopes: hydrogen, deuterium, tritium')); right.appendChild(isoBox);
    if (!opt.compact) { right.appendChild(h('p', { class: 'panel-title', style: { marginTop: '12px' } }, 'Tunnelling time vs well separation')); right.appendChild(sweep); }
    var es, dyn, halfP, bloch, timer = null, raf = null;

    var ps = h('select', { 'aria-label': 'Preset' }, h('option', { value: '' }, 'Presets…'), Object.keys(TUNNEL_PRESETS).map(function (k) { return h('option', { value: k }, TUNNEL_PRESETS[k].label); }));
    ps.addEventListener('change', function () { var p = TUNNEL_PRESETS[ps.value]; if (!p) return; st.Vb = p.Vb; st.a = p.a; st.eps = p.eps; ps.value = ''; build(); });
    function build() {
      ctl.innerHTML = '';
      if (!opt.fixed) ctl.appendChild(h('div', { class: 'btn-row' }, ps, ['H', 'D', 'T'].map(function (k) { return h('button', { class: 'btn small' + (st.iso === k ? ' primary' : ''), onclick: function () { st.iso = k; build(); } }, { H: 'Hydrogen (H)', D: 'Deuterium (D)', T: 'Tritium (T)' }[k]); })));
      var sv = slider(2, 25, 0.5, st.Vb, 'Barrier height'), so = h('output', null, st.Vb + ' kcal/mol');
      var sa = slider(0.2, 0.6, 0.01, st.a, 'Half distance between wells'), sao = h('output', null, (2 * st.a).toFixed(2) + ' Å');
      var se = slider(-8, 8, 0.25, st.eps, 'Asymmetry'), seo = h('output', null, st.eps + ' kcal/mol');
      sv.addEventListener('input', function () { st.Vb = +sv.value; so.textContent = st.Vb + ' kcal/mol'; recompute(); });
      sa.addEventListener('input', function () { st.a = +sa.value; sao.textContent = (2 * st.a).toFixed(2) + ' Å'; recompute(); });
      se.addEventListener('input', function () { st.eps = +se.value; seo.textContent = st.eps + ' kcal/mol'; recompute(); });
      ctl.appendChild(row('Barrier', sv, so, '120px 1fr 100px'));
      ctl.appendChild(row('Well distance', sa, sao, '120px 1fr 100px'));
      ctl.appendChild(row('Asymmetry ε', se, seo, '120px 1fr 100px'));
      recompute();
    }
    var recompute = ui.debounce(function () {
      es = B.tunnel.eigenstates({ Vb: st.Vb, a: st.a, eps: st.eps, mass: B.tunnel.MASS[st.iso] }, 16);
      dyn = B.tunnel.dynamics(es, 16); halfP = PI * B.tunnel.HBAR / (es.energies[1] - es.energies[0]); st.t = 0;
      drawPchart(); drawIso(); if (!opt.compact) drawSweep(); drawTimeRow(); frame();
    }, 30);
    function drawTimeRow() {
      timeRow.innerHTML = '';
      var playBtn = h('button', { class: 'btn small primary', onclick: function () { st.playing = !st.playing; playBtn.textContent = st.playing ? '❚❚ Pause' : '▶ Play'; if (st.playing) loop(); } }, st.playing ? '❚❚ Pause' : '▶ Play');
      timeRow.appendChild(playBtn);
      timeRow.appendChild(h('button', { class: 'btn small', onclick: function () { st.t = 0; frame(); } }, 'Reset'));
      tlabel = h('span', { class: 'small muted' }, ''); timeRow.appendChild(tlabel);
    }
    var tlabel = null;
    function loop() {
      var last = performance.now();
      function step(now) {
        if (!st.playing || !document.body.contains(cv)) return;
        st.t += (now - last) / 1000 * (2 * halfP / 5); last = now; // one full back-and-forth in 5 s
        frame(); raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
    }
    function frame() {
      var g = es.grid, s = dyn.at(st.t), W = 560, H = 300, dpr = window.devicePixelRatio || 1;
      cv.width = W * dpr; cv.height = H * dpr; var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var xmin = -2.2 * st.a - 0.3, xmax = 2.2 * st.a + 0.3, emax = st.Vb * 1.6 + Math.abs(st.eps) + 4, emin = Math.min(0, -Math.abs(st.eps) / 2) - 1;
      function X(x) { return 40 + (x - xmin) / (xmax - xmin) * (W - 50); }
      function Y(e) { return H - 28 - (e - emin) / (emax - emin) * (H - 40); }
      ctx.fillStyle = css('--muted'); ctx.font = '11px Roboto, Segoe UI, sans-serif';
      ctx.fillText('kcal/mol', 4, 12); ctx.fillText('position (Å)', W - 70, H - 6);
      [-1, 0, 1].forEach(function (k) { var xx = k * 2 * st.a; if (xx > xmin && xx < xmax) ctx.fillText(xx.toFixed(2), X(xx) - 10, H - 12); });
      [0, Math.round(st.Vb)].forEach(function (e) { ctx.fillText(String(e), 8, Y(e) + 4); });
      // potential
      ctx.beginPath(); var started = false;
      for (var i = 0; i < g.N; i++) { if (g.x[i] < xmin || g.x[i] > xmax || g.V[i] > emax) { started = false; continue; } if (!started) { ctx.moveTo(X(g.x[i]), Y(g.V[i])); started = true; } else ctx.lineTo(X(g.x[i]), Y(g.V[i])); }
      ctx.strokeStyle = css('--text'); ctx.lineWidth = 2; ctx.stroke();
      // energy levels
      es.energies.slice(0, 6).forEach(function (E, k) { if (E > emax) return; ctx.beginPath(); ctx.moveTo(X(xmin), Y(E)); ctx.lineTo(X(xmax), Y(E)); ctx.strokeStyle = k < 2 ? css('--blue') : css('--border'); ctx.setLineDash(k < 2 ? [] : [4, 4]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]); });
      // probability density, drawn on the ground level
      var base = (es.energies[0] + es.energies[1]) / 2, pmax = 0; for (i = 0; i < g.N; i++) pmax = Math.max(pmax, s.prob[i]);
      var scale = (st.Vb * 0.55) / (pmax || 1);
      ctx.beginPath(); ctx.moveTo(X(xmin), Y(base));
      for (i = 0; i < g.N; i++) if (g.x[i] >= xmin && g.x[i] <= xmax) ctx.lineTo(X(g.x[i]), Y(base + s.prob[i] * scale));
      ctx.lineTo(X(xmax), Y(base)); ctx.closePath(); ctx.fillStyle = css('--green'); ctx.globalAlpha = 0.45; ctx.fill(); ctx.globalAlpha = 1;
      if (tlabel) tlabel.textContent = 't = ' + fmtTime(st.t) + ' · P(right) = ' + s.pRight.toFixed(3) + ' · left → right in ' + fmtTime(halfP);
      // two-level (qubit) picture: |L> = north pole, |R> = south pole
      var cL = proj(s, 'L'), cR = proj(s, 'R');
      var b = { x: 2 * (cL[0] * cR[0] + cL[1] * cR[1]), y: 2 * (cL[0] * cR[1] - cL[1] * cR[0]), z: (cL[0] * cL[0] + cL[1] * cL[1]) - (cR[0] * cR[0] + cR[1] * cR[1]) };
      if (!bloch) { qbox.innerHTML = ''; var bb = h('div'); qbox.appendChild(bb); bloch = QG.Bloch(bb, { size: 170, labels: false, caption: false, trail: true }); qbox.appendChild(h('p', { class: 'small', style: { flex: 1, minWidth: '200px' }, html: QG.math.process('<b>The proton as a qubit.</b> Keep only the two lowest states: "left" $\\ket{L}$ = north pole, "right" $\\ket{R}$ = south pole. Tunnelling is a rotation about the x axis, exactly the $R_x$ gate from Track 1, at frequency $\\Delta E/\\hbar$. Asymmetry tilts the axis, so the proton never fully reaches the other side.') })); }
      if (st.t === 0) bloch.clearTrail();
      bloch.set(b);
    }
    var LR = null;
    function proj(s, side) { // overlap with (phi0 +/- phi1)/sqrt2 localised states
      var g = es.grid, sg = 1, pL = 0, i; for (i = 0; i < g.N; i++) if (g.x[i] < 0) pL += Math.pow(es.states[0][i] + es.states[1][i], 2) * g.dx / 2;
      sg = pL > 0.5 ? 1 : -1; var sgn = side === 'L' ? sg : -sg, r = 0, m = 0;
      for (i = 0; i < g.N; i++) { var phi = (es.states[0][i] + sgn * es.states[1][i]) / Math.SQRT2; r += phi * s.re[i] * g.dx; m += phi * s.im[i] * g.dx; }
      return [r, m];
    }
    function drawPchart() {
      var ts = [], ps2 = []; for (var k = 0; k <= 120; k++) { var t = 4 * halfP * k / 120; ts.push(t); ps2.push(dyn.at(t).pRight); }
      var unit = halfP < 2e3 ? 1 : halfP < 2e6 ? 1e3 : 1e6, uname = unit === 1 ? 'fs' : unit === 1e3 ? 'ps' : 'ns';
      pchart.innerHTML = ''; pchart.appendChild(QG.charts.line([{ name: 'P(right)', x: ts.map(function (t) { return t / unit; }), y: ps2 }], { height: 180, xLabel: 'time (' + uname + ')', ymin: 0, ymax: 1 }));
    }
    function drawIso() {
      var r = B.tunnel.isotopes({ Vb: st.Vb, a: st.a, eps: st.eps }, st.T);
      var t = h('table', { class: 'amp-table' }, h('tr', null, h('th', null, 'Isotope'), h('th', null, 'mass'), h('th', null, 'zero-point energy'), h('th', null, 'splitting ΔE'), h('th', null, 'left → right time')));
      ['H', 'D', 'T'].forEach(function (k) { t.appendChild(h('tr', { style: k === st.iso ? { fontWeight: 600 } : null }, h('td', null, k), h('td', null, B.tunnel.MASS[k].toFixed(2)), h('td', { class: 'mono' }, r[k].zpe.toFixed(2) + ' kcal/mol'), h('td', { class: 'mono' }, r[k].splitting.toExponential(2)), h('td', { class: 'mono' }, fmtTime(r[k].tunnelTimeFs)))); });
      isoBox.innerHTML = ''; isoBox.appendChild(t);
      isoBox.appendChild(h('p', { class: 'small', html: QG.math.process('Kinetic isotope effect $k_H/k_D$ at ' + st.T + ' K: <b>' + r.kieClassical.toFixed(1) + '</b> if the proton only hops <i>over</i> the barrier (the difference in zero-point energy; the classical limit is about 7), but <b>' + (r.kieTunnel > 1e4 ? r.kieTunnel.toExponential(1) : r.kieTunnel.toFixed(0)) + '</b> for pure ground-state tunnelling (WKB, an upper bound). Measured KIEs far above 7, like ≈80 in soybean lipoxygenase, are the experimental fingerprint of tunnelling.') }));
    }
    function drawSweep() {
      var as = [], ser = { H: [], D: [], T: [] };
      for (var k = 0; k <= 12; k++) { var a = 0.2 + 0.3 * k / 12; as.push(2 * a); ['H', 'D', 'T'].forEach(function (iso) { var e = B.tunnel.eigenstates({ Vb: st.Vb, a: a, eps: 0, mass: B.tunnel.MASS[iso] }, 2); ser[iso].push(Math.log10(PI * B.tunnel.HBAR / (e.energies[1] - e.energies[0]) * 1e-15)); }); }
      sweep.innerHTML = '';
      sweep.appendChild(QG.charts.line(['H', 'D', 'T'].map(function (k) { return { name: k, x: as, y: ser[k] }; }), { height: 200, xLabel: 'distance between the wells (Å)', yLabel: 'log₁₀ tunnelling time (s)' }));
      sweep.appendChild(h('p', { class: 'small muted' }, 'Tunnelling time grows exponentially with distance and with √mass. Enzymes are thought to use protein motions to squeeze donor and acceptor together for an instant.'));
    }
    build();
  }

  /* =================== FMO light harvesting =================== */
  var FMO_POS = [[0.18, 0.2], [0.42, 0.1], [0.78, 0.72], [0.62, 0.48], [0.38, 0.6], [0.2, 0.78], [0.62, 0.86]]; // schematic layout
  function fmoLab(el, opt) {
    opt = opt || {};
    var st = { logG: Math.log10(opt.gamma || 100), start: 0, kTrap: 1, tMax: 2, frame: 0 };
    var wrap = h('div', { class: opt.compact ? '' : 'lab-grid' }), left = h('div', { class: opt.compact ? '' : 'card' }), right = h('div', { class: opt.compact ? '' : 'card' });
    wrap.appendChild(left); wrap.appendChild(right); el.appendChild(wrap);
    var ctl = h('div'), net = h('div'), tl = h('div', { class: 'btn-row' }), pop = h('div'), eff = h('div'), exc = h('div');
    left.appendChild(ctl); left.appendChild(net); left.appendChild(tl);
    right.appendChild(h('p', { class: 'panel-title' }, 'Site populations')); right.appendChild(pop);
    right.appendChild(h('p', { class: 'panel-title', style: { marginTop: '12px' } }, 'Transfer efficiency vs environmental noise')); right.appendChild(eff);
    if (!opt.compact) { left.appendChild(h('p', { class: 'panel-title', style: { marginTop: '12px' } }, 'Exciton states (eigenstates of H)')); left.appendChild(exc); }
    var gS = slider(-1, 4, 0.05, st.logG, 'Dephasing rate (log scale)'), gO = h('output'), sS = h('select', { 'aria-label': 'Initially excited site' }, [0, 5].map(function (k) { return h('option', { value: k }, 'site ' + (k + 1) + (k === 0 ? ' (antenna side)' : '')); }));
    gS.addEventListener('input', function () { st.logG = +gS.value; gO.textContent = Math.pow(10, st.logG).toFixed(st.logG < 0 ? 2 : 0) + ' cm⁻¹'; run(); });
    sS.addEventListener('change', function () { st.start = +sS.value; run(); drawEff(); });
    gO.textContent = Math.pow(10, st.logG).toFixed(0) + ' cm⁻¹';
    ctl.appendChild(row('Dephasing γ', gS, gO, '110px 1fr 90px'));
    ctl.appendChild(h('div', { class: 'btn-row' }, h('label', { class: 'inline' }, 'Excite ', sS), h('span', { class: 'small muted' }, 'Trap at site 3 (→ reaction centre) 1 ps⁻¹ · loss 1 ns⁻¹')));
    var ev = null, effCache = {};
    var run = ui.debounce(function () {
      var g = Math.pow(10, st.logG);
      ev = B.fmo.evolve({ gamma: g, kTrap: st.kTrap, kLoss: 0.001, start: st.start, tMax: st.tMax, dt: 0.002, every: 5 });
      st.frame = ev.t.length - 1;
      drawPop(); drawNet(); drawEffMarker();
    }, 25);
    function drawPop() {
      var series = [];
      for (var s = 0; s < 7; s++) series.push({ name: 'site ' + (s + 1), x: ev.t, y: ev.pops.map(function (p) { return p[s]; }), color: siteColor(s) });
      series.push({ name: 'trapped (delivered)', x: ev.t, y: ev.trapped, color: css('--text'), dashed: true });
      pop.innerHTML = ''; pop.appendChild(QG.charts.line(series, { height: 240, xLabel: 'time (ps)', ymin: 0, ymax: 1 }));
    }
    function siteColor(s) { return 'hsl(' + [215, 140, 45, 260, 190, 330, 95][s] + ',65%,45%)'; }
    function drawNet() {
      var S2 = ui.svg, W = 300, svg = S2('svg', { viewBox: '0 0 ' + W + ' ' + W, width: W, style: 'max-width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px', role: 'img', 'aria-label': 'FMO network; brighter sites hold more excitation' });
      var H = B.fmo.H, p = ev.pops[st.frame];
      for (var i = 0; i < 7; i++) for (var j = i + 1; j < 7; j++) { var J = Math.abs(H[i][j]); if (J < 15) continue; svg.appendChild(S2('line', { x1: FMO_POS[i][0] * W, y1: FMO_POS[i][1] * W, x2: FMO_POS[j][0] * W, y2: FMO_POS[j][1] * W, stroke: css('--muted'), 'stroke-width': J / 15, opacity: 0.6 })); }
      for (i = 0; i < 7; i++) {
        var x = FMO_POS[i][0] * W, y = FMO_POS[i][1] * W;
        svg.appendChild(S2('circle', { cx: x, cy: y, r: 20, fill: css('--yellow'), 'fill-opacity': Math.min(1, 0.08 + 1.6 * p[i]), stroke: i === 2 ? css('--green') : css('--text'), 'stroke-width': i === 2 ? 3 : 1 }));
        svg.appendChild(S2('text', { x: x, y: y + 4, 'text-anchor': 'middle', style: 'font:600 12px var(--font);fill:var(--text)', text: String(i + 1) }));
        svg.appendChild(S2('text', { x: x, y: y + 34, 'text-anchor': 'middle', style: 'font:10px var(--font);fill:var(--muted)', text: (H[i][i] + 12000) + ' cm⁻¹' }));
      }
      svg.appendChild(S2('text', { x: W - 8, y: 16, 'text-anchor': 'end', style: 'font:11px var(--font);fill:var(--green)', text: 'site 3 → reaction centre' }));
      net.innerHTML = ''; net.appendChild(svg);
      tl.innerHTML = '';
      var fr = slider(0, ev.t.length - 1, 1, st.frame, 'Time'), fo = h('output', null, ev.t[st.frame].toFixed(2) + ' ps');
      fr.addEventListener('input', function () { st.frame = +fr.value; drawNet(); });
      tl.appendChild(h('div', { class: 'ctrl-row', style: { gridTemplateColumns: '50px 1fr 70px', width: '100%' } }, h('span', null, 'time'), fr, fo));
      tl.appendChild(h('button', { class: 'btn small', onclick: function () { var k = 0; var tm = setInterval(function () { if (!document.body.contains(net) || k >= ev.t.length) { clearInterval(tm); return; } st.frame = k; drawNet(); k += 4; }, 40); } }, '▶ Animate'));
    }
    function effCurve() {
      var key = st.start; if (effCache[key]) return effCache[key];
      var xs = [], ys = []; for (var k = 0; k <= 40; k++) { var lg = -1 + 5 * k / 40; xs.push(lg); ys.push(B.fmo.efficiency({ gamma: Math.pow(10, lg), kTrap: st.kTrap, kLoss: 0.001, start: st.start })); }
      return (effCache[key] = { xs: xs, ys: ys });
    }
    var effMark = null;
    function drawEff() { effMark = null; drawEffMarker(); }
    function drawEffMarker() {
      var c = effCurve(), e = B.fmo.efficiency({ gamma: Math.pow(10, st.logG), kTrap: st.kTrap, kLoss: 0.001, start: st.start });
      var best = c.ys.indexOf(Math.max.apply(null, c.ys));
      eff.innerHTML = '';
      eff.appendChild(QG.charts.line([{ name: 'efficiency η', x: c.xs, y: c.ys }, { name: 'current γ', x: [st.logG], y: [e], pointsOnly: true, color: css('--yellow') }], { height: 200, xLabel: 'log₁₀ dephasing rate γ (cm⁻¹)', yLabel: 'η' }));
      eff.appendChild(h('p', { class: 'small', html: 'Efficiency at this γ: <b>' + (e * 100).toFixed(1) + '%</b>. Best ' + (c.ys[best] * 100).toFixed(1) + '% at γ ≈ ' + Math.pow(10, c.xs[best]).toFixed(0) + ' cm⁻¹. Too little noise: the excitation is trapped by energy mismatches (interference, localisation). Too much: the quantum Zeno effect freezes it. In between, noise <b>helps</b>: environment-assisted quantum transport.' }));
    }
    function drawExc() {
      var E = B.fmo.excitons(), t = h('table', { class: 'amp-table' }, h('tr', null, h('th', null, 'exciton'), h('th', null, 'energy (cm⁻¹)'), h('th', null, 'spread over ≈ sites'), h('th', null, 'main sites')));
      E.values.forEach(function (v, k) { var vec = E.vectors[k], ipr = 0, main = []; for (var s = 0; s < 7; s++) { ipr += Math.pow(vec[s], 4); if (vec[s] * vec[s] > 0.2) main.push(s + 1); } t.appendChild(h('tr', null, h('td', null, String(k + 1)), h('td', { class: 'mono' }, (v + 12000).toFixed(0)), h('td', { class: 'mono' }, (1 / ipr).toFixed(2)), h('td', null, main.join(', ')))); });
      exc.innerHTML = ''; exc.appendChild(t);
      exc.appendChild(h('p', { class: 'small muted' }, 'Couplings between pigments mix the site states: each exciton is a superposition spread over several chlorophylls. The 7 single-excitation states could be encoded in 3 qubits (binary) or 7 qubits (one per site).'));
    }
    run(); if (!opt.compact) drawExc();
  }

  /* =================== Radical-pair compass =================== */
  function compassLab(el, opt) {
    opt = opt || {};
    var st = { B: 50, A: 1.0, axial: true, logk: 0, theta: 45 };
    var wrap = h('div', { class: opt.compact ? '' : 'lab-grid' }), left = h('div', { class: opt.compact ? '' : 'card' }), right = h('div', { class: opt.compact ? '' : 'card' });
    wrap.appendChild(left); wrap.appendChild(right); el.appendChild(wrap);
    var ctl = h('div'), polar = h('div', { style: { display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' } }), trace = h('div');
    left.appendChild(ctl); left.appendChild(polar); right.appendChild(h('p', { class: 'panel-title' }, 'Singlet probability over time (no recombination)')); right.appendChild(trace);
    var sB = slider(0, 100, 1, st.B, 'Field strength'), oB = h('output'), sA = slider(0, 2, 0.05, st.A, 'Hyperfine coupling'), oA = h('output'), sk = slider(-2, 2, 0.1, st.logk, 'Recombination rate'), ok2 = h('output'), sT = slider(0, 180, 1, st.theta, 'Field angle'), oT = h('output');
    var ax = h('select', { 'aria-label': 'Hyperfine coupling shape' }, h('option', { value: 'axial' }, 'Anisotropic (axial) hyperfine'), h('option', { value: 'iso' }, 'Isotropic hyperfine'));
    function lab() { oB.textContent = st.B + ' µT'; oA.textContent = st.A.toFixed(2) + ' mT'; ok2.textContent = Math.pow(10, st.logk).toFixed(st.logk < 0 ? 2 : 1) + ' µs⁻¹'; oT.textContent = st.theta + '°'; }
    [[sB, 'B'], [sA, 'A'], [sk, 'logk'], [sT, 'theta']].forEach(function (p) { p[0].addEventListener('input', function () { st[p[1]] = +p[0].value; lab(); p[1] === 'theta' ? drawTheta() : drawAll(); }); });
    ax.addEventListener('change', function () { st.axial = ax.value === 'axial'; drawAll(); });
    ctl.appendChild(h('div', { class: 'btn-row' }, ax));
    ctl.appendChild(row('Field B', sB, oB, '130px 1fr 80px')); ctl.appendChild(row('Hyperfine A', sA, oA, '130px 1fr 80px'));
    ctl.appendChild(row('Recombination k', sk, ok2, '130px 1fr 80px')); ctl.appendChild(row('Field angle θ', sT, oT, '130px 1fr 80px'));
    lab();
    var curve = null;
    function params(theta) { return { B: st.B / 1000, A: st.axial ? [0, 0, st.A] : [st.A / 3, st.A / 3, st.A / 3], k: Math.pow(10, st.logk), theta: theta }; }
    var drawAll = ui.debounce(function () { curve = B.radicalPair.angularYield(params(0), 61); drawTheta(); }, 40);
    function drawTheta() {
      if (!curve) return;
      var th = st.theta * PI / 180, y = B.radicalPair.singletYield(params(th)).yield;
      // mirror 0..180 to a full circle (the yield is symmetric under theta -> -theta)
      var angs = curve.theta.concat(curve.theta.slice(1).map(function (t) { return 2 * PI - t; }).reverse()), vals = curve.yield.concat(curve.yield.slice(1).reverse());
      polar.innerHTML = '';
      polar.appendChild(QG.charts.polar(angs, vals, { size: 250, marker: [th, y], title: 'Singlet yield vs field direction' }));
      polar.appendChild(h('div', { class: 'small', style: { flex: 1, minWidth: '200px' }, html: QG.math.process(
        '<dl class="kv"><dt>Singlet yield at θ</dt><dd>' + y.toFixed(4) + '</dd><dt>Compass signal (max − min)</dt><dd>' + curve.anisotropy.toFixed(4) + '</dd></dl>' +
        '<p>The pair starts in the singlet $\\ket{\\Psi^-}$, the entangled Bell state from Track 2. The field and the nuclear spin rotate the two electrons at slightly different rates, converting singlet to triplet. How much stays singlet depends on the field <b>direction</b>, so the chemical product could act as a compass. ' + (st.axial ? '' : '<b>With isotropic coupling the plot is a perfect circle: no compass.</b> ') + (Math.pow(10, st.logk) > 5 ? '<b>Recombination is too fast</b>: the spins have no time to feel the weak field.' : '') + '</p>') }));
      var ts = [], ps = []; for (var k = 0; k <= 600; k++) { var t = 2 * k / 600; ts.push(t); } ps = B.radicalPair.singletTrace(params(th), ts); // fine sampling: hyperfine period ~0.04 us
      var env = ts.map(function (t) { return Math.exp(-Math.pow(10, st.logk) * t); });
      trace.innerHTML = ''; trace.appendChild(QG.charts.line([{ name: 'P(singlet)', x: ts, y: ps }, { name: 'fraction not yet recombined e^(−kt)', x: ts, y: env, dashed: true, color: css('--muted') }], { height: 220, xLabel: 'time (µs)', ymin: 0, ymax: 1 }));
    }
    drawAll();
  }

  QG.labs.tunneling = function (el) {
    el.appendChild(h('div', { class: 'lab-head' }, h('h1', null, 'Tunnelling Lab'), h('span', { class: 'muted small' }, 'A proton in a double-well potential · exact quantum dynamics · H, D and T isotopes')));
    tunnelLab(el, {});
    el.appendChild(h('div', { class: 'callout reality', style: { marginTop: '16px' } }, h('strong', null, 'Toy model vs reality'), 'A one-dimensional quartic double well with a fixed shape. Real enzymatic proton transfer couples to protein motions, solvent and temperature; rate theories (for example vibrationally enhanced tunnelling) average over many configurations. The trends here, exponential sensitivity to distance and mass, are robust; the absolute numbers are illustrative.'));
  };
  QG.labs.fmo = function (el) {
    el.appendChild(h('div', { class: 'lab-head' }, h('h1', null, 'Light-Harvesting Lab'), h('span', { class: 'muted small' }, 'Energy transfer in the 7-site FMO complex · Lindblad dephasing · efficiency vs noise')));
    fmoLab(el, {});
    el.appendChild(h('div', { class: 'callout reality', style: { marginTop: '16px' } }, h('strong', null, 'Toy model vs reality'), 'Hamiltonian from Adolphs & Renger (2006). Dephasing is modelled as white noise of equal strength on every site (Haken–Strobl), the simplest model. Real protein environments have memory and specific vibrations. Whether long-lived electronic coherence matters for photosynthetic efficiency is still debated; many oscillations seen in experiments are now attributed to vibrations.'));
  };
  QG.labs.compass = function (el) {
    el.appendChild(h('div', { class: 'lab-head' }, h('h1', null, 'Radical-Pair Compass'), h('span', { class: 'muted small' }, 'Two electron spins + one nuclear spin = 3 "qubits" · singlet yield vs field direction')));
    compassLab(el, {});
    el.appendChild(h('div', { class: 'callout reality', style: { marginTop: '16px' } }, h('strong', null, 'Toy model vs reality'), 'Real cryptochrome radical pairs have dozens of coupled nuclear spins, spin relaxation and electron–electron interactions. One nucleus with an axial coupling shows the key mechanism: direction-dependent singlet–triplet conversion that needs spin coherence lasting around a microsecond.'));
  };
  QG.widgets.tunnel = function (el, o) { tunnelLab(el, Object.assign({ compact: true }, o)); };
  QG.widgets.fmo = function (el, o) { fmoLab(el, Object.assign({ compact: true }, o)); };
  QG.widgets.compass = function (el, o) { compassLab(el, Object.assign({ compact: true }, o)); };

  /* Timescales: why "warm, wet and noisy" matters */
  QG.widgets.timescales = function (el) {
    var c = h('div', { class: 'card' }); el.appendChild(c);
    var data = [['Electronic coherence in a warm protein (FMO, measured)', -12.7], ['Proton tunnelling across 0.6 Å (this course\'s model)', -12.8], ['Bond vibration (C–H stretch period)', -14], ['Excitation reaches FMO reaction centre', -12], ['Radical-pair spin coherence needed for a compass', -6], ['Superconducting qubit T2', -3.7], ['Enzyme turnover (one reaction)', -3]];
    var t = h('table', { class: 'amp-table' }, h('tr', null, h('th', null, 'Process'), h('th', null, 'Time (s)'), h('th', null, '')));
    data.forEach(function (d) { t.appendChild(h('tr', null, h('td', null, d[0]), h('td', { class: 'mono' }, '10^' + d[1]), h('td', null, h('div', { style: { height: '8px', width: ((d[1] + 15) * 18) + 'px', background: 'var(--blue)', borderRadius: '4px' } })))); });
    c.appendChild(t);
    c.appendChild(h('p', { class: 'small muted' }, 'Order-of-magnitude values. Quantum effects can matter in biology when the process is faster than decoherence. Femtosecond to picosecond events, and well-shielded spins, are the candidates.'));
  };
})();
