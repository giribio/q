/* Quantum machine learning widget: variational classifier vs quantum kernel vs a classical baseline. */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h;

  function decisionPlot(fn, data, size) {
    var G = 40, dpr = window.devicePixelRatio || 1, cv = h('canvas', { width: size * dpr, height: size * dpr, style: { width: size + 'px', maxWidth: '100%', height: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }, role: 'img', 'aria-label': 'Decision boundary plot' });
    var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    var pts = []; for (var j = 0; j < G; j++) for (var i = 0; i < G; i++) pts.push([-1 + 2 * (i + 0.5) / G, -1 + 2 * (j + 0.5) / G]);
    var vals = fn(pts), blue = [26, 115, 232], green = [24, 128, 56], bg = [255, 255, 255];
    var small = document.createElement('canvas'); small.width = G; small.height = G;
    var sctx = small.getContext('2d'), img = sctx.createImageData(G, G);
    vals.forEach(function (v, k) {
      var i = k % G, j = Math.floor(k / G), c = v >= 0 ? green : blue, a = Math.min(0.55, 0.12 + Math.abs(v) * 0.6), o = ((G - 1 - j) * G + i) * 4;
      for (var ch = 0; ch < 3; ch++) img.data[o + ch] = Math.round(bg[ch] * (1 - a) + c[ch] * a);
      img.data[o + 3] = 255;
    });
    sctx.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(small, 0, 0, size, size);
    function P(x) { return [(x[0] + 1) / 2 * size, size - (x[1] + 1) / 2 * size]; }
    [['train', true], ['test', false]].forEach(function (s) {
      data[s[0]].X.forEach(function (x, k) {
        var p = P(x), lab = data[s[0]].y[k];
        ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, 2 * Math.PI);
        ctx.fillStyle = s[1] ? (lab > 0 ? '#188038' : '#1a73e8') : '#ffffff'; ctx.fill();
        ctx.lineWidth = s[1] ? 1.5 : 2.2; ctx.strokeStyle = s[1] ? '#ffffff' : (lab > 0 ? '#188038' : '#1a73e8'); ctx.stroke();
      });
    });
    return cv;
  }

  QG.qmlDecisionPlot = decisionPlot;
  QG.widgets.qml = function (el, o) {
    var c = h('div', { class: 'card' }); el.appendChild(c);
    var st = { data: o.dataset || 'circles', model: o.model || 'kernel', layers: 3, reps: 2 };
    var ctl = h('div', { class: 'btn-row' }), out = h('div', { style: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' } }), plotBox = h('div'), side = h('div', { style: { flex: '1', minWidth: '220px' } });
    out.appendChild(plotBox); out.appendChild(side); c.appendChild(ctl); c.appendChild(out);
    var ds = h('select', { 'aria-label': 'Dataset' }, [['blobs', 'Two blobs (linear)'], ['circles', 'Circles'], ['xor', 'XOR'], ['moons', 'Moons']].map(function (x) { return h('option', { value: x[0], selected: x[0] === st.data ? 'selected' : null }, x[1]); }));
    var ms = h('select', { 'aria-label': 'Model' }, [['kernel', 'Quantum kernel (ZZ feature map)'], ['vqc', 'Variational classifier (re-uploading)'], ['logistic', 'Classical logistic regression']].map(function (x) { return h('option', { value: x[0], selected: x[0] === st.model ? 'selected' : null }, x[1]); }));
    var go = h('button', { class: 'btn primary' }, '▶ Train');
    ds.addEventListener('change', function () { st.data = ds.value; showData(); }); ms.addEventListener('change', function () { st.model = ms.value; });
    go.addEventListener('click', train);
    ctl.appendChild(ds); ctl.appendChild(ms); ctl.appendChild(go);
    var data;
    function showData() {
      data = QG.qml.split(QG.qml.dataset(st.data, 60, 4), 0.7);
      plotBox.innerHTML = ''; plotBox.appendChild(decisionPlot(function (p) { return p.map(function () { return 0; }); }, data, 280));
      side.innerHTML = '<p class="small">42 training points (filled) and 18 test points (hollow). Green = class +1, blue = class −1. Features are two numbers in [−1, 1], encoded into 2 qubits as rotation angles.</p>';
    }
    function report(scores, tr, te, extra) {
      plotBox.innerHTML = ''; plotBox.appendChild(decisionPlot(scores, data, 280));
      side.innerHTML = '';
      side.appendChild(h('dl', { class: 'kv' }, h('dt', null, 'Training accuracy'), h('dd', null, (tr * 100).toFixed(0) + '%'), h('dt', null, 'Test accuracy'), h('dd', null, (te * 100).toFixed(0) + '%')));
      if (extra) side.appendChild(extra);
    }
    function train() {
      go.disabled = true;
      if (st.model === 'logistic') {
        var lg = QG.qml.logistic(data.train);
        report(lg.decision, QG.qml.accuracy(lg.decision(data.train.X), data.train.y), QG.qml.accuracy(lg.decision(data.test.X), data.test.y), h('p', { class: 'small' }, 'A straight-line boundary. It fails on circles, XOR and moons: a fair classical baseline would use a non-linear model too (for example an RBF-kernel SVM).'));
        go.disabled = false; return;
      }
      if (st.model === 'kernel') {
        var km = QG.qml.kernelModel(st.reps, 0.05).fit(data.train), K = km.kernel(data.train.X.slice(0, 30));
        var kbox = h('div', null, h('p', { class: 'panel-title', style: { marginTop: '10px' } }, 'Kernel matrix k(xᵢ, xⱼ) = |⟨φ(xᵢ)|φ(xⱼ)⟩|²'), QG.charts.heatmap(K, { size: 160 }), h('p', { class: 'small' }, 'Each entry is the overlap of two encoded quantum states. A classical solver (kernel ridge regression) then finds the boundary. On hardware each entry would be estimated from shots.'));
        report(km.decision, QG.qml.accuracy(km.decision(data.train.X), data.train.y), QG.qml.accuracy(km.decision(data.test.X), data.test.y), kbox);
        go.disabled = false; return;
      }
      side.innerHTML = '<p class="small muted">Training ' + 4 * st.layers + ' parameters with Adam and the parameter-shift rule (in a background thread)…</p>';
      QG.worker.call('qml.trainVQC', [data.train, st.layers, { maxIter: 60 }], 60000).then(function (r) {
        var m = QG.qml.vqc(st.layers), sc = function (X) { return X.map(function (x) { return m.predict(x, r.x); }); };
        var lc = QG.charts.line([{ name: 'training loss (MSE)', x: r.losses.map(function (_, i) { return i; }), y: r.losses }], { height: 160, xLabel: 'Adam step', ymin: 0 });
        report(sc, QG.qml.accuracy(sc(data.train.X), data.train.y), QG.qml.accuracy(sc(data.test.X), data.test.y), h('div', null, lc, h('p', { class: 'small' }, 'About ' + ((r.losses.length - 1) * data.train.X.length * (8 * st.layers + 2)).toLocaleString() + ' circuit runs (each Adam step: one run per training point, plus 2 shifted runs per parameter per point). The data is loaded ' + st.layers + ' times between trainable layers ("re-uploading"), which lets a 2-qubit circuit draw curved boundaries.')));
        go.disabled = false;
      }, function (e) { side.textContent = e.message; go.disabled = false; });
    }
    showData();
  };
})();
