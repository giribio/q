/* Algorithm Animator: step through textbook algorithms stage by stage, watching the amplitudes. */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h, A = QG.algorithms;

  var ALGS = {
    grover: {
      title: 'Grover search', blurb: 'Find one marked item among $2^n$ using about $\\frac{\\pi}{4}\\sqrt{2^n}$ oracle calls instead of $2^n/2$.',
      controls: [{ key: 'n', label: 'Qubits n', type: 'range', min: 2, max: 6, value: 3 }, { key: 'marked', label: 'Marked item', type: 'range', min: 0, max: 7, value: 5, dynMax: function (p) { return (1 << p.n) - 1; } }, { key: 'iters', label: 'Iterations', type: 'range', min: 1, max: 12, value: 2, auto: function (p) { return A.groverIterations(p.n); } }],
      build: function (p) { return A.grover(p.n, p.marked, p.iters); }, mean: true,
      highlight: function (p) { return [p.marked]; },
      readout: function (p, sv) { var pm = sv.probabilities()[p.marked], th = Math.asin(1 / Math.sqrt(1 << p.n)); return 'P(marked |' + QG.bitstring(p.marked, p.n) + '⟩) = <b>' + pm.toFixed(4) + '</b>. Optimal: ' + A.groverIterations(p.n) + ' iterations. Theory after k iterations: $\\sin^2((2k+1)\\theta)$ with $\\theta = ' + th.toFixed(4) + '$.'; }
    },
    dj: {
      title: 'Deutsch–Jozsa', blurb: 'Decide whether $f$ is constant or balanced with a single query.',
      controls: [{ key: 'n', label: 'Qubits n', type: 'range', min: 2, max: 5, value: 3 }, { key: 'type', label: 'Oracle f', type: 'select', value: 'balanced-x0', options: [['const0', 'constant: f(x) = 0'], ['const1', 'constant: f(x) = 1'], ['balanced-x0', 'balanced: f(x) = x₀'], ['balanced-parity', 'balanced: parity of x'], ['balanced-xn', 'balanced: top bit']] }],
      build: function (p) { return A.deutschJozsa(p.n, p.type); }, highlight: function () { return [0]; },
      readout: function (p, sv) { var p0 = sv.probabilities()[0]; return 'P(all zeros) = <b>' + p0.toFixed(4) + '</b> → f is <b>' + (p0 > 0.5 ? 'constant' : 'balanced') + '</b>.'; }
    },
    bv: {
      title: 'Bernstein–Vazirani', blurb: 'Learn a hidden bit string $s$ from $f(x) = s\\cdot x \\bmod 2$ with one query.',
      controls: [{ key: 'n', label: 'Qubits n', type: 'range', min: 2, max: 6, value: 4 }, { key: 'secret', label: 'Secret s', type: 'range', min: 0, max: 15, value: 11, dynMax: function (p) { return (1 << p.n) - 1; }, fmt: function (v, p) { return QG.bitstring(v, p.n); } }],
      build: function (p) { return A.bernsteinVazirani(p.n, p.secret); }, highlight: function (p) { return [p.secret]; },
      readout: function (p, sv) { var pr = sv.probabilities(), best = 0; for (var i = 0; i < pr.length; i++) if (pr[i] > pr[best]) best = i; return 'Most likely outcome: <b>' + QG.bitstring(best, p.n) + '</b> (secret ' + QG.bitstring(p.secret, p.n) + ').'; }
    },
    qft: {
      title: 'Quantum Fourier transform', blurb: 'The QFT maps $\\ket{x}$ to $\\frac{1}{\\sqrt N}\\sum_y e^{2\\pi i xy/N}\\ket{y}$: every amplitude has the same size, and the phase winds $x$ times around the circle.',
      controls: [{ key: 'n', label: 'Qubits n', type: 'range', min: 2, max: 5, value: 3 }, { key: 'x', label: 'Input x', type: 'range', min: 0, max: 7, value: 1, dynMax: function (p) { return (1 << p.n) - 1; } }],
      build: function (p) { return A.qft(p.n, p.x); },
      readout: function (p) { return 'Output phases step by $2\\pi x / N$ = ' + Math.round(360 * p.x / (1 << p.n)) + '° from one basis state to the next.'; }
    },
    qpe: {
      title: 'Phase estimation', blurb: 'Estimate the eigenphase $\\varphi$ of a unitary $U\\ket{u} = e^{2\\pi i\\varphi}\\ket{u}$ to $t$ bits.',
      controls: [{ key: 't', label: 'Counting qubits t', type: 'range', min: 2, max: 5, value: 3 }, { key: 'phi', label: 'Phase φ', type: 'range', min: 0, max: 0.984375, step: 0.015625, value: 0.375, fmt: function (v) { return v.toFixed(4); } }],
      build: function (p) { return A.phaseEstimation(p.t, p.phi); },
      marginal: function (p, sv) { var M = 1 << p.t, o = {}, pr = sv.probabilities(); for (var y = 0; y < M; y++) o[QG.bitstring(y, p.t)] = pr[y] + pr[y + M]; return o; },
      readout: function (p, sv) { var M = 1 << p.t, pr = sv.probabilities(), best = 0, bp = 0; for (var y = 0; y < M; y++) { var v = pr[y] + pr[y + M]; if (v > bp) { bp = v; best = y; } } return 'Most likely y = ' + best + ' → estimate φ ≈ ' + best + '/' + M + ' = <b>' + (best / M).toFixed(4) + '</b> (true φ = ' + p.phi.toFixed(4) + ', P = ' + bp.toFixed(3) + '). ' + (Math.abs(p.phi * M - Math.round(p.phi * M)) < 1e-9 ? 'φ has an exact ' + p.t + '-bit expansion, so the answer is certain.' : 'φ needs more than ' + p.t + ' bits, so the result is spread around the best estimate.'); }
    }
  };

  function animator(el, opt) {
    opt = opt || {};
    var key = opt.alg || 'grover', cfg, params = {}, built, stage = 0, timer = null;
    var head = h('div'), ctrl = h('div'), nav = h('div', { class: 'btn-row' }), circ = h('div'), desc = h('div', { class: 'callout', style: { marginTop: '10px' } }), amp = h('div'), prob = h('div'), info = h('p', { class: 'small' });
    var wrap = h('div', { class: opt.compact ? '' : 'lab-grid' }), left = h('div', { class: opt.compact ? '' : 'card' }), right = h('div', { class: opt.compact ? '' : 'card' });
    wrap.appendChild(left); wrap.appendChild(right); el.appendChild(wrap);
    left.appendChild(head); left.appendChild(ctrl); left.appendChild(nav); left.appendChild(circ); left.appendChild(desc);
    right.appendChild(amp); right.appendChild(prob); right.appendChild(info);

    function select(k) {
      key = k; cfg = ALGS[k]; params = {};
      cfg.controls.forEach(function (c) { params[c.key] = c.value; });
      Object.assign(params, opt.params || {});
      drawHead(); drawControls(); rebuild(0);
    }
    function drawHead() {
      head.innerHTML = '';
      if (!opt.fixed) {
        var sel = h('select', { 'aria-label': 'Algorithm' }, Object.keys(ALGS).map(function (k) { return h('option', { value: k, selected: k === key ? 'selected' : null }, ALGS[k].title); }));
        sel.addEventListener('change', function () { stop(); opt.params = null; select(sel.value); });
        head.appendChild(h('div', { class: 'btn-row' }, h('label', { class: 'inline' }, 'Algorithm ', sel)));
      }
      head.appendChild(h('p', { class: 'small', html: QG.math.process(cfg.blurb) }));
    }
    function drawControls() {
      ctrl.innerHTML = '';
      cfg.controls.forEach(function (c) {
        var out = h('output'), input;
        if (c.type === 'select') {
          input = h('select', { 'aria-label': c.label }, c.options.map(function (o) { return h('option', { value: o[0], selected: o[0] === params[c.key] ? 'selected' : null }, o[1]); }));
          input.addEventListener('change', function () { params[c.key] = input.value; rebuild(0); });
          ctrl.appendChild(h('div', { class: 'ctrl-row', style: { gridTemplateColumns: '130px 1fr' } }, h('span', null, c.label), input));
          return;
        }
        var max = c.dynMax ? c.dynMax(params) : c.max;
        if (params[c.key] > max) params[c.key] = max;
        input = h('input', { type: 'range', min: c.min, max: max, step: c.step || 1, value: params[c.key], 'aria-label': c.label });
        out.textContent = c.fmt ? c.fmt(params[c.key], params) : params[c.key];
        input.addEventListener('input', function () {
          params[c.key] = +input.value; out.textContent = c.fmt ? c.fmt(params[c.key], params) : params[c.key];
          if (c.key === 'n' || c.key === 't') { cfg.controls.forEach(function (d) { if (d.auto) params[d.key] = d.auto(params); }); drawControls(); }
          rebuild(null);
        });
        ctrl.appendChild(h('div', { class: 'ctrl-row', style: { gridTemplateColumns: '130px 1fr 60px' } }, h('span', null, c.label), input, out));
      });
    }
    function rebuild(st) {
      built = cfg.build(params);
      stage = st === null ? Math.min(stage, built.stages.length - 1) : st;
      if (st === null) stage = built.stages.length - 1;
      draw();
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function draw() {
      var S = built.stages, s = S[stage], c = built.circuit;
      nav.innerHTML = '';
      nav.appendChild(h('button', { class: 'btn small', disabled: stage === 0 ? true : null, onclick: function () { stop(); stage--; draw(); } }, '← Back'));
      nav.appendChild(h('button', { class: 'btn small primary', disabled: stage === S.length - 1 ? true : null, onclick: function () { stop(); stage++; draw(); } }, 'Next →'));
      nav.appendChild(h('button', { class: 'btn small', onclick: function () { stop(); stage = 0; draw(); timer = setInterval(function () { if (!document.body.contains(el) || stage >= S.length - 1) { stop(); return; } stage++; draw(); }, 1400); } }, '▶ Play all'));
      nav.appendChild(h('span', { class: 'small muted' }, 'Stage ' + (stage + 1) + ' of ' + S.length + ': ' + s.label));
      if (!opt.compact) nav.appendChild(h('button', { class: 'btn small', onclick: function () { ui.codeModal('Qiskit (Python)', QG.toQiskit(c), key + '.py'); } }, 'Qiskit'));
      circ.innerHTML = ''; circ.appendChild(QG.circuitView(c, { stages: S, upto: s.end, compact: opt.compact }));
      desc.innerHTML = '<strong>' + ui.esc(s.label) + '</strong>' + QG.math.process(s.desc);
      var sv = c.statevector(s.end), shown = sv, flipped = false;
      if (cfg.mean) { // drop the unobservable global phase -1 that the H-X-MCZ-X-H diffuser adds
        var sum = 0; for (var k = 0; k < sv.N; k++) sum += sv.re[k];
        if (sum < -1e-9) { shown = sv.clone(); for (k = 0; k < sv.N; k++) { shown.re[k] = -sv.re[k]; shown.im[k] = -sv.im[k]; } flipped = true; }
      }
      amp.innerHTML = '';
      amp.appendChild(h('p', { class: 'panel-title' }, 'Amplitudes after this stage'));
      amp.appendChild(QG.charts.amplitudes(shown.re, shown.im, { n: c.nq, mean: cfg.mean, highlight: cfg.highlight ? cfg.highlight(params) : [] }));
      if (flipped) amp.appendChild(h('p', { class: 'small muted' }, 'This diffuser circuit also multiplies every amplitude by −1, a global phase that no measurement can detect. It is removed here so you can compare with the mean.'));
      prob.innerHTML = '';
      prob.appendChild(h('p', { class: 'panel-title', style: { marginTop: '12px' } }, cfg.marginal ? 'Probabilities of the counting register' : 'Probabilities'));
      var pd;
      if (cfg.marginal) pd = cfg.marginal(params, sv);
      else { pd = {}; var p = sv.probabilities(); for (var i = 0; i < p.length; i++) pd[QG.bitstring(i, c.nq)] = p[i]; }
      prob.appendChild(QG.charts.bars(pd, { ymax: 1, height: 170, highlight: cfg.highlight ? cfg.highlight(params).map(function (k) { return QG.bitstring(k, c.nq); }) : [] }));
      info.innerHTML = QG.math.process(cfg.readout ? cfg.readout(params, sv) : '');
    }
    select(key);
    if (opt.stage !== undefined) { stage = Math.min(opt.stage, built.stages.length - 1); draw(); }
  }

  QG.algorithmAnimator = animator;
  QG.labs.algorithms = function (el) {
    el.appendChild(h('div', { class: 'lab-head' }, h('h1', null, 'Algorithm Animator'), h('span', { class: 'muted small' }, 'Step through each algorithm and watch the amplitudes interfere')));
    animator(el, {});
  };
  QG.widgets.algo = function (el, o) { animator(el, Object.assign({ fixed: true, compact: true }, o)); };
})();
