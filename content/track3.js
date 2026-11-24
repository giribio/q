/* Track 3: Quantum Algorithms */
(function () {
  var QG = window.QG, R = String.raw;
  function W(name, opts) { return '<div data-widget="' + name + '" data-opts=\'' + JSON.stringify(opts || {}).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/\$/g, '&#36;').replace(/</g, '&lt;') + '\'></div>'; }
  function L(o) { o.track = 't3'; QG.content.register(o); }

  L({ id: '3.1', title: 'Oracles and phase kickback', minutes: 25, tags: ['algorithms'],
    objectives: ['Explain what an oracle (black-box function) is', 'Turn a bit oracle into a phase oracle with phase kickback', 'Build a phase oracle that marks one state'],
    body: R`
<span class="step-label">Idea</span>
<p>Many algorithms are stated in the <b>query model</b>: you are given a function $f$ as a black box, an <span data-term="oracle">oracle</span>, and you count how many times you must call it. A reversible quantum oracle comes in two flavours:</p>
<ul><li><b>Bit oracle:</b> $U_f\ket{x}\ket{y} = \ket{x}\ket{y \oplus f(x)}$ (writes $f(x)$ into a helper qubit).</li>
<li><b>Phase oracle:</b> $O_f\ket{x} = (-1)^{f(x)}\ket{x}$ (marks the answer in the sign).</li></ul>
<p>They are equivalent. Put the helper qubit in $\ket{-}$ and the bit oracle flips $\ket{-}$ to $-\ket{-}$ exactly when $f(x) = 1$. The sign "kicks back" onto the input register:</p>
$$U_f\ket{x}\ket{-} = (-1)^{f(x)}\ket{x}\ket{-}.$$
<p>This <span data-term="phase kickback">phase kickback</span> is the engine of Deutsch–Jozsa, Grover, phase estimation and Shor.</p>

<span class="step-label">Try it</span>
<p>Here the target (q1) is prepared in $\ket{-}$ and a CNOT acts as the oracle for $f(x) = x$. Step through: the CNOT changes nothing on q1, yet q0 flips from $\ket{+}$ to $\ket{-}$, and the final H reads that out as a 1.</p>
${W('composer', { preset: 'kickback', fixedQubits: true, tab: 'bloch' })}

<span class="step-label">Challenge</span>
<p>Starting from two qubits, build the state where only $\ket{11}$ has a minus sign: $\frac12(\ket{00}+\ket{01}+\ket{10}-\ket{11})$. That is a phase oracle marking 11 applied to the uniform superposition.</p>
${W('composer', { nq: 2, fixedQubits: true, gates: ['h', 'x', 'z', 'cx', 'cz'], challenge: { id: 'c3.1-mark11', text: 'Prepare $\\frac12(\\ket{00}+\\ket{01}+\\ket{10}-\\ket{11})$.', state: [[0.5, 0], [0.5, 0], [0.5, 0], [-0.5, 0]], hint: 'H on both qubits, then the controlled-Z gate flips the sign of $\\ket{11}$ only.' } })}
<div class="callout"><strong>Why not just evaluate f?</strong>The oracle is a model: in real algorithms it is a circuit computing $f$ (for Shor, modular exponentiation). Query complexity tells you how many times that circuit must run.</div>`,
    quiz: [
      { q: 'A bit oracle acts on $\\ket{x}\\ket{-}$. What happens when $f(x) = 1$?', options: ['The helper becomes $\\ket{+}$', 'The state picks up a factor $-1$', 'Nothing'], answer: 1, why: '$X\\ket{-} = -\\ket{-}$: the helper is unchanged but a global $-1$ appears on that branch, which is a relative phase for the superposition.' },
      { q: 'Which gate is a phase oracle for $f(x_1x_0) = x_1 \\text{ AND } x_0$?', options: ['CNOT', 'CZ', 'SWAP'], answer: 1, why: 'CZ multiplies only $\\ket{11}$ by $-1$.' }
    ]
  });

  L({ id: '3.2', title: 'Deutsch–Jozsa', minutes: 25, tags: ['algorithms'],
    objectives: ['State the Deutsch–Jozsa problem', 'Follow the interference that separates constant from balanced', 'Compare the quantum and classical query counts'],
    body: R`
<span class="step-label">Idea</span>
<p>You are promised that $f:\{0,1\}^n\to\{0,1\}$ is either <b>constant</b> (the same output for every input) or <b>balanced</b> (0 on exactly half the inputs). Which is it?</p>
<p>Classically, in the worst case you must check $2^{n-1}+1$ inputs. The Deutsch–Jozsa algorithm needs <b>one</b> query:</p>
<ol><li>H on all qubits: $\frac{1}{\sqrt{2^n}}\sum_x\ket{x}$</li><li>Phase oracle: $\frac{1}{\sqrt{2^n}}\sum_x(-1)^{f(x)}\ket{x}$</li><li>H on all qubits again, then measure.</li></ol>
<p>The amplitude of $\ket{0\ldots0}$ at the end is $\frac{1}{2^n}\sum_x(-1)^{f(x)}$: it is $\pm1$ if $f$ is constant and exactly 0 if balanced.</p>

<span class="step-label">Try it</span>
<p>Switch the oracle between constant and balanced. Watch the last stage: all paths into $\ket{000}$ either add up or cancel completely.</p>
${W('algo', { alg: 'dj' })}

<span class="step-label">Code it</span>
<pre><code>// The library builds the circuit; count the queries yourself
const a = QG.algorithms.deutschJozsa(4, 'balanced-parity');
QG.show.circuit(a.circuit);
const r = QG.run(a.circuit, { shots: 100 });
console.log(r.counts);       // never 0000, so f is balanced</code></pre>
<div class="callout reality"><strong>Honest note</strong>A randomised classical algorithm can guess "constant or balanced" with high confidence using just a few queries. Deutsch–Jozsa's exponential separation is only against <i>exact</i> deterministic algorithms. Its value is as the clearest demonstration of quantum interference.</div>`,
    quiz: [
      { q: 'If $f$ is balanced, what is the probability of measuring all zeros?', options: ['0', '1/2', '1/2ⁿ'], answer: 0, why: 'The $\\ket{0\\ldots0}$ amplitude is the average of $(-1)^{f(x)}$, which is 0 for balanced $f$.' },
      { q: 'How many classical queries are needed in the worst case for n = 10 (deterministic, certain answer)?', options: ['2', '11', '513'], answer: 2, why: '$2^{n-1}+1 = 513$: you might see 512 equal outputs from a balanced function before the first different one.' }
    ]
  });

  L({ id: '3.3', title: 'Bernstein–Vazirani', minutes: 20, tags: ['algorithms'],
    objectives: ['Recover a hidden string from one query', 'Explain why H·Z·H acts like X on each qubit', 'Build the circuit for a given secret'],
    body: R`
<span class="step-label">Idea</span>
<p>Hidden inside $f(x) = s\cdot x \bmod 2$ (the parity of the bits where both $s$ and $x$ are 1) is a secret string $s$. Classically each query reveals one bit of $s$, so you need $n$ queries. Quantumly you need one.</p>
<p>The phase oracle $(-1)^{s\cdot x}$ factorises: it is just a Z on every qubit where $s_i = 1$. Then each qubit does H → (Z or nothing) → H, which is X or nothing. The output is exactly $\ket{s}$.</p>

<span class="step-label">Try it</span>
${W('algo', { alg: 'bv' })}

<span class="step-label">Challenge</span>
<p>Build the Bernstein–Vazirani circuit for the secret <code>101</code> (q2 = 1, q1 = 0, q0 = 1) using only H and Z.</p>
${W('composer', { nq: 3, fixedQubits: true, gates: ['h', 'z'], challenge: { id: 'c3.3-bv101', text: 'Make the circuit output $\\ket{101}$ with certainty using only H and Z.', state: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 0], [0, 0], [0, 0]], hint: 'H on all three qubits, Z on q0 and q2, then H on all three again.' } })}`,
    quiz: [
      { q: 'How many classical queries does Bernstein–Vazirani need for an n-bit secret?', options: ['1', 'n', '2ⁿ'], answer: 1, why: 'Query $x = 0\\ldots010\\ldots0$ to read one bit at a time: $n$ queries.' },
      { q: 'For $s = 110$, which qubits get a Z in the phase oracle?', options: ['q0', 'q1 and q2', 'all three'], answer: 1, why: 'Bits of $s$ read q2 q1 q0 = 1 1 0, so q2 and q1.' }
    ]
  });

  L({ id: '3.4', title: 'Grover search', minutes: 30, tags: ['algorithms'],
    objectives: ['Describe the oracle + diffuser iteration', 'Explain "inversion about the mean"', 'Compute the optimal number of iterations and the √N speed-up'],
    body: R`
<span class="step-label">Idea</span>
<p>Search an unsorted list of $N = 2^n$ items for the one marked item. Classically: about $N/2$ checks on average. <span data-term="grover search">Grover's algorithm</span>: about $\frac{\pi}{4}\sqrt{N}$.</p>
<ol><li>Start in the uniform superposition: every amplitude is $1/\sqrt N$.</li>
<li><b>Oracle:</b> flip the sign of the marked amplitude.</li>
<li><b>Diffuser:</b> reflect every amplitude about the mean: $a \to 2\bar a - a$. The marked amplitude, now far below the mean, lands far above it.</li>
<li>Repeat steps 2–3 about $\frac{\pi}{4}\sqrt N$ times, then measure.</li></ol>
<p>Geometrically, each iteration rotates the state by an angle $2\theta$ towards the answer, where $\sin\theta = 1/\sqrt N$. After $k$ iterations the success probability is $\sin^2((2k+1)\theta)$.</p>

<span class="step-label">Try it</span>
<p>Watch the green "mean" line. Then increase the iterations beyond the optimum: the probability goes <b>down</b> again. Grover overshoots!</p>
${W('algo', { alg: 'grover' })}

<span class="step-label">Code it</span>
<pre><code>// Success probability vs number of iterations for n = 6 (N = 64)
const xs = [], ys = [];
for (let k = 0; k <= 12; k++) {
  const a = QG.algorithms.grover(6, 42, k);
  xs.push(k); ys.push(QG.state(a.circuit).probabilities()[42]);
}
QG.show.plot([{ name: 'P(found)', x: xs, y: ys, points: true }], { xLabel: 'iterations', yLabel: 'probability' });</code></pre>
<div class="callout reality"><strong>Honest note</strong>A quadratic speed-up is real but modest. Each oracle call on real hardware is a deep, error-corrected circuit, and the classical computer it competes with is very fast. Estimates suggest Grover-type advantages need large fault-tolerant machines. The ideas (amplitude amplification) are widely reused inside other algorithms.</div>`,
    quiz: [
      { q: 'About how many Grover iterations for N = 1,000,000?', options: ['≈ 785', '≈ 500,000', '≈ 20'], answer: 0, why: '$\\frac{\\pi}{4}\\sqrt{10^6} \\approx 785$.' },
      { q: 'After the oracle (before the diffuser), how did the probabilities change?', options: ['The marked item became more likely', 'They did not change', 'All became zero'], answer: 1, why: 'Only a sign flipped; $|a|^2$ is unchanged. The diffuser converts the sign into a larger amplitude.' },
      { q: 'What happens if you run twice the optimal number of iterations?', options: ['Even higher success', 'Success probability falls again', 'The state is destroyed'], answer: 1, why: 'The state keeps rotating past the target: $\\sin^2((2k+1)\\theta)$ oscillates.' }
    ],
    refs: ['L. K. Grover, "A fast quantum mechanical algorithm for database search", STOC 1996.']
  });

  L({ id: '3.5', title: 'The quantum Fourier transform', minutes: 30, tags: ['algorithms'],
    objectives: ['Write the QFT of a basis state', 'Build the QFT from H and controlled-phase gates', 'Explain why the QFT is exponentially cheaper than the classical FFT, and why that does not make it a faster FFT'],
    body: R`
<span class="step-label">Idea</span>
<p>The <span data-term="quantum fourier transform">quantum Fourier transform</span> on $n$ qubits ($N = 2^n$) is</p>
$$\text{QFT}\ket{x} = \frac{1}{\sqrt N}\sum_{y=0}^{N-1} e^{2\pi i\,xy/N}\ket{y}.$$
<p>It is the discrete Fourier transform applied to the amplitudes. The circuit uses only H and controlled-phase gates: about $n^2/2$ gates, compared with $N\log N$ operations for the classical FFT.</p>

<span class="step-label">Try it</span>
<p>Choose an input $x$. After the QFT every bar has the same height $1/\sqrt N$. The information is entirely in the <b>phases</b> (colours), which wind around the circle $x$ times. Try $x = 0$ and $x = N/2$.</p>
${W('algo', { alg: 'qft' })}

<span class="step-label">Code it</span>
<pre><code>// Check the QFT against the DFT formula for x = 3 on 3 qubits
const a = QG.algorithms.qft(3, 3), s = QG.state(a.circuit);
for (let y = 0; y < 8; y++) {
  const ang = 2 * Math.PI * 3 * y / 8;
  console.log(y, s.re[y].toFixed(3), s.im[y].toFixed(3), ' expected', (Math.cos(ang) / Math.sqrt(8)).toFixed(3), (Math.sin(ang) / Math.sqrt(8)).toFixed(3));
}</code></pre>
<div class="callout"><strong>Not a faster FFT</strong>You cannot read out all $N$ Fourier coefficients: a measurement gives one $y$. The QFT is powerful as a <i>step inside</i> algorithms such as phase estimation and Shor, where the answer is concentrated on a few outcomes.</div>`,
    quiz: [
      { q: 'After the QFT of a basis state, what is the probability of each outcome?', options: ['All equal, 1/N', 'Only one outcome', 'Depends on x'], answer: 0, why: 'Every amplitude has magnitude $1/\\sqrt N$; only phases depend on $x$.' },
      { q: 'Roughly how many gates does the QFT on 20 qubits need?', options: ['About 200', 'About 20 million', 'About 1 million'], answer: 0, why: '$n(n+1)/2 = 210$ H and controlled-phase gates, plus swaps.' }
    ]
  });

  L({ id: '3.6', title: 'Quantum phase estimation', minutes: 30, tags: ['algorithms'],
    objectives: ['State what phase estimation computes', 'Explain how controlled-$U^{2^j}$ writes binary digits of the phase', 'Relate the number of counting qubits to precision'],
    body: R`
<span class="step-label">Idea</span>
<p>Given a unitary $U$ and an eigenstate $\ket{u}$ with $U\ket{u} = e^{2\pi i\varphi}\ket{u}$, <b>phase estimation</b> outputs a $t$-bit approximation of $\varphi$. It is the core of Shor's algorithm and of quantum chemistry algorithms that find energies (eigenvalues of a Hamiltonian).</p>
<ol><li>Put $t$ counting qubits in superposition.</li>
<li>Counting qubit $j$ controls $U^{2^j}$. Phase kickback writes $e^{2\pi i\,2^j\varphi}$ onto it.</li>
<li>The counting register now holds exactly the QFT of $\ket{2^t\varphi}$, so an inverse QFT reveals $\varphi$ in binary.</li></ol>

<span class="step-label">Try it</span>
<p>Here $U = P(2\pi\varphi)$ and $\ket{u} = \ket{1}$. With $\varphi = 0.375 = 0.011_2$ and 3 counting qubits the answer is certain: $y = 011 = 3$. Now set $\varphi = 0.3$: the distribution spreads around the best estimate. Add counting qubits to sharpen it.</p>
${W('algo', { alg: 'qpe' })}

<span class="step-label">Code it</span>
<pre><code>// Precision improves with t: estimate phi = 0.3
for (let t = 2; t <= 6; t++) {
  const a = QG.algorithms.phaseEstimation(t, 0.3), r = QG.run(a.circuit, { shots: 2000 });
  let best = '', n = 0; for (const k in r.counts) if (r.counts[k] > n) { n = r.counts[k]; best = k; }
  console.log('t =', t, ' estimate =', (parseInt(best, 2) / 2 ** t).toFixed(4));
}</code></pre>
<div class="callout"><strong>Why chemists care</strong>For a molecule, $U = e^{-iHt}$ and the phase is proportional to an energy. Phase estimation on a good approximate ground state gives the ground-state energy to high precision. It needs deep circuits, which is why near-term devices use VQE instead (Track 5).</div>`,
    quiz: [
      { q: 'φ = 0.625 with t = 3 counting qubits. Which outcome do you get?', options: ['101', '011', '110'], answer: 0, why: '$0.625 \\times 8 = 5 = 101_2$, exact, so certain.' },
      { q: 'To get one more bit of precision you need…', options: ['One more counting qubit (and a $U^{2^t}$ gate)', 'Twice as many shots', 'A bigger eigenstate'], answer: 0, why: 'Each counting qubit adds one binary digit of $\\varphi$, at the cost of applying $U$ twice as many times.' }
    ]
  });

  L({ id: '3.7', title: 'Shor\'s algorithm (conceptual)', minutes: 30, tags: ['algorithms'],
    objectives: ['Reduce factoring to finding the period of $a^x \\bmod N$', 'Run the order-finding step and the classical post-processing', 'Give an honest estimate of what breaking RSA would need'],
    body: R`
<span class="step-label">Idea</span>
<p>Factoring a large number $N$ is believed to be hard classically, which is what RSA encryption relies on. Shor (1994) showed a quantum computer could do it in polynomial time:</p>
<ol><li>Pick a random $a < N$ with $\gcd(a, N) = 1$.</li>
<li><b>Quantum step:</b> find the period $r$ of $f(x) = a^x \bmod N$, using phase estimation on the unitary $\ket{y}\to\ket{ay \bmod N}$. The output is $y \approx k\cdot 2^t / r$.</li>
<li><b>Classical step:</b> continued fractions turn $y/2^t$ into $k/r$. If $r$ is even, $\gcd(a^{r/2}\pm1, N)$ gives factors.</li></ol>

<span class="step-label">Try it</span>
<p>The quantum part below is simulated exactly. The peaks sit at multiples of $2^t/r$. Press the button to "measure" and run the classical post-processing. Sometimes it fails: then you just repeat.</p>
${W('shor')}

<div class="callout reality"><strong>Reality check</strong>The largest numbers factored with Shor's algorithm on real hardware are tiny (like 15 and 21), and often with shortcuts that assume the answer. Breaking RSA-2048 needs a large <i>fault-tolerant</i> computer: a 2025 estimate by Gidney is just under a million noisy physical qubits running for about a week. Today's devices have around a thousand noisy qubits. Cryptographers are already moving to post-quantum algorithms (NIST standards, 2024) because encrypted data can be stored now and decrypted later.</div>`,
    quiz: [
      { q: 'For N = 15 and a = 7 the period is r = 4. What factors do you get?', options: ['3 and 5', '7 and 2', 'none'], answer: 0, why: '$7^2 \\bmod 15 = 4$; $\\gcd(3, 15) = 3$ and $\\gcd(5, 15) = 5$.' },
      { q: 'Which part of Shor\'s algorithm needs the quantum computer?', options: ['The gcd', 'Finding the period r', 'Picking a'], answer: 1, why: 'Order finding is the hard part; everything else is cheap classical arithmetic.' }
    ],
    refs: ['P. W. Shor, "Polynomial-time algorithms for prime factorization and discrete logarithms on a quantum computer", <i>SIAM J. Comput.</i> 26, 1484 (1997).', 'C. Gidney, "How to factor 2048 bit RSA integers with less than a million noisy qubits", arXiv:2505.15917 (2025).']
  });
})();
