/* Track 4: Real Hardware & Noise */
(function () {
  var QG = window.QG, R = String.raw;
  function W(name, opts) { return '<div data-widget="' + name + '" data-opts=\'' + JSON.stringify(opts || {}).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/\$/g, '&#36;').replace(/</g, '&lt;') + '\'></div>'; }
  function L(o) { o.track = 't4'; QG.content.register(o); }

  L({ id: '4.1', title: 'Decoherence: T1 and T2', minutes: 20, tags: ['hardware'],
    objectives: ['Define T1 (energy relaxation) and T2 (dephasing)', 'Predict how a superposition decays over time', 'Estimate how many gates fit inside a coherence time'],
    body: R`
<span class="step-label">Idea</span>
<p>Real qubits are not isolated. Their environment slowly "measures" them, and the quantum information leaks away. This is <span data-term="decoherence">decoherence</span>, described by two times:</p>
<ul><li><b>T1, energy relaxation:</b> an excited qubit $\ket{1}$ decays to $\ket{0}$. $P(1)$ falls as $e^{-t/T_1}$.</li>
<li><b>T2, dephasing:</b> the relative phase of a superposition gets scrambled. Coherence falls as $e^{-t/T_2}$. Physics requires $T_2 \le 2T_1$.</li></ul>

<span class="step-label">Try it</span>
<p>Move the time slider. The arrow starts at $\ket{+}$ on the equator, shrinks towards the axis (T2), and drifts up to $\ket{0}$ (T1).</p>
${W('decay')}

<span class="step-label">How long is long?</span>
<table class="amp-table" style="max-width:560px"><tr><th>Platform</th><th>Typical T2</th><th>Typical gate time</th></tr>
<tr><td>Superconducting</td><td>100–300 µs</td><td>20–100 ns (1q), 50–500 ns (2q)</td></tr>
<tr><td>Trapped ions</td><td>seconds or longer</td><td>10–100 µs</td></tr>
<tr><td>Neutral atoms</td><td>about 1 s</td><td>about 1 µs</td></tr></table>
<p>The figure of merit is the <b>ratio</b> of coherence time to gate time, roughly how many operations fit before the state is lost. That is why gate speed matters as much as coherence. (Numbers are representative of recent devices and vary widely.)</p>`,
    quiz: [
      { q: 'Which process makes $\\ket{1}$ turn into $\\ket{0}$?', options: ['T1 relaxation', 'T2 dephasing', 'Readout error'], answer: 0, why: 'T1 is energy loss to the environment.' },
      { q: 'A qubit has T2 = 100 µs. After 100 µs, what fraction of the coherence is left?', options: ['0', '$1/e \\approx 37\\%$', '50%'], answer: 1, why: '$e^{-1} \\approx 0.37$.' },
      { q: 'Can T2 be 3 × T1?', options: ['Yes', 'No: T2 ≤ 2·T1'], answer: 1, why: 'Energy relaxation alone already destroys coherence at rate $1/(2T_1)$.' }
    ]
  });

  L({ id: '4.2', title: 'Density matrices and mixed states', minutes: 25, tags: ['theory'],
    objectives: ['Write the density matrix of a pure and a mixed state', 'Use purity $\\mathrm{Tr}\\,\\rho^2$ to tell them apart', 'Explain why one half of a Bell pair is a mixed state'],
    body: R`
<span class="step-label">Idea</span>
<p>Noise turns definite quantum states into probabilistic mixtures. The tool for that is the <span data-term="density matrix">density matrix</span>:</p>
$$\rho = \sum_k p_k \ket{\psi_k}\bra{\psi_k}.$$
<ul><li>Diagonal entries are measurement probabilities. Off-diagonal entries are <b>coherences</b>.</li>
<li>A <b>pure</b> state has $\rho = \ket\psi\bra\psi$ and purity $\mathrm{Tr}\,\rho^2 = 1$. A <b>mixed</b> state has purity below 1, down to $1/2^n$ for the maximally mixed $I/2^n$.</li>
<li>For one qubit $\rho = \frac12(I + xX + yY + zZ)$: the Bloch vector $(x,y,z)$ has length 1 for pure states and less than 1 for mixed ones.</li></ul>

<span class="step-label">Try it</span>
<p>A 50/50 superposition and a 50/50 coin flip give the same probabilities. The density matrix tells them apart: only the superposition has off-diagonal coherence.</p>
${W('mixed')}

<span class="step-label">Entanglement looks like noise locally</span>
<p>Take the Bell state $\ket{\Phi^+}$ and ignore qubit 1 (a partial trace). Qubit 0 alone is $\rho_0 = I/2$, maximally mixed, at the centre of the Bloch sphere. This is why the Composer's Bloch view showed shrunken arrows for entangled qubits. From one qubit's point of view, being entangled with the environment is exactly decoherence.</p>`,
    quiz: [
      { q: 'What is the purity of $I/2$?', options: ['1', '1/2', '0'], answer: 1, why: '$\\mathrm{Tr}(I/2)^2 = \\mathrm{Tr}(I/4) = 1/2$.' },
      { q: 'Which matrix describes the superposition $\\ket{+}$?', options: ['$\\begin{pmatrix}1/2&0\\\\0&1/2\\end{pmatrix}$', '$\\begin{pmatrix}1/2&1/2\\\\1/2&1/2\\end{pmatrix}$'], answer: 1, why: '$\\ket{+}\\bra{+}$ has off-diagonal entries 1/2 (coherence). The first is the 50/50 mixture.' }
    ]
  });

  L({ id: '4.3', title: 'Noise channels', minutes: 25, tags: ['theory'],
    objectives: ['Describe a noise channel with Kraus operators', 'Name the effect of bit-flip, phase-flip, depolarizing, amplitude and phase damping', 'Match each channel to its effect on the Bloch sphere'],
    body: R`
<span class="step-label">Idea</span>
<p>Any physical noise process on a state can be written with <b>Kraus operators</b> $K_i$:</p>
$$\mathcal{E}(\rho) = \sum_i K_i\,\rho\,K_i^\dagger, \qquad \sum_i K_i^\dagger K_i = I.$$
<table class="amp-table"><tr><th>Channel</th><th>Kraus operators</th><th>Physical picture</th></tr>
<tr><td>Bit flip</td><td>$\sqrt{1-p}\,I,\ \sqrt p\,X$</td><td>random X errors</td></tr>
<tr><td>Phase flip</td><td>$\sqrt{1-p}\,I,\ \sqrt p\,Z$</td><td>random phase kicks</td></tr>
<tr><td>Depolarizing</td><td>$\mathcal E(\rho) = (1-\lambda)\rho + \lambda I/2$</td><td>"anything can happen"; the standard gate-error model</td></tr>
<tr><td>Amplitude damping</td><td>$\begin{pmatrix}1&0\\0&\sqrt{1-\gamma}\end{pmatrix}, \begin{pmatrix}0&\sqrt\gamma\\0&0\end{pmatrix}$</td><td>T1 energy loss</td></tr>
<tr><td>Phase damping</td><td>$\begin{pmatrix}1&0\\0&\sqrt{1-\lambda}\end{pmatrix}, \begin{pmatrix}0&0\\0&\sqrt\lambda\end{pmatrix}$</td><td>T2 dephasing</td></tr></table>

<span class="step-label">Try it</span>
<p>Every dot starts on the sphere's surface. Pick a channel and increase its strength to see what happens to the <i>whole</i> set of states.</p>
${W('channel')}

<span class="step-label">Code it</span>
<pre><code>// Density-matrix simulation in the Code Lab
const c = new QG.Circuit(1); c.h(0);
const rho = QG.DensityMatrix.fromStateVector(QG.state(c));
QG.channels.amplitudeDamping(rho, 0, 0.5);
console.log('Bloch vector:', rho.bloch(0));      // x = 0.707, z = 0.5
console.log('purity:', rho.purity());</code></pre>
<p class="small muted">Depolarizing uses the same definition as Qiskit's <code>depolarizing_error(λ, 1)</code>, so models exported from the <a href="#/lab/noise">Noise Lab</a> match.</p>`,
    quiz: [
      { q: 'Which channel leaves $\\ket{0}$ and $\\ket{1}$ unchanged but destroys superpositions?', options: ['Bit flip', 'Phase damping', 'Amplitude damping'], answer: 1, why: 'Dephasing only shrinks the off-diagonal coherences.' },
      { q: 'Which channel has a preferred end state?', options: ['Depolarizing', 'Amplitude damping', 'Phase flip'], answer: 1, why: 'Amplitude damping pulls every state towards $\\ket{0}$.' }
    ]
  });

  L({ id: '4.4', title: 'Noisy circuits and gate fidelity', minutes: 25, tags: ['hardware'],
    objectives: ['Explain how errors accumulate with circuit size', 'Use fidelity to quantify how close a noisy result is to the ideal', 'Run your own circuits with realistic noise in the Noise Lab'],
    body: R`
<span class="step-label">Idea</span>
<p>Every gate has an error rate. Two-qubit gates are the weak link: today's best are around 99.5–99.9% accurate (error 0.1–0.5%), single-qubit gates around 99.95–99.99%. A rough rule of thumb: the chance a circuit runs without any error is</p>
$$F \approx \prod_{\text{gates}}(1 - \varepsilon_g) \approx e^{-\sum \varepsilon_g}.$$
<p>So a circuit with 1,000 two-qubit gates at 0.5% error succeeds less than 1% of the time. Depth and gate count are the critical resources on noisy hardware.</p>

<span class="step-label">Try it</span>
<p>The fidelity of an n-qubit GHZ state built from a chain of CNOTs, simulated with full density matrices:</p>
${W('ghz-noise')}
<p>Now open the <a href="#/lab/noise">Noise Lab</a>. Build any circuit, pick a device preset, and compare ideal and noisy distributions. You can export the same noise model to Qiskit Aer.</p>

<div class="callout"><strong>Measures of hardware quality</strong>Vendors quote gate fidelities, T1/T2, readout error and composite benchmarks such as <i>quantum volume</i> or <i>layer fidelity</i>. Each summarises how large a circuit can run before noise wins.</div>`,
    quiz: [
      { q: 'A circuit has 200 two-qubit gates at 1% error each. Roughly what fraction of runs are error-free?', options: ['About 13%', 'About 80%', 'About 99%'], answer: 0, why: '$0.99^{200} \\approx e^{-2} \\approx 0.13$.' },
      { q: 'Which usually dominates errors on today\'s hardware?', options: ['Single-qubit gates', 'Two-qubit gates and readout', 'Classical control software'], answer: 1, why: 'Entangling gates and measurement have the highest error rates.' }
    ]
  });

  L({ id: '4.5', title: 'Bit-flip and phase-flip codes', minutes: 30, tags: ['error correction'],
    objectives: ['Encode one logical qubit in three physical qubits', 'Show the logical error rate falls from p to about 3p²', 'Explain why quantum error correction must handle both bit and phase errors'],
    body: R`
<span class="step-label">Idea</span>
<p>No-cloning forbids backup copies, yet we can spread information redundantly using <b>entanglement</b>:</p>
$$\alpha\ket{0} + \beta\ket{1} \;\to\; \alpha\ket{000} + \beta\ket{111}.$$
<p>If one qubit flips, a majority vote (implemented with CNOTs and a Toffoli) fixes it, without ever learning $\alpha$ or $\beta$. The code fails only when 2 or 3 qubits flip:</p>
$$p_L = 3p^2(1-p) + p^3 = 3p^2 - 2p^3.$$

<span class="step-label">Try it: bit-flip code</span>
${W('repetition', { kind: 'bit' })}
<p>Below $p = 0.5$ the code always helps, and for small $p$ dramatically so: $p = 1\%$ becomes $p_L \approx 0.03\%$.</p>

<span class="step-label">Phase-flip code</span>
<p>Quantum states also suffer phase errors (Z), which the bit-flip code cannot see. Encode in the X basis instead, $\ket{0}\to\ket{+++}$, $\ket{1}\to\ket{---}$. A Z error swaps $\ket{+}\leftrightarrow\ket{-}$, which looks like a bit flip in that basis.</p>
${W('repetition', { kind: 'phase' })}

<div class="callout green"><strong>Towards real error correction</strong>Shor's 9-qubit code nests these two codes to fix any single-qubit error. Modern devices use the <b>surface code</b>: a 2D grid where every extra layer of qubits suppresses errors further, <i>provided</i> physical errors are below a threshold of about 1%. In 2024 Google reported a surface-code memory operating below threshold, with the logical error falling as the code grew.</div>`,
    quiz: [
      { q: 'With p = 0.1, what is the logical error of the 3-qubit code?', options: ['0.028', '0.1', '0.3'], answer: 0, why: '$3(0.01) - 2(0.001) = 0.028$.' },
      { q: 'Why does measuring the helper qubits not destroy the logical state?', options: ['They measure only parities, which reveal the error but not α, β', 'Measurements never disturb qubits', 'The code uses classical bits'], answer: 0, why: 'Syndrome measurements ask "do qubits 0 and 1 agree?", not "what is qubit 0?".' }
    ],
    refs: ['Nielsen & Chuang, Ch. 10 (Quantum error correction).', 'Google Quantum AI, "Quantum error correction below the surface code threshold", <i>Nature</i> 638, 920 (2025).']
  });

  L({ id: '4.6', title: 'Error mitigation', minutes: 25, tags: ['hardware'],
    objectives: ['Correct readout errors with a calibration matrix', 'Explain zero-noise extrapolation', 'Contrast mitigation with full error correction'],
    body: R`
<span class="step-label">Idea</span>
<p>Full error correction needs many physical qubits per logical qubit. Until then, <b>error mitigation</b> uses classical post-processing to estimate what a noiseless device would have given. It costs extra runs (shots), not extra qubits.</p>

<span class="step-label">Readout mitigation</span>
<p>Measure known states $\ket{0}$ and $\ket{1}$ to learn the confusion matrix $A$ (probability of reading $i$ when the truth is $j$). Then invert it: $p_{\text{true}} \approx A^{-1} p_{\text{measured}}$.</p>
${W('readout')}

<span class="step-label">Zero-noise extrapolation (ZNE)</span>
<p>Run the circuit at several deliberately <i>amplified</i> noise levels $s = 1, 2, 3, \ldots$, measure an expectation value, and extrapolate the trend back to $s = 0$.</p>
${W('zne')}

<div class="callout reality"><strong>Limits</strong>Mitigation reduces <i>bias</i> but increases <i>variance</i>: the extrapolated value needs many more shots to be precise, and the cost grows exponentially with circuit size. It is a bridge to fault tolerance, not a replacement.</div>
<p>Try readout mitigation on your own circuits: tick "Show readout-mitigated result" in the <a href="#/lab/noise">Noise Lab</a>.</p>
<div class="callout green"><strong>Track 4 complete</strong>You can now reason about real, noisy quantum computers. Next, Track 5 uses short, noise-tolerant variational circuits, the workhorse of today's chemistry and optimisation experiments.</div>`,
    quiz: [
      { q: 'What does readout mitigation need?', options: ['Extra qubits', 'A calibration of the measurement error', 'A fault-tolerant computer'], answer: 1, why: 'Prepare known states, measure the confusion matrix, then invert it.' },
      { q: 'What is the main cost of zero-noise extrapolation?', options: ['More qubits', 'More shots, because variance grows', 'Longer coherence times'], answer: 1, why: 'Extrapolation amplifies statistical noise, so you need more samples.' }
    ],
    refs: ['K. Temme, S. Bravyi, J. M. Gambetta, "Error mitigation for short-depth quantum circuits", <i>Phys. Rev. Lett.</i> 119, 180509 (2017).']
  });
})();
