/* Track 8: Drug Discovery */
(function () {
  var QG = window.QG, R = String.raw;
  function W(name, opts) { return '<div data-widget="' + name + '" data-opts=\'' + JSON.stringify(opts || {}).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/\$/g, '&#36;').replace(/</g, '&lt;') + '\'></div>'; }
  function L(o) { o.track = 't8'; QG.content.register(o); }

  L({ id: '8.1', title: 'The drug discovery pipeline', minutes: 20, tags: ['drug discovery'],
    objectives: ['Describe the stages from target to approved medicine', 'Locate where computation, and possibly quantum computing, enters', 'Explain why Grover search is not a shortcut for screening a list'],
    body: R`
<span class="step-label">Idea</span>
<p>A new medicine takes 10–15 years and costs over a billion dollars, and most candidates fail. Computation already shapes every early stage: predicting structures, docking molecules into proteins, estimating binding strength, filtering by drug-likeness. The hope for quantum computing is to make some of these predictions <b>more accurate</b>, especially where electrons behave in strongly quantum ways.</p>
${W('pipeline')}

<span class="step-label">Searching a library</span>
<p>Hit discovery means finding the few active molecules in a large library. Grover's algorithm (Track 3) finds one of $M$ marked items among $N$ in about $\frac{\pi}{4}\sqrt{N/M}$ oracle calls.</p>
${W('grover-screen')}
<div class="callout reality"><strong>The catch</strong>The oracle must decide "is this molecule active?" <i>inside</i> a quantum circuit, for all molecules in superposition. That is itself a hard computation. Grover never helps to search a list that is already written down; its square-root speed-up applies to huge, implicitly defined spaces with a cheap coherent test.</div>`,
    quiz: [
      { q: 'Roughly what fraction of drug candidates entering clinical trials are eventually approved?', options: ['About 10%', 'About 50%', 'About 90%'], answer: 0, why: 'Around nine in ten fail, mostly on efficacy or safety.' },
      { q: 'Why does Grover search not speed up checking a written list of 16 molecules?', options: ['The oracle must compute activity coherently, and reading the list classically is already trivial', 'Grover only works for 2 qubits', 'Molecules are not quantum'], answer: 0, why: 'The quadratic speed-up counts oracle calls; building the oracle is the hard part.' }
    ],
    refs: ['O. J. Wouters, M. McKee, J. Luyten, "Estimated research and development investment needed to bring a new medicine to market, 2009–2018", <i>JAMA</i> 323, 844 (2020).', 'Y. Cao, J. Romero, A. Aspuru-Guzik, "Potential of quantum computing for drug discovery", <i>IBM J. Res. Dev.</i> 62, 6:1 (2018).']
  });

  L({ id: '8.2', title: 'Binding energies with VQE', minutes: 25, tags: ['drug discovery', 'chemistry'],
    objectives: ['Define a binding (interaction) energy', 'Compute a binding curve with VQE and exact methods', 'Separate algorithm error from basis-set error'],
    body: R`
<span class="step-label">Idea</span>
<p>A drug works by <b>binding</b> to its target. The strength of that binding is an energy difference:</p>
$$\Delta E_{bind} = E(\text{complex}) - E(\text{drug}) - E(\text{protein}).$$
<p>Errors of just 1–2 kcal/mol change a binding constant tenfold, so accuracy matters enormously. Most binding sites are handled well by classical methods, but some, such as metal centres in metalloenzymes, involve strongly correlated electrons where classical approximations become unreliable. That is the niche where quantum computers might one day help.</p>

<span class="step-label">Try it: the smallest binding problem</span>
<p>The proton affinity of helium: how strongly does He bind an H⁺? Everything is computed from scratch with the Track 6 engine, and VQE runs at every distance.</p>
${W('binding')}

<span class="step-label">Two kinds of error</span>
<ul><li><b>Algorithm error:</b> how far VQE is from the exact answer <i>in this basis</i>. Here it is essentially zero.</li>
<li><b>Model (basis-set) error:</b> how far the exact-in-this-basis answer is from reality. Here it is about 20%, because STO-3G is tiny.</li></ul>
<p>A quantum computer only fixes the first kind. Reducing the second needs bigger basis sets, which means more qubits. In practice, quantum calculations would be embedded in classical workflows (QM/MM, fragment methods) that treat only the critical region quantum-mechanically.</p>`,
    quiz: [
      { q: 'VQE matches the exact STO-3G energy but differs from experiment by 20%. What should you improve?', options: ['The basis set (model)', 'The optimiser', 'The number of shots'], answer: 0, why: 'The algorithm is already exact for the model; the model itself is too crude.' },
      { q: 'Why is 1 kcal/mol accuracy important in drug design?', options: ['Binding constants depend exponentially on free energy', 'It is the energy of one photon', 'Regulators require it'], answer: 0, why: '$K \\propto e^{-\\Delta G/RT}$: 1.4 kcal/mol at room temperature is a factor of 10.' }
    ]
  });

  L({ id: '8.3', title: 'Docking as an optimisation problem', minutes: 30, tags: ['drug discovery', 'QAOA'],
    objectives: ['Represent a binding pose as a clique in a graph', 'Write the maximum-weight clique problem as a QUBO', 'Solve it with QAOA and judge the result'],
    body: R`
<span class="step-label">Idea</span>
<p><b>Docking</b> predicts how a ligand sits in a protein pocket. Reduce both to <b>pharmacophore features</b> (hydrogen-bond donors and acceptors, rings, charges). Then:</p>
<ul><li>Each <b>vertex</b> is a possible contact: a ligand feature paired with a compatible pocket feature, weighted by its interaction strength.</li>
<li>Two vertices are joined by an <b>edge</b> if both contacts can happen at once: the ligand distance matches the pocket distance within a tolerance τ.</li>
<li>A consistent pose is a <b>clique</b> (every pair connected). The best pose is the <b>maximum-weight clique</b>.</li></ul>
<p>As a QUBO (one qubit per vertex):</p>
$$\max_x \; \sum_v w_v x_v - P\sum_{(u,v)\notin E} x_u x_v.$$

<span class="step-label">Try it</span>
<p>Run QAOA, then shrink τ (a stiffer ligand) and watch contacts disappear. Lower the penalty P below the largest weight and the "best" answer stops being a valid pose: a classic QUBO pitfall.</p>
${W('dock')}
<p>Open the full <a href="#/lab/docking">Docking Lab</a> for ligand B (8 qubits).</p>`,
    quiz: [
      { q: 'In the binding interaction graph, what is a clique?', options: ['A set of contacts that are all geometrically compatible', 'A single strong contact', 'All pocket features'], answer: 0, why: 'Every pair of chosen contacts must fit together.' },
      { q: 'What happens if the penalty P is too small?', options: ['The optimum may include incompatible contacts', 'QAOA fails to run', 'Nothing'], answer: 0, why: 'Violating a constraint costs less than the weight it gains.' }
    ],
    refs: ['L. Banchi, M. Fingerhuth, T. Babej, C. Ing, J. M. Arrazola, "Molecular docking with Gaussian boson sampling", <i>Sci. Adv.</i> 6, eaax1950 (2020).']
  });

  L({ id: '8.4', title: 'Lattice protein folding', minutes: 30, tags: ['drug discovery', 'QAOA'],
    objectives: ['Describe the HP lattice model of protein folding', 'Encode a chain conformation in qubits', 'Interpret QAOA results and their limits'],
    body: R`
<span class="step-label">Idea</span>
<p>A protein's function depends on its 3D shape. The <b>HP model</b> keeps one key force: hydrophobic (H) residues like to be buried next to each other, polar (P) residues do not care. Place the chain on a square lattice. Each H–H contact between residues that are not chain neighbours scores −1, and the lowest energy is the native fold.</p>
<p><b>Encoding:</b> after the first bond, every bond turns straight, left or right: 2 qubits per turn (the fourth code is forbidden). A chain of $N$ residues needs $2(N-2)$ qubits. Overlapping residues are penalised.</p>

<span class="step-label">Try it</span>
${W('fold', { seq: 'HPPHPH' })}
<p>Compare the number of valid folds with the number of bit strings: most encodings are invalid, and QAOA has to learn to avoid them. Try longer sequences in the <a href="#/lab/folding">Protein Folding Lab</a>.</p>
<div class="callout reality"><strong>Reality check</strong>AlphaFold (Nobel Prize in Chemistry 2024) predicts real protein structures with near-experimental accuracy using deep learning, no quantum computer needed. Quantum folding studies are small proofs of concept. Where quantum methods could still matter is in the <i>chemistry</i> around proteins: reactions, metal sites and accurate energies.</div>`,
    quiz: [
      { q: 'How many qubits encode a 7-residue chain with 2 qubits per turn?', options: ['10', '14', '7'], answer: 0, why: '$2(7-2) = 10$.' },
      { q: 'What does the HP model reward?', options: ['Contacts between hydrophobic residues', 'Straight chains', 'Polar contacts'], answer: 0, why: 'Each non-bonded H–H neighbour pair lowers the energy by 1.' }
    ],
    refs: ['K. A. Dill, "Theory for the folding and stability of globular proteins", <i>Biochemistry</i> 24, 1501 (1985).', 'A. Robert et al., "Resource-efficient quantum algorithm for protein folding", <i>npj Quantum Inf.</i> 7, 38 (2021).']
  });

  L({ id: '8.5', title: 'Quantum machine learning for activity prediction', minutes: 25, tags: ['drug discovery', 'QML'],
    objectives: ['Frame activity prediction as classification', 'Train quantum and classical models on molecular descriptors', 'Read a confusion matrix and judge generalisation'],
    body: R`
<span class="step-label">Idea</span>
<p><b>QSAR</b> (quantitative structure–activity relationship) models predict whether a molecule is active from its descriptors. Here, two descriptors: <b>logP</b> (oil-versus-water preference) and <b>molecular weight</b>. Lipinski's "rule of five" says oral drugs usually have logP ≤ 5 and MW ≤ 500 Da.</p>
<p>The data are <b>synthetic</b>: actives cluster inside a drug-like window and inactives lie around it. A straight line cannot separate a window, a curved boundary can.</p>

<span class="step-label">Try it</span>
${W('activity')}

<span class="step-label">Reading the results</span>
<ul><li><b>Accuracy</b> on the hidden test set is what counts; high training accuracy alone can mean overfitting.</li>
<li>The <b>confusion matrix</b> separates false positives (wasted lab work) from false negatives (missed drugs).</li>
<li>Any non-linear classical model would also succeed here. The fair benchmark for a quantum model is the best classical model, not a linear one.</li></ul>`,
    quiz: [
      { q: 'Why does logistic regression fail on this data?', options: ['Actives sit inside a window; a single straight line cannot enclose it', 'It needs more qubits', 'The data are random'], answer: 0, why: 'Activity drops on both sides of the window, which is non-linear.' },
      { q: 'What is the fair comparison for a quantum classifier?', options: ['The best available classical model', 'A random guess', 'The training accuracy'], answer: 0, why: 'Advantage claims must beat strong classical baselines.' }
    ]
  });

  L({ id: '8.6', title: 'Reality check: quantum computing and drug discovery', minutes: 20, tags: ['drug discovery', 'reality check'],
    objectives: ['Summarise where quantum computing could and could not help drug discovery', 'Name the resources a useful calculation needs', 'Plan what to learn next'],
    body: R`
<span class="step-label">Where things stand</span>
<table class="amp-table"><tr><th>Task</th><th>Classical state of the art</th><th>Quantum prospect</th></tr>
<tr><td>Structure prediction</td><td>AlphaFold and successors: excellent</td><td>Little to add</td></tr>
<tr><td>Docking and virtual screening</td><td>Fast physics- and ML-based scoring of billions of molecules</td><td>QUBO/QAOA studies are tiny; no advantage shown</td></tr>
<tr><td>Activity and ADMET prediction</td><td>Deep learning on large datasets</td><td>No proven advantage on classical data</td></tr>
<tr><td>Accurate energies of strongly correlated sites (metalloenzymes, cytochrome P450, photochemistry)</td><td>Approximate; can be unreliable</td><td><b>The most credible target</b>, but needs fault-tolerant machines</td></tr></table>
<p>Estimates for P450 or FeMoco active sites call for roughly 100–200 <i>logical</i> qubits and $10^9$–$10^{10}$ gates, around a million physical qubits with error correction. Hybrid workflows would pass only the hardest fragment to the quantum computer.</p>

<span class="step-label">What you can do now</span>
<ul><li>Export any circuit from this course to Qiskit and run it on real hardware or noisy simulators.</li>
<li>Learn the classical tools well (RDKit, docking programs, DFT, ML), because quantum methods will plug into them.</li>
<li>Try the capstone projects in Track 9.</li></ul>
<div class="callout green"><strong>Track 8 complete</strong>You have seen every layer, from a single qubit to toy versions of real drug-discovery problems, with an honest view of what is hype and what is promise.</div>`,
    quiz: [
      { q: 'Which application is the most credible long-term target for quantum computers in drug discovery?', options: ['Accurate electronic energies of strongly correlated active sites', 'Searching a written compound list', 'Predicting protein structures from sequence'], answer: 0, why: 'This is classically hard and maps naturally onto quantum simulation.' }
    ],
    refs: ['C. Outeiral et al., "The prospects of quantum computing in computational molecular biology", <i>WIREs Comput. Mol. Sci.</i> 11, e1481 (2021).', 'J. M. Jumper et al., "Highly accurate protein structure prediction with AlphaFold", <i>Nature</i> 596, 583 (2021).']
  });
})();
