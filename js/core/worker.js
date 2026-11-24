/* Runs heavy work in a Web Worker built from a Blob, so it works when the app is opened as a file.
 * The worker gets a copy of every core module's source (QG._modules -> fn.toString()).
 * If workers are unavailable, work runs on the main thread instead (QG.worker.mode === 'main'). */
(function (g) {
  var QG = g.QG;
  if (typeof document === 'undefined') return; // only in the page

  function workerMain() {
    /* --- runs inside the worker --- */
    var running = {};
    self.onmessage = function (e) {
      var msg = e.data, id = msg.id;
      try {
        if (msg.type === 'run') {
          var c = self.QG.Circuit.fromJSON(msg.circuit), r = self.QG.run(c, msg.opt || {});
          self.postMessage({ id: id, ok: true, result: self.QG.packResult(r, msg.opt || {}) });
        } else if (msg.type === 'code') {
          var out = [];
          var send = function (kind, payload) { self.postMessage({ id: id, stream: true, kind: kind, payload: payload }); };
          self.QG.show = self.QG.makeShow(send);
          var consoleProxy = {
            log: function () { send('log', Array.prototype.map.call(arguments, self.QG.fmt).join(' ')); },
            warn: function () { send('warn', Array.prototype.map.call(arguments, self.QG.fmt).join(' ')); },
            error: function () { send('error', Array.prototype.map.call(arguments, self.QG.fmt).join(' ')); }
          };
          var fn = new Function('QG', 'console', '"use strict";\n' + msg.code);
          var ret = fn(self.QG, consoleProxy);
          Promise.resolve(ret).then(function () { self.postMessage({ id: id, ok: true, result: null }); },
            function (err) { self.postMessage({ id: id, ok: false, error: String(err && err.message || err), stack: err && err.stack }); });
        } else if (msg.type === 'call') {
          var parts = msg.fn.split('.'), f = self.QG;
          for (var i = 0; i < parts.length; i++) f = f[parts[i]];
          var res = f.apply(null, msg.args || []);
          self.postMessage({ id: id, ok: true, result: res });
        }
      } catch (err) {
        self.postMessage({ id: id, ok: false, error: String(err && err.message || err), stack: err && err.stack });
      }
    };
  }

  var W = QG.worker = { mode: 'none', _w: null, _seq: 0, _pending: {} };

  function build() {
    try {
      var src = 'self.QG={version:' + JSON.stringify(QG.version) + ',_modules:[]};\n' +
        'self.QG.module=function(n,f){self.QG._modules.push({name:n,fn:f});f(self.QG);};\n' +
        QG._modules.map(function (m) { return 'self.QG.module(' + JSON.stringify(m.name) + ',' + m.fn.toString() + ');'; }).join('\n') +
        '\n(' + workerMain.toString() + ')();';
      var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      var w = new Worker(url);
      w.onmessage = function (e) {
        var m = e.data, p = W._pending[m.id];
        if (!p) return;
        if (m.stream) { if (p.onStream) p.onStream(m.kind, m.payload); return; }
        delete W._pending[m.id];
        clearTimeout(p.timer);
        if (m.ok) p.resolve(m.result); else { var er = new Error(m.error); er.workerStack = m.stack; p.reject(er); }
      };
      w.onerror = function (e) { e.preventDefault && e.preventDefault(); Object.keys(W._pending).forEach(function (k) { W._pending[k].reject(new Error(e.message || 'Worker error')); delete W._pending[k]; }); };
      W._w = w; W.mode = 'worker';
    } catch (err) {
      W._w = null; W.mode = 'main';
    }
  }

  function post(msg, opt) {
    opt = opt || {};
    if (!W._w) build();
    if (W.mode === 'main') return runOnMain(msg, opt);
    var id = ++W._seq; msg.id = id;
    return new Promise(function (resolve, reject) {
      var entry = { resolve: resolve, reject: reject, onStream: opt.onStream };
      if (opt.timeout) entry.timer = setTimeout(function () {
        delete W._pending[id];
        W.terminate();
        reject(new Error('Stopped after ' + (opt.timeout / 1000) + ' s (possible infinite loop). The simulator was restarted.'));
      }, opt.timeout);
      W._pending[id] = entry;
      W._w.postMessage(msg);
    });
  }

  function runOnMain(msg, opt) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          if (msg.type === 'run') resolve(QG.packResult(QG.run(QG.Circuit.fromJSON(msg.circuit), msg.opt || {}), msg.opt || {}));
          else if (msg.type === 'code') {
            var send = function (k, p) { if (opt.onStream) opt.onStream(k, p); };
            var saved = QG.show; QG.show = QG.makeShow(send);
            var cons = { log: function () { send('log', [].map.call(arguments, QG.fmt).join(' ')); }, warn: function () { send('warn', [].map.call(arguments, QG.fmt).join(' ')); }, error: function () { send('error', [].map.call(arguments, QG.fmt).join(' ')); } };
            try { var r = new Function('QG', 'console', '"use strict";\n' + msg.code)(QG, cons); Promise.resolve(r).then(function () { QG.show = saved; resolve(null); }, function (e) { QG.show = saved; reject(e); }); }
            catch (e) { QG.show = saved; reject(e); }
          } else if (msg.type === 'call') {
            var f = QG; msg.fn.split('.').forEach(function (p) { f = f[p]; }); resolve(f.apply(null, msg.args || []));
          }
        } catch (e) { reject(e); }
      }, 0);
    });
  }

  W.terminate = function () { if (W._w) { W._w.terminate(); W._w = null; W.mode = 'none'; } };
  /* Run a circuit off the main thread. */
  W.run = function (circuit, opt) { return post({ type: 'run', circuit: circuit.toJSON ? circuit.toJSON() : circuit, opt: opt || {} }); };
  /* Run student code. onStream(kind, payload) receives console output and QG.show.* calls. */
  W.code = function (code, onStream, timeout) { return post({ type: 'code', code: code }, { onStream: onStream, timeout: timeout || 15000 }); };
  /* Call any QG function by dotted name with plain-data arguments. */
  W.call = function (fn, args, timeout) { return post({ type: 'call', fn: fn, args: args }, { timeout: timeout }); };
  W.ensure = function () { if (!W._w && W.mode !== 'main') build(); return W.mode; };
})(typeof self !== 'undefined' ? self : globalThis);
