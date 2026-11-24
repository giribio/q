/* Read-only circuit diagram. QG.circuitView(circuit, {stages, upto, compact}) -> element.
 * Ops at index >= upto are faded; stage boundaries are drawn as dashed separators with labels. */
(function () {
  var QG = window.QG, ui = QG.ui, S = ui.svg, h = ui.h;
  var FILL = { 'g-meas': '#5f6368', 'g-h': '#188038', 'g-pauli': '#1a73e8', 'g-phase': '#e37400', 'g-rot': '#7b61ff', 'g-multi': '#1967d2' };
  function cls(g) {
    if (g === 'measure') return 'g-meas'; if (g === 'h') return 'g-h';
    if (['x', 'y', 'z', 'id'].indexOf(g) >= 0) return 'g-pauli';
    if (['s', 'sdg', 't', 'tdg', 'p'].indexOf(g) >= 0) return 'g-phase';
    if (['rx', 'ry', 'rz', 'u', 'sx', 'sxdg'].indexOf(g) >= 0) return 'g-rot';
    return 'g-multi';
  }
  var BASE = { x: 'X', y: 'Y', z: 'Z', h: 'H', p: 'P', rx: 'Rx', ry: 'Ry', rz: 'Rz', u: 'U' };

  QG.circuitView = function (c, opt) {
    opt = opt || {};
    var CW = opt.compact ? 40 : 46, RH = opt.compact ? 38 : 44, LEFT = 46, TOP = opt.stages ? 24 : 10, BOX = opt.compact ? 28 : 32;
    var level = new Array(c.nq).fill(0), cols = [], stageEnds = {}, stageCols = [];
    (opt.stages || []).forEach(function (s) { stageEnds[s.end] = (stageEnds[s.end] || []).concat([s]); });
    var maxCol = 0;
    function bumpAll() { var m = Math.max.apply(null, level); for (var q = 0; q < c.nq; q++) level[q] = m; return m; }
    c.ops.forEach(function (op, i) {
      if (stageEnds[i] && i > 0) stageCols.push({ col: bumpAll(), stages: stageEnds[i] });
      var qs = op.q, lo = Math.min.apply(null, qs), hi = Math.max.apply(null, qs);
      if (op.g === 'barrier' || op.g === 'diagonal') { lo = Math.min(lo, 0); }
      var col = 0; for (var q = lo; q <= hi; q++) col = Math.max(col, level[q]);
      for (q = lo; q <= hi; q++) level[q] = col + 1;
      cols.push(col); maxCol = Math.max(maxCol, col + 1);
    });
    if (opt.stages) opt.stages.forEach(function (s) { if (s.end === 0) stageCols.unshift({ col: 0, stages: [s], start: true }); });
    var W = LEFT + Math.max(maxCol, 1) * CW + 16, H = TOP + c.nq * RH + 4;
    var svg = S('svg', { class: 'composer-svg', width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Circuit diagram, ' + c.nq + ' qubits, ' + c.ops.length + ' operations' });
    function X(col) { return LEFT + col * CW + CW / 2; }
    function Y(q) { return TOP + q * RH + RH / 2; }
    for (var q = 0; q < c.nq; q++) {
      svg.appendChild(S('text', { class: 'qlabel', x: 6, y: Y(q) + 4, text: 'q' + q }));
      svg.appendChild(S('line', { class: 'wire', x1: LEFT - 10, x2: W - 4, y1: Y(q), y2: Y(q) }));
    }
    // stage separators
    stageCols.forEach(function (sc) {
      var x = LEFT + sc.col * CW;
      if (!sc.start) svg.appendChild(S('line', { x1: x, x2: x, y1: TOP - 4, y2: H - 2, stroke: 'var(--border)', 'stroke-dasharray': '3 3' }));
    });
    if (opt.upto !== undefined && opt.upto !== null) {
      var lastCol = -1; cols.forEach(function (cc, i) { if (i < opt.upto) lastCol = Math.max(lastCol, cc); });
      if (lastCol >= 0) svg.appendChild(S('rect', { class: 'col-marker', x: LEFT - 4, y: TOP - 4, width: (lastCol + 1) * CW + 4, height: c.nq * RH + 4, rx: 6 }));
    }
    c.ops.forEach(function (op, i) {
      var x = X(cols[i]), g = S('g', { opacity: opt.upto !== undefined && opt.upto !== null && i >= opt.upto ? 0.28 : 1 }), qs = op.q;
      if (op.g === 'barrier') { g.appendChild(S('line', { x1: x, x2: x, y1: TOP, y2: H - 4, stroke: 'var(--muted)', 'stroke-dasharray': '2 3', 'stroke-width': 1.5 })); svg.appendChild(g); return; }
      if (op.g === 'diagonal') {
        var y0 = Y(Math.min.apply(null, qs)) - BOX / 2, y1 = Y(Math.max.apply(null, qs)) + BOX / 2;
        g.appendChild(S('rect', { x: x - BOX / 2, y: y0, width: BOX, height: y1 - y0, rx: 5, fill: '#7b61ff' }));
        g.appendChild(S('text', { class: 'gl', x: x, y: (y0 + y1) / 2 + 4, 'text-anchor': 'middle', text: opt.diagLabel || 'Uf' }));
        svg.appendChild(g); return;
      }
      var d = op.g === 'measure' ? null : QG.gates.defs[op.g], nc = d ? (d.nc === -1 ? qs.length - 1 : d.nc) : 0, base = d ? (d.base || d.base2) : null;
      if (qs.length > 1) g.appendChild(S('line', { class: 'link', x1: x, x2: x, y1: Y(Math.min.apply(null, qs)), y2: Y(Math.max.apply(null, qs)) }));
      for (var k = 0; k < nc; k++) g.appendChild(S('circle', { class: 'ctrl', cx: x, cy: Y(qs[k]), r: 5 }));
      qs.slice(nc).forEach(function (tq) {
        var y = Y(tq);
        if (nc > 0 && base === 'x') { g.appendChild(S('circle', { cx: x, cy: y, r: 11, fill: '#1967d2' })); g.appendChild(S('path', { d: 'M' + (x - 7) + ' ' + y + 'H' + (x + 7) + 'M' + x + ' ' + (y - 7) + 'V' + (y + 7), stroke: '#fff', 'stroke-width': 2 })); }
        else if (nc > 0 && base === 'z') g.appendChild(S('circle', { class: 'ctrl', cx: x, cy: y, r: 5 }));
        else if (base === 'swap') g.appendChild(S('path', { d: 'M' + (x - 6) + ' ' + (y - 6) + 'L' + (x + 6) + ' ' + (y + 6) + 'M' + (x + 6) + ' ' + (y - 6) + 'L' + (x - 6) + ' ' + (y + 6), stroke: '#1967d2', 'stroke-width': 2.4 }));
        else {
          var lab = op.g === 'measure' ? '' : nc > 0 ? (BASE[base] || d.label) : d.label;
          g.appendChild(S('rect', { x: x - BOX / 2, y: y - BOX / 2, width: BOX, height: BOX, rx: 4, fill: FILL[cls(nc > 0 ? base : op.g)] }));
          if (op.g === 'measure') g.appendChild(S('path', { d: 'M' + (x - 9) + ' ' + (y + 5) + 'A10 10 0 0 1 ' + (x + 9) + ' ' + (y + 5) + 'M' + x + ' ' + (y + 5) + 'L' + (x + 6) + ' ' + (y - 6), stroke: '#fff', fill: 'none', 'stroke-width': 1.6 }));
          else g.appendChild(S('text', { class: 'gl', x: x, y: y + 4, 'text-anchor': 'middle', style: lab.length > 2 ? 'font-size:10px' : null, text: lab }));
        }
      });
      if (op.p && op.p.length && op.g !== 'measure') g.appendChild(S('title', { text: op.g + '(' + op.p.map(function (v) { return QG.formatNumber(v); }).join(', ') + ')' }));
      svg.appendChild(g);
    });
    // stage labels on top
    if (opt.stages) {
      var prev = 0;
      opt.stages.forEach(function (s) {
        if (s.end <= prev) { prev = Math.max(prev, s.end); return; }
        var c0 = Infinity, c1 = -1;
        for (var i = prev; i < s.end; i++) { c0 = Math.min(c0, cols[i]); c1 = Math.max(c1, cols[i]); }
        prev = s.end;
        var x0 = LEFT + c0 * CW, x1 = LEFT + (c1 + 1) * CW, label = s.label, room = Math.floor((x1 - x0) / 6.2);
        if (room < 2) return;
        svg.appendChild(S('text', { x: (x0 + x1) / 2, y: 13, 'text-anchor': 'middle', fill: 'var(--muted)', style: 'font:11px var(--font)', text: label.length > room ? label.slice(0, room - 1) + '…' : label }));
      });
    }
    return h('div', { class: 'composer-wrap' }, svg);
  };
})();
