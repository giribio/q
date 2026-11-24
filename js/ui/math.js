/* Mini TeX-subset renderer (offline, no library). Supports what beginner lessons need:
 * \frac \sqrt ^ _ \ket \bra \braket \expval \text \mathrm \hat \vec \bar \tilde, pmatrix/bmatrix/vmatrix,
 * Greek letters and common symbols. Use $...$ inline and $$...$$ for display in lesson HTML. */
(function () {
  var QG = window.QG;
  var SYM = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
    notin: '∉', subset: '⊂', subseteq: '⊆', cup: '∪', cap: '∩', emptyset: '∅', setminus: '∖', neg: '¬', land: '∧', lor: '∨',
    uparrow: '↑', downarrow: '↓', Uparrow: '⇑', Downarrow: '⇓', updownarrow: '↕', rightleftharpoons: '⇌', longrightarrow: '⟶',
    otimes: '⊗', oplus: '⊕', cdot: '·', times: '×', pm: '±', mp: '∓', dagger: '†', langle: '⟨', rangle: '⟩', to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', leftrightarrow: '↔', mapsto: '↦',
    approx: '≈', neq: '≠', ne: '≠', leq: '≤', le: '≤', geq: '≥', ge: '≥', infty: '∞', sum: '∑', prod: '∏', int: '∫', partial: '∂', hbar: 'ℏ', in: '∈', equiv: '≡', propto: '∝', circ: '∘', ldots: '…', cdots: '⋯', dots: '…',
    sim: '∼', star: '⋆', nabla: '∇', mid: '|', lvert: '|', rvert: '|', '|': '‖', forall: '∀', exists: '∃', ll: '≪', gg: '≫', perp: '⊥', angle: '∠', degree: '°', checkmark: '✓', ell: 'ℓ', Re: 'Re', Im: 'Im',
    quad: ' ', qquad: '  ', ',': ' ', ';': ' ', ':': ' ', '!': '', ' ': ' ', '{': '{', '}': '}', '%': '%', '#': '#', '&': '&amp;'
  };
  var FUN = { sin: 1, cos: 1, tan: 1, exp: 1, log: 1, ln: 1, det: 1, Tr: 1, tr: 1, max: 1, min: 1, arg: 1, lim: 1, gcd: 1, arcsin: 1, arccos: 1, arctan: 1, sinh: 1, cosh: 1, tanh: 1 };
  var ACC = { hat: '̂', vec: '⃗', bar: '̅', tilde: '̃', dot: '̇' };
  function esc(c) { return c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c; }

  function render(src) {
    var i = 0, s = src;
    function peek() { return s[i]; }
    function readCmd() { i++; var m = /^[A-Za-z]+/.exec(s.slice(i)); if (m) { i += m[0].length; return m[0]; } return s[i++]; }
    function skipWs() { while (s[i] === ' ') i++; }
    function arg() { // one argument: {group} or a single token
      skipWs();
      if (s[i] === '{') { i++; var r = seq('}'); i++; return r; }
      if (s[i] === '\\') { var c = readCmd(); return cmd(c); }
      return atom(s[i++]);
    }
    function rawArg() { skipWs(); if (s[i] !== '{') return s[i++] || ''; var d = 0, st = ++i; while (i < s.length) { if (s[i] === '{') d++; else if (s[i] === '}') { if (d === 0) break; d--; } i++; } var r = s.slice(st, i); i++; return r; }
    function atom(c) {
      if (c === undefined) return '';
      if (/[A-Za-z]/.test(c)) return '<i>' + c + '</i>';
      if (c === '-') return ' − ';
      if (c === '+' || c === '=' || c === '<' || c === '>') return ' ' + esc(c) + ' ';
      if (c === ',') return ', ';
      if (c === ' ') return '';
      if (c === "'") return '′';
      if (c === '~') return ' ';
      return esc(c);
    }
    function env(name) {
      var body = '', start = i, endTag = '\\end{' + name + '}', j = s.indexOf(endTag, i);
      if (j < 0) j = s.length;
      body = s.slice(start, j); i = j + endTag.length;
      var rows = body.split(/\\\\/).map(function (r) { return r.trim(); }).filter(function (r) { return r.length; });
      var cols = 1, cells = [];
      rows.forEach(function (r) { var cs = r.split('&'); cols = Math.max(cols, cs.length); cs.forEach(function (c) { cells.push('<span>' + render(c.trim()) + '</span>'); }); });
      var br = name === 'bmatrix' ? ['[', ']'] : name === 'vmatrix' ? ['|', '|'] : ['(', ')'];
      var style = name === 'pmatrix' ? '' : ' style="border-radius:0"';
      if (name === 'cases') return '<span class="mat"><span style="font-size:1.6em;line-height:1">{</span><span class="cells" style="grid-template-columns:repeat(' + cols + ',auto);text-align:left">' + cells.join('') + '</span></span>';
      return '<span class="mat"><span class="br l"' + style + '></span><span class="cells" style="grid-template-columns:repeat(' + cols + ',auto)">' + cells.join('') + '</span><span class="br r"' + style + '></span></span>';
    }
    function cmd(c) {
      switch (c) {
        case 'frac': case 'dfrac': case 'tfrac': { var a = arg(), b = arg(); return '<span class="frac"><span>' + a + '</span><span>' + b + '</span></span>'; }
        case 'sqrt': return '<span class="sqrt">√<span class="rad">' + arg() + '</span></span>';
        case 'ket': return '|' + arg() + '⟩';
        case 'bra': return '⟨' + arg() + '|';
        case 'braket': { var x = arg(), y = arg(); return '⟨' + x + '|' + y + '⟩'; }
        case 'expval': return '⟨' + arg() + '⟩';
        case 'abs': return '|' + arg() + '|';
        case 'norm': return '‖' + arg() + '‖';
        case 'text': case 'mathrm': case 'textrm': case 'operatorname': case 'mathbf': case 'textbf':
          var t = rawArg(); return (c === 'mathbf' || c === 'textbf' ? '<b>' : '<span>') + t.replace(/[<>&]/g, esc) + (c === 'mathbf' || c === 'textbf' ? '</b>' : '</span>');
        case 'left': case 'right': case 'big': case 'Big': case 'bigg': return s[i] === '.' ? (i++, '') : (s[i] === '\\' ? cmd(readCmd()) : esc(s[i++]));
        case 'begin': { var e = rawArg(); return env(e); }
        case 'color': rawArg(); return '';
        case 'binom': { var bn = arg(), bk = arg(); return '<span style="font-size:1.3em">(</span><span class="frac"><span style="border:0">' + bn + '</span><span>' + bk + '</span></span><span style="font-size:1.3em">)</span>'; }
        case 'xrightarrow': { var lab = arg(); return '<span class="frac" style="margin:0 .25em"><span style="border:0;font-size:.75em">' + lab + '</span><span style="line-height:.6">⟶</span></span>'; }
        case 'bmod': case 'mod': return ' <span>mod</span> ';
        case 'pmod': return ' (<span>mod</span> ' + arg() + ')';
        case 'mathcal': { var mc = rawArg(); return { E: 'ℰ', H: 'ℋ', L: 'ℒ', O: '𝒪', N: '𝒩', D: '𝒟', A: '𝒜', B: 'ℬ', C: '𝒞' }[mc] || mc; }
        case 'mathbb': { var bb = rawArg(); return { C: 'ℂ', R: 'ℝ', Z: 'ℤ', N: 'ℕ', Q: 'ℚ' }[bb] || bb; }
      }
      if (ACC[c]) { var inner = arg().replace(/<\/?i>/g, ''); return '<i>' + inner + ACC[c] + '</i>'; }
      if (FUN[c]) return '<span>' + c + '</span> ';
      if (SYM[c] !== undefined) return SYM[c];
      return esc('\\' + c);
    }
    function seq(stop) {
      var out = '';
      while (i < s.length && s[i] !== stop) {
        var ch = s[i];
        if (ch === '\\') { var c = readCmd(); out += cmd(c); }
        else if (ch === '^') { i++; out += '<sup>' + arg() + '</sup>'; }
        else if (ch === '_') { i++; out += '<sub>' + arg() + '</sub>'; }
        else if (ch === '{') { i++; out += seq('}'); i++; }
        else { i++; out += atom(ch); }
      }
      return out;
    }
    return seq(undefined);
  }

  QG.math = {
    render: render,
    inline: function (tex) { return '<span class="m">' + render(tex) + '</span>'; },
    block: function (tex) { return '<span class="m m-block">' + render(tex) + '</span>'; },
    /* Convert $$..$$ and $..$ in an HTML string. Use \$ for a literal dollar sign. */
    process: function (html) {
      return html
        .replace(/\$\$([\s\S]+?)\$\$/g, function (_, t) { return '<span class="m m-block">' + render(t.trim()) + '</span>'; })
        .replace(/(^|[^\\])\$([^$\n]+?)\$/g, function (_, pre, t) { return pre + '<span class="m">' + render(t) + '</span>'; })
        .replace(/\\\$/g, '$');
    }
  };
})();
