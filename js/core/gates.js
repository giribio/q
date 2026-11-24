/* Gate library. Qubit order follows Qiskit: qubit 0 is the least-significant bit.
 * 1-qubit matrix  = Float64Array(8)  [a_re,a_im, b_re,b_im, c_re,c_im, d_re,d_im] for [[a,b],[c,d]].
 * 2-qubit matrix  = Float64Array(32) row-major 4x4, basis index k = (bit of 2nd qubit)<<1 | (bit of 1st qubit).
 * A gate may be "controlled": base gate + nc control qubits listed first in op.q. */
QG.module('gates', function (QG) {
  var S2 = Math.SQRT1_2;
  function m1(ar, ai, br, bi, cr, ci, dr, di) { return Float64Array.of(ar, ai, br, bi, cr, ci, dr, di); }
  function expi(t) { return [Math.cos(t), Math.sin(t)]; }

  var M = {
    id: function () { return m1(1, 0, 0, 0, 0, 0, 1, 0); },
    x: function () { return m1(0, 0, 1, 0, 1, 0, 0, 0); },
    y: function () { return m1(0, 0, 0, -1, 0, 1, 0, 0); },
    z: function () { return m1(1, 0, 0, 0, 0, 0, -1, 0); },
    h: function () { return m1(S2, 0, S2, 0, S2, 0, -S2, 0); },
    s: function () { return m1(1, 0, 0, 0, 0, 0, 0, 1); },
    sdg: function () { return m1(1, 0, 0, 0, 0, 0, 0, -1); },
    t: function () { return m1(1, 0, 0, 0, 0, 0, S2, S2); },
    tdg: function () { return m1(1, 0, 0, 0, 0, 0, S2, -S2); },
    sx: function () { return m1(0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5); },
    sxdg: function () { return m1(0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5); },
    rx: function (p) { var c = Math.cos(p[0] / 2), s = Math.sin(p[0] / 2); return m1(c, 0, 0, -s, 0, -s, c, 0); },
    ry: function (p) { var c = Math.cos(p[0] / 2), s = Math.sin(p[0] / 2); return m1(c, 0, -s, 0, s, 0, c, 0); },
    rz: function (p) { var a = expi(-p[0] / 2), b = expi(p[0] / 2); return m1(a[0], a[1], 0, 0, 0, 0, b[0], b[1]); },
    p: function (p) { var b = expi(p[0]); return m1(1, 0, 0, 0, 0, 0, b[0], b[1]); },
    u: function (p) {
      var th = p[0], ph = p[1], la = p[2], c = Math.cos(th / 2), s = Math.sin(th / 2);
      var el = expi(la), ep = expi(ph), epl = expi(ph + la);
      return m1(c, 0, -el[0] * s, -el[1] * s, ep[0] * s, ep[1] * s, epl[0] * c, epl[1] * c);
    }
  };
  // two-qubit matrices
  function m4(entries) { // entries: array of [row, col, re, im]
    var a = new Float64Array(32);
    for (var i = 0; i < entries.length; i++) { var e = entries[i]; a[(e[0] * 4 + e[1]) * 2] = e[2]; a[(e[0] * 4 + e[1]) * 2 + 1] = e[3]; }
    return a;
  }
  var M2 = {
    swap: function () { return m4([[0, 0, 1, 0], [1, 2, 1, 0], [2, 1, 1, 0], [3, 3, 1, 0]]); },
    rxx: function (p) { var c = Math.cos(p[0] / 2), s = Math.sin(p[0] / 2); return m4([[0, 0, c, 0], [1, 1, c, 0], [2, 2, c, 0], [3, 3, c, 0], [0, 3, 0, -s], [3, 0, 0, -s], [1, 2, 0, -s], [2, 1, 0, -s]]); },
    ryy: function (p) { var c = Math.cos(p[0] / 2), s = Math.sin(p[0] / 2); return m4([[0, 0, c, 0], [1, 1, c, 0], [2, 2, c, 0], [3, 3, c, 0], [0, 3, 0, s], [3, 0, 0, s], [1, 2, 0, -s], [2, 1, 0, -s]]); },
    rzz: function (p) { var a = expi(-p[0] / 2), b = expi(p[0] / 2); return m4([[0, 0, a[0], a[1]], [1, 1, b[0], b[1]], [2, 2, b[0], b[1]], [3, 3, a[0], a[1]]]); }
  };

  // name -> definition
  var G = {};
  function def(name, o) { o.name = name; o.np = o.np || 0; o.nc = o.nc || 0; o.nt = o.nt || 1; G[name] = o; }
  var single = {
    id: ['I', 'Identity: does nothing'], x: ['X', 'Pauli-X (NOT): flips |0⟩↔|1⟩'], y: ['Y', 'Pauli-Y: bit and phase flip'],
    z: ['Z', 'Pauli-Z: flips the sign of |1⟩'], h: ['H', 'Hadamard: creates superposition'], s: ['S', 'S = √Z: quarter-turn phase (+90°)'],
    sdg: ['S†', 'S-dagger: −90° phase'], t: ['T', 'T = √S: eighth-turn phase (+45°)'], tdg: ['T†', 'T-dagger: −45° phase'],
    sx: ['√X', 'Square root of X'], sxdg: ['√X†', 'Inverse square root of X']
  };
  Object.keys(single).forEach(function (k) { def(k, { label: single[k][0], desc: single[k][1], base: k }); });
  def('rx', { label: 'Rx', np: 1, base: 'rx', desc: 'Rotate about the X axis by θ' });
  def('ry', { label: 'Ry', np: 1, base: 'ry', desc: 'Rotate about the Y axis by θ' });
  def('rz', { label: 'Rz', np: 1, base: 'rz', desc: 'Rotate about the Z axis by θ' });
  def('p', { label: 'P', np: 1, base: 'p', desc: 'Phase gate: adds phase λ to |1⟩' });
  def('u', { label: 'U', np: 3, base: 'u', desc: 'General single-qubit gate U(θ,φ,λ)' });
  def('cx', { label: 'CX', nc: 1, base: 'x', desc: 'Controlled-NOT: flips target if control is |1⟩' });
  def('cy', { label: 'CY', nc: 1, base: 'y', desc: 'Controlled-Y' });
  def('cz', { label: 'CZ', nc: 1, base: 'z', desc: 'Controlled-Z: phase −1 on |11⟩' });
  def('ch', { label: 'CH', nc: 1, base: 'h', desc: 'Controlled-Hadamard' });
  def('cp', { label: 'CP', nc: 1, np: 1, base: 'p', desc: 'Controlled phase' });
  def('crx', { label: 'CRx', nc: 1, np: 1, base: 'rx', desc: 'Controlled Rx' });
  def('cry', { label: 'CRy', nc: 1, np: 1, base: 'ry', desc: 'Controlled Ry' });
  def('crz', { label: 'CRz', nc: 1, np: 1, base: 'rz', desc: 'Controlled Rz' });
  def('cu', { label: 'CU', nc: 1, np: 3, base: 'u', desc: 'Controlled U(θ,φ,λ)' });
  def('ccx', { label: 'CCX', nc: 2, base: 'x', desc: 'Toffoli: flips target if both controls are |1⟩' });
  def('swap', { label: 'SWAP', nt: 2, base2: 'swap', desc: 'Swaps two qubits' });
  def('cswap', { label: 'CSWAP', nc: 1, nt: 2, base2: 'swap', desc: 'Fredkin: swap if control is |1⟩' });
  def('rxx', { label: 'Rxx', nt: 2, np: 1, base2: 'rxx', desc: 'exp(−iθ/2 X⊗X)' });
  def('ryy', { label: 'Ryy', nt: 2, np: 1, base2: 'ryy', desc: 'exp(−iθ/2 Y⊗Y)' });
  def('rzz', { label: 'Rzz', nt: 2, np: 1, base2: 'rzz', desc: 'exp(−iθ/2 Z⊗Z)' });
  // mcx: variable number of controls, decided by op.q length
  def('mcx', { label: 'MCX', nc: -1, base: 'x', desc: 'Multi-controlled X' });

  var selfInverse = { id: 1, x: 1, y: 1, z: 1, h: 1, cx: 1, cy: 1, cz: 1, ch: 1, ccx: 1, swap: 1, cswap: 1, mcx: 1 };
  var pairs = { s: 'sdg', sdg: 's', t: 'tdg', tdg: 't', sx: 'sxdg', sxdg: 'sx' };

  QG.gates = {
    defs: G,
    matrix1: function (base, params) { return M[base](params || []); },
    matrix2: function (base, params) { return M2[base](params || []); },
    has: function (name) { return !!G[name]; },
    inverse: function (op) {
      var g = op.g, p = op.p || [];
      if (selfInverse[g]) return { g: g, q: op.q.slice(), p: [] };
      if (pairs[g]) return { g: pairs[g], q: op.q.slice(), p: [] };
      if (g === 'u' || g === 'cu') return { g: g, q: op.q.slice(), p: [-p[0], -p[2], -p[1]] };
      if (G[g] && G[g].np === 1) return { g: g, q: op.q.slice(), p: [-p[0]] };
      throw new Error('No inverse for ' + g);
    }
  };
});
