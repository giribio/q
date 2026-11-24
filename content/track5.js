/* Track 5: Variational Algorithms */
(function () {
  var QG = window.QG, R = String.raw;
  function W(name, opts) { return '<div data-widget="' + name + '" data-opts=\'' + JSON.stringify(opts || {}).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/\$/g, '&#36;').replace(/</g, '&lt;') + '\'></div>'; }
  function L(o) { o.track = 't5'; QG.content.register(o); }

  L({ id: '5.1', title: 'Parameterised circuits and the variational principle', minutes: 25, tags: ['variational'],
    objectives: ['Describe a parameterised circuit (ansatz) and its parameters', 'State the variational principle $E(\\theta) \\ge E_0$', 'Explain the hybrid quantum–classical loop'],
    body: R`
<span class="step-label">Idea</span>
<p>Today's quantum computers are noisy and can only run short circuits. <b>Variational algorithms</b> work within that limit: a short circuit with adjustable angles, an <span data-term="ansatz">ansatz</span> $U(\theta)$, prepares a trial state $\ket{\psi(\theta)} = U(\theta)\ket{0}$. A classical computer then tunes the angles.</p>
<ol><li>The quantum computer prepares $\ket{\psi(\theta)}$ and measures the cost, for example an energy $E(\theta) = \bra{\psi(\theta)}H\ket{\psi(\theta)}$.</li>
<li>The classical optimiser proposes better angles.</li>
<li>Repeat until the cost stops falling.</li></ol>
<p>The <span data-term="variational principle">variational principle</span> makes energy a safe target: for every state, $E(\theta) \geq E_0$, the true ground-state energy. Lower is always closer to the truth, and you can never undershoot.</p>

<span class="step-label">Try it</span>
<p>The smallest example: one qubit, $H = X + Z$, and an ansatz with two angles. The map shows the energy for every $(\theta_1, \theta_2)$. Bright yellow marks the lowest energy. Click a starting point and press Optimise.</p>
${W('vplay', { problem: 'one', fixedProblem: true, optimizer: 'gd' })}
<p>The minimum is $-\sqrt2 \approx -1.414$, the smallest eigenvalue of $X + Z$. No point on the map goes lower.</p>
<div class="callout"><strong>Hybrid by design</strong>The quantum part only has to do what classical computers find hard: prepare and measure a state that may be too big to store. Everything else, the optimisation, runs classically.</div>`,
    quiz: [
      { q: 'Why is it safe to minimise the energy $E(\\theta)$?', options: ['Because $E(\\theta) \\ge E_0$ for every θ', 'Because it is always negative', 'Because the circuit is short'], answer: 0, why: 'The variational principle: no trial state can have lower energy than the ground state.' },
      { q: 'Which part of VQE runs on the quantum computer?', options: ['Preparing $\\ket{\\psi(\\theta)}$ and measuring the energy', 'Choosing new angles', 'Both'], answer: 0, why: 'The optimiser is classical; only state preparation and measurement are quantum.' }
    ]
  });

  L({ id: '5.2', title: 'Optimisers, gradients and barren plateaus', minutes: 30, tags: ['variational'],
    objectives: ['Compute gradients with the parameter-shift rule', 'Compare gradient descent, Adam, SPSA and Nelder–Mead under shot noise', 'Explain what a barren plateau is and why it matters'],
    body: R`
<span class="step-label">The parameter-shift rule</span>
<p>For a gate $e^{-i\theta P/2}$ with $P$ a Pauli operator, the derivative of any expectation value is <b>exact</b> from two shifted runs:</p>
$$\frac{\partial E}{\partial\theta} = \frac{E(\theta + \frac{\pi}{2}) - E(\theta - \frac{\pi}{2})}{2}.$$
<p>No small step size is needed, so it is robust on noisy hardware. The cost is two circuit runs per parameter.</p>
${W('param-shift')}

<span class="step-label">Try it: optimisers and shot noise</span>
<p>On hardware every energy is <i>estimated</i> from a finite number of shots, so it is noisy. Pick the H₂ landscape, switch "Measurement" to 100 shots and compare optimisers. Watch the x-axis: it counts circuit evaluations, the real cost on a quantum computer.</p>
${W('vplay', { problem: 'h2' })}
<table class="amp-table"><tr><th>Optimiser</th><th>Cost per step</th><th>Good for</th></tr>
<tr><td>Gradient descent / Adam</td><td>2 × (number of parameters)</td><td>smooth landscapes, few parameters</td></tr>
<tr><td>SPSA</td><td>2, whatever the number of parameters</td><td>many parameters, noisy estimates</td></tr>
<tr><td>Nelder–Mead</td><td>1–2 (no gradient)</td><td>very few parameters, exact energies</td></tr></table>

<span class="step-label">Barren plateaus</span>
<p>For large random circuits, almost the whole landscape is flat: gradients shrink exponentially with the number of qubits and drown in shot noise. This is a <span data-term="barren plateau">barren plateau</span>.</p>
${W('barren')}
<div class="callout reality"><strong>What helps</strong>Shallow circuits, ansätze built from the problem's physics (for chemistry, the "UCC" family), cost functions that act on few qubits, and good starting points. Trainability is one of the central open questions for variational algorithms.</div>`,
    quiz: [
      { q: 'How many circuit evaluations does one parameter-shift gradient need for 20 parameters?', options: ['2', '20', '40'], answer: 2, why: 'Two shifted evaluations per parameter: 40.' },
      { q: 'What is the main advantage of SPSA?', options: ['Exact gradients', 'A cost of 2 evaluations per step regardless of the number of parameters', 'No randomness'], answer: 1, why: 'SPSA perturbs all parameters at once along a random direction.' },
      { q: 'In a barren plateau…', options: ['the energy is always zero', 'gradients are exponentially small almost everywhere', 'the optimiser always finds the global minimum'], answer: 1, why: 'The variance of the gradient decays exponentially with the number of qubits.' }
    ],
    refs: ['M. Schuld et al., "Evaluating analytic gradients on quantum hardware", <i>Phys. Rev. A</i> 99, 032331 (2019).', 'J. R. McClean et al., "Barren plateaus in quantum neural network training landscapes", <i>Nat. Commun.</i> 9, 4812 (2018).']
  });

  L({ id: '5.3', title: 'The variational quantum eigensolver (VQE)', minutes: 30, tags: ['variational', 'chemistry'],
    objectives: ['Write a Hamiltonian as a sum of Pauli strings', 'Run VQE and compare with exact diagonalisation', 'Name the main costs: ansatz depth, measurements and optimisation'],
    body: R`
<span class="step-label">Idea</span>
<p>Most Hamiltonians we care about, from magnets to molecules, can be written as a weighted sum of Pauli strings:</p>
$$H = \sum_k c_k P_k, \qquad E(\theta) = \sum_k c_k \bra{\psi(\theta)}P_k\ket{\psi(\theta)}.$$
<p>Each $\expval{P_k}$ is measured separately, after rotating into its basis (H for X, S†H for Y). <span data-term="vqe">VQE</span> then minimises the total. For example, the hydrogen molecule at its bond length becomes, after the reductions you will meet in Track 6, just five Pauli terms:</p>
$$H_{\text{H}_2} = -1.0524\,II + 0.3979\,IZ - 0.3979\,ZI - 0.0113\,ZZ + 0.1809\,XX.$$
<p class="small">These are electronic energies in hartree. Add the nuclear repulsion $1/R = 0.7200$ Ha for the total energy $-1.1373$ Ha.</p>

<span class="step-label">Try it</span>
<p>Run VQE on a transverse-field Ising chain or a Heisenberg chain with up to 6 qubits. Increase the layers if the energy stalls above the exact value: a shallow ansatz may simply not be able to represent the ground state.</p>
${W('vqe', { model: 'tfim', n: 4 })}

<span class="step-label">Code it</span>
<pre><code>const H = QG.pauli.models.h2();                     // 5 Pauli terms
const A = QG.variational.ansatz('ry', 2, 1);         // 4 parameters
const r = QG.vqe({ H, ansatz: A, optimizer: 'nelder-mead', maxIter: 300 });
console.log('VQE', r.energy, ' exact', r.exact, ' error', r.energy - r.exact);
console.log(QG.pauli.toQiskit(H));                   // SparsePauliOp for Qiskit</code></pre>
<div class="callout reality"><strong>Honest costs</strong>Real molecules need hundreds to thousands of Pauli terms, each estimated with many shots (the precision target, 1.6 mHa, is tiny). Optimisation can stall in local minima or on plateaus. VQE is a valuable testbed, but it has not yet beaten classical chemistry methods on any problem of practical size.</div>`,
    quiz: [
      { q: 'How is $\\expval{XX}$ measured on hardware that only measures Z?', options: ['Apply H to both qubits, then measure', 'Apply X to both qubits', 'It cannot be measured'], answer: 0, why: 'H rotates the X basis onto the Z basis; then $\\expval{XX}$ is the average parity.' },
      { q: 'VQE gives E = −1.1350 Ha; the exact value is −1.1373 Ha. Is this within chemical accuracy (1.6 mHa)?', options: ['Yes', 'No: the error is 2.3 mHa'], answer: 1, why: '−1.1350 − (−1.1373) = 0.0023 Ha = 2.3 mHa > 1.6 mHa.' }
    ],
    refs: ['A. Peruzzo et al., "A variational eigenvalue solver on a photonic quantum processor", <i>Nat. Commun.</i> 5, 4213 (2014).', 'P. J. J. O\'Malley et al., "Scalable quantum simulation of molecular energies", <i>Phys. Rev. X</i> 6, 031007 (2016).']
  });

  L({ id: '5.4', title: 'QAOA for MaxCut', minutes: 30, tags: ['variational', 'optimisation'],
    objectives: ['Write MaxCut as a cost Hamiltonian', 'Build the QAOA circuit from cost and mixer layers', 'Interpret the approximation ratio and the success probability'],
    body: R`
<span class="step-label">Idea</span>
<p><b>MaxCut:</b> split a graph's nodes into two groups so that as many edges as possible connect the groups. It is NP-hard in general and a standard benchmark. Each node is one qubit (0 = blue, 1 = green), and the cost is diagonal:</p>
$$C = \sum_{(i,j)\in E}\frac{1 - Z_iZ_j}{2}.$$
<p>The <span data-term="qaoa">QAOA</span> circuit alternates two layers $p$ times, starting from $\ket{+}^{\otimes n}$:</p>
$$\ket{\gamma,\beta} = e^{-i\beta_p B}e^{-i\gamma_p C}\cdots e^{-i\beta_1 B}e^{-i\gamma_1 C}\ket{+}^{\otimes n}, \qquad B = \sum_i X_i.$$
<p>The cost layer is one $R_{ZZ}$ gate per edge and the mixer is an $R_X$ on every qubit. A classical optimiser tunes the $2p$ angles to maximise $\expval{C}$.</p>

<span class="step-label">Try it</span>
${W('qaoa', { preset: 'pentagon' })}
<p>For rings, depth $p = 1$ reaches an approximation ratio of 3/4 on even rings. Try p = 2 and p = 3: the ratio rises, and as $p\to\infty$ QAOA approaches the exact answer (it becomes adiabatic evolution). Open the <a href="#/lab/qaoa">QAOA Studio</a> to draw your own graphs.</p>
<div class="callout reality"><strong>Reality check</strong>For MaxCut, excellent classical algorithms exist (Goemans–Williamson guarantees ratio 0.878, and heuristics do better in practice). No quantum advantage for QAOA has been demonstrated. It remains a useful model of how quantum optimisation might work, and appears in drug-discovery proposals for docking (Track 8).</div>`,
    quiz: [
      { q: 'For a triangle, what is the maximum cut?', options: ['1', '2', '3'], answer: 1, why: 'Any split leaves one edge uncut: an odd cycle cannot be fully cut.' },
      { q: 'How many parameters does depth-p QAOA have?', options: ['p', '2p', 'one per edge'], answer: 1, why: 'One γ and one β per layer.' }
    ],
    refs: ['E. Farhi, J. Goldstone, S. Gutmann, "A quantum approximate optimization algorithm", arXiv:1411.4028 (2014).']
  });

  L({ id: '5.5', title: 'Quantum machine learning: kernels and classifiers', minutes: 30, tags: ['variational', 'QML'],
    objectives: ['Encode classical data into quantum states', 'Train a variational classifier and a quantum-kernel classifier', 'Judge quantum-ML claims critically'],
    body: R`
<span class="step-label">Idea</span>
<p><b>Data encoding</b> (a <span data-term="feature map">feature map</span>) turns a data point $x$ into a state $\ket{\phi(x)}$, for example by using its values as rotation angles. Then two approaches:</p>
<ul><li><b>Variational classifier:</b> apply a trainable circuit and read $\expval{Z}$ as the prediction. Train it like a tiny neural network. Loading the data several times ("re-uploading") lets small circuits learn curved boundaries.</li>
<li><b>Quantum kernel:</b> use the overlap $k(x,x') = |\braket{\phi(x)}{\phi(x')}|^2$ as a similarity measure, and let a classical kernel method (SVM, kernel ridge) find the boundary.</li></ul>

<span class="step-label">Try it</span>
<p>Train each model on each dataset. Note when the classical straight-line model fails, and when the quantum models overfit (training accuracy far above test accuracy).</p>
${W('qml', { dataset: 'circles', model: 'kernel' })}

<div class="callout reality"><strong>Be critical</strong>
<ul style="margin:4px 0 0"><li>Two qubits can be simulated exactly in microseconds, so nothing here is beyond classical computers.</li>
<li>For classical data there is no general proof of quantum advantage, and many proposed speed-ups were later matched by "dequantised" classical algorithms.</li>
<li>Loading large datasets into quantum states is itself expensive.</li>
<li>The most promising targets are data that are <i>already quantum</i>: outputs of quantum sensors or simulations.</li></ul></div>
<p>In drug discovery (Track 8) you will use these models to classify toy molecules as active or inactive, keeping the same critical eye.</p>
<div class="callout green"><strong>Track 5 complete</strong>You now know the toolkit used in most near-term experiments: ansätze, optimisers, VQE, QAOA and QML. Track 6 applies VQE to real molecules, computing the Hamiltonian from scratch.</div>`,
    quiz: [
      { q: 'What does a quantum kernel compute?', options: ['The overlap of two encoded states', 'The gradient of the loss', 'A classical distance'], answer: 0, why: '$k(x,x\') = |\\braket{\\phi(x)}{\\phi(x\')}|^2$, estimated by running circuits.' },
      { q: 'Training accuracy is 100% and test accuracy is 60%. What is happening?', options: ['The model generalises well', 'Overfitting', 'Shot noise'], answer: 1, why: 'The model memorised the training data but does not generalise.' }
    ],
    refs: ['V. Havlíček et al., "Supervised learning with quantum-enhanced feature spaces", <i>Nature</i> 567, 209 (2019).', 'A. Pérez-Salinas et al., "Data re-uploading for a universal quantum classifier", <i>Quantum</i> 4, 226 (2020).', 'M. Schuld & N. Killoran, "Is quantum advantage the right goal for quantum machine learning?", <i>PRX Quantum</i> 3, 030101 (2022).']
  });
})();
