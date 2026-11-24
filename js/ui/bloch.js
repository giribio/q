/* Bloch sphere on a 2D canvas (no WebGL / libraries). Drag to rotate the view.
 *   var b = QG.Bloch(container, {size: 260}); b.set({x,y,z}); b.trail = true; */
(function () {
  var QG = window.QG, ui = QG.ui;

  QG.Bloch = function (container, opt) {
    opt = opt || {};
    var size = opt.size || 260, dpr = window.devicePixelRatio || 1;
    var canvas = ui.h('canvas', { width: size * dpr, height: size * dpr, style: { width: size + 'px', height: size + 'px', maxWidth: '100%', touchAction: 'none', cursor: 'grab' }, role: 'img', 'aria-label': 'Bloch sphere' });
    container.appendChild(canvas);
    var ctx = canvas.getContext('2d'), self = { canvas: canvas, vectors: [], trailPts: [], trail: !!opt.trail, az: opt.az !== undefined ? opt.az : -0.6, el: opt.el !== undefined ? opt.el : 0.35 };

    function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
    // world: z up, x toward viewer-left, y right. Rotate by azimuth (about z) then elevation (about screen x).
    function proj(x, y, z) {
      var ca = Math.cos(self.az), sa = Math.sin(self.az), ce = Math.cos(self.el), se = Math.sin(self.el);
      var X = x * ca - y * sa, Y = x * sa + y * ca; // rotate about z
      var sx = Y, depth = X * ce + z * se, sy = -(z * ce - X * se);
      var R = size * 0.36;
      return { x: size / 2 + sx * R, y: size / 2 + sy * R, d: depth };
    }
    function line3(a, b, color, width, dash) {
      var p = proj(a[0], a[1], a[2]), q = proj(b[0], b[1], b[2]);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.strokeStyle = color; ctx.lineWidth = width || 1; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
    }
    function circle3(fn, color, width) { // fn(t) -> [x,y,z]; front solid, back dashed
      for (var pass = 0; pass < 2; pass++) {
        ctx.beginPath(); var started = false;
        for (var k = 0; k <= 96; k++) {
          var t = k / 96 * 2 * Math.PI, v = fn(t), p = proj(v[0], v[1], v[2]), front = p.d >= -1e-9;
          if ((pass === 0) === front) { if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y); }
          else started = false;
        }
        ctx.strokeStyle = color; ctx.lineWidth = width || 1; ctx.setLineDash(pass === 0 ? [] : [3, 4]); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    function label(txt, v, color) { var p = proj(v[0], v[1], v[2]); ctx.fillStyle = color; ctx.font = (12) + 'px ' + 'Roboto, Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, p.x, p.y); }

    self.draw = function () {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      var muted = css('--muted'), border = css('--border'), text = css('--text'), blue = css('--blue'), green = css('--green'), yellow = css('--yellow');
      // sphere outline
      ctx.beginPath(); ctx.arc(size / 2, size / 2, size * 0.36, 0, 2 * Math.PI); ctx.fillStyle = css('--surface'); ctx.fill(); ctx.strokeStyle = muted; ctx.lineWidth = 1.2; ctx.stroke();
      circle3(function (t) { return [Math.cos(t), Math.sin(t), 0]; }, border, 1);
      circle3(function (t) { return [Math.cos(t), 0, Math.sin(t)]; }, border, 0.8);
      line3([-1, 0, 0], [1, 0, 0], border, 1); line3([0, -1, 0], [0, 1, 0], border, 1); line3([0, 0, -1], [0, 0, 1], border, 1);
      label('|0⟩', [0, 0, 1.2], text); label('|1⟩', [0, 0, -1.2], text);
      label('x', [1.25, 0, 0], muted); label('y', [0, 1.2, 0], muted);
      if (opt.labels !== false) { label('|+⟩', [1.05, 0, 0.12], muted); label('|i⟩', [0, 1.05, 0.12], muted); }
      if (self.trail && self.trailPts.length > 1) {
        ctx.beginPath();
        self.trailPts.forEach(function (v, k) { var p = proj(v.x, v.y, v.z); if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
        ctx.strokeStyle = yellow; ctx.lineWidth = 2; ctx.stroke();
      }
      if (self.points && self.points.length) {
        var pts = self.points.map(function (v) { return proj(v.x, v.y, v.z); }).sort(function (a, b) { return a.d - b.d; });
        pts.forEach(function (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, 2 * Math.PI); ctx.fillStyle = p.d >= 0 ? green : muted; ctx.globalAlpha = p.d >= 0 ? 0.95 : 0.45; ctx.fill(); });
        ctx.globalAlpha = 1;
      }
      var colors = [blue, green, yellow];
      self.vectors.forEach(function (v, k) {
        var col = v.color || colors[k % colors.length], len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        var o = proj(0, 0, 0), p = proj(v.x, v.y, v.z);
        ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(p.x, p.y); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, len > 0.02 ? 6 : 4, 0, 2 * Math.PI); ctx.fillStyle = col; ctx.fill();
        // projection shadow onto equator
        var s = proj(v.x, v.y, 0); ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(s.x, s.y); ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.stroke(); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      });
      if (opt.caption !== false && self.vectors[0]) {
        var v0 = self.vectors[0], r = Math.sqrt(v0.x * v0.x + v0.y * v0.y + v0.z * v0.z);
        ctx.fillStyle = muted; ctx.font = '11px Roboto, Segoe UI, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('x ' + v0.x.toFixed(2) + '  y ' + v0.y.toFixed(2) + '  z ' + v0.z.toFixed(2) + (r < 0.98 ? '  |r| ' + r.toFixed(2) : ''), 6, size - 8);
      }
      canvas.setAttribute('aria-label', 'Bloch sphere. ' + self.vectors.map(function (v) { return 'Vector x ' + v.x.toFixed(2) + ', y ' + v.y.toFixed(2) + ', z ' + v.z.toFixed(2); }).join('. '));
    };
    self.set = function (v) {
      self.vectors = Array.isArray(v) ? v : [v];
      if (self.trail && !Array.isArray(v)) { self.trailPts.push({ x: v.x, y: v.y, z: v.z }); if (self.trailPts.length > 400) self.trailPts.shift(); }
      self.draw();
    };
    self.clearTrail = function () { self.trailPts = []; self.draw(); };
    /* Draw a cloud of Bloch points (e.g. where a noise channel sends the whole sphere). */
    self.setPoints = function (pts) { self.points = pts; self.draw(); };
    /* Animate from current to target along a straight-ish path (normalised on the sphere). */
    self.animateTo = function (target, ms, done) {
      var start = self.vectors[0] || { x: 0, y: 0, z: 1 }, t0 = performance.now(); ms = ms || 450;
      function step(now) {
        var f = Math.min(1, (now - t0) / ms), e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
        var v = { x: start.x + (target.x - start.x) * e, y: start.y + (target.y - start.y) * e, z: start.z + (target.z - start.z) * e };
        var L = Math.hypot(v.x, v.y, v.z), Lt = Math.hypot(target.x, target.y, target.z), Ls = Math.hypot(start.x, start.y, start.z), want = Ls + (Lt - Ls) * e;
        if (L > 1e-6) { v.x *= want / L; v.y *= want / L; v.z *= want / L; }
        self.set(v);
        if (f < 1) requestAnimationFrame(step); else if (done) done();
      }
      requestAnimationFrame(step);
    };
    // drag to rotate
    var drag = null;
    canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, az: self.az, el: self.el }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
    canvas.addEventListener('pointermove', function (e) { if (!drag) return; self.az = drag.az - (e.clientX - drag.x) * 0.01; self.el = Math.max(-1.4, Math.min(1.4, drag.el + (e.clientY - drag.y) * 0.01)); self.draw(); });
    canvas.addEventListener('pointerup', function () { drag = null; canvas.style.cursor = 'grab'; });
    self.set(opt.vector || { x: 0, y: 0, z: 1 });
    return self;
  };
})();
