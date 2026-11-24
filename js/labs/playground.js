/* Playground page (#/playground): the same problem on a classical CPU, a parallel GPU (modelled) and qubits. */
(function () {
  var QG = window.QG, ui = QG.ui, h = ui.h, PG = QG.playground, PI = Math.PI;
  function css(v) { return QG.charts.cssVar(v); }

  var BACKENDS = [
    { id: 'cpu', name: 'Classical CPU', tag: 'one step at a time', col: '--yellow', ink: '--yellow-ink', icon: '▣', blurb: 'Real JavaScript running on your computer, step by step.' },
    { id: 'gpu', name: 'Parallel GPU', tag: 'modelled', col: '--green', ink: '--green', icon: '▦', blurb: 'A model of many threads working at once (like CUDA). We count ideal parallel steps; no graphics card is used.' },
    { id: 'qubit', name: 'Quantum qubits', tag: 'exact simulation', col: '--blue', ink: '--blue', icon: '◉', blurb: 'The real quantum circuit, simulated exactly with the QGiriBio engine.' }
  ];

  var EXAMPLES = {
    coin: {
      title: 'Random bits', level: 'Intro', concept: 'Superposition', icon: '🪙',
      desc: 'Make a long list of random 0s and 1s, like flipping a coin many times.',
      params: [{ key: 'shots', label: 'Number of bits', options: [100, 1000, 10000], value: 1000 }],
      run: function (p) { return PG.coin(p.shots); },
      why: function (r) {
        return '<p>All three give roughly half 0s and half 1s. The qubit is no faster: it still makes <b>one bit per run</b>. What is different is <i>where the randomness comes from</i>. A normal computer uses a formula that only looks random. A real qubit in superposition (after an H gate) gives randomness from physics itself.</p>' +
          '<p class="small muted">Honest note: in this simulator the qubit\'s randomness also comes from your computer\'s random-number generator. Only real quantum hardware gives physical randomness, and researchers use it for "certified" random numbers.</p>';
      },
      code: function (p) { return '// Random bits from a qubit: H then measure\nconst qc = new QG.Circuit(1);\nqc.h(0).measure(0, 0);\nconst r = QG.run(qc, { shots: ' + p.shots + ' });\nconsole.log(r.counts);\nQG.show.histogram(r, "' + p.shots + ' quantum coin flips");\nQG.show.bloch(new QG.Circuit(1).h(0), 0, "The qubit before measuring");\n'; }
    },
    search: {
      title: 'Find the hidden item', level: 'Core', concept: 'Grover search', icon: '🔍',
      desc: 'One item in an unsorted list is marked. Find it while checking the list as few times as possible.',
      params: [{ key: 'n', label: 'List size', options: [[4, '16 items (4 qubits)'], [6, '64 items (6 qubits)'], [8, '256 items (8 qubits)'], [10, '1,024 items (10 qubits)']], value: 8 }],
      run: function (p) { return PG.search(p.n); },
      why: function (r) {
        return '<p>The CPU checks items one by one: on average half the list, up to all ' + r.N + '. The GPU splits the list between ' + r.gpu.threads + ' threads: much faster, but the work still grows in proportion to the list size. Grover\'s algorithm used only <b>' + r.qubit.iterations + '</b> checks, about $\\frac{\\pi}{4}\\sqrt{N}$, by making the marked item\'s amplitude grow a little with each check.</p>' +
          '<p>That is a <b>square-root</b> speed-up: a list a million times longer needs only a thousand times more checks. The answer is right with probability ' + (r.qubit.pSuccess * 100).toFixed(2) + '%; if a measurement misses, you simply run again.</p>' +
          '<p class="small muted">Honest note: each "check" on a quantum computer is a whole circuit (the oracle), and real hardware is slower and noisier than a CPU per step. Grover pays off only for huge search spaces.</p>';
      },
      code: function (p, r) { return '// Grover search for item ' + r.target + ' among ' + r.N + '\nconst g = QG.algorithms.grover(' + p.n + ', ' + r.target + ');\nconsole.log("iterations:", g.iterations);\nconst s = QG.state(g.circuit);\nconsole.log("P(found) =", s.probabilities()[' + r.target + '].toFixed(4));\nconst run = QG.run(g.circuit.copy().measureAll(), { shots: 100 });\nconsole.log(run.counts);\n'; }
    },
    bell: {
      title: 'Entangled twins', level: 'Core', concept: 'Entanglement', icon: '🔗',
      desc: 'Make two bits many times. Do they agree? Then play the CHSH game, a test that no classical trick can pass as well.',
      params: [{ key: 'shots', label: 'Rounds', options: [200, 1000, 4000], value: 1000 }],
      run: function (p) { return PG.bell(p.shots); },
      why: function (r) {
        return '<p>Two independent random bits agree only about half the time. The entangled pair (H then CX) agrees <b>every time</b>.</p>' +
          '<p>But careful: two classical friends could also agree every time by sharing a coin flip in advance. The real proof that entanglement is different is the <b>CHSH game</b>, where the players get random questions: the best classical strategy wins at most 75%, the entangled pair wins about 85% (here ' + (r.qubit.chsh * 100).toFixed(1) + '% vs ' + (r.cpu.chsh * 100).toFixed(1) + '%). That gap won the 2022 Nobel Prize in Physics. See <a href="#/learn/2.7">lesson 2.7</a>.</p>';
      },
      code: function (p) { return '// Entangled twins: H then CX\nconst qc = new QG.Circuit(2);\nqc.h(0).cx(0, 1).measureAll();\nconst r = QG.run(qc, { shots: ' + p.shots + ' });\nQG.show.histogram(r, "Bell pair: only 00 and 11");\n// CHSH game: classical vs quantum win rate\nconst b = QG.playground.bell(' + p.shots + ');\nconsole.log("CHSH win rate  classical:", b.cpu.chsh, "  quantum:", b.qubit.chsh);\n'; }
    },
    factor: {
      title: 'Break a number into primes', level: 'Advanced', concept: "Shor's algorithm", icon: '🔐',
      desc: 'Find the two prime numbers that multiply to N. This is the problem that keeps internet encryption (RSA) safe.',
      params: [{ key: 'N', label: 'Number N', options: [15, 21, 33, 35], value: 15 }],
      run: function (p) { return PG.factor(p.N); },
      why: function (r) {
        return '<p>For small numbers the CPU wins easily: a couple of divisions. The point is how the work <b>grows</b>. Trial division doubles its work every time N gets 2 bits longer, so a 2048-bit RSA number is far out of reach. Shor\'s algorithm finds a hidden <b>period</b> with a quantum Fourier transform; its cost grows only like (number of bits)³.</p>' +
          '<p>Shor is a mix: a quantum part (finding the period) plus easy classical maths (continued fractions and greatest common divisors). Some runs fail and are simply repeated; here it took ' + r.qubit.attempts.length + ' run' + (r.qubit.attempts.length > 1 ? 's' : '') + ' using ' + r.qubit.qubits + ' qubits.</p>' +
          '<p class="small muted">Honest note: breaking real RSA would need a fault-tolerant quantum computer with roughly a million physical qubits. Today\'s machines are far from that (see <a href="#/learn/3.7">lesson 3.7</a>).</p>';
      },
      code: function (p) { return '// Shor-style factoring of N = ' + p.N + ' (quantum period finding + classical maths)\nconst f = QG.playground.factor(' + p.N + ');\nf.qubit.attempts.forEach((a, i) => console.log("run " + (i + 1) + ": a = " + a.a + "  " + a.note));\nconsole.log("factors:", f.qubit.factors);\nconst o = QG.algorithms.orderFinding(7, 15, 8);\nQG.show.plot([{ name: "P(y)", x: o.probs.map((_, i) => i), y: Array.from(o.probs) }], { title: "Period finding for 7^x mod 15", xLabel: "measured y" });\n'; }
    }
  };
  var ORDER = ['coin', 'search', 'bell', 'factor'];

  function hbars(rows, unit) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.v; }).concat([1])), min = Math.max(1e-9, Math.min.apply(null, rows.map(function (r) { return Math.max(r.v, 1e-9); }))), log = max / min > 30;
    var box = h('div', { class: 'pg-bars' });
    rows.forEach(function (r) {
      var f = log ? Math.log10(r.v + 1) / Math.log10(max + 1) : r.v / max;
      box.appendChild(h('div', { class: 'pg-bar-row' }, h('span', { class: 'pg-bar-label' }, r.label),
        h('span', { class: 'pg-bar-track' }, h('span', { class: 'pg-bar-fill', style: { width: Math.max(2, f * 100) + '%', background: css(r.col) } })),
        h('span', { class: 'pg-bar-val' }, r.text || String(r.v))));
    });
    box.appendChild(h('div', { class: 'small muted' }, 'Unit: ' + unit + (log ? ' (bar lengths on a log scale)' : '') + '.'));
    return box;
  }

  function page(el) {
    var st = { ex: ui.store.get('playground:ex', 'coin'), params: {}, result: null };
    if (!EXAMPLES[st.ex]) st.ex = 'coin';
    el.appendChild(h('div', { class: 'lab-head' }, h('h1', null, 'Quantum Playground'), h('span', { class: 'muted small' }, 'One problem, three computers: a classical CPU, a parallel GPU and qubits')));
    el.appendChild(h('div', { class: 'callout green', html: '<strong>Start here</strong>Pick a problem, press <b>Run all three</b>, and compare the answers and the work each computer needed. New to qubits, gates and the Bloch sphere? Read <a href="#/learn/0.1">lesson 0.1</a> first: it takes 15 minutes.' }));
    var legend = h('div', { class: 'pg-backend-legend' });
    BACKENDS.forEach(function (b) { legend.appendChild(h('div', { class: 'pg-legend-item', style: { borderTopColor: css(b.col) } }, h('strong', null, b.icon + ' ' + b.name), h('span', { class: 'chip', style: { marginLeft: '6px' } }, b.tag), h('div', { class: 'small muted' }, b.blurb))); });
    el.appendChild(legend);

    var picker = h('div', { class: 'pg-picker', role: 'tablist', 'aria-label': 'Choose a problem' });
    var panel = h('div', { class: 'card', style: { marginTop: '14px' } }), cards = h('div', { class: 'pg-cards' }), compare = h('div');
    el.appendChild(picker); el.appendChild(panel); el.appendChild(cards); el.appendChild(compare);

    function drawPicker() {
      picker.innerHTML = '';
      ORDER.forEach(function (k, i) {
        var e = EXAMPLES[k];
        picker.appendChild(h('button', { class: 'pg-pick' + (k === st.ex ? ' on' : ''), role: 'tab', 'aria-selected': k === st.ex ? 'true' : 'false', onclick: function () { st.ex = k; st.result = null; ui.store.set('playground:ex', k); draw(); } },
          h('span', { class: 'pg-pick-icon', 'aria-hidden': 'true' }, e.icon), h('span', { class: 'small muted' }, (i + 1) + ' · ' + e.level), h('strong', null, e.title), h('span', { class: 'small muted' }, e.concept)));
      });
    }
    function drawPanel() {
      var e = EXAMPLES[st.ex]; panel.innerHTML = '';
      panel.appendChild(h('div', { class: 'tag-row' }, h('span', { class: 'chip blue' }, e.level), h('span', { class: 'chip green' }, e.concept)));
      panel.appendChild(h('h2', { style: { margin: '8px 0 4px' } }, e.icon + ' ' + e.title));
      panel.appendChild(h('p', { class: 'muted', style: { marginTop: 0 } }, e.desc));
      var row = h('div', { class: 'btn-row' });
      e.params.forEach(function (p) {
        if (st.params[p.key] === undefined) st.params[p.key] = p.value;
        var sel = h('select', { 'aria-label': p.label }, p.options.map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : String(o); return h('option', { value: v, selected: v === st.params[p.key] ? 'selected' : null }, t); }));
        sel.addEventListener('change', function () { st.params[p.key] = +sel.value; st.result = null; drawCards(); });
        row.appendChild(h('label', { class: 'inline' }, p.label + ' ', sel));
      });
      row.appendChild(h('button', { class: 'btn primary', onclick: run }, '▶ Run all three'));
      panel.appendChild(row);
    }
    function run() {
      var e = EXAMPLES[st.ex]; st.result = e.run(st.params); drawCards();
      setTimeout(function () { var t = cards.getBoundingClientRect().top; if (t > window.innerHeight * 0.7) cards.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
    }
    function card(b, body) {
      return h('div', { class: 'card pg-card', style: { borderTop: '4px solid ' + css(b.col) } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' } }, h('h3', { style: { margin: 0 } }, b.icon + ' ' + b.name), h('span', { class: 'chip' }, b.tag)), body);
    }
    function drawCards() {
      cards.innerHTML = ''; compare.innerHTML = '';
      var r = st.result;
      if (!r) {
        BACKENDS.forEach(function (b) { cards.appendChild(card(b, h('p', { class: 'small muted' }, b.blurb + ' Press "Run all three" to start.'))); });
        return;
      }
      var body = ({ coin: coinCards, search: searchCards, bell: bellCards, factor: factorCards })[st.ex](r);
      BACKENDS.forEach(function (b) { cards.appendChild(card(b, body[b.id])); });
      drawCompare(r);
    }

    /* ----- per-example card bodies ----- */
    function kv(pairs) { var d = h('dl', { class: 'kv' }); pairs.forEach(function (p) { d.appendChild(h('dt', null, p[0])); d.appendChild(h('dd', null, p[1])); }); return d; }
    function coinCards(r) {
      function mini(z, o) { return QG.charts.bars({ '0': z, '1': o }, { height: 140, normalize: true, ymax: 1 }); }
      var qb = h('div');
      var bl = h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } }), bw = h('div'); bl.appendChild(bw);
      QG.Bloch(bw, { size: 130, vector: { x: 1, y: 0, z: 0 }, labels: false, caption: false });
      bl.appendChild(h('p', { class: 'small', style: { flex: 1, minWidth: '120px', margin: 0 } }, 'After H the arrow lies on the equator: a perfect 50/50 "spinning coin".'));
      qb.appendChild(kv([['zeros / ones', r.qubit.zeros + ' / ' + r.qubit.ones], ['steps', r.qubit.cost + ' runs of the circuit']])); qb.appendChild(mini(r.qubit.zeros, r.qubit.ones)); qb.appendChild(bl);
      qb.appendChild(QG.circuitView(r.qubit.circuit, { compact: true }));
      return {
        cpu: h('div', null, kv([['zeros / ones', r.cpu.zeros + ' / ' + r.cpu.ones], ['steps', r.cpu.cost + ' (one per bit)']]), mini(r.cpu.zeros, r.cpu.ones), h('p', { class: 'small muted' }, 'Pseudo-random: a formula that only looks random.')),
        gpu: h('div', null, kv([['zeros / ones', r.gpu.zeros + ' / ' + r.gpu.ones], ['steps', r.gpu.cost + ' (' + r.gpu.threads + ' threads at once)']]), mini(r.gpu.zeros, r.gpu.ones), h('p', { class: 'small muted' }, 'Same kind of randomness, many bits at the same time.')),
        qubit: qb
      };
    }
    function searchCards(r) {
      var q = r.qubit, probs = {}; for (var i = 0; i < r.N; i++) probs[QG.bitstring(i, r.n)] = q.probs[i];
      var qb = h('div', null, kv([['checks (oracle calls)', String(q.iterations)], ['P(correct answer)', (q.pSuccess * 100).toFixed(2) + '%'], ['measured', QG.bitstring(q.measured, r.n) + ' = item ' + q.measured + (q.found ? ' ✓' : ' ✗ (run again)')], ['circuit', q.gates + ' gates on ' + r.n + ' qubits']]));
      if (r.N <= 64) qb.appendChild(QG.charts.bars(probs, { ymax: 1, height: 150, highlight: [QG.bitstring(r.target, r.n)], max: 64 }));
      else { var xs = [], ys = []; for (i = 0; i < r.N; i++) { xs.push(i); ys.push(q.probs[i]); } qb.appendChild(QG.charts.line([{ name: 'probability of each item', x: xs, y: ys }], { height: 150, xLabel: 'item number', ymin: 0, ymax: 1 })); }
      qb.appendChild(h('p', { class: 'small muted' }, 'Almost all the probability has moved onto the hidden item ' + r.target + '.'));
      return {
        cpu: h('div', null, kv([['hidden item', String(r.target)], ['checks', r.cpu.cost + ' (worst case ' + r.N + ')']]), h('p', { class: 'small muted' }, 'Looks at item 0, 1, 2, … until it finds the marked one.')),
        gpu: h('div', null, kv([['hidden item', String(r.target)], ['parallel steps', r.gpu.cost + ' with ' + r.gpu.threads + ' threads']]), h('p', { class: 'small muted' }, 'Each thread scans ' + Math.ceil(r.N / r.gpu.threads) + ' items; total work is still all ' + r.N + ' items.')),
        qubit: qb
      };
    }
    function bellCards(r) {
      function pct(x) { return (x * 100).toFixed(1) + '%'; }
      return {
        cpu: h('div', null, kv([['bits agree', pct(r.cpu.match)], ['CHSH game won', pct(r.cpu.chsh) + ' (best classical ≤ 75%)']]), h('p', { class: 'small muted' }, 'Two independent random bits: they agree only by chance.')),
        gpu: h('div', null, kv([['bits agree', pct(r.gpu.match)], ['CHSH game won', pct(r.gpu.chsh)]]), h('p', { class: 'small muted' }, 'Faster, but parallel hardware cannot create correlations either.')),
        qubit: h('div', null, kv([['bits agree', pct(r.qubit.match)], ['CHSH game won', pct(r.qubit.chsh) + ' (quantum limit 85.4%)']]), QG.charts.histogram(r.qubit.counts, { height: 140 }), QG.circuitView(r.qubit.circuit, { compact: true }))
      };
    }
    function factorCards(r) {
      var q = r.qubit, list = h('ol', { class: 'small', style: { paddingLeft: '18px', margin: '6px 0' } });
      q.attempts.forEach(function (a) { list.appendChild(h('li', null, 'a = ' + a.a + ': ' + a.note)); });
      return {
        cpu: h('div', null, kv([['answer', r.cpu.factors ? r.N + ' = ' + r.cpu.factors.join(' × ') : 'prime'], ['divisions', String(r.cpu.cost)]]), h('p', { class: 'small muted' }, 'Tries dividing by 2, 3, 4, … up to √N.')),
        gpu: h('div', null, kv([['answer', r.gpu.factors ? r.N + ' = ' + r.gpu.factors.join(' × ') : 'prime'], ['parallel steps', r.gpu.cost + ' with ' + r.gpu.threads + ' threads']]), h('p', { class: 'small muted' }, 'Same method, divisions spread over threads.')),
        qubit: h('div', null, kv([['answer', q.factors ? r.N + ' = ' + q.factors.join(' × ') : 'not found yet'], ['quantum runs', String(q.cost)], ['qubits', q.qubits + ' (' + q.countingQubits + ' counting + ' + (q.qubits - q.countingQubits) + ' work)']]), list, h('p', { class: 'small muted' }, 'Each run measures one value y; continued fractions turn it into the period r.'))
      };
    }

    /* ----- comparison + explanation ----- */
    function drawCompare(r) {
      var e = EXAMPLES[st.ex], box = h('div', { class: 'card', style: { marginTop: '14px' } });
      box.appendChild(h('p', { class: 'panel-title' }, 'Compare the work'));
      if (st.ex === 'bell') box.appendChild(hbars([{ label: 'CPU', v: r.cpu.chsh, col: '--yellow', text: (r.cpu.chsh * 100).toFixed(1) + '%' }, { label: 'GPU', v: r.gpu.chsh, col: '--green', text: (r.gpu.chsh * 100).toFixed(1) + '%' }, { label: 'Qubits', v: r.qubit.chsh, col: '--blue', text: (r.qubit.chsh * 100).toFixed(1) + '%' }], 'CHSH game win rate (higher is better; classical can never beat 75%)'));
      else box.appendChild(hbars([{ label: 'CPU', v: r.cpu.cost, col: '--yellow' }, { label: 'GPU', v: r.gpu.cost, col: '--green' }, { label: 'Qubits', v: r.qubit.cost, col: '--blue' }], r.unit));
      if (st.ex === 'search' || st.ex === 'factor') {
        var s = st.ex === 'search' ? PG.searchScaling() : PG.factorScaling();
        box.appendChild(h('p', { class: 'panel-title', style: { marginTop: '14px' } }, 'How the work grows with problem size'));
        box.appendChild(QG.charts.line([{ name: 'CPU', x: s.bits, y: s.cpu, color: css('--yellow') }, { name: 'GPU (' + (st.ex === 'search' ? 64 : 32) + ' threads)', x: s.bits, y: s.gpu, color: css('--green') }, { name: st.ex === 'search' ? 'Grover' : 'Shor (≈ bits³ gates)', x: s.bits, y: s.qubit, color: css('--blue') }],
          { height: 230, xLabel: st.ex === 'search' ? 'list size in bits (N = 2^bits)' : 'size of N in bits', yLabel: 'log₁₀(steps)' }));
        box.appendChild(h('p', { class: 'small muted' }, st.ex === 'search' ? 'Each step up the y-axis means 10 times more work. The GPU line is the CPU line shifted down: a constant speed-up. Grover\'s line climbs at half the slope: a square-root speed-up.' : 'Trial division climbs in a straight line on this log scale: exponential growth. Shor\'s curve flattens out: polynomial growth. At 2048 bits (RSA) the gap is astronomical.'));
      }
      box.appendChild(h('div', { class: 'callout', html: '<strong>What just happened?</strong>' + QG.math.process(e.why(r)) }));
      var actions = h('div', { class: 'btn-row' });
      if (st.ex === 'coin' || st.ex === 'bell') actions.appendChild(h('button', { class: 'btn', onclick: function () { var c = r.qubit.circuit; ui.store.set('composer:import', { nq: c.nq, ops: c.ops }); location.hash = '#/lab/composer'; } }, 'Open the circuit in the Composer'));
      if (st.ex === 'search') actions.appendChild(h('a', { class: 'btn', href: '#/lab/algorithms' }, 'Watch Grover step by step'));
      if (st.ex === 'factor') actions.appendChild(h('a', { class: 'btn', href: '#/learn/3.7' }, 'Learn how Shor works'));
      actions.appendChild(h('button', { class: 'btn', onclick: function () { ui.store.set('codelab:draft', e.code(st.params, r)); location.hash = '#/lab/code'; } }, 'Open in Code Lab'));
      var qc = r.qubit.circuit;
      if (qc) actions.appendChild(h('button', { class: 'btn', onclick: function () { var c = qc.copy(); if (!c.ops.some(function (o) { return o.g === 'measure'; })) c.measureAll(); ui.codeModal('Qiskit (Python)', QG.toQiskit(c), st.ex + '.py'); } }, 'Export to Qiskit'));
      box.appendChild(actions);
      compare.appendChild(box);
    }

    function draw() { drawPicker(); drawPanel(); drawCards(); }
    draw();
    el.appendChild(h('div', { class: 'callout reality', style: { marginTop: '16px' } }, h('strong', null, 'Fair comparison, honestly'), 'Times in milliseconds are not compared, because the qubits here are themselves simulated on your CPU. Instead each problem counts one clearly stated unit of work. The GPU is an ideal model (perfect parallelism, no overheads). Real quantum hardware is slower per step and noisy; its advantage, where it exists, comes from needing far fewer steps for large problems.'));
  }

  QG.pages = QG.pages || {};
  QG.pages.playground = page;
  QG.playgroundExamples = EXAMPLES;
})();
