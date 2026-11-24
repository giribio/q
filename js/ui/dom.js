/* Small DOM helpers, storage, toasts, modals, downloads. Page only. */
(function () {
  var QG = window.QG, ui = QG.ui = {};

  /* h('div', {class:'x', onclick: fn}, child, 'text', [more]) */
  ui.h = function (tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  ui.svg = function (tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v === null || v === undefined) return;
      if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  };
  ui.$ = function (sel, root) { return (root || document).querySelector(sel); };
  ui.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  ui.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* localStorage with a prefix; every access is guarded (storage may be blocked). */
  var PREFIX = 'qgiribio:', memory = {};
  ui.store = {
    get: function (k, def) {
      try { var v = window.localStorage.getItem(PREFIX + k); if (v !== null) return JSON.parse(v); } catch (e) { if (k in memory) return memory[k]; }
      return k in memory ? memory[k] : def;
    },
    set: function (k, v) { memory[k] = v; try { window.localStorage.setItem(PREFIX + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    remove: function (k) { delete memory[k]; try { window.localStorage.removeItem(PREFIX + k); } catch (e) { } },
    available: function () { try { window.localStorage.setItem(PREFIX + '_t', '1'); window.localStorage.removeItem(PREFIX + '_t'); return true; } catch (e) { return false; } },
    dump: function () {
      var o = {};
      try { for (var i = 0; i < window.localStorage.length; i++) { var k = window.localStorage.key(i); if (k.indexOf(PREFIX) === 0) o[k.slice(PREFIX.length)] = JSON.parse(window.localStorage.getItem(k)); } }
      catch (e) { Object.keys(memory).forEach(function (k) { o[k] = memory[k]; }); }
      return o;
    }
  };

  ui.toast = function (msg, ms) {
    var t = ui.h('div', { class: 'toast', role: 'status' }, msg);
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 2400);
  };

  ui.modal = function (title, body, actions) {
    var back = ui.h('div', { class: 'modal-back', onclick: function (e) { if (e.target === back) close(); } });
    var box = ui.h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, ui.h('h3', null, title), body);
    var row = ui.h('div', { class: 'btn-row', style: { justifyContent: 'flex-end', marginTop: '16px' } });
    (actions || []).forEach(function (a) { row.appendChild(ui.h('button', { class: 'btn' + (a.primary ? ' primary' : ''), onclick: function () { if (a.onclick() !== false) close(); } }, a.label)); });
    row.appendChild(ui.h('button', { class: 'btn', onclick: close }, 'Close'));
    box.appendChild(row); back.appendChild(box); document.body.appendChild(back);
    function key(e) { if (e.key === 'Escape') close(); }
    function close() { back.remove(); document.removeEventListener('keydown', key); }
    document.addEventListener('keydown', key);
    setTimeout(function () { var f = box.querySelector('button, textarea, input, select'); if (f) f.focus(); }, 0);
    return { close: close, el: box };
  };

  ui.download = function (text, filename, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' }));
    var a = ui.h('a', { href: url, download: filename }); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  };
  ui.copy = function (text) {
    function fallback() {
      var ta = ui.h('textarea', { style: { position: 'fixed', opacity: '0' } }); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ui.toast('Copied'); } catch (e) { ui.toast('Copy failed: select the text and press Ctrl+C'); } ta.remove();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { ui.toast('Copied'); }, fallback);
    else fallback();
  };
  /* Show code (Qiskit / QASM) with copy + download buttons. */
  ui.codeModal = function (title, text, filename) {
    var pre = ui.h('pre', null, ui.h('code', null, text));
    ui.modal(title, pre, [
      { label: 'Copy', onclick: function () { ui.copy(text); return false; } },
      { label: 'Download ' + filename, primary: true, onclick: function () { ui.download(text, filename); return false; } }
    ]);
  };
  ui.debounce = function (fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; };
  ui.fmtAngle = function (x) { return QG.formatNumber(x).replace(/\*?pi/, 'π').replace('np.', ''); };
})();
