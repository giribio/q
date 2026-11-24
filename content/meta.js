/* Course structure, simulator list, glossary and About page. */
(function () {
  var QG = window.QG, C = QG.content;

  C.registerTrack({ id: 't0', num: 0, title: 'Math Launchpad', summary: 'Complex numbers, vectors, matrices, Dirac notation and tensor products: just enough maths to start.' });
  C.registerTrack({ id: 't1', num: 1, title: 'The Qubit', summary: 'Superposition, measurement, the Bloch sphere, and the single-qubit gates.' });
  C.registerTrack({ id: 't2', num: 2, title: 'Many Qubits', summary: 'Entanglement, Bell states, no-cloning, teleportation, superdense coding and the CHSH game.' });
  C.registerTrack({ id: 't3', num: 3, title: 'Quantum Algorithms', summary: 'Oracles, Deutsch–Jozsa, Bernstein–Vazirani, Grover search, the QFT and phase estimation.', outline: ['Oracles and phase kickback', 'Deutsch–Jozsa', 'Bernstein–Vazirani', 'Grover search', 'Quantum Fourier transform', 'Phase estimation', 'Shor\'s algorithm (conceptual)'] });
  C.registerTrack({ id: 't4', num: 4, title: 'Real Hardware & Noise', summary: 'Decoherence, T1/T2, noise channels, error-correcting codes and error mitigation.', outline: ['Decoherence and T1/T2', 'Noise channels and density matrices', 'Gate fidelity', 'Bit-flip and phase-flip codes', 'Error mitigation'] });
  C.registerTrack({ id: 't5', num: 5, title: 'Variational Algorithms', summary: 'Parameterised circuits, optimisers, VQE, QAOA and quantum machine learning.', outline: ['Parameterised circuits', 'Cost landscapes and optimisers', 'VQE', 'QAOA for MaxCut', 'Quantum kernels and classifiers'] });
  C.registerTrack({ id: 't6', num: 6, title: 'Quantum Chemistry', summary: 'From molecular integrals to qubits: H₂ and HeH⁺ energies computed live in your browser.', outline: ['Why molecules are quantum', 'The electronic Hamiltonian', 'Mapping electrons to qubits', 'VQE for H₂', 'Potential energy curves', 'HeH⁺ and self-consistent fields', 'Chemical accuracy'] });
  C.registerTrack({ id: 't7', num: 7, title: 'Quantum Biology', summary: 'Proton tunnelling in enzymes, energy transfer in photosynthesis, and the quantum compass of birds.', outline: ['Tunnelling in enzymes', 'Kinetic isotope effects', 'Photosynthesis and the FMO complex', 'Noise-assisted transport', 'The radical-pair compass', 'DNA tautomers and mutation'] });
  C.registerTrack({ id: 't8', num: 8, title: 'Drug Discovery', summary: 'Where quantum computing may help drug discovery, honestly assessed, with docking, folding and QML labs.', outline: ['The drug discovery pipeline', 'Binding energies with VQE', 'Docking as an optimisation problem', 'Lattice protein folding', 'Quantum ML for activity prediction', 'Reality check'] });
  C.registerTrack({ id: 't9', num: 9, title: 'Capstone Projects', summary: 'Four guided projects that combine the simulators into a small research report.', outline: ['H₂ dissociation curve', 'Enzyme tunnelling KIE study', 'FMO dephasing sweep', 'Mini virtual-screening pipeline'] });

  QG.labList = [
    { id: 'composer', title: 'Circuit Composer', desc: 'Build circuits by clicking gates onto wires. Step through, inspect amplitudes, export to Qiskit.', icon: '⊕', color: 'blue', track: '1–2', phase: 2 },
    { id: 'bloch', title: 'Bloch Sphere Explorer', desc: 'See every single-qubit state as a point on a sphere and watch gates rotate it.', icon: '◉', color: 'green', track: 1, phase: 2 },
    { id: 'code', title: 'Code Lab', desc: 'Write JavaScript with the QG circuit API. Runs in a background thread on your machine.', icon: '{ }', color: 'yellow', track: 'all', phase: 2 },
    { id: 'algorithms', title: 'Algorithm Animator', desc: 'Watch Grover, Deutsch–Jozsa and the QFT step by step as amplitude bars.', icon: '▤', color: 'blue', track: 3, phase: 3 },
    { id: 'noise', title: 'Noise Lab', desc: 'Compare ideal and noisy circuits. See decoherence shrink the Bloch vector.', icon: '≈', color: 'green', track: 4, phase: 3 },
    { id: 'variational', title: 'Variational Playground', desc: 'Explore cost landscapes and watch optimisers find the minimum.', icon: '⛰', color: 'yellow', track: 5, phase: 4 },
    { id: 'qaoa', title: 'QAOA Studio', desc: 'Solve MaxCut on a graph you draw, and compare with brute force.', icon: '△', color: 'blue', track: 5, phase: 4 },
    { id: 'molecule', title: 'Molecule Lab', desc: 'H₂ and HeH⁺ Hamiltonians computed live from STO-3G integrals, then solved with VQE.', icon: '⚛', color: 'green', track: 6, phase: 5 },
    { id: 'tunneling', title: 'Tunnelling Lab', desc: 'A proton wavepacket in an enzyme double well. Compare hydrogen with deuterium.', icon: '∿', color: 'yellow', track: 7, phase: 6 },
    { id: 'fmo', title: 'Light-Harvesting Lab', desc: 'Energy hopping through the 7 sites of the FMO complex, with tunable noise.', icon: '☀', color: 'green', track: 7, phase: 6 },
    { id: 'compass', title: 'Radical-Pair Compass', desc: 'How two electron spins could let a bird sense the direction of Earth\'s magnetic field.', icon: '🧭', color: 'blue', track: 7, phase: 6 },
    { id: 'docking', title: 'Docking Lab', desc: 'Find a ligand\'s binding pose as a graph optimisation solved with QAOA.', icon: '⌬', color: 'yellow', track: 8, phase: 7 },
    { id: 'folding', title: 'Protein Folding Lab', desc: 'Fold a short HP protein chain on a lattice using qubits.', icon: '〰', color: 'green', track: 8, phase: 7 },
    { id: 'qml', title: 'QML Activity Classifier', desc: 'Classify toy compounds as active or inactive with a variational quantum classifier.', icon: '◫', color: 'blue', track: 8, phase: 7 }
  ];

  function g(term, def) { QG.glossary[term.toLowerCase()] = { term: term, def: def }; }
  g('Qubit', 'A quantum bit: a two-level system whose state is $\\alpha\\ket{0}+\\beta\\ket{1}$ with complex amplitudes and $|\\alpha|^2+|\\beta|^2=1$.');
  g('Superposition', 'A state that is a weighted sum (with complex amplitudes) of basis states, like $\\frac{1}{\\sqrt2}(\\ket{0}+\\ket{1})$. It is not "both at once" in a classical sense: it is a new kind of state.');
  g('Amplitude', 'The complex number multiplying a basis state. Its squared magnitude is the probability of that outcome (the Born rule).');
  g('Born rule', 'The probability of measuring outcome $x$ is $|\\braket{x}{\\psi}|^2$, the squared magnitude of its amplitude.');
  g('Measurement', 'Reading out a qubit. It returns 0 or 1 at random according to the Born rule and collapses the state to the observed outcome.');
  g('Collapse', 'After a measurement the state becomes the basis state that was observed. Measuring again gives the same answer.');
  g('Phase', 'The angle of a complex amplitude. A global phase (multiplying the whole state) is unobservable; relative phases between amplitudes cause interference.');
  g('Interference', 'Amplitudes add like waves: they can reinforce (constructive) or cancel (destructive). Quantum algorithms arrange cancellation of wrong answers.');
  g('Bloch sphere', 'A sphere on which every pure single-qubit state is a point: $\\ket{0}$ at the north pole, $\\ket{1}$ at the south pole, superpositions elsewhere.');
  g('Gate', 'An operation on qubits, described by a unitary matrix. Gates are reversible.');
  g('Unitary', 'A matrix $U$ with $U^\\dagger U = I$. Unitaries preserve total probability and can always be undone by $U^\\dagger$.');
  g('Hadamard', 'The H gate. It maps $\\ket{0}\\to\\ket{+}$ and $\\ket{1}\\to\\ket{-}$ and is its own inverse.');
  g('Pauli matrices', 'The three gates X, Y, Z (plus the identity I). X flips the bit, Z flips the phase of $\\ket{1}$, Y does both.');
  g('CNOT', 'Controlled-NOT: flips the target qubit when the control qubit is $\\ket{1}$. The basic entangling gate.');
  g('Entanglement', 'A multi-qubit state that cannot be written as a product of single-qubit states. Measurement results of entangled qubits are correlated beyond any classical explanation.');
  g('Bell state', 'One of four maximally entangled two-qubit states, for example $\\ket{\\Phi^+} = \\frac{1}{\\sqrt2}(\\ket{00}+\\ket{11})$.');
  g('Tensor product', 'The way to combine systems: $\\ket{a}\\otimes\\ket{b}$. n qubits live in a $2^n$-dimensional space.');
  g('Ket', 'Dirac notation for a column vector: $\\ket{\\psi}$.');
  g('Bra', 'Dirac notation for the conjugate-transpose (row vector) of a ket: $\\bra{\\psi}$.');
  g('Inner product', '$\\braket{\\phi}{\\psi}$: a complex number measuring overlap. $|\\braket{\\phi}{\\psi}|^2$ is the probability of finding $\\ket{\\psi}$ in state $\\ket{\\phi}$.');
  g('Fidelity', 'How close two states are: $|\\braket{\\phi}{\\psi}|^2$ for pure states, between 0 (orthogonal) and 1 (identical up to global phase).');
  g('Shot', 'One run of a circuit ending in measurement. Probabilities are estimated from many shots.');
  g('No-cloning theorem', 'No physical process can copy an unknown quantum state. It follows from linearity.');
  g('Teleportation', 'Transferring an unknown qubit state using a shared Bell pair plus two classical bits. Nothing travels faster than light.');
  g('Superdense coding', 'Sending two classical bits by transmitting one qubit, using a pre-shared Bell pair.');
  g('Complex number', 'A number $a + bi$ with $i^2 = -1$. It has a modulus $|z|$ and an angle (argument), and is drawn as a point in a plane.');
  g('Expectation value', '$\\expval{A} = \\bra{\\psi}A\\ket{\\psi}$: the average result of measuring observable $A$ over many shots.');
  g('Observable', 'A Hermitian matrix representing a measurable quantity, such as Z (the bit value as ±1) or an energy (Hamiltonian).');
  g('Hamiltonian', 'The observable for energy. Its lowest eigenvalue is the ground-state energy that chemistry simulations look for.');
  g('Qiskit', 'IBM\'s open-source Python toolkit for quantum computing. Every circuit here can be exported to Qiskit code.');
  g('OpenQASM', 'A text format for quantum circuits used by Qiskit and many hardware providers.');
  g('State vector', 'The list of all $2^n$ amplitudes of an n-qubit state. A state-vector simulator stores and updates it directly.');
  g('Decoherence', 'Loss of quantum behaviour through unwanted interaction with the environment. The main obstacle for real hardware.');
  g('CHSH inequality', 'A test of local realism: classical strategies win the CHSH game at most 75% of the time; quantum mechanics allows about 85.4%.');
  g('Oracle', 'A black-box operation that evaluates a function $f$ reversibly, either as $\\ket{x}\\ket{y}\\to\\ket{x}\\ket{y\\oplus f(x)}$ or as a phase $(-1)^{f(x)}$.');
  g('Phase kickback', 'When a controlled operation acts on an eigenstate, its eigenvalue (a phase) appears on the control qubit instead of the target.');
  g('Grover search', 'An algorithm that finds a marked item among N using about $\\frac{\\pi}{4}\\sqrt N$ oracle calls: a quadratic speed-up.');
  g('Quantum Fourier transform', 'The discrete Fourier transform applied to the $2^n$ amplitudes, using only about $n^2/2$ gates.');
  g('Phase estimation', 'An algorithm that reads the eigenphase $\\varphi$ of a unitary into a register of counting qubits, to $t$ bits of precision.');
  g('Density matrix', '$\\rho = \\sum_k p_k\\ket{\\psi_k}\\bra{\\psi_k}$: describes pure and mixed (noisy or partially known) states. Diagonal = probabilities, off-diagonal = coherences.');
  g('Purity', '$\\mathrm{Tr}\\,\\rho^2$: 1 for a pure state, less for a mixed one (minimum $1/2^n$).');
  g('Kraus operators', 'Matrices $K_i$ describing a noise channel: $\\rho \\to \\sum_i K_i\\rho K_i^\\dagger$ with $\\sum_i K_i^\\dagger K_i = I$.');
  g('T1', 'Energy-relaxation time: how long before $\\ket{1}$ decays to $\\ket{0}$ (population falls as $e^{-t/T_1}$).');
  g('T2', 'Dephasing time: how long a superposition keeps its relative phase (coherence falls as $e^{-t/T_2}$). Always $T_2 \\le 2T_1$.');
  g('Depolarizing channel', '$\\rho \\to (1-\\lambda)\\rho + \\lambda I/2^n$: the standard simple model of gate error.');
  g('Error mitigation', 'Classical post-processing (for example readout correction or zero-noise extrapolation) that reduces the bias caused by noise without extra qubits.');
  g('Error correction', 'Encoding a logical qubit in many physical qubits so that errors can be detected through parity checks and fixed, without measuring the encoded information.');
  g('Surface code', 'A leading quantum error-correcting code on a 2D grid of qubits; it suppresses errors when physical error rates are below about 1%.');
  g('Ansatz', 'A parameterised circuit $U(\\theta)$ whose angles are tuned by a classical optimiser (plural: ansätze).');
  g('Variational principle', 'For any state, $\\bra{\\psi}H\\ket{\\psi} \\ge E_0$: the expected energy can never fall below the ground-state energy.');
  g('VQE', 'Variational quantum eigensolver: minimise the measured energy of a parameterised circuit to approximate a ground state.');
  g('QAOA', 'Quantum approximate optimisation algorithm: alternate cost and mixer layers with tunable angles to find good solutions of combinatorial problems.');
  g('Parameter-shift rule', 'Exact gradient of an expectation value from two circuit runs: $\\partial E/\\partial\\theta = [E(\\theta+\\pi/2) - E(\\theta-\\pi/2)]/2$.');
  g('Barren plateau', 'A flat optimisation landscape in which gradients vanish exponentially with the number of qubits.');
  g('SPSA', 'Simultaneous perturbation stochastic approximation: an optimiser that estimates a gradient from 2 evaluations, whatever the number of parameters.');
  g('MaxCut', 'Split a graph\'s nodes into two groups so that the number (or weight) of edges between groups is as large as possible.');
  g('Feature map', 'A circuit that encodes classical data $x$ into a quantum state $\\ket{\\phi(x)}$.');
  g('Quantum kernel', 'A similarity measure $k(x,x\') = |\\braket{\\phi(x)}{\\phi(x\')}|^2$ computed by a quantum computer and used by a classical kernel method.');
  g('Pauli string', 'A tensor product of I, X, Y and Z, written like XZI. Hamiltonians are weighted sums of Pauli strings.');
  g('Born–Oppenheimer approximation', 'Treat the heavy nuclei as fixed and solve for the electrons at each nuclear geometry.');
  g('Basis set', 'The finite set of functions (for example Gaussians centred on atoms) used to expand molecular orbitals. Bigger basis sets are more accurate and need more qubits.');
  g('STO-3G', 'The smallest standard basis set: each Slater-type atomic orbital is approximated by a sum of 3 Gaussians.');
  g('Hartree–Fock', 'The mean-field approximation: each electron feels the average field of the others; the wavefunction is a single Slater determinant.');
  g('Self-consistent field', 'The iterative procedure that solves the Hartree–Fock equations: orbitals → field → new orbitals, until nothing changes.');
  g('Correlation energy', '$E_{exact} - E_{HF}$: the energy Hartree–Fock misses because electrons avoid each other.');
  g('Second quantisation', 'Describing electrons by which orbitals are occupied, using creation and annihilation operators $a^\\dagger$ and $a$.');
  g('Jordan–Wigner mapping', 'Encodes each spin orbital as one qubit; a string of Z gates supplies the fermionic minus signs.');
  g('Parity mapping', 'Encodes the parity of orbitals 0..j in qubit j; symmetries then let some qubits be removed (two-qubit reduction).');
  g('Chemical accuracy', 'An energy error below 1 kcal/mol ≈ 1.6 mHa, enough to predict chemical reaction rates usefully.');
  g('Potential energy surface', 'The electronic energy as a function of nuclear positions; its minima are stable structures and its saddle points are reaction barriers.');
  g('UCC', 'Unitary coupled cluster: a chemistry-inspired ansatz built from electron excitations out of the Hartree–Fock state.');
  g('Kinetic isotope effect', 'The ratio of reaction rates for light and heavy isotopes, such as k_H/k_D. Values far above about 7 at room temperature point to tunnelling.');
  g('Zero-point energy', 'The lowest possible vibrational energy of a quantum oscillator, $\\hbar\\omega/2$. Lighter isotopes have more.');
  g('Exciton', 'An electronic excitation shared (delocalised) over several coupled molecules, such as the pigments of a light-harvesting complex.');
  g('Radical pair', 'Two molecules each carrying one unpaired electron, created together so that their spins are correlated (often in a singlet state).');
  g('Cryptochrome', 'A light-sensitive protein in the eyes of birds and other animals; the leading candidate for a radical-pair magnetic compass.');
  g('Tautomer', 'A form of a molecule in which a proton has moved to a different atom, such as the rare forms of DNA bases.');
  g('ENAQT', 'Environment-assisted quantum transport: moderate noise can increase the efficiency of quantum energy transfer.');
  g('Quantum Zeno effect', 'Very frequent measurement (or strong dephasing) freezes the evolution of a quantum system.');
  g('Lindblad equation', 'The standard equation of motion for a density matrix coupled to a memoryless environment: unitary evolution plus jump (noise) terms.');
  g('Pharmacophore', 'An abstract feature of a molecule that matters for binding, such as a hydrogen-bond donor, an acceptor, an aromatic ring or a charge.');
  g('Docking', 'Predicting how a small molecule (ligand) sits in a protein pocket, and how well it binds.');
  g('Clique', 'A set of graph vertices that are all connected to each other. In docking, a clique of compatible contacts is a consistent pose.');
  g('QUBO', 'Quadratic unconstrained binary optimisation: minimise or maximise a quadratic function of binary variables. Constraints become penalty terms.');
  g('HP model', 'A lattice protein model with only two residue types, hydrophobic (H) and polar (P), scoring contacts between H residues.');
  g('QSAR', 'Quantitative structure–activity relationship: a model that predicts biological activity from molecular descriptors.');
  g('logP', 'The logarithm of a molecule’s oil–water partition coefficient: a measure of how fat-loving (lipophilic) it is.');
  g('Rule of five', 'Lipinski’s guideline: orally active drugs usually have logP ≤ 5, molecular weight ≤ 500 Da, at most 5 H-bond donors and 10 acceptors.');
  g('ADMET', 'Absorption, distribution, metabolism, excretion and toxicity: the properties that decide whether a molecule can become a medicine.');
  g('Binding energy', 'The energy released when a ligand binds its target: E(complex) − E(ligand) − E(target).');
  g('Basis','A set of states used to describe all others. The computational basis is $\\{\\ket{0},\\ket{1}\\}$; the X basis is $\\{\\ket{+},\\ket{-}\\}$.');

  QG.notationDecoder =
    '<dl class="kv" style="grid-template-columns:auto 1fr;gap:8px 18px">' +
    '<dt>$\\ket{\\psi}$</dt><dd style="font-family:inherit">"ket psi": a quantum state, a column vector</dd>' +
    '<dt>$\\bra{\\psi}$</dt><dd style="font-family:inherit">"bra psi": the conjugate transpose, a row vector</dd>' +
    '<dt>$\\braket{\\phi}{\\psi}$</dt><dd style="font-family:inherit">inner product (overlap), a complex number</dd>' +
    '<dt>$\\ket{01}$</dt><dd style="font-family:inherit">two qubits: q1 = 0, q0 = 1 (rightmost is qubit 0, as in Qiskit)</dd>' +
    '<dt>$\\otimes$</dt><dd style="font-family:inherit">tensor product: combine systems</dd>' +
    '<dt>$U^\\dagger$</dt><dd style="font-family:inherit">"U dagger": conjugate transpose; for a gate, its inverse</dd>' +
    '<dt>$z^*$</dt><dd style="font-family:inherit">complex conjugate: flip the sign of the imaginary part</dd>' +
    '<dt>$|z|^2$</dt><dd style="font-family:inherit">squared magnitude $z^* z$; a probability when z is an amplitude</dd>' +
    '<dt>$\\expval{Z}$</dt><dd style="font-family:inherit">expectation value of Z</dd>' +
    '<dt>$\\ket{+}, \\ket{-}$</dt><dd style="font-family:inherit">$\\frac{1}{\\sqrt2}(\\ket{0}\\pm\\ket{1})$, the X basis</dd>' +
    '<dt>$\\ket{i}, \\ket{-i}$</dt><dd style="font-family:inherit">$\\frac{1}{\\sqrt2}(\\ket{0}\\pm i\\ket{1})$, the Y basis</dd></dl>';

  /* Developer credit. Paste the full profile addresses (starting with https://) between the quotes;
   * each link appears on the About page as soon as its address is filled in. */
  QG.author = {
    name: 'Girinath G. Pillai',
    linkedin: 'https://www.linkedin.com/in/giribio/',
    github: 'https://github.com/giribio'
  };
  function authorLinks() {
    var a = QG.author, links = [];
    if (a.linkedin) links.push('<a href="' + a.linkedin + '" target="_blank" rel="noopener noreferrer">LinkedIn</a>');
    if (a.github) links.push('<a href="' + a.github + '" target="_blank" rel="noopener noreferrer">GitHub</a>');
    return links.length ? ' (' + links.join(' · ') + ')' : '';
  }

  QG.aboutHTML =
    '<h1>About QGiriBio</h1>' +
    '<p>QGiriBio is a free, self-contained course in quantum computing for undergraduates. It starts from complex numbers and ends with toy models of enzymes, photosynthesis and drug discovery.</p>' +
    '<div class="callout green"><strong>Developer</strong>The simulator is developed by <b>' + QG.author.name + '</b>' + authorLinks() + ' with AI assistance.</div>' +
    '<h2>Everything runs on your computer</h2>' +
    '<p>There is no server. The quantum simulator is written in plain JavaScript and runs inside this page, using your CPU and memory. You can copy the whole folder to a USB stick, open <code>index.html</code> with no internet connection, and everything works.</p>' +
    '<ul><li><b>State-vector simulator:</b> stores all $2^n$ complex amplitudes. About 20 qubits on a typical laptop (16 MB), up to 24 on a powerful one.</li>' +
    '<li><b>Background thread:</b> heavy runs and Code Lab programs execute in a Web Worker, so the page stays responsive.</li>' +
    '<li><b>Your progress</b> is stored only in this browser. Use the Progress page to download a backup.</li></ul>' +
    '<h2>The Playground</h2>' +
    '<p>The <a href="#/playground">Playground</a> runs four problems (random bits, search, entanglement, factoring) on three kinds of computer: a classical CPU, an ideal parallel GPU model, and qubits. Every quantum answer is computed by the same tested engine as the rest of the course; costs are compared in one stated unit of work rather than in milliseconds.</p>' +
    '<h2>The Academy</h2>' +
    '<p>The <a href="#/academy">Academy</a> is the structured 12-week course: lecture notes and slides, Python notebooks and Q# practicals, quizzes, a rubric, certification levels and six capstone research tracks. Every notebook and Q# practical has an equivalent you can run here, and the whole course package can be read, searched and downloaded offline.</p>' +
    '<h2>From here to real quantum computers</h2>' +
    '<p>Every circuit can be exported to <b>Qiskit</b> (Python), <b>OpenQASM 2.0</b> and <b>Q#</b> (Microsoft QDK). The exported code uses the current Qiskit API (<code>StatevectorSampler</code>), so it runs in any Python notebook with <code>pip install qiskit</code>, and on IBM Quantum hardware if you have an account.</p>' +
    '<h2>An honest note on applications</h2>' +
    '<div class="callout reality"><strong>Toy models, not research tools</strong>The chemistry, biology and drug-discovery labs use deliberately tiny models (2–10 qubits) so that you can see every step. Today\'s quantum computers cannot yet beat classical computers on real drug-discovery problems. These labs teach how the methods work and where the hard parts are, without overselling.</div>' +
    '<h2>How the course is built</h2>' +
    '<p>Each lesson follows the same rhythm: <b>Idea → Visual → Try it → Code it → Check</b>. Challenges are checked automatically by comparing your circuit\'s output state with a target (fidelity above 99%).</p>' +
    '<p class="small muted">Version ' + QG.version + '. Engine tests: open <code>tests/test.html</code>. File-access diagnostics: <code>tests/smoke.html</code>.</p>';
})();
