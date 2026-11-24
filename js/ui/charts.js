/* SVG charts: histogram / bar, line plot. Canvas heatmap. Colors come from CSS tokens. */
(function () {
  var QG = window.QG, ui = QG.ui, S = ui.svg;
  var charts = QG.charts = {}, h = ui.h;

  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  charts.cssVar = cssVar;

  /* data: {label: value}. opt: {title, normalize (counts->probability), highlight:[labels], max:32, height, yLabel, sort:'label'|'value', valueFmt} */
  charts.bars = function (data, opt) {
    opt = opt || {};
    var entries = Object.keys(data).map(function (k) { return [k, +data[k]]; });
    var total = entries.reduce(function (s, e) { return s + e[1]; }, 0) || 1;
    if (opt.normalize) entries = entries.map(function (e) { return [e[0], e[1] / total]; });
    var max = opt.max || 32, note = '';
    if (entries.length > max) {
      entries.sort(function (a, b) { return b[1] - a[1]; });
      note = 'Showing the ' + max + ' most likely of ' + entries.length + ' outcomes';
      entries = entries.slice(0, max);
    }
    if (opt.sort !== 'value') entries.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
    var W = Math.max(320, 46 * entries.length + 60), H = opt.height || 220, padL = 40, padB = 46, padT = opt.title ? 26 : 12;
    var ymax = opt.ymax || Math.max(1e-9, Math.max.apply(null, entries.map(function (e) { return e[1]; })));
    if (opt.normalize && !opt.ymax) ymax = Math.min(1, Math.ceil(ymax * 10) / 10 || 1);
    var svg = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'max-width:' + Math.round(W * 1.45) + 'px', role: 'img', 'aria-label': (opt.title || 'Bar chart') + ': ' + entries.map(function (e) { return e[0] + ' ' + fmt(e[1]); }).join(', ') });
    if (opt.title) svg.appendChild(S('text', { x: padL, y: 16, text: opt.title, style: 'font-size:12px;font-weight:500' }));
    var plotH = H - padT - padB, plotW = W - padL - 10, bw = plotW / Math.max(1, entries.length);
    for (var g = 0; g <= 4; g++) {
      var yv = ymax * g / 4, y = padT + plotH - plotH * g / 4;
      svg.appendChild(S('line', { class: 'grid-line', x1: padL, x2: W - 10, y1: y, y2: y }));
      svg.appendChild(S('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', text: fmt(yv) }));
    }
    function fmt(v) { return opt.valueFmt ? opt.valueFmt(v) : (opt.normalize || ymax <= 1 ? (+v.toFixed(3)).toString() : Math.round(v).toString()); }
    var hl = {}; (opt.highlight || []).forEach(function (k) { hl[k] = 1; });
    entries.forEach(function (e, idx) {
      var h = Math.max(0, plotH * e[1] / ymax), x = padL + idx * bw + bw * 0.15, w = bw * 0.7;
      var rect = S('rect', { class: 'bar' + (hl[e[0]] ? ' hl' : ''), x: x, y: padT + plotH - h, width: w, height: h, rx: 2 });
      rect.appendChild(S('title', { text: e[0] + ': ' + fmt(e[1]) }));
      svg.appendChild(rect);
      if (entries.length <= 16) svg.appendChild(S('text', { class: 'val', x: x + w / 2, y: padT + plotH - h - 4, 'text-anchor': 'middle', text: fmt(e[1]) }));
      var lab = S('text', { x: x + w / 2, y: padT + plotH + 14, 'text-anchor': entries.length > 10 ? 'end' : 'middle', text: e[0], style: 'font-family:var(--mono)' });
      if (entries.length > 10) lab.setAttribute('transform', 'rotate(-45 ' + (x + w / 2) + ' ' + (padT + plotH + 14) + ')');
      svg.appendChild(lab);
    });
    svg.appendChild(S('line', { class: 'axis', x1: padL, x2: W - 10, y1: padT + plotH, y2: padT + plotH }));
    var wrap = ui.h('div', { class: 'chart-wrap' }, svg);
    if (note) wrap.appendChild(ui.h('div', { class: 'small muted' }, note));
    return wrap;
  };
  charts.histogram = function (counts, opt) { opt = Object.assign({ normalize: true }, opt || {}); return charts.bars(counts, opt); };

  var PALETTE = ['--blue', '--green', '--yellow', '--muted'];
  /* series: [{name, x:[...], y:[...], color?, dashed?}], opt: {title, xLabel, yLabel, height, band:{y0,y1,label}, ymin, ymax, points} */
  charts.line = function (series, opt) {
    opt = opt || {};
    var W = opt.width || 560, H = opt.height || 260, pl = 56, pr = 14, pt = opt.title ? 28 : 14, pb = 40;
    var xs = [], ys = [];
    series.forEach(function (s) { xs = xs.concat(s.x); ys = ys.concat(s.y.filter(isFinite)); });
    if (opt.band) ys.push(opt.band.y0, opt.band.y1);
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var y0 = opt.ymin !== undefined ? opt.ymin : Math.min.apply(null, ys), y1 = opt.ymax !== undefined ? opt.ymax : Math.max.apply(null, ys);
    if (x1 === x0) x1 = x0 + 1; if (y1 === y0) { y1 += 0.5; y0 -= 0.5; }
    var padY = (y1 - y0) * 0.06; if (opt.ymin === undefined) y0 -= padY; if (opt.ymax === undefined) y1 += padY;
    function X(v) { return pl + (v - x0) / (x1 - x0) * (W - pl - pr); }
    function Y(v) { return pt + (1 - (v - y0) / (y1 - y0)) * (H - pt - pb); }
    var svg = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'max-width:' + Math.round(W * 1.4) + 'px', role: 'img', 'aria-label': opt.title || 'Line chart' });
    if (opt.title) svg.appendChild(S('text', { x: pl, y: 17, text: opt.title, style: 'font-size:12px;font-weight:500' }));
    for (var g = 0; g <= 4; g++) {
      var yv = y0 + (y1 - y0) * g / 4, xv = x0 + (x1 - x0) * g / 4;
      svg.appendChild(S('line', { class: 'grid-line', x1: pl, x2: W - pr, y1: Y(yv), y2: Y(yv) }));
      svg.appendChild(S('text', { x: pl - 6, y: Y(yv) + 4, 'text-anchor': 'end', text: nice(yv) }));
      svg.appendChild(S('text', { x: X(xv), y: H - pb + 16, 'text-anchor': 'middle', text: nice(xv) }));
    }
    if (opt.band) {
      svg.appendChild(S('rect', { x: pl, width: W - pl - pr, y: Y(opt.band.y1), height: Math.abs(Y(opt.band.y0) - Y(opt.band.y1)), fill: cssVar('--green'), opacity: 0.15 }));
    }
    if (opt.xLabel) svg.appendChild(S('text', { x: (pl + W - pr) / 2, y: H - 6, 'text-anchor': 'middle', text: opt.xLabel }));
    if (opt.yLabel) svg.appendChild(S('text', { x: 12, y: (pt + H - pb) / 2, 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (pt + H - pb) / 2 + ')', text: opt.yLabel }));
    svg.appendChild(S('line', { class: 'axis', x1: pl, x2: W - pr, y1: H - pb, y2: H - pb }));
    var legend = ui.h('div', { class: 'legend' });
    series.forEach(function (s, k) {
      var col = s.color || cssVar(PALETTE[k % PALETTE.length]), d = '';
      s.x.forEach(function (xv, j) { if (!isFinite(s.y[j])) return; d += (d ? 'L' : 'M') + X(xv).toFixed(1) + ' ' + Y(s.y[j]).toFixed(1); });
      if (!s.pointsOnly) svg.appendChild(S('path', { d: d, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-dasharray': s.dashed ? '5 4' : null }));
      if (s.points || s.pointsOnly) s.x.forEach(function (xv, j) { if (isFinite(s.y[j])) svg.appendChild(S('circle', { cx: X(xv), cy: Y(s.y[j]), r: 3, fill: col })); });
      if (s.name) legend.appendChild(ui.h('span', null, ui.h('i', { style: { background: col } }), s.name));
    });
    return ui.h('div', { class: 'chart-wrap' }, svg, series.length > 1 || (series[0] && series[0].name) ? legend : null);
  };
  function nice(v) { var a = Math.abs(v); return a === 0 ? '0' : a >= 1000 || a < 0.01 ? v.toExponential(1) : (+v.toPrecision(3)).toString(); }

  /* grid[row][col] values -> canvas heatmap with blue (low) to yellow (high). */
  charts.heatmap = function (grid, opt) {
    opt = opt || {};
    var rows = grid.length, cols = grid[0].length, size = opt.size || 280, c = ui.h('canvas', { width: cols, height: rows, style: { width: size + 'px', maxWidth: '100%', height: 'auto', imageRendering: 'pixelated', borderRadius: '6px', aspectRatio: cols + '/' + rows } });
    var ctx = c.getContext('2d'), img = ctx.createImageData(cols, rows), lo = Infinity, hi = -Infinity;
    grid.forEach(function (r) { r.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; }); });
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var t = hi > lo ? (grid[y][x] - lo) / (hi - lo) : 0.5, col = ramp(t), o = ((rows - 1 - y) * cols + x) * 4;
      img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  };
  /* Large heatmap with axes, an optional optimiser path and click-to-pick.
   * grid[row][col], row 0 = ymin. opt: {size, x:[x0,x1], y:[y0,y1], xLabel, yLabel, onPick(x,y)}.
   * Returns {el, draw(path, marker)}; path = [[x,y],...] in data units. */
  charts.heatmapPlot = function (grid, opt) {
    opt = opt || {};
    var rows = grid.length, cols = grid[0].length, size = opt.size || 300, pad = 42, dpr = window.devicePixelRatio || 1;
    var small = document.createElement('canvas'); small.width = cols; small.height = rows;
    var sctx = small.getContext('2d'), img = sctx.createImageData(cols, rows), lo = Infinity, hi = -Infinity;
    grid.forEach(function (r) { r.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; }); });
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var t = hi > lo ? (grid[y][x] - lo) / (hi - lo) : 0.5, col = ramp(opt.invert ? 1 - t : t), o = ((rows - 1 - y) * cols + x) * 4;
      img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
    }
    sctx.putImageData(img, 0, 0);
    var W = size + pad + 10, H = size + pad + 10, canvas = h('canvas', { width: W * dpr, height: H * dpr, style: { width: W + 'px', maxWidth: '100%', height: 'auto', cursor: opt.onPick ? 'crosshair' : 'default', touchAction: 'none' }, role: 'img', 'aria-label': (opt.title || 'Heatmap') + ', values from ' + lo.toFixed(3) + ' to ' + hi.toFixed(3) });
    var ctx = canvas.getContext('2d'), X0 = opt.x ? opt.x[0] : 0, X1 = opt.x ? opt.x[1] : cols - 1, Y0 = opt.y ? opt.y[0] : 0, Y1 = opt.y ? opt.y[1] : rows - 1;
    function px(v) { return pad + (v - X0) / (X1 - X0) * size; }
    function py(v) { return 10 + (1 - (v - Y0) / (Y1 - Y0)) * size; }
    function draw(path, marker) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = true; ctx.drawImage(small, pad, 10, size, size);
      ctx.strokeStyle = cssVar('--border'); ctx.strokeRect(pad, 10, size, size);
      ctx.fillStyle = cssVar('--muted'); ctx.font = '11px Roboto, Segoe UI, sans-serif'; ctx.textAlign = 'center';
      [0, 0.5, 1].forEach(function (f) { var v = X0 + (X1 - X0) * f; ctx.fillText(nice(v), pad + f * size, size + 24); });
      ctx.textAlign = 'right';
      [0, 0.5, 1].forEach(function (f) { var v = Y0 + (Y1 - Y0) * f; ctx.fillText(nice(v), pad - 5, 14 + (1 - f) * size); });
      ctx.textAlign = 'center';
      if (opt.xLabel) ctx.fillText(opt.xLabel, pad + size / 2, size + 38);
      if (opt.yLabel) { ctx.save(); ctx.translate(10, 10 + size / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(opt.yLabel, 0, 0); ctx.restore(); }
      if (path && path.length) {
        // break the line where the path wraps around a periodic edge (a jump of more than half the map)
        ctx.beginPath(); path.forEach(function (p, i) {
          var a = px(p[0]), b = py(p[1]), q = path[i - 1];
          if (i && Math.abs(p[0] - q[0]) < (X1 - X0) / 2 && Math.abs(p[1] - q[1]) < (Y1 - Y0) / 2) ctx.lineTo(a, b); else ctx.moveTo(a, b);
        });
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.stroke(); ctx.strokeStyle = '#202124'; ctx.lineWidth = 1.5; ctx.stroke();
        var s = path[0], e = path[path.length - 1];
        ctx.beginPath(); ctx.arc(px(s[0]), py(s[1]), 5, 0, 2 * Math.PI); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#202124'; ctx.stroke();
        ctx.beginPath(); ctx.arc(px(e[0]), py(e[1]), 6, 0, 2 * Math.PI); ctx.fillStyle = '#fbbc04'; ctx.fill(); ctx.stroke();
      }
      if (marker) { ctx.beginPath(); ctx.moveTo(px(marker[0]) - 7, py(marker[1])); ctx.lineTo(px(marker[0]) + 7, py(marker[1])); ctx.moveTo(px(marker[0]), py(marker[1]) - 7); ctx.lineTo(px(marker[0]), py(marker[1]) + 7); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke(); }
    }
    if (opt.onPick) canvas.addEventListener('click', function (e) {
      var b = canvas.getBoundingClientRect(), sx = W / b.width, cx = (e.clientX - b.left) * sx, cy = (e.clientY - b.top) * sx;
      if (cx < pad || cx > pad + size || cy < 10 || cy > 10 + size) return;
      opt.onPick(X0 + (cx - pad) / size * (X1 - X0), Y0 + (1 - (cy - 10) / size) * (Y1 - Y0));
    });
    draw();
    var legend = h('div', { class: 'legend' }, h('span', null, h('i', { style: { background: 'rgb(23,43,77)' } }), (opt.invert ? 'high ' : 'low ') + nice(opt.invert ? hi : lo)), h('span', null, h('i', { style: { background: 'rgb(251,188,4)' } }), (opt.invert ? 'low ' : 'high ') + nice(opt.invert ? lo : hi)));
    return { el: h('div', { class: 'chart-wrap' }, canvas, legend), draw: draw, lo: lo, hi: hi };
  };

  /* Polar plot: angles (radians, 0 = up/north, clockwise) and radial values. opt: {size, rMin, rMax, marker, title} */
  charts.polar = function (angles, values, opt) {
    opt = opt || {};
    var size = opt.size || 260, c = size / 2, R = size / 2 - 26, lo = opt.rMin !== undefined ? opt.rMin : Math.min.apply(null, values), hi = opt.rMax !== undefined ? opt.rMax : Math.max.apply(null, values);
    if (hi - lo < 1e-9) { hi = lo + 1e-3; lo = lo - 1e-3; }
    var svg = S('svg', { class: 'chart', viewBox: '0 0 ' + size + ' ' + size, width: size, style: 'max-width:100%', role: 'img', 'aria-label': (opt.title || 'Polar plot') + ', values ' + lo.toFixed(3) + ' to ' + hi.toFixed(3) });
    function pt(a, r) { var rr = (r - lo) / (hi - lo) * R * 0.8 + R * 0.2; return [c + rr * Math.sin(a), c - rr * Math.cos(a)]; }
    [0.2, 0.6, 1].forEach(function (f) { svg.appendChild(S('circle', { cx: c, cy: c, r: R * f, fill: 'none', class: 'grid-line' })); });
    for (var k = 0; k < 12; k++) { var a = k * Math.PI / 6; svg.appendChild(S('line', { x1: c, y1: c, x2: c + R * Math.sin(a), y2: c - R * Math.cos(a), class: 'grid-line' })); }
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(function (l) { var a = l[1] * Math.PI / 180; svg.appendChild(S('text', { x: c + (R + 13) * Math.sin(a), y: c - (R + 13) * Math.cos(a) + 4, 'text-anchor': 'middle', text: l[0], style: 'font-weight:600' })); });
    var d = ''; angles.forEach(function (a, i) { var p = pt(a, values[i]); d += (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); });
    svg.appendChild(S('path', { d: d + 'Z', fill: cssVar('--green'), 'fill-opacity': 0.18, stroke: cssVar('--green'), 'stroke-width': 2 }));
    if (opt.marker) { var p = pt(opt.marker[0], opt.marker[1]); svg.appendChild(S('line', { x1: c, y1: c, x2: p[0], y2: p[1], stroke: cssVar('--blue'), 'stroke-width': 2.5 })); svg.appendChild(S('circle', { cx: p[0], cy: p[1], r: 5, fill: cssVar('--yellow'), stroke: cssVar('--text') })); }
    svg.appendChild(S('text', { x: 4, y: size - 4, text: 'radius: ' + lo.toFixed(3) + ' (inner) … ' + hi.toFixed(3) + ' (outer)', style: 'font-size:9px' }));
    return svg;
  };

  function ramp(t) { // dark blue -> blue -> green -> yellow
    var stops = [[23, 43, 77], [26, 115, 232], [52, 168, 83], [251, 188, 4]], s = Math.min(2.999, Math.max(0, t * 3)), k = Math.floor(s), f = s - k;
    return [0, 1, 2].map(function (i) { return Math.round(stops[k][i] + (stops[k + 1][i] - stops[k][i]) * f); });
  }
  charts.ramp = ramp;

  /* Amplitude table: basis state, amplitude, probability bar, phase colour. */
  charts.ampTable = function (n, re, im, opt) {
    opt = opt || {};
    var tbl = ui.h('table', { class: 'amp-table' }, ui.h('thead', null, ui.h('tr', null, ui.h('th', null, 'State'), ui.h('th', null, 'Amplitude'), ui.h('th', null, 'Probability'), ui.h('th', null, 'Phase'))));
    var body = ui.h('tbody'), shown = 0;
    for (var i = 0; i < re.length; i++) {
      var p = re[i] * re[i] + im[i] * im[i];
      if (p < 1e-10 && !opt.showZero) continue;
      if (++shown > (opt.max || 64)) break;
      var ph = Math.atan2(im[i], re[i]), deg = Math.round(ph * 180 / Math.PI);
      body.appendChild(ui.h('tr', null,
        ui.h('td', { class: 'mono' }, '|' + QG.bitstring(i, n) + '⟩'),
        ui.h('td', { class: 'mono' }, QG.complexStr(re[i], im[i])),
        ui.h('td', null, ui.h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, ui.h('div', { class: 'pbar', style: { width: (p * 100).toFixed(1) + 'px' } }), (p * 100).toFixed(1) + '%')),
        ui.h('td', null, p < 1e-10 ? '' : [ui.h('span', { class: 'phase-dot', style: { background: phaseColor(ph) }, title: deg + '°' }), ' ' + deg + '°'])));
    }
    tbl.appendChild(body);
    return tbl;
  };
  /* Signed amplitude bars. Real amplitudes: up = positive (blue), down = negative (yellow).
   * Complex amplitudes: bar length = magnitude, colour = phase. opt: {n, mean, highlight:[idx], title, labels} */
  charts.amplitudes = function (re, im, opt) {
    opt = opt || {};
    var N = re.length, n = opt.n || Math.round(Math.log2(N)), complex = false, amax = 1e-9, i;
    for (i = 0; i < N; i++) { if (Math.abs(im[i]) > 1e-9) complex = true; amax = Math.max(amax, Math.hypot(re[i], im[i])); }
    amax = Math.min(1, Math.ceil(amax * 10) / 10);
    var W = Math.max(320, Math.min(900, 22 * N + 60)), H = opt.height || 220, pl = 40, pr = 8, pt = opt.title ? 24 : 10, pb = N <= 32 ? 40 : 14;
    var mid = complex ? H - pb : pt + (H - pt - pb) / 2, half = complex ? H - pt - pb : (H - pt - pb) / 2, bw = (W - pl - pr) / N;
    var svg = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'max-width:' + Math.round(W * 1.45) + 'px', role: 'img', 'aria-label': (opt.title || 'Amplitudes') });
    if (opt.title) svg.appendChild(S('text', { x: pl, y: 15, text: opt.title, style: 'font-size:12px;font-weight:500' }));
    [-1, -0.5, 0, 0.5, 1].forEach(function (f) {
      if (complex && f < 0) return;
      var y = mid - f * half; svg.appendChild(S('line', { class: f === 0 ? 'axis' : 'grid-line', x1: pl, x2: W - pr, y1: y, y2: y }));
      svg.appendChild(S('text', { x: pl - 5, y: y + 4, 'text-anchor': 'end', text: (+(f * amax).toFixed(2)).toString() }));
    });
    var pos = cssVar('--amp-pos'), neg = cssVar('--amp-neg'), hl = {}; (opt.highlight || []).forEach(function (k) { hl[k] = 1; });
    for (i = 0; i < N; i++) {
      var mag = Math.hypot(re[i], im[i]), val = complex ? mag : re[i], hgt = Math.abs(val) / amax * half;
      var x = pl + i * bw + bw * 0.12, w = Math.max(1, bw * 0.76), y = val >= 0 ? mid - hgt : mid;
      var col = complex ? phaseColor(Math.atan2(im[i], re[i])) : (val >= 0 ? pos : neg);
      var r = S('rect', { x: x, y: y, width: w, height: Math.max(0.5, hgt), fill: col, rx: 1.5, stroke: hl[i] ? cssVar('--text') : 'none', 'stroke-width': hl[i] ? 1.5 : 0 });
      r.appendChild(S('title', { text: '|' + QG.bitstring(i, n) + '⟩  ' + QG.complexStr(re[i], im[i]) + (complex ? '  phase ' + Math.round(Math.atan2(im[i], re[i]) * 180 / Math.PI) + '°' : '') }));
      svg.appendChild(r);
      if (N <= 32) {
        var lx = x + w / 2, ly = H - pb + 13, t = S('text', { x: lx, y: ly, 'text-anchor': N > 8 ? 'end' : 'middle', text: QG.bitstring(i, n), style: 'font-family:var(--mono);font-size:10px' + (hl[i] ? ';font-weight:700;fill:var(--text)' : '') });
        if (N > 8) t.setAttribute('transform', 'rotate(-60 ' + lx + ' ' + ly + ')');
        svg.appendChild(t);
      }
    }
    if (opt.mean && !complex) {
      var mean = 0; for (i = 0; i < N; i++) mean += re[i]; mean /= N;
      var my = mid - mean / amax * half;
      svg.appendChild(S('line', { x1: pl, x2: W - pr, y1: my, y2: my, stroke: cssVar('--green'), 'stroke-width': 1.5, 'stroke-dasharray': '6 3' }));
      svg.appendChild(S('text', { x: W - pr - 2, y: my - 4, 'text-anchor': 'end', text: 'mean ' + mean.toFixed(3), style: 'fill:var(--green)' }));
    }
    var legend = h('div', { class: 'legend' }, complex ? [h('span', null, 'Bar height = |amplitude|; colour = phase:'), [0, 90, 180, 270].map(function (d) { return h('span', null, h('i', { style: { background: phaseColor(d * Math.PI / 180) } }), d + '°'); })] : [h('span', null, h('i', { style: { background: pos } }), 'positive amplitude'), h('span', null, h('i', { style: { background: neg } }), 'negative amplitude')]);
    return h('div', { class: 'chart-wrap' }, svg, legend);
  };

  /* Grouped bars: series = [{name, values: {label: v}}]. */
  charts.grouped = function (series, opt) {
    opt = opt || {};
    var keys = {}; series.forEach(function (s) { Object.keys(s.values).forEach(function (k) { if (s.values[k] > (opt.minShow || 0)) keys[k] = 1; }); });
    keys = Object.keys(keys).sort();
    if (keys.length > (opt.max || 32)) { var tot = {}; keys.forEach(function (k) { tot[k] = series.reduce(function (a, s) { return a + (s.values[k] || 0); }, 0); }); keys.sort(function (a, b) { return tot[b] - tot[a]; }); keys = keys.slice(0, opt.max || 32).sort(); }
    var ns = series.length, W = Math.max(320, keys.length * (14 * ns + 14) + 60), H = opt.height || 220, pl = 40, pt = opt.title ? 24 : 10, pb = 40;
    var ymax = opt.ymax || Math.max.apply(null, series.map(function (s) { return Math.max.apply(null, keys.map(function (k) { return s.values[k] || 0; }).concat([1e-9])); }));
    var svg = S('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'max-width:' + Math.round(W * 1.45) + 'px', role: 'img', 'aria-label': opt.title || 'Comparison chart' });
    if (opt.title) svg.appendChild(S('text', { x: pl, y: 15, text: opt.title, style: 'font-size:12px;font-weight:500' }));
    var plotH = H - pt - pb, gw = (W - pl - 10) / Math.max(1, keys.length), cols = (opt.colors || ['--blue', '--green', '--yellow']).map(cssVar);
    for (var g = 0; g <= 4; g++) { var y = pt + plotH - plotH * g / 4; svg.appendChild(S('line', { class: 'grid-line', x1: pl, x2: W - 10, y1: y, y2: y })); svg.appendChild(S('text', { x: pl - 5, y: y + 4, 'text-anchor': 'end', text: (+(ymax * g / 4).toFixed(2)).toString() })); }
    keys.forEach(function (k, i) {
      var bw = gw * 0.8 / ns;
      series.forEach(function (s, j) {
        var v = s.values[k] || 0, hh = plotH * Math.min(1, v / ymax), x = pl + i * gw + gw * 0.1 + j * bw;
        var r = S('rect', { x: x, y: pt + plotH - hh, width: Math.max(1, bw - 1), height: hh, fill: cols[j % cols.length], rx: 1.5 });
        r.appendChild(S('title', { text: s.name + ' ' + k + ': ' + v.toFixed(4) })); svg.appendChild(r);
      });
      var lx = pl + i * gw + gw / 2, t = S('text', { x: lx, y: pt + plotH + 14, 'text-anchor': keys.length > 10 ? 'end' : 'middle', text: k, style: 'font-family:var(--mono);font-size:10px' });
      if (keys.length > 10) t.setAttribute('transform', 'rotate(-50 ' + lx + ' ' + (pt + plotH + 14) + ')');
      svg.appendChild(t);
    });
    svg.appendChild(S('line', { class: 'axis', x1: pl, x2: W - 10, y1: pt + plotH, y2: pt + plotH }));
    return h('div', { class: 'chart-wrap' }, svg, h('div', { class: 'legend' }, series.map(function (s, j) { return h('span', null, h('i', { style: { background: cols[j % cols.length] } }), s.name); })));
  };

  function phaseColor(ph) { var h = ((ph * 180 / Math.PI) % 360 + 360) % 360; return 'hsl(' + (h + 215) % 360 + ',75%,52%)'; }
  charts.phaseColor = phaseColor;
})();
