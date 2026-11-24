/* Bloch Sphere Explorer: one qubit, apply gates or set the angles directly. */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h, PI = Math.PI;

  function explorer(el, opt) {
    opt = opt || {};
    var sv = new QG.StateVector(1), history = [];
    var wrap = h('div', { class: opt.compact ? '' : 'lab-grid' });
    var left = h('div', { class: opt.compact ? '' : 'card' }), right = h('div', { class: opt.compact ? '' : 'card' });
    wrap.appendChild(left); wrap.appendChild(right); el.appendChild(wrap);
    var sphereBox = h('div', { style: { display: 'flex', justifyContent: 'center' } }); left.appendChild(sphereBox);
    var B = QG.Bloch(sphereBox, { size: opt.size || (opt.compact ? 260 : 340), trail: true });
    var info = h('div'), hist = h('div', { class: 'small muted', style: { fontFamily: 'var(--mono)', margin: '6px 0', minHeight: '1.4em' } });
    var gates = opt.gates || ['x', 'y', 'z', 'h', 's', 'sdg', 't', 'tdg'];
    var row = h('div', { class: 'palette', role: 'toolbar', 'aria-label': 'Apply a gate' });
    gates.forEach(function (g) {
      var cls = { x: 'g-pauli', y: 'g-pauli', z: 'g-pauli', h: 'g-h', s: 'g-phase', sdg: 'g-phase', t: 'g-phase', tdg: 'g-phase' }[g] || 'g-rot';
      row.appendChild(h('button', { class: 'gate-btn ' + cls, title: QG.gates.defs[g].desc, onclick: function () { apply({ g: g, q: [0], p: [] }); } }, QG.gates.defs[g].label));
    });
    left.appendChild(h('p', { class: 'panel-title', style: { marginTop: '10px' } }, 'Apply a gate'));
    left.appendChild(row);
    if (opt.rotations !== false) {
      var ang = h('input', { type: 'range', min: -PI, max: PI, step: PI / 24, value: PI / 4, 'aria-label': 'Rotation angle' }), angOut = h('output', null, 'π/4');
      ang.addEventListener('input', function () { angOut.textContent = ui.fmtAngle(+ang.value); });
      left.appendChild(h('div', { class: 'ctrl-row' }, h('span', null, 'Angle θ'), ang, angOut));
      left.appendChild(h('div', { class: 'palette' }, ['rx', 'ry', 'rz'].map(function (g) { return h('button', { class: 'gate-btn g-rot', title: QG.gates.defs[g].desc, onclick: function () { apply({ g: g, q: [0], p: [+ang.value] }); } }, QG.gates.defs[g].label + '(θ)'); })));
    }
    left.appendChild(hist);
    left.appendChild(h('div', { class: 'btn-row' },
      h('button', { class: 'btn small', onclick: function () { setState(0, 0); history = []; B.clearTrail(); refresh(); } }, 'Reset to |0⟩'),
      h('button', { class: 'btn small', onclick: function () { B.clearTrail(); } }, 'Clear trail'),
      h('button', { class: 'btn small', onclick: function () { var c = new QG.Circuit(1); history.forEach(function (o) { c.ops.push(o); }); ui.codeModal('Qiskit (Python)', QG.toQiskit(c), 'bloch.py'); } }, 'Export to Qiskit')));

    // direct angle sliders
    var thS = h('input', { type: 'range', min: 0, max: PI, step: PI / 72, value: 0, 'aria-label': 'Polar angle theta' }), phS = h('input', { type: 'range', min: 0, max: 2 * PI, step: PI / 72, value: 0, 'aria-label': 'Azimuth phi' });
    var thO = h('output'), phO = h('output');
    function fromSliders() { setState(+thS.value, +phS.value); history = [{ g: 'u', q: [0], p: [+thS.value, +phS.value, 0] }]; refresh(true); }
    thS.addEventListener('input', fromSliders); phS.addEventListener('input', fromSliders);
    if (opt.sliders !== false) {
      right.appendChild(h('p', { class: 'panel-title' }, 'Set the state directly'));
      right.appendChild(h('div', { class: 'ctrl-row' }, h('span', { class: 'm' }, 'θ (polar)'), thS, thO));
      right.appendChild(h('div', { class: 'ctrl-row' }, h('span', { class: 'm' }, 'φ (phase)'), phS, phO));
    }
    right.appendChild(info);

    function setState(th, ph) { sv.re[0] = Math.cos(th / 2); sv.im[0] = 0; sv.re[1] = Math.sin(th / 2) * Math.cos(ph); sv.im[1] = Math.sin(th / 2) * Math.sin(ph); }
    function apply(op) {
      sv.applyOp(op); history.push(op);
      B.animateTo(sv.bloch(0), 420); refresh(false, true);
      if (opt.onApply) opt.onApply(sv, history);
    }
    function refresh(fromSlider, animated) {
      var b = sv.bloch(0), th = Math.acos(Math.max(-1, Math.min(1, b.z))), ph = Math.atan2(b.y, b.x); if (ph < 0) ph += 2 * PI;
      if (!animated) B.set(b);
      if (!fromSlider) { thS.value = th; phS.value = ph; }
      thO.textContent = (th * 180 / PI).toFixed(0) + '°'; phO.textContent = (ph * 180 / PI).toFixed(0) + '°';
      // remove global phase so alpha is real and non-negative
      var g = Math.atan2(sv.im[0], sv.re[0]), c = Math.cos(-g), s = Math.sin(-g);
      var a0 = sv.re[0] * c - sv.im[0] * s, a1r = sv.re[1] * c - sv.im[1] * s, a1i = sv.re[1] * s + sv.im[1] * c;
      if (Math.hypot(sv.re[0], sv.im[0]) < 1e-9) { var g1 = Math.atan2(sv.im[1], sv.re[1]); a1r = Math.hypot(sv.re[1], sv.im[1]); a1i = 0; a0 = 0; }
      var p0 = a0 * a0, p1 = a1r * a1r + a1i * a1i;
      info.innerHTML = QG.math.process(
        '<p class="panel-title" style="margin-top:12px">The state</p>' +
        '$$\\ket{\\psi} = ' + QG.complexStr(a0, 0) + '\\ket{0} + (' + QG.complexStr(a1r, a1i) + ')\\ket{1}$$' +
        '<p class="small">In Bloch form: $\\ket{\\psi} = \\cos\\frac{\\theta}{2}\\ket{0} + e^{i\\varphi}\\sin\\frac{\\theta}{2}\\ket{1}$ with $\\theta$ = ' + (th * 180 / PI).toFixed(1) + '°, $\\varphi$ = ' + (ph * 180 / PI).toFixed(1) + '°.</p>' +
        '<dl class="kv"><dt>P(measure 0)</dt><dd>' + p0.toFixed(3) + '</dd><dt>P(measure 1)</dt><dd>' + p1.toFixed(3) + '</dd><dt>Bloch vector</dt><dd>(' + b.x.toFixed(2) + ', ' + b.y.toFixed(2) + ', ' + b.z.toFixed(2) + ')</dd></dl>');
      hist.textContent = history.length ? 'Gates so far: ' + history.map(function (o) { return o.g === 'u' ? 'U(θ,φ)' : QG.gates.defs[o.g].label + (o.p.length ? '(' + ui.fmtAngle(o.p[0]) + ')' : ''); }).join(' → ') : 'Start: |0⟩ (north pole)';
      if (opt.target) checkTarget();
    }
    var tBox = h('div'); if (opt.target) left.appendChild(tBox);
    function checkTarget() {
      var b = sv.bloch(0), t = opt.target.bloch, d = Math.hypot(b.x - t[0], b.y - t[1], b.z - t[2]), ok = d < 0.05;
      tBox.innerHTML = ''; tBox.appendChild(h('div', { class: 'callout ' + (ok ? 'green' : 'yellow') }, h('strong', null, ok ? '✓ Target reached!' : 'Challenge'), h('span', { html: QG.math.process(opt.target.text) })));
      if (ok && opt.target.id && QG.progress.markChallenge(opt.target.id)) ui.toast('Challenge solved!');
    }
    refresh();
    return { sv: sv };
  }

  QG.labs.bloch = function (el) {
    el.appendChild(h('div', { class: 'lab-head' }, h('h1', null, 'Bloch Sphere Explorer'), h('span', { class: 'muted small' }, 'Every single-qubit state is a point on this sphere · drag to rotate')));
    explorer(el, {});
    el.appendChild(h('div', { class: 'card', style: { marginTop: '16px' }, html: QG.math.process(
      '<p class="panel-title">Things to try</p><ul class="small" style="margin:0">' +
      '<li>Press <b>H</b>: the arrow moves from the north pole to the equator, an equal superposition.</li>' +
      '<li>Press <b>H</b> then <b>Z</b> then <b>H</b>: you get $\\ket{1}$. Phase became a bit flip.</li>' +
      '<li>Press <b>T</b> eight times from $\\ket{+}$: the arrow turns 45° per press around the equator and comes home.</li>' +
      '<li>Gates on a phase-only state (on the equator) never change P(0) or P(1). Only measurement in another basis reveals phase.</li></ul>') }));
  };
  QG.widgets.bloch = function (el, opts) { explorer(el, Object.assign({ compact: true, sliders: opts.sliders !== undefined ? opts.sliders : false }, opts)); };
  QG.blochExplorer = explorer;
})();
