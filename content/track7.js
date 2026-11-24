/* Track 7: Quantum Biology */
(function () {
  var QG = window.QG, R = String.raw;
  function W(name, opts) { return '<div data-widget="' + name + '" data-opts=\'' + JSON.stringify(opts || {}).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/\$/g, '&#36;').replace(/</g, '&lt;') + '\'></div>'; }
  function L(o) { o.track = 't7'; QG.content.register(o); }

  L({ id: '7.1', title: 'Quantum biology: warm, wet and noisy', minutes: 20, tags: ['biology'],
    objectives: ['State when quantum effects can matter in a living system', 'Compare biological timescales with decoherence times', 'Separate trivial from non-trivial quantum effects in biology'],
    body: R`
<span class="step-label">Idea</span>
<p>All chemistry is quantum at heart: bonds exist because of quantum mechanics. <b>Quantum biology</b> asks a narrower question: do <i>non-trivial</i> quantum effects, such as tunnelling, coherent superposition or entanglement, play a <b>functional</b> role that evolution could exploit?</p>
<p>The usual objection: cells are warm (310 K), wet and noisy, and the environment destroys coherence very fast (Track 4). So quantum effects can only matter when a process is <b>faster than decoherence</b>, or when the quantum degree of freedom is <b>well shielded</b>, like electron spins.</p>
${W('timescales')}

<span class="step-label">Three case studies</span>
<table class="amp-table"><tr><th>Phenomenon</th><th>Quantum effect</th><th>Status</th></tr>
<tr><td>Enzymes moving protons and hydride ions</td><td>Tunnelling through energy barriers</td><td>Well established (large kinetic isotope effects)</td></tr>
<tr><td>Photosynthetic light harvesting</td><td>Delocalised excitons, transient coherence</td><td>Excitons certain; functional role of long coherence debated</td></tr>
<tr><td>Bird magnetoreception</td><td>Spin-correlated (entangled) radical pairs</td><td>Leading hypothesis, strong supporting evidence</td></tr></table>
<p>For each you will run a faithful but simplified model: a proton in a double well (7.2–7.3), excitation transport in the FMO complex (7.4–7.5), and a radical-pair spin system (7.6). Then a more speculative case: proton tunnelling in DNA (7.7).</p>
<div class="callout reality"><strong>A healthy attitude</strong>Quantum biology attracts hype. Throughout this track, ask: what is the evidence, and would a classical model explain it just as well?</div>`,
    quiz: [
      { q: 'When can quantum coherence plausibly matter in a cell?', options: ['When the process is faster than decoherence or the system is well shielded', 'Never', 'Always: everything is quantum'], answer: 0, why: 'Coherence must survive long enough to influence the outcome.' },
      { q: 'Which effect is the best established functionally?', options: ['Proton tunnelling in enzymes', 'Quantum computation in neurons', 'Entanglement between organisms'], answer: 0, why: 'Large kinetic isotope effects and their temperature dependence are well documented.' }
    ],
    refs: ['N. Lambert et al., "Quantum biology", <i>Nat. Phys.</i> 9, 10 (2013).', 'J. Cao et al., "Quantum biology revisited", <i>Sci. Adv.</i> 6, eaaz4888 (2020).']
  });

  L({ id: '7.2', title: 'Proton tunnelling in enzymes', minutes: 30, tags: ['biology', 'tunnelling'],
    objectives: ['Model proton transfer as a particle in a double well', 'Relate the tunnelling time to the energy splitting ΔE', 'Map the two lowest states onto a qubit'],
    body: R`
<span class="step-label">Idea</span>
<p>Many enzymes move a proton (or a hydride, H⁻) from a donor atom to an acceptor. Classically the proton must climb over the energy barrier. A proton is light enough to behave as a wave, so it can also <b>tunnel through</b>.</p>
<p>Model: a proton in a symmetric double-well potential. Its two lowest energy states are a symmetric and an antisymmetric combination of "proton on the left" and "proton on the right", split by a tiny energy $\Delta E$. A proton starting on the left moves to the right in time</p>
$$t_{L\to R} = \frac{\pi\hbar}{\Delta E}.$$

<span class="step-label">Try it</span>
<p>Press Play. The green area is the probability density $|\psi(x,t)|^2$; blue lines are the energy levels. Then change the barrier height and the distance, and switch to deuterium.</p>
${W('tunnel', { preset: 'shallow' })}

<span class="step-label">The proton is a qubit</span>
<p>Restricted to its two lowest states, the proton is a two-level system: $\ket{L}$ and $\ket{R}$. In that basis the Hamiltonian is</p>
$$H = -\frac{\Delta E}{2}X + \frac{\varepsilon}{2}Z,$$
<p>so tunnelling is a rotation about the x axis of the Bloch sphere, the same physics as an $R_x$ gate. An asymmetry $\varepsilon$ between the wells tilts the rotation axis, and transfer becomes incomplete. That is exactly what you see on the Bloch sphere above.</p>
<div class="callout"><strong>Under the hood</strong>The lab solves the Schrödinger equation on a grid of 512 points (finite differences, a pivoted tridiagonal eigen-solver), and checks the dynamics against split-operator FFT propagation. Both run in your browser.</div>`,
    quiz: [
      { q: 'What happens to the tunnelling time if the barrier gets wider?', options: ['It grows roughly exponentially', 'It shrinks', 'Nothing'], answer: 0, why: 'ΔE falls exponentially with width (and with $\\sqrt{\\text{mass}\\times\\text{height}}$).' },
      { q: 'In the qubit picture, which gate does symmetric tunnelling implement?', options: ['An X-axis rotation', 'A Z gate', 'A CNOT'], answer: 0, why: '$H \\propto X$ generates rotations about the x axis between $\\ket{L}$ and $\\ket{R}$.' }
    ]
  });

  L({ id: '7.3', title: 'Kinetic isotope effects: the fingerprint of tunnelling', minutes: 25, tags: ['biology', 'tunnelling'],
    objectives: ['Explain the zero-point-energy origin of the classical kinetic isotope effect', 'Explain why tunnelling gives much larger isotope effects', 'Interpret enzyme KIEs such as ≈80 for soybean lipoxygenase'],
    body: R`
<span class="step-label">Idea</span>
<p>Replace hydrogen by deuterium (twice the mass) and reactions slow down. The ratio of rates $k_H/k_D$ is the <span data-term="kinetic isotope effect">kinetic isotope effect (KIE)</span>.</p>
<ul><li><b>Over-barrier (semiclassical) picture:</b> a heavier isotope has a lower zero-point energy, so it sits deeper in the well and needs more energy to reach the top: $\text{KIE} \approx e^{\Delta ZPE/k_BT}$, at most about 7 at room temperature for C–H bonds.</li>
<li><b>Tunnelling:</b> the probability falls roughly as $e^{-2d\sqrt{2m V}/\hbar}$. Mass sits <i>inside</i> the exponent, so doubling it can reduce tunnelling by orders of magnitude.</li></ul>

<span class="step-label">Try it</span>
<p>The "Enzyme" preset uses a 12 kcal/mol barrier. Read the isotope table: zero-point energies, splittings and the two KIE estimates.</p>
${W('tunnel', { preset: 'enzyme' })}

<span class="step-label">Evidence from real enzymes</span>
<p>Soybean lipoxygenase, which oxidises fatty acids, shows $k_H/k_D \approx 80$ at room temperature, far beyond the semiclassical limit, and the effect barely depends on temperature. Both are hallmarks of tunnelling. Current models describe it as tunnelling <b>assisted by protein motions</b> that briefly bring donor and acceptor closer.</p>
<div class="callout reality"><strong>About the numbers</strong>The "pure tunnelling" KIE in the lab is an upper bound: it assumes the proton tunnels only from its ground state, with no thermal averaging and no protein motion. Real KIEs fall between the two estimates.</div>`,
    quiz: [
      { q: 'A measured KIE of 3 at 300 K suggests…', options: ['Mostly over-barrier transfer', 'Deep tunnelling', 'No reaction'], answer: 0, why: 'It is within the semiclassical range set by zero-point energies.' },
      { q: 'Why does tunnelling give larger isotope effects than the zero-point-energy argument?', options: ['Mass appears inside an exponential', 'Deuterium has more charge', 'Tunnelling is faster at high temperature'], answer: 0, why: 'Tunnelling probability decays exponentially with $\\sqrt{m}$.' }
    ],
    refs: ['M. J. Knapp, K. Rickert, J. P. Klinman, "Temperature-dependent isotope effects in soybean lipoxygenase-1", <i>J. Am. Chem. Soc.</i> 124, 3865 (2002).', 'J. P. Klinman & A. Kohen, "Hydrogen tunneling links protein dynamics to enzyme catalysis", <i>Annu. Rev. Biochem.</i> 82, 471 (2013).']
  });

  L({ id: '7.4', title: 'Photosynthesis and the FMO complex', minutes: 30, tags: ['biology', 'open systems'],
    objectives: ['Describe excitation energy transfer between pigments', 'Write the FMO exciton Hamiltonian and interpret its eigenstates', 'Summarise the debate about long-lived coherence'],
    body: R`
<span class="step-label">Idea</span>
<p>Green sulphur bacteria capture sunlight in huge antennas and funnel the energy through the <b>Fenna–Matthews–Olson (FMO) complex</b> to the reaction centre, with near-perfect efficiency. FMO holds 7 bacteriochlorophyll pigments (8 in some structures). An excitation sits on one pigment at a time, and couplings $J_{ij}$ let it hop:</p>
$$H = \sum_i \varepsilon_i\ket{i}\bra{i} + \sum_{i\ne j} J_{ij}\ket{i}\bra{j}.$$
<p>This is a single-excitation quantum system: a 7-level "qudit" that could be encoded in 3 qubits. The eigenstates (<span data-term="exciton">excitons</span>) are spread over several pigments at once.</p>

<span class="step-label">Try it</span>
<p>Excite site 1 and watch the populations. At low noise they oscillate (coherent transfer); at moderate noise they flow smoothly downhill to site 3, the exit to the reaction centre.</p>
${W('fmo', { gamma: 3 })}

<span class="step-label">The coherence debate</span>
<p>In 2007 Engel and co-workers saw oscillations in FMO's 2D electronic spectra lasting about 660 fs at 77 K, which suggested wave-like electronic coherence. This sparked the field of quantum biology. Later work found that, at physiological temperature, electronic coherence probably lasts only tens of femtoseconds, and that the long-lived beats are mostly <b>vibrational</b> or mixed vibronic. The excitons themselves are not in doubt; what is debated is whether long coherence is <i>functionally</i> important.</p>`,
    quiz: [
      { q: 'What is an exciton in FMO?', options: ['An eigenstate of the pigment Hamiltonian, delocalised over several pigments', 'A photon', 'A proton'], answer: 0, why: 'Couplings mix the site states into delocalised eigenstates.' },
      { q: 'How many qubits does a binary encoding of 7 single-excitation states need?', options: ['3', '7', '128'], answer: 0, why: '$2^3 = 8 \\ge 7$.' }
    ],
    refs: ['G. S. Engel et al., "Evidence for wavelike energy transfer through quantum coherence in photosynthetic systems", <i>Nature</i> 446, 782 (2007).', 'J. Adolphs & T. Renger, "How proteins trigger excitation energy transfer in the FMO complex of green sulfur bacteria", <i>Biophys. J.</i> 91, 2778 (2006).', 'H.-G. Duan et al., "Nature does not rely on long-lived electronic quantum coherence for photosynthetic energy transfer", <i>PNAS</i> 114, 8493 (2017).']
  });

  L({ id: '7.5', title: 'Noise-assisted quantum transport', minutes: 25, tags: ['biology', 'open systems'],
    objectives: ['Model environmental noise with a Lindblad dephasing term', 'Explain why both too little and too much noise reduce efficiency', 'Connect to the quantum Zeno effect and Anderson localisation'],
    body: R`
<span class="step-label">Idea</span>
<p>The protein environment constantly jiggles the pigment energies. A simple model is pure dephasing at rate $\gamma$ (Lindblad form, Track 4):</p>
$$\dot\rho = -\tfrac{i}{\hbar}[H,\rho] + \gamma\sum_k\Big(P_k\rho P_k - \tfrac12\{P_k,\rho\}\Big) + \text{trapping} + \text{loss},$$
<p>with $P_k = \ket{k}\bra{k}$. Trapping removes excitation from site 3 into the reaction centre; slow loss (≈1 ns) represents fluorescence.</p>

<span class="step-label">Try it</span>
<p>Slide γ from very small to very large and watch the efficiency curve on the right.</p>
${W('fmo', { gamma: 100 })}

<span class="step-label">Why noise helps</span>
<ul><li><b>Too little noise:</b> pigments have different energies, so coherent waves interfere destructively and get stuck (similar to Anderson localisation).</li>
<li><b>Just right:</b> noise broadens the energy levels, bridging mismatches, and the excitation flows downhill to the trap. This is <b>environment-assisted quantum transport (ENAQT)</b>.</li>
<li><b>Too much noise:</b> the environment effectively "measures" the excitation's location so often that it freezes: the <b>quantum Zeno effect</b>.</li></ul>
<p>The efficiency is computed exactly by solving the Liouvillian equation $\mathcal{L}x = -\rho_0$ for the time-integrated density matrix: 98 linear equations, done in a millisecond.</p>
<div class="callout green"><strong>Design lesson</strong>Optimal transport happens at the boundary between quantum and classical. The same idea is being explored for organic solar cells and quantum networks.</div>`,
    quiz: [
      { q: 'Why does very strong dephasing reduce efficiency?', options: ['Quantum Zeno effect: frequent "measurement" freezes hopping', 'The trap breaks', 'Energy is created'], answer: 0, why: 'Coherences needed for hopping are destroyed faster than they can build up.' },
      { q: 'Without any noise, why can transfer be inefficient?', options: ['Energy mismatches cause destructive interference and localisation', 'Excitons decay instantly', 'The Hamiltonian is not Hermitian'], answer: 0, why: 'Disorder in site energies traps coherent waves.' }
    ],
    refs: ['M. Mohseni, P. Rebentrost, S. Lloyd, A. Aspuru-Guzik, <i>J. Chem. Phys.</i> 129, 174106 (2008).', 'M. B. Plenio & S. F. Huelga, "Dephasing-assisted transport", <i>New J. Phys.</i> 10, 113019 (2008).']
  });

  L({ id: '7.6', title: 'The radical-pair compass', minutes: 30, tags: ['biology', 'spins'],
    objectives: ['Describe how a radical pair forms in an entangled singlet state', 'Explain why the singlet yield depends on field direction', 'Identify why anisotropy and long spin coherence are essential'],
    body: R`
<span class="step-label">Idea</span>
<p>Migratory birds such as the European robin sense the <i>direction</i> of Earth's magnetic field (about 50 µT, tiny next to a fridge magnet's 5 mT). The leading explanation involves the protein <b>cryptochrome</b> in the eye:</p>
<ol><li>Light creates a pair of radicals: two molecules, each with one unpaired electron.</li>
<li>The two electron spins start in the <b>singlet</b> state $\frac{1}{\sqrt2}(\ket{\uparrow\downarrow} - \ket{\downarrow\uparrow})$, the Bell state $\ket{\Psi^-}$.</li>
<li>Earth's field and the hyperfine coupling to nearby nuclear spins rotate the two electrons differently, interconverting singlet and triplet.</li>
<li>Singlet and triplet pairs react to different chemical products. The product yield depends on the field's orientation relative to the molecule: a chemical compass.</li></ol>

<span class="step-label">Try it</span>
<p>The model has 3 spins (two electrons and one nucleus), so 8 states: a 3-"qubit" system. Compare anisotropic and isotropic hyperfine couplings, then slow down or speed up recombination.</p>
${W('compass')}

<span class="step-label">What the model teaches</span>
<ul><li>An <b>isotropic</b> coupling gives no directional information. The compass needs an anisotropic (direction-dependent) interaction.</li>
<li>The spins must stay coherent for roughly a <b>microsecond</b>, a long time in biology. The weak field rotates spins by only about 9 radians per µs.</li>
<li>Very weak radio-frequency noise disrupts robins' orientation in experiments, consistent with a fragile spin-coherent mechanism.</li></ul>
<div class="callout reality"><strong>Status</strong>The radical-pair mechanism is strongly supported: magnetic sensitivity was measured in robin cryptochrome 4 in 2021. How the signal reaches the brain, and how coherence survives so long, remain open questions.</div>`,
    quiz: [
      { q: 'In which state do the two electron spins start?', options: ['The singlet $\\ket{\\Psi^-}$, an entangled Bell state', '$\\ket{\\uparrow\\uparrow}$', 'A random mixture'], answer: 0, why: 'Spin conservation in the light-induced electron transfer gives a singlet pair.' },
      { q: 'Why is an anisotropic hyperfine interaction essential?', options: ['Otherwise the yield is the same for every field direction', 'It makes the field stronger', 'It speeds up recombination'], answer: 0, why: 'With isotropic couplings the physics is rotationally symmetric: no compass.' }
    ],
    refs: ['K. Schulten, C. E. Swenberg, A. Weller, <i>Z. Phys. Chem.</i> 111, 1 (1978).', 'T. Ritz, S. Adem, K. Schulten, <i>Biophys. J.</i> 78, 707 (2000).', 'S. Engels et al., "Anthropogenic electromagnetic noise disrupts magnetic compass orientation in a migratory bird", <i>Nature</i> 509, 353 (2014).', 'J. Xu et al., "Magnetic sensitivity of cryptochrome 4 from a migratory songbird", <i>Nature</i> 594, 535 (2021).']
  });

  L({ id: '7.7', title: 'DNA, tautomers and mutation', minutes: 20, tags: ['biology', 'tunnelling'],
    objectives: ['State Löwdin\'s proton-tunnelling hypothesis for point mutations', 'Model an asymmetric double well and its consequences', 'Weigh current evidence critically'],
    body: R`
<span class="step-label">Idea</span>
<p>DNA base pairs are held together by hydrogen bonds. In 1963 Per-Olov Löwdin proposed that protons in these bonds could <b>tunnel</b> to the partner base, creating rare <b>tautomers</b> (for example G*–C*). If DNA is copied while a base is in its tautomeric form, it can pair with the wrong partner: a point mutation.</p>
<p>Unlike the symmetric enzyme well, this well is <b>asymmetric</b>: the tautomer is higher in energy, by $\varepsilon$, and more fragile.</p>

<span class="step-label">Try it</span>
<p>The preset uses an illustrative barrier and asymmetry. Play the dynamics: the proton only partially and briefly visits the right-hand well. On the Bloch sphere the rotation axis is tilted, so the state never reaches the south pole. Set ε = 0 to compare.</p>
${W('tunnel', { preset: 'dna' })}

<div class="callout reality"><strong>What we know</strong>Recent open-quantum-system calculations suggest tautomers form quickly (on femtosecond to picosecond timescales) with small populations, but most revert before they could matter. Whether tunnelling contributes measurably to spontaneous mutation rates is <b>unresolved</b>. It is an active research question, not an established fact.</div>
<div class="callout green"><strong>Track 7 complete</strong>You have modelled three quantum effects in biology: tunnelling, exciton transport and spin chemistry. Track 8 asks where quantum computers might help with biology's most practical problem: discovering new drugs.</div>`,
    quiz: [
      { q: 'Why does asymmetry suppress tunnelling?', options: ['The two wells are no longer at the same energy, so transfer is off-resonant', 'It makes the proton heavier', 'It removes the barrier'], answer: 0, why: 'Off-resonance tilts the rotation axis; only partial transfer occurs.' },
      { q: 'What is the current status of Löwdin\'s hypothesis?', options: ['Plausible but unresolved', 'Proven to cause most mutations', 'Disproved'], answer: 0, why: 'Tautomers can form, but their contribution to real mutation rates is still being studied.' }
    ],
    refs: ['P.-O. Löwdin, "Proton tunneling in DNA and its biological implications", <i>Rev. Mod. Phys.</i> 35, 724 (1963).', 'L. Slocombe, M. Sacchi, J. Al-Khalili, "An open quantum systems approach to proton tunnelling in DNA", <i>Commun. Phys.</i> 5, 109 (2022).']
  });
})();
