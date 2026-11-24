/* Track 6: Quantum Chemistry */
(function () {
  var QG = window.QG, R = String.raw;
  function W(name, opts) { return '<div data-widget="' + name + '" data-opts=\'' + JSON.stringify(opts || {}).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/\$/g, '&#36;').replace(/</g, '&lt;') + '\'></div>'; }
  function L(o) { o.track = 't6'; QG.content.register(o); }

  L({ id: '6.1', title: 'Why molecules are quantum', minutes: 20, tags: ['chemistry'],
    objectives: ['State the electronic Schrödinger equation and the Born–Oppenheimer approximation', 'Explain why exact classical simulation scales exponentially', 'Describe what a quantum computer would contribute'],
    body: R`
<span class="step-label">Idea</span>
<p>Chemistry is the physics of electrons. Bonds, reaction rates, colours and drug–protein binding all follow from the <b>electronic Schrödinger equation</b>:</p>
$$\hat H\,\Psi(\mathbf r_1, \ldots, \mathbf r_N) = E\,\Psi.$$
<p>Nuclei are thousands of times heavier than electrons, so we freeze them in place (the <b>Born–Oppenheimer approximation</b>) and solve for the electrons at each nuclear geometry. Repeating this for many geometries gives a <b>potential energy surface</b>: bond lengths, vibrations and reaction barriers.</p>
<p>The difficulty is that electrons are correlated: each one's motion depends on all the others. The exact wavefunction lives in a space that grows exponentially with the number of orbitals.</p>
${W('scaling')}

<span class="step-label">What a quantum computer adds</span>
<p>A register of $2K$ qubits can hold a superposition over all those configurations at once, one qubit per spin orbital. Algorithms like VQE (Track 5) and phase estimation (Track 3) then extract energies. In this track you will carry out the <b>entire pipeline</b> for the two smallest molecules, H₂ and HeH⁺:</p>
<ol><li>Choose a basis set and compute integrals (6.2).</li><li>Run Hartree–Fock to get molecular orbitals (6.3).</li><li>Map electrons to qubits (6.4).</li><li>Run VQE (6.5) and scan the bond length (6.6).</li><li>Ask honestly how far this is from useful chemistry (6.7).</li></ol>
${W('molecule', { tabs: [['orbitals', 'Orbitals']], fixedMolecule: true })}
<p class="small">Drag the bond length: the bonding orbital (σ₁) piles electron density between the nuclei; the antibonding orbital (σ₂) has a node in the middle.</p>`,
    quiz: [
      { q: 'What does the Born–Oppenheimer approximation do?', options: ['Treats nuclei as fixed while solving for the electrons', 'Ignores electron repulsion', 'Uses only one electron'], answer: 0, why: 'Nuclei are slow and heavy, so electrons are solved for at fixed nuclear positions.' },
      { q: 'How many qubits does a direct encoding of 50 spatial orbitals need?', options: ['50', '100', '10²⁸'], answer: 1, why: 'One qubit per spin orbital: 2 × 50 = 100.' }
    ]
  });

  L({ id: '6.2', title: 'Basis sets and the electronic Hamiltonian', minutes: 25, tags: ['chemistry'],
    objectives: ['Explain what a basis set is and why Gaussians are used', 'List the integrals that define the Hamiltonian', 'Separate electronic energy and nuclear repulsion'],
    body: R`
<span class="step-label">Idea</span>
<p>We cannot work with continuous wavefunctions directly, so we expand orbitals in a finite <b>basis set</b>. The smallest is <b>STO-3G</b>: one 1s function per hydrogen or helium atom, each a fixed sum of 3 Gaussians fitted to a Slater orbital.</p>
${W('sto3g-fit')}

<span class="step-label">The Hamiltonian, in numbers</span>
<p>In atomic units (hartree, bohr), the electronic Hamiltonian for nuclei $A$ with charges $Z_A$ is</p>
$$\hat H_{el} = \sum_i\Big(-\tfrac12\nabla_i^2 - \sum_A\frac{Z_A}{r_{iA}}\Big) + \sum_{i<j}\frac{1}{r_{ij}}.$$
<p>Projected onto the basis, everything reduces to a handful of integrals: overlaps $S_{\mu\nu}$, kinetic energy $T_{\mu\nu}$, nuclear attraction $V_{\mu\nu}$ and two-electron repulsion $(\mu\nu|\lambda\sigma)$. For Gaussians all of them have closed forms. The constant <b>nuclear repulsion</b> $E_{nuc} = \sum_{A<B} Z_AZ_B/R_{AB}$ is added at the end:</p>
$$E_{total} = E_{electronic} + E_{nuc}.$$
${W('molecule', { tab: 'ints', tabs: [['ints', 'Integrals']] })}
<div class="callout"><strong>A common trap</strong>Published qubit Hamiltonians for H₂ (for example $-1.0524\,II + 0.3979\,IZ \ldots$) are <i>electronic</i> only. Their lowest eigenvalue is −1.857 Ha; add $E_{nuc}$ = 0.720 Ha to get the total −1.137 Ha. Always check which one a paper reports.</div>`,
    quiz: [
      { q: 'Why are Gaussian functions used instead of Slater functions?', options: ['They are more accurate', 'Their integrals have simple closed forms', 'They have a cusp at the nucleus'], answer: 1, why: 'The product of two Gaussians is a Gaussian, which makes the many-centre integrals easy.' },
      { q: 'H₂ at 0.735 Å: electronic energy −1.857 Ha, E_nuc = 0.720 Ha. Total?', options: ['−2.577 Ha', '−1.137 Ha', '−1.857 Ha'], answer: 1, why: '−1.857 + 0.720 = −1.137 Ha.' }
    ],
    refs: ['A. Szabo & N. S. Ostlund, <i>Modern Quantum Chemistry</i> (Dover), ch. 3 and appendix A.']
  });

  L({ id: '6.3', title: 'Hartree–Fock and self-consistent fields', minutes: 25, tags: ['chemistry'],
    objectives: ['Describe the mean-field (Hartree–Fock) approximation', 'Follow the SCF loop for HeH⁺', 'Define the correlation energy'],
    body: R`
<span class="step-label">Idea</span>
<p><b>Hartree–Fock</b> assumes each electron moves in the <i>average</i> field of the others. The wavefunction is a single configuration (a Slater determinant) built from molecular orbitals $\sigma = \sum_\mu c_\mu\phi_\mu$. Because the average field depends on the orbitals, and the orbitals on the field, the equations are solved iteratively: the <b>self-consistent field (SCF)</b> loop.</p>
<ol><li>Guess the electron density.</li><li>Build the Fock matrix $F = H_{core} + G(\text{density})$.</li><li>Solve $FC = SC\varepsilon$ for new orbitals.</li><li>Refill the lowest orbitals with electrons; repeat until nothing changes.</li></ol>

<span class="step-label">Try it</span>
<p>HeH⁺ has no left–right symmetry, so its orbitals must be found by iteration. At R = 0.774 Å (1.4632 bohr) you should get $E_{HF} = -2.86066$ Ha with orbital energies −1.5975 and −0.0617 Ha, the textbook values from Szabo & Ostlund.</p>
${W('molecule', { molecule: 'HeH', R: 0.7743, tab: 'orbitals', tabs: [['orbitals', 'Orbitals & SCF']] })}

<span class="step-label">What Hartree–Fock misses</span>
<p>The mean field ignores how electrons dodge each other. The difference from the exact answer is the <b>correlation energy</b>:</p>
$$E_{corr} = E_{exact} - E_{HF} < 0.$$
<p>It is small (about 1% of the total) but chemically decisive: reaction energies and bond breaking depend on it. Capturing correlation is exactly where quantum computers might help.</p>`,
    quiz: [
      { q: 'Why is Hartree–Fock solved iteratively?', options: ['The Fock matrix depends on the orbitals it determines', 'Computers are slow', 'To include nuclear motion'], answer: 0, why: 'The mean field is built from the occupied orbitals, which are its own solution: self-consistency.' },
      { q: 'The correlation energy is…', options: ['always positive', 'E(exact) − E(HF), always ≤ 0', 'the nuclear repulsion'], answer: 1, why: 'Hartree–Fock is variational, so the exact energy is lower.' }
    ]
  });

  L({ id: '6.4', title: 'Mapping electrons to qubits', minutes: 30, tags: ['chemistry'],
    objectives: ['Write the Hamiltonian with creation and annihilation operators', 'Apply the Jordan–Wigner and parity mappings', 'Reduce H₂ to 2 qubits and even 1 qubit using symmetry'],
    body: R`
<span class="step-label">Second quantisation</span>
<p>Each spin orbital is either empty or occupied, just like a qubit is 0 or 1. Electrons are moved with creation ($a_p^\dagger$) and annihilation ($a_q$) operators:</p>
$$\hat H = \sum_{pq} h_{pq}\,a_p^\dagger a_q + \frac12\sum_{pqrs}\langle pq|rs\rangle\,a_p^\dagger a_q^\dagger a_s a_r.$$
<p>The $h_{pq}$ and $\langle pq|rs\rangle$ are the integrals from 6.2, transformed into the molecular-orbital basis.</p>

<span class="step-label">Fermions are not qubits</span>
<p>Electrons are fermions: swapping two of them flips the sign of the wavefunction ($a_pa_q = -a_qa_p$). Qubit operators on different qubits commute instead. The mappings fix this:</p>
<ul><li><b>Jordan–Wigner:</b> $a_j^\dagger = Z_0\cdots Z_{j-1}\,\tfrac12(X_j - iY_j)$. The string of Z gates counts the electrons "before" orbital $j$ and supplies the sign.</li>
<li><b>Parity:</b> qubit $j$ stores the parity of orbitals $0..j$. For H₂ two qubits then just store the known numbers of spin-up and spin-down electrons, and can be removed: 4 qubits become 2.</li>
<li><b>Symmetry, again:</b> for H₂ only two configurations can mix (both electrons in σ₁, or both in σ₂), so 1 qubit suffices.</li></ul>

<span class="step-label">Try it</span>
<p>Switch between the 1-, 2- and 4-qubit encodings. The number of terms changes, but the lowest energy is identical. The 2-qubit coefficients at 0.735 Å are computed here from scratch, and they reproduce the values published with Qiskit.</p>
${W('molecule', { tab: 'ham', tabs: [['ham', 'Qubit Hamiltonian']] })}

<span class="step-label">Code it</span>
<pre><code>const m = QG.chem.molecule('H2', 0.735);   // integrals -> HF -> MO -> qubits
console.log('JW (4 qubits):', m.jw.length, 'terms');
console.log(QG.pauli.toString(m.parity2));    // the 2-qubit Hamiltonian
console.log('FCI total energy:', m.fci.energy);
// check the anticommutation relation {a_0, a_0^dagger} = 1 for Jordan-Wigner
const PS = QG.fermion.PS, a = QG.fermion.jw(0, 4, false), ad = QG.fermion.jw(0, 4, true);
console.log(PS.simplify(PS.add(PS.mul(a, ad), PS.mul(ad, a))));   // { IIII: [1, 0] }</code></pre>`,
    quiz: [
      { q: 'What does the string of Z gates in the Jordan–Wigner mapping do?', options: ['Adds the fermionic sign', 'Measures the qubit', 'Normalises the state'], answer: 0, why: 'It counts occupied orbitals to the left and supplies $(-1)^{count}$, reproducing fermion anticommutation.' },
      { q: 'Why can the parity mapping drop two qubits for H₂?', options: ['They hold only the known spin-up and total electron parities', 'They are always 0', 'H₂ has 2 electrons'], answer: 0, why: 'Their values are fixed by the electron counts, so they can be replaced by numbers.' }
    ],
    refs: ['J. T. Seeley, M. J. Richard, P. J. Love, "The Bravyi–Kitaev transformation for quantum computation of electronic structure", <i>J. Chem. Phys.</i> 137, 224109 (2012).']
  });

  L({ id: '6.5', title: 'VQE for the hydrogen molecule', minutes: 30, tags: ['chemistry', 'VQE'],
    objectives: ['Run VQE on the 1-, 2- and 4-qubit H₂ Hamiltonians', 'Compare a hardware-efficient and a chemistry-inspired ansatz', 'Check results against chemical accuracy'],
    body: R`
<span class="step-label">Idea</span>
<p>Now combine Track 5 and this track. Two families of ansatz:</p>
<ul><li><b>Hardware-efficient:</b> layers of rotations and CNOTs (used here for 2 qubits). Easy to run, but blind to chemistry.</li>
<li><b>Chemistry-inspired (UCC-type):</b> start from Hartree–Fock $\ket{0101}$ and add excitations that conserve the number of electrons. For H₂ one parameter is enough: $\cos\theta\ket{0101} + \sin\theta\ket{1010}$.</li></ul>
<p>The target is <b>chemical accuracy</b>: within 1.6 mHa (1 kcal/mol) of the exact answer, the green band in the chart.</p>

<span class="step-label">Try it</span>
${W('molecule', { tab: 'vqe', tabs: [['vqe', 'VQE']] })}
<p>Try each encoding with exact energies, then switch to 1,000 shots per term. Shot noise alone can push you outside chemical accuracy.</p>
<div class="callout"><strong>Historic note</strong>The first VQE experiment (Peruzzo et al., 2014, on a photonic chip) computed the energy curve of HeH⁺, the other molecule in this lab. In 2016 Google computed the H₂ curve on superconducting qubits (O'Malley et al.) using a 2-qubit Hamiltonian like the one above.</div>`,
    quiz: [
      { q: 'Which ansatz conserves the number of electrons by construction?', options: ['The double-excitation (UCC-type) ansatz', 'Random Ry/CNOT layers', 'Neither'], answer: 0, why: 'It only moves amplitude between $\\ket{0101}$ and $\\ket{1010}$, both with 2 electrons.' },
      { q: 'Chemical accuracy is about…', options: ['1.6 mHa (1 kcal/mol)', '1 Ha', '1 eV'], answer: 0, why: '1 kcal/mol ≈ 1.6 mHa ≈ 0.043 eV.' }
    ],
    refs: ['A. Peruzzo et al., <i>Nat. Commun.</i> 5, 4213 (2014).', 'P. J. J. O\'Malley et al., <i>Phys. Rev. X</i> 6, 031007 (2016).']
  });

  L({ id: '6.6', title: 'Potential energy curves and bond breaking', minutes: 25, tags: ['chemistry'],
    objectives: ['Compute a potential energy curve and read off the bond length', 'Explain why Hartree–Fock fails when bonds break', 'Relate static correlation to the strength of quantum methods'],
    body: R`
<span class="step-label">Idea</span>
<p>Repeating the energy calculation at many bond lengths traces the <b>potential energy curve</b>. Its minimum gives the equilibrium bond length; its depth gives the bond energy; its curvature gives the vibrational frequency.</p>

<span class="step-label">Try it</span>
<p>Compute the curve for H₂ and then HeH⁺. Tick "also run VQE" to add VQE points.</p>
${W('molecule', { tab: 'curve', tabs: [['curve', 'Energy curve']] })}

<span class="step-label">Why Hartree–Fock breaks</span>
<p>At large R the exact H₂ wavefunction is one electron on each atom. Hartree–Fock insists both electrons share one orbital, which keeps a 50% chance of finding both on the same atom (H⁺ + H⁻). That is far too high in energy. Fixing it needs <b>two</b> configurations with equal weight: <b>static (strong) correlation</b>. VQE with even a 1-parameter ansatz captures it exactly, because a quantum state can be any superposition of configurations.</p>
<div class="callout green"><strong>Why this matters</strong>Bond breaking, transition metals, catalysts and enzyme active sites (Track 7) are full of static correlation, where classical approximations struggle. That is the territory where quantum computers are expected to matter first.</div>`,
    quiz: [
      { q: 'What does the minimum of the potential energy curve give?', options: ['The equilibrium bond length', 'The ionisation energy', 'The number of electrons'], answer: 0, why: 'The lowest-energy geometry is the equilibrium structure.' },
      { q: 'Why does restricted Hartree–Fock fail for stretched H₂?', options: ['It forces both electrons into one shared orbital', 'The integrals become wrong', 'Nuclear repulsion vanishes'], answer: 0, why: 'One configuration cannot describe one electron per atom; you need a superposition of two.' }
    ]
  });

  L({ id: '6.7', title: 'Chemical accuracy and the road to useful chemistry', minutes: 20, tags: ['chemistry', 'reality check'],
    objectives: ['Estimate the measurement cost of VQE', 'Compare toy molecules with industrially relevant targets', 'Summarise what fault tolerance would bring'],
    body: R`
<span class="step-label">Measurement cost</span>
${W('precision')}

<span class="step-label">From H₂ to real chemistry</span>
<table class="amp-table"><tr><th>System</th><th>Qubits (rough)</th><th>Status</th></tr>
<tr><td>H₂, HeH⁺, minimal basis</td><td>1–4</td><td>done since 2014; trivial classically</td></tr>
<tr><td>Small molecules, larger basis (LiH, BeH₂, H₂O)</td><td>10–30</td><td>VQE demonstrations; still classically easy</td></tr>
<tr><td>Iron–sulphur clusters, FeMoco (nitrogen fixation), cytochrome P450 (drug metabolism)</td><td>100–200 logical</td><td>believed classically hard; needs fault tolerance</td></tr></table>
<p>Resource estimates for FeMoco, the active site of the enzyme that fixes nitrogen, have fallen from about $10^{15}$ gates (2017) to around $10^{9}$–$10^{10}$ Toffoli gates with newer algorithms. That still means roughly a million or more physical qubits running for days. It is a fault-tolerant, phase-estimation problem, not a near-term VQE one.</p>
<div class="callout reality"><strong>Honest summary</strong>
<ul style="margin:4px 0 0"><li>Everything you computed in this track can be done exactly on a laptop in milliseconds.</li>
<li>Classical methods (DFT, coupled cluster, DMRG) are excellent and keep improving.</li>
<li>Quantum advantage for chemistry is expected for strongly correlated systems at a scale that needs error-corrected hardware.</li>
<li>Learning the full pipeline now, as you did here, is exactly how researchers prepare for that hardware.</li></ul></div>
<div class="callout green"><strong>Track 6 complete</strong>You have built a quantum chemistry calculation from integrals to qubits. Track 7 turns to quantum effects inside living systems: tunnelling in enzymes, energy transfer in photosynthesis, and the bird compass.</div>`,
    quiz: [
      { q: 'Why is FeMoco a famous target for quantum computing?', options: ['It is strongly correlated and hard for classical methods', 'It has only 2 electrons', 'It needs no error correction'], answer: 0, why: 'Its many interacting d-electrons make classical simulation unreliable.' },
      { q: 'To halve the statistical error of an energy estimate you need…', options: ['twice as many shots', 'four times as many shots', 'half the shots'], answer: 1, why: 'Error ∝ $1/\\sqrt{N}$, so halving it requires 4× the shots.' }
    ],
    refs: ['M. Reiher et al., "Elucidating reaction mechanisms on quantum computers", <i>PNAS</i> 114, 7555 (2017).', 'J. Lee et al., "Even more efficient quantum computations of chemistry through tensor hypercontraction", <i>PRX Quantum</i> 2, 030305 (2021).', 'S. McArdle et al., "Quantum computational chemistry", <i>Rev. Mod. Phys.</i> 92, 015003 (2020).']
  });
})();
