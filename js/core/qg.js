/* QGiriBio core namespace.
 * Every core module registers itself with QG.module(name, fn). The fn receives QG
 * and must only use QG plus built-ins (Math, typed arrays), never outer variables,
 * so its source can be re-used inside a Blob Web Worker (fn.toString()).
 * Works in the page (window), in a worker (self) and in Node (globalThis). */
(function (g) {
  var QG = g.QG || (g.QG = {});
  QG.version = '1.0.0';
  QG._modules = QG._modules || [];
  QG.module = function (name, fn) {
    QG._modules.push({ name: name, fn: fn });
    fn(QG);
  };
})(typeof self !== 'undefined' ? self : globalThis);
