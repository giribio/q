/* Track 9: Capstone projects (each with starter code that runs in the Code Lab, and a saved deliverables checklist). */
(function () {
  var QG = window.QG, R = String.raw;
  function W(name, opts) { return '<div data-widget="' + name + '" data-opts=\'' + JSON.stringify(opts || {}).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/\$/g, '&#36;').replace(/</g, '&lt;') + '\'></div>'; }
  function L(o) { o.track = 't9'; QG.content.register(o); }

  var CODE = QG.capstoneCode = {
    h2: [
      '// Capstone 1: the H2 dissociation curve (Hartree-Fock vs exact vs VQE)',
      'const Rs = [], hf = [], fci = [], vqe = [];',
      'let x0 = null;',
      'for (let R = 0.40; R <= 3.01; R += 0.10) {',
      '  const m = QG.chem.molecule("H2", R);            // integrals -> HF -> qubit Hamiltonians',
      '  const r = QG.vqe({ H: m.parity2, ansatz: QG.variational.ansatz("ry", 2, 1),',
      '                     optimizer: "nelder-mead", maxIter: 300, x0 });',
      '  x0 = r.x;                                       // warm start from the previous bond length',
      '  Rs.push(R); hf.push(m.hf.energy); fci.push(m.fci.energy); vqe.push(r.energy + m.Enuc);',
      '}',
      'QG.show.plot([',
      '  { name: "Hartree-Fock", x: Rs, y: hf },',
      '  { name: "exact (FCI)", x: Rs, y: fci },',
      '  { name: "VQE", x: Rs, y: vqe, pointsOnly: true }',
      '], { title: "H2 potential energy curve (STO-3G)", xLabel: "R (angstrom)", yLabel: "energy (Ha)" });',
      'const i = fci.indexOf(Math.min(...fci));',
      'console.log("equilibrium R ~", Rs[i].toFixed(2), "A, E =", fci[i].toFixed(5), "Ha");',
      'console.log("dissociation energy De ~", ((fci[fci.length - 1] - fci[i]) * 27.2114).toFixed(2), "eV (experiment 4.75 eV)");',
      'console.log("largest |VQE - FCI| =", Math.max(...vqe.map((v, k) => Math.abs(v - fci[k]))).toExponential(2), "Ha");'
    ].join('\n'),
    kie: [
      '// Capstone 2: how do isotope effects depend on the distance a proton must tunnel?',
      'const T = QG.bio.tunnel, rows = [["distance (A)", "t(H) fs", "t(D) fs", "KIE classical", "KIE tunnelling"]];',
      'const d = [], kc = [], kt = [];',
      'for (let a = 0.25; a <= 0.451; a += 0.025) {',
      '  const r = T.isotopes({ Vb: 12, a: a, eps: 0 }, 300);   // barrier 12 kcal/mol, 300 K',
      '  d.push(2 * a); kc.push(Math.log10(r.kieClassical)); kt.push(Math.log10(r.kieTunnel));',
      '  rows.push([(2 * a).toFixed(2), r.H.tunnelTimeFs.toExponential(2), r.D.tunnelTimeFs.toExponential(2), r.kieClassical.toFixed(1), r.kieTunnel.toExponential(1)]);',
      '}',
      'QG.show.table(rows, "Barrier 12 kcal/mol, T = 300 K");',
      'QG.show.plot([{ name: "log10 KIE (zero-point only)", x: d, y: kc }, { name: "log10 KIE (ground-state tunnelling)", x: d, y: kt }],',
      '  { title: "Kinetic isotope effect vs donor-acceptor distance", xLabel: "distance between wells (A)", yLabel: "log10 k_H/k_D" });',
      '// Your turn: repeat for barriers of 8 and 16 kcal/mol, and compare with the measured KIE of ~80 for soybean lipoxygenase.'
    ].join('\n'),
    fmo: [
      '// Capstone 3: environment-assisted transport in the FMO complex',
      'const logs = [], effSite1 = [], effSite6 = [];',
      'for (let k = 0; k <= 40; k++) {',
      '  const lg = -1 + 5 * k / 40, g = Math.pow(10, lg);    // dephasing from 0.1 to 10^4 cm^-1',
      '  logs.push(lg);',
      '  effSite1.push(QG.bio.fmo.efficiency({ gamma: g, kTrap: 1, kLoss: 0.001, start: 0 }));',
      '  effSite6.push(QG.bio.fmo.efficiency({ gamma: g, kTrap: 1, kLoss: 0.001, start: 5 }));',
      '}',
      'QG.show.plot([{ name: "start at site 1", x: logs, y: effSite1 }, { name: "start at site 6", x: logs, y: effSite6 }],',
      '  { title: "Transfer efficiency vs dephasing", xLabel: "log10 gamma (cm^-1)", yLabel: "efficiency" });',
      'const best = effSite1.indexOf(Math.max(...effSite1));',
      'console.log("optimum dephasing ~", Math.pow(10, logs[best]).toFixed(0), "cm^-1, efficiency", effSite1[best].toFixed(4));',
      '// Room temperature corresponds to kT ~ 200 cm^-1. Is the optimum close to that?',
      '// Your turn: change kTrap (0.1, 1, 10 per ps) and see how the optimum moves.'
    ].join('\n'),
    screen: [
      '// Capstone 4: a mini virtual-screening pipeline (synthetic data)',
      '// Step 1: train a quantum-kernel activity model',
      'const data = QG.drug.compoundData(48), split = QG.qml.split(data, 0.7);',
      'const model = QG.qml.kernelModel(2, 0.05).fit(split.train);',
      'console.log("test accuracy:", QG.qml.accuracy(model.decision(split.test.X), split.test.y));',
      '// Step 2: screen a new virtual library and keep drug-like predicted actives',
      'const library = QG.drug.compounds(16, 99);',
      'const scores = model.decision(library.map(QG.drug.featurise));',
      'const hits = library.map((c, i) => i).filter(i => scores[i] > 0 && library[i].logP <= 5 && library[i].mw <= 500);',
      'QG.show.table([["ID", "logP", "MW", "score"]].concat(hits.map(i => [library[i].id, library[i].logP, library[i].mw, scores[i].toFixed(2)])), "Predicted drug-like actives");',
      '// Step 3: Grover search over the 16-compound library for those hits (4 qubits)',
      'const iters = Math.max(1, Math.floor(Math.PI / 4 * Math.sqrt(16 / Math.max(1, hits.length))));',
      'const g = QG.drug.groverMarked(4, hits, iters);',
      'QG.show.probabilities(g, "Grover after " + iters + " iteration(s)");',
      '// Step 4: dock the reference ligand into the pocket with QAOA',
      'const G = QG.drug.dockingGraph(QG.drug.DOCK_SETS.A, 0.6);',
      'const r = QG.drug.qaoaMax(QG.drug.cliqueValues(G, 2), G.n, 2);',
      'console.log("docking: P(best pose) =", r.pOpt.toFixed(3), "vs random", r.uniformP.toFixed(3));',
      'console.log("best pose contacts:", G.V.filter((v, i) => (r.argmax[0] >> i) & 1).map(v => v.label).join(", "));'
    ].join('\n')
  };

  function brief(o) { return '<div class="objectives"><h4>Your deliverable</h4><p style="margin:0">' + o + '</p></div>'; }

  L({ id: '9.1', title: 'Capstone 1: the H₂ dissociation curve', minutes: 90, tags: ['capstone', 'chemistry'],
    objectives: ['Reproduce a full quantum chemistry workflow end to end', 'Quantify the errors of Hartree–Fock and VQE', 'Write a short scientific report'],
    body: R`
${brief('A 1–2 page report with a figure of the H₂ potential energy curve (Hartree–Fock, exact, VQE), the equilibrium bond length, the dissociation energy, and a discussion of where and why Hartree–Fock fails.')}
<span class="step-label">Steps</span>
<ol><li>Explore the <a href="#/lab/molecule">Molecule Lab</a>: orbitals, integrals, qubit Hamiltonians.</li>
<li>Run the starter code below in the Code Lab. Read every line.</li>
<li>Extend it: compare the 1-, 2- and 4-qubit encodings, and add shot noise (<code>shots: 1000</code> in <code>QG.vqe</code>). Does VQE stay within chemical accuracy?</li>
<li>Export one VQE circuit to Qiskit. If you have access, run it on a simulator or real device.</li>
<li>Write up: method, results, error analysis, limitations (basis set!).</li></ol>
${W('starter', { title: 'Starter code (runs in the Code Lab)', code: CODE.h2 })}
${W('checklist', { id: 'cap1', items: ['Curve with HF, FCI and VQE plotted', 'Equilibrium bond length and energy reported', 'Dissociation energy computed and compared with experiment (4.75 eV)', 'Shot-noise experiment done', 'Explained why RHF fails at large R (static correlation)', 'Qiskit export included in the report'] })}`
  });

  L({ id: '9.2', title: 'Capstone 2: enzyme tunnelling and isotope effects', minutes: 75, tags: ['capstone', 'biology'],
    objectives: ['Design a parameter study with a quantum model', 'Relate kinetic isotope effects to tunnelling distance', 'Argue from evidence about tunnelling in a real enzyme'],
    body: R`
${brief('A short study answering: "for what donor–acceptor distances and barrier heights does tunnelling dominate the isotope effect?", with at least two figures and a comparison with the soybean lipoxygenase KIE of about 80.')}
<span class="step-label">Steps</span>
<ol><li>Explore the <a href="#/lab/tunneling">Tunnelling Lab</a>: switch H/D/T and vary the barrier.</li>
<li>Run the starter code. It sweeps the distance at a fixed barrier and tabulates both KIE estimates.</li>
<li>Repeat for 8 and 16 kcal/mol barriers. Plot all three.</li>
<li>Find parameter ranges that give KIE ≈ 80. Discuss why the "pure tunnelling" estimate is an upper bound.</li>
<li>Bonus: use the asymmetry ε to model a reaction that is not thermoneutral. How does it change the tunnelling time?</li></ol>
${W('starter', { title: 'Starter code', code: CODE.kie })}
${W('checklist', { id: 'cap2', items: ['Distance sweep for three barrier heights', 'KIE plot with classical and tunnelling estimates', 'Parameter range consistent with KIE ≈ 80 identified', 'Limitations of the 1D model discussed', 'Asymmetry (bonus) explored'] })}`
  });

  L({ id: '9.3', title: 'Capstone 3: the FMO dephasing sweep', minutes: 75, tags: ['capstone', 'biology'],
    objectives: ['Quantify environment-assisted quantum transport', 'Test how the optimum depends on the starting site and trapping rate', 'Connect the optimum to physiological temperature'],
    body: R`
${brief('A figure of transfer efficiency against dephasing rate for two starting sites and three trapping rates, the location of the optimum in each case, and a discussion of whether the optimum is close to room-temperature noise (kT ≈ 200 cm⁻¹).')}
<span class="step-label">Steps</span>
<ol><li>Explore the <a href="#/lab/fmo">Light-Harvesting Lab</a> and watch populations at low, medium and high noise.</li>
<li>Run the starter code (efficiency vs dephasing for sites 1 and 6).</li>
<li>Vary <code>kTrap</code> (0.1, 1 and 10 ps⁻¹). How does the optimum move?</li>
<li>Bonus: remove site 3's trap and put it on site 4 instead (<code>trap: 3</code>). Is the network "designed" for site 3?</li>
<li>Discuss the coherence debate (lesson 7.4) in light of your results.</li></ol>
${W('starter', { title: 'Starter code', code: CODE.fmo })}
${W('checklist', { id: 'cap3', items: ['Efficiency curves for sites 1 and 6', 'Optimum dephasing reported for three trapping rates', 'Comparison with kT at 300 K', 'Bonus trap-site experiment', 'Discussion of the coherence debate'] })}`
  });

  L({ id: '9.4', title: 'Capstone 4: a mini virtual-screening pipeline', minutes: 90, tags: ['capstone', 'drug discovery'],
    objectives: ['Chain several quantum methods into one workflow', 'Evaluate each step against a classical baseline', 'Communicate honestly about the value added by quantum methods'],
    body: R`
${brief('A pipeline diagram and a short report: activity model (with test accuracy versus a classical baseline), screened hits, Grover search over the library, docking of a reference ligand with QAOA, and an honest assessment of what each quantum step adds.')}
<span class="step-label">Steps</span>
<ol><li>Run the starter code. It trains a quantum-kernel classifier, screens a synthetic library, runs Grover over the hits, and docks a ligand with QAOA.</li>
<li>Replace the kernel model with the variational classifier (<code>QG.qml.vqc</code>) and with logistic regression. Compare test accuracies.</li>
<li>For each step, name the best classical alternative and estimate its cost.</li>
<li>Export the docking circuit to Qiskit (<code>QG.toQiskit</code>) and comment on its depth.</li>
<li>Write a one-paragraph "honest abstract" that a sceptical reviewer would accept.</li></ol>
${W('starter', { title: 'Starter code', code: CODE.screen })}
${W('checklist', { id: 'cap4', items: ['Pipeline runs end to end', 'Three activity models compared on the test set', 'Hits listed and Grover probabilities shown', 'Docking result with P(best pose) vs random', 'Classical alternative named for every step', 'Honest abstract written'] })}
<div class="callout green"><strong>Course complete</strong>Congratulations! You have gone from complex numbers to quantum algorithms, noise, variational methods, chemistry, biology and drug discovery, all simulated on your own computer. Keep exploring with the Code Lab, and take your circuits to real hardware with the Qiskit exports.</div>`
  });
})();
