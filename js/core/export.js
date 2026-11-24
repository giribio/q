/* Export circuits to OpenQASM 2.0 and to Qiskit (Python, Qiskit 1.x/2.x API), and import OpenQASM 2.0. */
QG.module('export', function (QG) {
  /* Pretty number: recognises simple multiples of pi (pi/2, -3*pi/4 ...). */
  function num(x, py) {
    var PI = Math.PI, piName = py ? 'np.pi' : 'pi';
    if (Math.abs(x) < 1e-12) return '0';
    var dens = [1, 2, 3, 4, 6, 8, 12, 16];
    for (var i = 0; i < dens.length; i++) {
      var d = dens[i], k = x * d / PI, kr = Math.round(k);
      if (kr !== 0 && Math.abs(k - kr) < 1e-9 && Math.abs(kr) <= 64) {
        var s = (kr < 0 ? '-' : '') + (Math.abs(kr) === 1 ? '' : Math.abs(kr) + '*') + piName;
        return d === 1 ? s : s + '/' + d;
      }
    }
    return String(+x.toPrecision(12));
  }
  QG.formatNumber = num;

  // Gates Qiskit's qelib1.inc does not define get a definition in the QASM header.
  var QASM_DEFS = {
    ryy: 'gate ryy(theta) a,b { rx(pi/2) a; rx(pi/2) b; cx a,b; rz(theta) b; cx a,b; rx(-pi/2) a; rx(-pi/2) b; }'
  };

  QG.toQASM = function (c) {
    var lines = ['OPENQASM 2.0;', 'include "qelib1.inc";'], used = {};
    c.ops.forEach(function (o) { if (QASM_DEFS[o.g]) used[o.g] = true; if (o.g === 'diagonal') throw new Error('OpenQASM 2.0 has no diagonal gate: export this circuit to Qiskit instead'); });
    Object.keys(used).forEach(function (k) { lines.push(QASM_DEFS[k]); });
    lines.push('qreg q[' + c.nq + '];');
    if (c.nc > 0) lines.push('creg c[' + c.nc + '];');
    c.ops.forEach(function (o) {
      var pre = '';
      if (o.cond) { if (c.nc !== 1) throw new Error('OpenQASM 2.0 can only condition on a whole register; use Qiskit export for single-bit conditions'); pre = 'if(c==' + o.cond.val + ') '; }
      var qs = o.q.map(function (q) { return 'q[' + q + ']'; }).join(',');
      if (o.g === 'measure') lines.push(pre + 'measure q[' + o.q[0] + '] -> c[' + o.c[0] + '];');
      else if (o.g === 'barrier') lines.push('barrier ' + qs + ';');
      else if (o.g === 'reset') lines.push(pre + 'reset ' + qs + ';');
      else if (o.g === 'mcx') {
        if (o.q.length === 2) lines.push(pre + 'cx ' + qs + ';');
        else if (o.q.length === 3) lines.push(pre + 'ccx ' + qs + ';');
        else throw new Error('OpenQASM 2.0 export supports MCX with at most 2 controls');
      } else {
        var g = o.g === 'cu' ? 'cu3' : o.g, p = o.p && o.p.length ? '(' + o.p.map(function (x) { return num(x); }).join(',') + ')' : '';
        lines.push(pre + g + p + ' ' + qs + ';');
      }
    });
    return lines.join('\n') + '\n';
  };

  QG.toQiskit = function (c, opt) {
    opt = opt || {};
    var shots = opt.shots || 1024, L = [], hasMeas = false, hasDiag = false;
    c.ops.forEach(function (o) { if (o.g === 'measure') hasMeas = true; if (o.g === 'diagonal') hasDiag = true; });
    L.push('# Exported from QGiriBio. Requires: pip install qiskit   (Qiskit 1.x or 2.x)');
    L.push('import numpy as np');
    L.push('from qiskit import QuantumCircuit');
    if (hasDiag) L.push('from qiskit.circuit.library import DiagonalGate');
    L.push(hasMeas ? 'from qiskit.primitives import StatevectorSampler' : 'from qiskit.quantum_info import Statevector');
    L.push('');
    L.push('qc = QuantumCircuit(' + c.nq + (hasMeas ? ', ' + c.nc : '') + ')');
    var indent = '';
    c.ops.forEach(function (o) {
      var line, ind = '';
      if (o.cond) { L.push('with qc.if_test((qc.clbits[' + o.cond.bit + '], ' + o.cond.val + ')):'); ind = '    '; }
      var ps = (o.p || []).map(function (x) { return num(x, true); });
      if (o.g === 'measure') line = 'qc.measure(' + o.q[0] + ', ' + o.c[0] + ')';
      else if (o.g === 'barrier') line = 'qc.barrier()';
      else if (o.g === 'reset') line = 'qc.reset(' + o.q[0] + ')';
      else if (o.g === 'mcx') line = 'qc.mcx([' + o.q.slice(0, -1).join(', ') + '], ' + o.q[o.q.length - 1] + ')';
      else if (o.g === 'diagonal') line = 'qc.append(DiagonalGate([' + o.phases.map(function (ph) { return 'np.exp(1j*' + num(ph, true) + ')'; }).join(', ') + ']), [' + o.q.join(', ') + '])';
      else if (o.g === 'cu') line = 'qc.cu(' + ps.concat(['0']).join(', ') + ', ' + o.q.join(', ') + ')';
      else line = 'qc.' + o.g + '(' + ps.concat(o.q.map(String)).join(', ') + ')';
      L.push(indent + ind + line);
    });
    L.push('');
    L.push('print(qc.draw())');
    if (hasMeas) {
      L.push('sampler = StatevectorSampler()');
      L.push('result = sampler.run([qc], shots=' + shots + ').result()');
      L.push('print(result[0].data.c.get_counts())');
    } else {
      L.push('state = Statevector(qc)');
      L.push('print(state.probabilities_dict())');
    }
    return L.join('\n') + '\n';
  };

  /* ---------- Q# export (Microsoft Quantum Development Kit, Q# 1.x syntax) ----------
   * Gate meanings match Q#'s intrinsics: R1 = phase gate P, Rx/Ry/Rz/Rxx/Ryy/Rzz as in Qiskit.
   * SX and single-qubit U are exported up to a global phase (unobservable); controlled U keeps the exact phase. */
  function qsNum(x) { var s = String(+(+x).toPrecision(15)); return /[.eE]/.test(s) ? s : s + '.0'; }
  QG.toQSharp = function (c, opt) {
    opt = opt || {};
    var L = [], ind = '        ', hasMeas = c.ops.some(function (o) { return o.g === 'measure'; });
    function q(i) { return 'q[' + i + ']'; }
    function ctl(list) { return '[' + list.map(q).join(', ') + ']'; }
    function angle(x) { var f = num(x); return qsNum(x) + (/pi/.test(f) ? ' /* ' + f + ' */' : ''); }
    c.ops.forEach(function (o) {
      var g = o.g, Q = o.q, p = o.p || [], line;
      if (g === 'barrier') return;
      if (g === 'diagonal') throw new Error('Q# export does not support diagonal gates; decompose them first (or export to Qiskit)');
      if (g === 'measure') line = 'set c w/= ' + o.c[0] + ' <- M(' + q(Q[0]) + ');';
      else if (g === 'reset') line = 'Reset(' + q(Q[0]) + ');';
      else {
        var simple = { id: 'I', x: 'X', y: 'Y', z: 'Z', h: 'H', s: 'S', t: 'T' };
        if (simple[g]) line = simple[g] + '(' + q(Q[0]) + ');';
        else if (g === 'sdg') line = 'Adjoint S(' + q(Q[0]) + ');';
        else if (g === 'tdg') line = 'Adjoint T(' + q(Q[0]) + ');';
        else if (g === 'sx') line = 'Rx(' + angle(Math.PI / 2) + ', ' + q(Q[0]) + '); // √X up to a global phase';
        else if (g === 'sxdg') line = 'Rx(' + angle(-Math.PI / 2) + ', ' + q(Q[0]) + '); // √X† up to a global phase';
        else if (g === 'rx' || g === 'ry' || g === 'rz') line = g[0].toUpperCase() + g[1] + '(' + angle(p[0]) + ', ' + q(Q[0]) + ');';
        else if (g === 'p') line = 'R1(' + angle(p[0]) + ', ' + q(Q[0]) + ');';
        else if (g === 'u') line = 'Rz(' + angle(p[2]) + ', ' + q(Q[0]) + '); Ry(' + angle(p[0]) + ', ' + q(Q[0]) + '); Rz(' + angle(p[1]) + ', ' + q(Q[0]) + '); // U(θ,φ,λ) up to a global phase';
        else if (g === 'cx') line = 'CNOT(' + q(Q[0]) + ', ' + q(Q[1]) + ');';
        else if (g === 'cz') line = 'CZ(' + q(Q[0]) + ', ' + q(Q[1]) + ');';
        else if (g === 'cy') line = 'Controlled Y(' + ctl([Q[0]]) + ', ' + q(Q[1]) + ');';
        else if (g === 'ch') line = 'Controlled H(' + ctl([Q[0]]) + ', ' + q(Q[1]) + ');';
        else if (g === 'cp') line = 'Controlled R1(' + ctl([Q[0]]) + ', (' + angle(p[0]) + ', ' + q(Q[1]) + '));';
        else if (g === 'crx' || g === 'cry' || g === 'crz') line = 'Controlled ' + g[1].toUpperCase() + g[2] + '(' + ctl([Q[0]]) + ', (' + angle(p[0]) + ', ' + q(Q[1]) + '));';
        else if (g === 'cu') line = 'R1(' + angle((p[1] + p[2]) / 2) + ', ' + q(Q[0]) + '); Controlled Rz(' + ctl([Q[0]]) + ', (' + angle(p[2]) + ', ' + q(Q[1]) + ')); Controlled Ry(' + ctl([Q[0]]) + ', (' + angle(p[0]) + ', ' + q(Q[1]) + ')); Controlled Rz(' + ctl([Q[0]]) + ', (' + angle(p[1]) + ', ' + q(Q[1]) + ')); // controlled U(θ,φ,λ), exact';
        else if (g === 'ccx') line = 'CCNOT(' + q(Q[0]) + ', ' + q(Q[1]) + ', ' + q(Q[2]) + ');';
        else if (g === 'mcx') line = 'Controlled X(' + ctl(Q.slice(0, -1)) + ', ' + q(Q[Q.length - 1]) + ');';
        else if (g === 'swap') line = 'SWAP(' + q(Q[0]) + ', ' + q(Q[1]) + ');';
        else if (g === 'cswap') line = 'Controlled SWAP(' + ctl([Q[0]]) + ', (' + q(Q[1]) + ', ' + q(Q[2]) + '));';
        else if (g === 'rxx' || g === 'ryy' || g === 'rzz') line = 'R' + g[1] + g[2] + '(' + angle(p[0]) + ', ' + q(Q[0]) + ', ' + q(Q[1]) + ');';
        else throw new Error('Q# export: unsupported gate ' + g);
      }
      if (o.cond) line = 'if c[' + o.cond.bit + '] == ' + (o.cond.val ? 'One' : 'Zero') + ' { ' + line + ' }';
      L.push(ind + line);
    });
    var ns = opt.namespace || 'QGiriBio', out = [
      '// Exported from QGiriBio. Run with the Microsoft Quantum Development Kit (VS Code extension or `qsharp` Python package).',
      '// Result array index k = classical bit k (qubit 0 is the least-significant bit, as in Qiskit).',
      'namespace ' + ns + ' {',
      '    @EntryPoint()',
      '    operation Main() : Result[] {',
      '        use q = Qubit[' + c.nq + '];'];
    if (hasMeas) out.push('        mutable c = [Zero, size = ' + c.nc + '];');
    out = out.concat(L);
    if (hasMeas) out.push('        ResetAll(q);', '        return c;');
    else out.push('        mutable r = [Zero, size = ' + c.nq + '];', '        for i in 0..' + (c.nq - 1) + ' { set r w/= i <- M(q[i]); }', '        ResetAll(q);', '        return r;');
    out.push('    }', '}');
    return out.join('\n') + '\n';
  };

  /* ---------- OpenQASM 2.0 import (subset: qelib1 gates, gate definitions, measure, reset, barrier, if) ---------- */
  function evalExpr(src, env) {
    var toks = src.match(/\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+(?:[eE][-+]?\d+)?|[A-Za-z_][A-Za-z0-9_]*|\*\*|[-+*/^()]/g) || [], i = 0;
    function peek() { return toks[i]; }
    function next() { return toks[i++]; }
    function primary() {
      var t = next();
      if (t === undefined) throw new Error('Unexpected end of expression');
      if (t === '(') { var v = add(); if (next() !== ')') throw new Error('Missing )'); return v; }
      if (t === '-') return -power();
      if (t === '+') return power();
      if (/^[\d.]/.test(t)) return parseFloat(t);
      if (t === 'pi') return Math.PI;
      var fns = { sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, ln: Math.log, sqrt: Math.sqrt };
      if (fns[t]) { if (next() !== '(') throw new Error('Expected ( after ' + t); var a = add(); if (next() !== ')') throw new Error('Missing )'); return fns[t](a); }
      if (env && t in env) return env[t];
      throw new Error('Unknown symbol in expression: ' + t);
    }
    function power() { var b = primary(); if (peek() === '^' || peek() === '**') { next(); return Math.pow(b, power()); } return b; }
    function mul() { var v = power(); while (peek() === '*' || peek() === '/') { var o = next(), r = power(); v = o === '*' ? v * r : v / r; } return v; }
    function add() { var v = mul(); while (peek() === '+' || peek() === '-') { var o = next(), r = mul(); v = o === '+' ? v + r : v - r; } return v; }
    var v = add(); if (i < toks.length) throw new Error('Unexpected token: ' + toks[i]); return v;
  }
  QG.evalExpr = evalExpr;

  function splitTop(s) { // split by commas not inside parentheses
    var out = [], depth = 0, cur = '';
    for (var i = 0; i < s.length; i++) { var ch = s[i]; if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch; }
    if (cur.trim()) out.push(cur); return out.map(function (x) { return x.trim(); });
  }

  QG.fromQASM = function (text) {
    var src = text.replace(/\/\/.*$/gm, '').replace(/\r/g, '');
    var qregs = {}, cregs = {}, nq = 0, ncl = 0, userGates = {}, stmts = [], m;
    // pull out gate definitions first
    src = src.replace(/gate\s+([A-Za-z_]\w*)\s*(\(([^)]*)\))?\s*([^{]*)\{([^}]*)\}/g, function (_, name, __, params, args, body) {
      userGates[name] = { params: params ? params.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : [], args: args.split(',').map(function (x) { return x.trim(); }).filter(Boolean), body: body };
      return '';
    });
    src.split(';').forEach(function (s) { s = s.trim(); if (s) stmts.push(s); });
    var circ = null, ops = [];
    function regIndex(tok, regs) {
      var mm = tok.match(/^([A-Za-z_]\w*)\s*(\[\s*(\d+)\s*\])?$/);
      if (!mm || !regs[mm[1]]) throw new Error('Unknown register: ' + tok);
      var r = regs[mm[1]];
      if (mm[2] === undefined) { var all = []; for (var k = 0; k < r.size; k++) all.push(r.off + k); return all; }
      if (+mm[3] >= r.size) throw new Error('Index out of range: ' + tok);
      return [r.off + (+mm[3])];
    }
    var builtin = { u3: 'u', u2: 'u2', u1: 'p', U: 'u', CX: 'cx', cu3: 'cu', cu1: 'cp' };
    function emit(name, params, qubitLists, cond) {
      // broadcast over whole registers
      var len = 1; qubitLists.forEach(function (l) { if (l.length > 1) len = l.length; });
      for (var b = 0; b < len; b++) {
        var q = qubitLists.map(function (l) { return l.length > 1 ? l[b] : l[0]; });
        applyGate(name, params, q, cond, 0);
      }
    }
    function applyGate(name, params, q, cond, depth) {
      if (depth > 20) throw new Error('Gate definitions nested too deeply');
      if (userGates[name] && !QG.gates.defs[name]) {
        var g = userGates[name], env = {}, qmap = {};
        g.params.forEach(function (p, i) { env[p] = params[i]; });
        g.args.forEach(function (a, i) { qmap[a] = q[i]; });
        g.body.split(';').forEach(function (s) {
          s = s.trim(); if (!s) return;
          var mm = s.match(/^([A-Za-z_]\w*)\s*(\((.*)\))?\s+(.+)$/);
          if (!mm) throw new Error('Cannot parse: ' + s);
          var ps = mm[3] ? splitTop(mm[3]).map(function (e) { return evalExpr(e, env); }) : [];
          var qs = mm[4].split(',').map(function (x) { x = x.trim(); if (!(x in qmap)) throw new Error('Unknown gate argument: ' + x); return qmap[x]; });
          if (mm[1] === 'barrier') return;
          applyGate(mm[1], ps, qs, cond, depth + 1);
        });
        return;
      }
      var n = builtin[name] || name, op;
      if (n === 'u2') { n = 'u'; params = [Math.PI / 2, params[0], params[1]]; }
      if (!QG.gates.defs[n]) throw new Error('Unsupported gate: ' + name);
      if (n === 'cu' && params.length === 4) params = params.slice(0, 3);
      op = { g: n, q: q, p: params };
      if (cond) op.cond = cond;
      ops.push(op);
    }
    stmts.forEach(function (s) {
      if (/^OPENQASM/.test(s) || /^include/.test(s)) return;
      if ((m = s.match(/^qreg\s+([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]$/))) { qregs[m[1]] = { off: nq, size: +m[2] }; nq += +m[2]; return; }
      if ((m = s.match(/^creg\s+([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]$/))) { cregs[m[1]] = { off: ncl, size: +m[2] }; ncl += +m[2]; return; }
      var cond = null;
      if ((m = s.match(/^if\s*\(\s*([A-Za-z_]\w*)\s*==\s*(\d+)\s*\)\s*(.+)$/))) {
        var cr = cregs[m[1]]; if (!cr) throw new Error('Unknown creg in if: ' + m[1]);
        if (cr.size !== 1) throw new Error('Only 1-bit registers are supported in if()');
        cond = { bit: cr.off, val: +m[2] ? 1 : 0 }; s = m[3].trim();
      }
      if ((m = s.match(/^measure\s+(.+?)\s*->\s*(.+)$/))) {
        var qa = regIndex(m[1].trim(), qregs), ca = regIndex(m[2].trim(), cregs);
        if (qa.length !== ca.length) throw new Error('measure: register sizes differ');
        qa.forEach(function (q, i) { var o = { g: 'measure', q: [q], c: [ca[i]] }; if (cond) o.cond = cond; ops.push(o); });
        return;
      }
      if ((m = s.match(/^reset\s+(.+)$/))) { regIndex(m[1].trim(), qregs).forEach(function (q) { var o = { g: 'reset', q: [q] }; if (cond) o.cond = cond; ops.push(o); }); return; }
      if ((m = s.match(/^barrier\b/))) { var all = []; for (var k = 0; k < nq; k++) all.push(k); ops.push({ g: 'barrier', q: all }); return; }
      m = s.match(/^([A-Za-z_]\w*)\s*(\((.*)\))?\s+(.+)$/);
      if (!m) throw new Error('Cannot parse statement: ' + s);
      var params = m[3] !== undefined ? splitTop(m[3]).map(function (e) { return evalExpr(e); }) : [];
      var qlists = splitTop(m[4]).map(function (t) { return regIndex(t, qregs); });
      emit(m[1], params, qlists, cond);
    });
    if (nq === 0) throw new Error('No qreg declared');
    circ = new QG.Circuit(nq, ncl);
    circ.ops = ops;
    return circ;
  };
});
