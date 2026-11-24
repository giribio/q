/* QAOA Studio: draw a graph, find its maximum cut with QAOA, compare with brute force. */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h, S = ui.svg, PI = Math.PI;
  var MAXN = 10;

  function ring(n) { var e = []; for (var i = 0; i < n; i++) e.push([i, (i + 1) % n]); return e; }
  var PRESETS = {
    triangle: { label: 'Triangle', n: 3, edges: ring(3) },
    square: { label: 'Square (4-ring)', n: 4, edges: ring(4) },
    pentagon: { label: 'Pentagon (5-ring)', n: 5, edges: ring(5) },
    k4: { label: 'Complete graph K4', n: 4, edges: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]] },
    prism: { label: 'Triangular prism (6)', n: 6, edges: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]] },
    random: { label: 'Random graph (7 nodes)', random: 7 }
  };
  function randomGraph(n, seed) { var r = QG.rng(seed), e = []; for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) if (r() < 0.42) e.push([i, j]); for (i = 0; i < n; i++) if (!e.some(function (x) { return x[0] === i || x[1] === i; })) e.push([i, (i + 1) % n]); return e; }
  function circlePos(n) { var p = []; for (var i = 0; i < n; i++) p.push([0.5 + 0.38 * Math.cos(2 * PI * i / n - PI / 2), 0.5 + 0.38 * Math.sin(2 * PI * i / n - PI / 2)]); return p; }

  function studio(el, opt) {
    opt = opt || {};
    var g = { n: 4, edges: ring(4) }, pos = circlePos(4), p = 1, sel = null, result = null, seed = 1;
    if (opt.preset) load(opt.preset);
    var wrap = h('div', { class: opt.compact ? '' : 'lab-grid' }), left = h('div', { class: opt.compact ? '' : 'card' }), right = h('div', { class: opt.compact ? '' : 'card' });
    wrap.appendChild(left); wrap.appendChild(right); el.appendChild(wrap);
    var graphBox = h('div'), tools = h('div', { class: 'btn-row' }), hint = h('div', { class: 'hint' }), mapBox = h('div'), res = h('div');
    left.appendChild(tools); left.appendChild(hint); left.appendChild(graphBox); left.appendChild(mapBox);
    right.appendChild(res);

    function load(k) {
      var pr = PRESETS[k];
      if (pr.random) { g = { n: pr.random, edges: randomGraph(pr.random, seed++) }; }
      else g = { n: pr.n, edges: pr.edges.map(function (e) { return e.slice(); }) };
      pos = circlePos(g.n); result = null;
    }
    function drawTools() {
      tools.innerHTML = '';
      var ps = h('select', { 'aria-label': 'Example graphs' }, h('option', { value: '' }, 'Example graphs…'), Object.keys(PRESETS).map(function (k) { return h('option', { value: k }, PRESETS[k].label); }));
      ps.addEventListener('change', function () { if (!ps.value) return; load(ps.value); ps.value = ''; refresh(); });
      var pp = h('select', { 'aria-label': 'QAOA depth p' }, [1, 2, 3].map(function (k) { return h('option', { value: k, selected: k === p ? 'selected' : null }, 'depth p = ' + k); }));
      pp.addEventListener('change', function () { p = +pp.value; result = null; refresh(); });
      tools.appendChild(ps); tools.appendChild(pp);
      tools.appendChild(h('button', { class: 'btn primary', onclick: optimise }, '▶ Run QAOA'));
      if (!opt.compact) tools.appendChild(h('button', { class: 'btn small', onclick: function () { g.edges = []; result = null; refresh(); } }, 'Clear edges'));
    }
    function drawGraph() {
      var W = 300, svg = S('svg', { viewBox: '0 0 ' + W + ' ' + W, width: W, style: 'max-width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;touch-action:none', role: 'img', 'aria-label': 'Graph with ' + g.n + ' nodes and ' + g.edges.length + ' edges' });
      var best = result ? result.bestZ : null, blue = QG.charts.cssVar('--blue'), green = QG.charts.cssVar('--green'), yellow = QG.charts.cssVar('--yellow'), mut = QG.charts.cssVar('--border');
      g.edges.forEach(function (e) {
        var a = pos[e[0]], b = pos[e[1]], cut = best !== null && (((best >> e[0]) & 1) !== ((best >> e[1]) & 1));
        var ln = S('line', { x1: a[0] * W, y1: a[1] * W, x2: b[0] * W, y2: b[1] * W, stroke: cut ? yellow : (best !== null ? mut : QG.charts.cssVar('--muted')), 'stroke-width': cut ? 4 : 2, 'stroke-dasharray': best !== null && !cut ? '4 4' : null, style: 'cursor:pointer' });
        ln.addEventListener('click', function (ev) { ev.stopPropagation(); if (opt.compact) return; g.edges.splice(g.edges.indexOf(e), 1); result = null; refresh(); });
        svg.appendChild(ln);
      });
      pos.forEach(function (pt, i) {
        var col = best === null ? QG.charts.cssVar('--card') : ((best >> i) & 1 ? green : blue);
        var c = S('circle', { cx: pt[0] * W, cy: pt[1] * W, r: 15, fill: col, stroke: sel === i ? QG.charts.cssVar('--text') : QG.charts.cssVar('--muted'), 'stroke-width': sel === i ? 3 : 1.5, style: 'cursor:pointer', tabindex: 0, role: 'button', 'aria-label': 'Node ' + i });
        function pick(ev) { if (ev) ev.stopPropagation(); if (opt.compact) return; if (sel === null) { sel = i; hint.textContent = 'Node ' + i + ' selected: click another node to add or remove an edge.'; } else if (sel === i) { sel = null; hint.textContent = ''; } else { var k = g.edges.findIndex(function (e) { return (e[0] === sel && e[1] === i) || (e[0] === i && e[1] === sel); }); if (k >= 0) g.edges.splice(k, 1); else g.edges.push([Math.min(sel, i), Math.max(sel, i)]); sel = null; hint.textContent = ''; result = null; } refresh(); }
        c.addEventListener('click', pick); c.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); } });
        svg.appendChild(c);
        svg.appendChild(S('text', { x: pt[0] * W, y: pt[1] * W + 4, 'text-anchor': 'middle', style: 'font:600 12px var(--font);pointer-events:none;fill:' + (best === null ? 'var(--text)' : '#fff'), text: String(i) }));
      });
      svg.addEventListener('click', function (ev) {
        if (opt.compact || g.n >= MAXN) { if (g.n >= MAXN) hint.textContent = 'Up to ' + MAXN + ' nodes (one qubit each).'; return; }
        var b = svg.getBoundingClientRect(); pos.push([(ev.clientX - b.left) / b.width, (ev.clientY - b.top) / b.height]); g.n++; result = null; refresh();
      });
      graphBox.innerHTML = ''; graphBox.appendChild(svg);
      if (!opt.compact) graphBox.appendChild(h('p', { class: 'small muted' }, 'Click empty space to add a node, click two nodes to add or remove an edge, click an edge to delete it. Each node is one qubit.'));
    }
    function drawMap() {
      mapBox.innerHTML = '';
      if (p !== 1 || g.edges.length === 0) return;
      var key = g.n + ':' + JSON.stringify(g.edges);
      if (!drawMap.cache || drawMap.cache.key !== key) drawMap.cache = { key: key, L: QG.qaoa.landscape(g, 41, 41) };
      var L = drawMap.cache.L, bf = QG.qaoa.bruteForce(g);
      var hm = QG.charts.heatmapPlot(L.grid, { size: opt.compact ? 220 : 260, x: [0, PI], y: [0, PI / 2], xLabel: 'γ', yLabel: 'β', title: 'Expected cut size' });
      mapBox.appendChild(h('p', { class: 'panel-title', style: { marginTop: '12px' } }, 'p = 1 landscape: expected cut ⟨C⟩(γ, β), best possible = ' + bf.max));
      mapBox.appendChild(hm.el);
      if (result && result.params.length === 2) hm.draw(result.history.map(function (s) { return [wrapP(s.x[0], PI), wrapP(s.x[1], PI / 2)]; }));
    }
    function wrapP(v, per) { return ((v % per) + per) % per; }
    function optimise() {
      if (!g.edges.length) { hint.textContent = 'Add some edges first.'; return; }
      var o = QG.qaoa.optimize(g, p, { starts: 5 }), c = QG.qaoa.circuit(g, o.params.slice(0, p), o.params.slice(p)), pr = c.statevector().probabilities(), cuts = QG.qaoa.cutValues(g), bf = QG.qaoa.bruteForce(g);
      var bestZ = 0; for (var z = 0; z < pr.length; z++) if (pr[z] > pr[bestZ]) bestZ = z;
      var pOpt = bf.argmax.reduce(function (s, z) { return s + pr[z]; }, 0);
      result = { params: o.params, history: o.history, expectation: o.expectation, pr: pr, cuts: cuts, bf: bf, bestZ: bestZ, pOpt: pOpt, circuit: c };
      refresh();
    }
    function drawResult() {
      res.innerHTML = '';
      var bf = QG.qaoa.bruteForce(g);
      res.appendChild(h('p', { class: 'panel-title' }, 'MaxCut'));
      res.appendChild(h('p', { class: 'small', html: QG.math.process('Split the nodes into two groups (blue = 0, green = 1) so that as many edges as possible cross between groups. Cost: $C(z) = \\sum_{(i,j)} \\frac{1 - Z_iZ_j}{2}$. Brute force over all $2^' + g.n + ' = ' + (1 << g.n) + '$ splits: best cut = <b>' + bf.max + '</b> (' + bf.argmax.length + ' optimal bit strings).') }));
      if (!result) { res.appendChild(h('p', { class: 'small muted' }, 'Press "Run QAOA" to optimise ' + 2 * p + ' angles (γ, β per layer) with Nelder–Mead from 5 random starts.')); return; }
      var r = result, top = [];
      for (var z = 0; z < r.pr.length; z++) top.push(z);
      top.sort(function (a, b) { return r.pr[b] - r.pr[a]; }); top = top.slice(0, Math.min(12, top.length));
      var data = {}; top.forEach(function (z) { data[QG.bitstring(z, g.n) + ' (cut ' + r.cuts[z] + ')'] = r.pr[z]; });
      res.appendChild(h('dl', { class: 'kv' },
        h('dt', null, 'Expected cut ⟨C⟩'), h('dd', null, r.expectation.toFixed(3)),
        h('dt', null, 'Approximation ratio'), h('dd', null, (r.expectation / bf.max).toFixed(3)),
        h('dt', null, 'P(measure an optimal cut)'), h('dd', null, (r.pOpt * 100).toFixed(1) + '%'),
        h('dt', null, 'Angles'), h('dd', null, r.params.map(function (v) { return v.toFixed(3); }).join(', '))));
      res.appendChild(QG.charts.bars(data, { title: 'Most likely bit strings (q' + (g.n - 1) + '…q0)', ymax: Math.min(1, Math.ceil(r.pr[top[0]] * 10) / 10 + 0.1), sort: 'value', highlight: top.filter(function (z) { return r.cuts[z] === bf.max; }).map(function (z) { return QG.bitstring(z, g.n) + ' (cut ' + r.cuts[z] + ')'; }) }));
      res.appendChild(h('p', { class: 'small muted' }, 'The graph shows the most likely bit string: yellow edges are cut. Yellow bars are optimal solutions.'));
      res.appendChild(QG.circuitView(r.circuit, { compact: true }));
      res.appendChild(h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onclick: function () { ui.codeModal('Qiskit (Python)', QG.toQiskit(r.circuit.copy().measureAll()), 'qaoa_maxcut.py'); } }, 'Export to Qiskit')));
    }
    function refresh() { drawTools(); drawGraph(); drawMap(); drawResult(); }
    refresh();
    if (opt.autorun) optimise();
  }

  QG.labs.qaoa = function (el) {
    el.appendChild(h('div', { class: 'lab-head' }, h('h1', null, 'QAOA Studio'), h('span', { class: 'muted small' }, 'MaxCut on a graph you draw · up to ' + MAXN + ' qubits')));
    studio(el, {});
  };
  QG.widgets.qaoa = function (el, o) { studio(el, Object.assign({ compact: true }, o)); };
})();
