/* Noise Lab: build a circuit, choose a noise model, compare ideal vs noisy results (density-matrix simulation). */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h;
  var MAXQ = 7;

  var PRESETS = {
    ideal: { label: 'Ideal (no noise)', p1: 0, p2: 0, t1: 0, t2: 0, readout: 0 },
    good: { label: 'Good superconducting device', p1: 0.0003, p2: 0.008, t1: 200, t2: 150, readout: 0.015 },
    nisq: { label: 'Early NISQ device (c. 2019)', p1: 0.002, p2: 0.03, t1: 60, t2: 50, readout: 0.04 },
    teach: { label: 'Very noisy (to see effects clearly)', p1: 0.02, p2: 0.08, t1: 15, t2: 10, readout: 0.08 }
  };
  QG.noisePresets = PRESETS;

  function noiseControls(model, onChange) {
    var box = h('div');
    var F = [
      { key: 'p1', label: '1-qubit gate error', min: 0, max: 0.1, step: 0.0005, fmt: function (v) { return (v * 100).toFixed(2) + '%'; } },
      { key: 'p2', label: '2-qubit gate error', min: 0, max: 0.2, step: 0.001, fmt: function (v) { return (v * 100).toFixed(1) + '%'; } },
      { key: 't1', label: 'T1 (µs, 0 = off)', min: 0, max: 300, step: 1, fmt: function (v) { return v ? v + ' µs' : 'off'; } },
      { key: 't2', label: 'T2 (µs, ≤ 2·T1)', min: 0, max: 300, step: 1, fmt: function (v) { return v ? v + ' µs' : '–'; } },
      { key: 'readout', label: 'Readout error', min: 0, max: 0.2, step: 0.001, fmt: function (v) { return (v * 100).toFixed(1) + '%'; } }];
    var sel = h('select', { 'aria-label': 'Noise preset' }, h('option', { value: '' }, 'Presets…'), Object.keys(PRESETS).map(function (k) { return h('option', { value: k }, PRESETS[k].label); }));
    sel.addEventListener('change', function () { if (!sel.value) return; var p = PRESETS[sel.value]; F.forEach(function (f) { model[f.key] = p[f.key]; }); sel.value = ''; draw(); onChange(); });
    function draw() {
      box.innerHTML = ''; box.appendChild(h('div', { class: 'btn-row' }, sel, h('span', { class: 'small muted' }, 'Gate times: 50 ns (1-qubit), 300 ns (2-qubit)')));
      F.forEach(function (f) {
        var out = h('output', null, f.fmt(model[f.key])), r = h('input', { type: 'range', min: f.min, max: f.max, step: f.step, value: model[f.key], 'aria-label': f.label });
        r.addEventListener('input', function () { model[f.key] = +r.value; if (f.key === 't1' && model.t2 > 2 * model.t1) model.t2 = 2 * model.t1; out.textContent = f.fmt(model[f.key]); onChange(); });
        box.appendChild(h('div', { class: 'ctrl-row', style: { gridTemplateColumns: '150px 1fr 70px' } }, h('span', null, f.label), r, out));
      });
    }
    draw();
    return { el: box, redraw: draw };
  }
  QG.noiseControls = noiseControls;

  QG.labs.noise = function (el) {
    el.appendChild(h('div', { class: 'lab-head' }, h('h1', null, 'Noise Lab'), h('span', { class: 'muted small' }, 'Density-matrix simulation · up to ' + MAXQ + ' qubits · export the noise model to Qiskit Aer')));
    var grid = h('div', { class: 'lab-grid' }), left = h('div', { class: 'card' }), right = h('div', { class: 'card' });
    grid.appendChild(left); grid.appendChild(right); el.appendChild(grid);
    var model = Object.assign({}, PRESETS.nisq), circuit = null, mitigate = false;
    var results = h('div'), metrics = h('div'), blochRow = h('div', { class: 'bloch-row' });
    var nc = noiseControls(model, ui.debounce(update, 60));
    right.appendChild(h('p', { class: 'panel-title' }, 'Noise model'));
    right.appendChild(nc.el);
    var mitBox = h('input', { type: 'checkbox', 'aria-label': 'Apply readout error mitigation' });
    mitBox.addEventListener('change', function () { mitigate = mitBox.checked; update(); });
    right.appendChild(h('div', { class: 'btn-row' }, h('label', { class: 'inline' }, mitBox, 'Show readout-mitigated result'),
      h('button', { class: 'btn small', onclick: function () { ui.codeModal('Qiskit Aer noise model', QG.noiseToQiskit(model) + '\n# Your circuit:\n' + (circuit ? QG.toQiskit(circuit).split('\n').filter(function (l) { return l.indexOf('Sampler') < 0 && l.indexOf('result') < 0 && l.indexOf('sampler') < 0; }).join('\n') : ''), 'noisy_circuit.py'); } }, 'Export to Qiskit Aer')));
    right.appendChild(h('p', { class: 'panel-title', style: { marginTop: '12px' } }, 'Ideal vs noisy'));
    right.appendChild(results); right.appendChild(metrics);
    right.appendChild(h('p', { class: 'panel-title', style: { marginTop: '12px' } }, 'Each qubit\'s Bloch vector (noisy)'));
    right.appendChild(blochRow);

    QG.Composer(left, { nq: 3, preset: 'ghz', maxQubits: MAXQ, tabs: [['probs', 'Ideal probabilities'], ['code', 'Code']], onChange: function (c) { circuit = c; update(); } });
    left.appendChild(h('p', { class: 'small muted', style: { marginTop: '10px' } }, 'Noise is added after every gate on the qubits it touches (depolarizing error, then T1/T2 relaxation for the gate time). Idle qubits are noiseless here, a simplification. Readout error flips each measured bit.'));

    function update() {
      if (!circuit) return;
      results.innerHTML = ''; metrics.innerHTML = ''; blochRow.innerHTML = '';
      var c = circuit.copy();
      c.ops = c.ops.filter(function (o) { return o.g !== 'measure'; });
      var t0 = performance.now(), r;
      try { r = QG.runNoisy(c, model); } catch (e) { results.appendChild(h('p', { class: 'err-text' }, e.message)); return; }
      var ideal = c.statevector(), ip = ideal.probabilities(), io = {}, no = {}, mo = {}, n = c.nq;
      for (var i = 0; i < ip.length; i++) { io[QG.bitstring(i, n)] = ip[i]; no[QG.bitstring(i, n)] = r.probsQubits[i]; }
      var series = [{ name: 'Ideal', values: io }, { name: 'Noisy', values: no }];
      if (mitigate && model.readout) { var mp = QG.mitigateReadout(r.probsQubits, n, model.readout); for (i = 0; i < mp.length; i++) mo[QG.bitstring(i, n)] = mp[i]; series.push({ name: 'Noisy + readout mitigation', values: mo }); }
      results.appendChild(QG.charts.grouped(series, { ymax: 1, minShow: 0.002 }));
      var tvd = 0; for (i = 0; i < ip.length; i++) tvd += Math.abs(ip[i] - r.probsQubits[i]); tvd /= 2;
      var F = r.dm.fidelity(ideal);
      metrics.appendChild(h('dl', { class: 'kv', style: { marginTop: '8px' } },
        h('dt', null, 'State fidelity ⟨ψ|ρ|ψ⟩'), h('dd', null, F.toFixed(4)),
        h('dt', null, 'Purity Tr(ρ²)'), h('dd', null, r.dm.purity().toFixed(4) + (r.dm.purity() < 0.999 ? ' (mixed)' : ' (pure)')),
        h('dt', null, 'Distribution error (TVD)'), h('dd', null, (tvd * 100).toFixed(2) + '%'),
        h('dt', null, 'Gates'), h('dd', null, c.gateCount() + ' gates, depth ' + c.depth()),
        h('dt', null, 'Simulation time'), h('dd', null, Math.round(performance.now() - t0) + ' ms')));
      for (var q = 0; q < Math.min(n, 5); q++) {
        var fig = h('figure'); blochRow.appendChild(fig);
        var b = r.dm.bloch(q), bi = ideal.bloch(q);
        QG.Bloch(fig, { size: 120, labels: false, caption: false }).set([bi, b].map(function (v, k) { return { x: v.x, y: v.y, z: v.z, color: k ? QG.charts.cssVar('--green') : QG.charts.cssVar('--border') }; }));
        fig.appendChild(h('figcaption', null, 'q' + q + ' |r| = ' + Math.hypot(b.x, b.y, b.z).toFixed(2)));
      }
      blochRow.appendChild(h('p', { class: 'small muted', style: { width: '100%' } }, 'Grey arrow: ideal. Green: noisy. Noise shrinks the arrow towards the centre (a mixed state) and T1 pulls it towards |0⟩.'));
    }
  };
})();
