# QGiriBio — instructor guide

QGiriBio is a self-contained course (60 lessons, 14 simulators, 4 capstone projects) that takes
undergraduates from complex numbers to quantum algorithms, noise, variational methods, quantum chemistry,
quantum biology and drug discovery. Everything runs offline in a browser.

## Deploying in a class

| Situation | What to do |
|---|---|
| Computer lab without internet | Copy the `qgiribio/` folder to each machine (or a shared drive). Students double-click `index.html`. |
| Students' own laptops | Share the folder as a .zip, or host it on any static web server (GitHub Pages, a university web space, an LMS file area that serves HTML). |
| Check a machine works | Open `tests/test.html` (engine tests, all should pass) and `tests/smoke.html` (file-access check). |

- Browsers: current Chrome, Edge, Firefox or Safari. Phones work for reading and most widgets; labs are best on a laptop.
- Progress is stored only in the student's browser. Students can download a backup (Progress page) and submit it as evidence of completed lessons and challenges.
- Nothing is sent anywhere: no accounts, no analytics, no network requests.

## Prerequisites

First-year calculus and basic programming (any language). Track 0 covers the linear algebra and complex numbers
needed. Tracks 6–8 assume introductory chemistry and biology at first-year level; the lessons explain the rest.

## Suggested 12-week semester (3 contact hours per week)

| Week | Lessons | Lab focus | Assessment idea |
|---|---|---|---|
| 1 | 0.1–0.5 Math Launchpad | Lesson 0.1 quick start, then the Playground (CPU vs GPU vs qubits); complex-plane, matrix and tensor widgets | Problem set: complex numbers, matrix–vector products |
| 2 | 1.1–1.6 The Qubit | Bloch Sphere Explorer, Composer | Challenges 1.4–1.6 (auto-graded) |
| 3 | 2.1–2.4 Many Qubits | Composer: Bell, GHZ states | Prove no-cloning in one paragraph |
| 4 | 2.5–2.7 Protocols, CHSH | Teleportation in the Code Lab | CHSH: explain the 75% vs 85% gap |
| 5 | 3.1–3.4 Oracles, DJ, BV, Grover | Algorithm Animator | Grover success probability vs iterations (plot) |
| 6 | 3.5–3.7 QFT, phase estimation, Shor | Shor widget | Factor 21 and 35 by hand from the widget's output |
| 7 | 4.1–4.6 Noise, error correction, mitigation | Noise Lab, Qiskit Aer export | GHZ fidelity vs size on a device preset; midterm |
| 8 | 5.1–5.5 Variational algorithms | Variational Playground, QAOA Studio | Compare optimisers under shot noise |
| 9 | 6.1–6.4 Quantum chemistry I | Molecule Lab: integrals, HF, mappings | Verify the H₂ 2-qubit Hamiltonian |
| 10 | 6.5–6.7 Quantum chemistry II | Molecule Lab: VQE, energy curves | Capstone 1 starts |
| 11 | 7.1–7.7 Quantum biology | Tunnelling, Light-Harvesting, Compass labs | Capstone 2 or 3 |
| 12 | 8.1–8.6 Drug discovery | Docking, Folding, QML Activity labs | Capstone 4; presentations |

**Using the Academy instead.** The Academy (`#/academy`) packages a second, assessed 12-week programme (Python + Q#) with lecture scripts, slide decks, notebooks, Q# practicals, a question bank (CSV and Moodle GIFT), a rubric (correctness 35, maths 20, code quality 15, validation 15, interpretation 15), grade weights, three certification levels and six capstone tracks. Each Academy week links to the matching QGiriBio lessons and simulators, so the two schedules can be mixed. Use the Academy's Resources page to download the original files for Moodle and JupyterHub.

For a shorter module (6 weeks), use Tracks 1, 2, 3.4, 5.3, 6.5 and one application track.

## Learning outcomes by track

| Track | Students will be able to |
|---|---|
| 0 Math Launchpad | Manipulate complex numbers, vectors, matrices, Dirac notation and tensor products |
| 1 The Qubit | Describe qubit states on the Bloch sphere; predict the effect of any single-qubit gate; apply the Born rule |
| 2 Many Qubits | Build and recognise entangled states; explain no-cloning, teleportation, superdense coding and the CHSH game |
| 3 Algorithms | Explain phase kickback and interference in DJ, BV, Grover, QFT, phase estimation and Shor; estimate query counts |
| 4 Hardware & Noise | Use density matrices and noise channels; quantify decoherence; explain repetition codes and error mitigation |
| 5 Variational | Formulate and solve VQE and QAOA problems; compare optimisers; recognise barren plateaus; critically assess QML |
| 6 Chemistry | Carry out the integrals → Hartree–Fock → qubit-mapping → VQE pipeline; interpret potential energy curves and chemical accuracy |
| 7 Biology | Model tunnelling, exciton transport and radical-pair spin dynamics; weigh evidence for quantum effects in biology |
| 8 Drug discovery | Formulate docking and folding as optimisation problems; build and evaluate activity models; separate hype from realistic prospects |

## Grading capstones (suggested rubric, 20 points)

| Criterion | Points |
|---|---|
| Correct, reproducible results (code runs; figures match the described method) | 6 |
| Quantitative error analysis (algorithm vs model error, statistical error) | 4 |
| Comparison with a classical baseline or experiment | 3 |
| Honest discussion of limitations and scale | 4 |
| Clarity of writing and figures | 3 |

Each capstone page has a saved deliverables checklist; students can submit their Code Lab programs
(Download button) and exported Qiskit files.

## Notes on accuracy

- All engine results are checked by automated tests (`node tests/run-tests.js`, or `tests/test.html`), including the
  H₂ and HeH⁺ values of Szabo & Ostlund, the published Qiskit H₂ coefficients, Grover and QFT identities, Lindblad
  trace conservation, and FMO efficiency computed two independent ways.
- Biology and drug-discovery models are deliberately small teaching models, and every lab says so ("Toy model vs
  reality"). The compound dataset is synthetic and labelled `SYN-…`.
- Qiskit exports use the Qiskit 1.x/2.x API (`StatevectorSampler`, `StatevectorEstimator`, `SparsePauliOp`, `if_test`).

## Extending the course

- Lessons are plain JavaScript files in `content/` that call `QG.content.register({...})`; see any track file.
- Widgets are functions registered in `QG.widgets` and placed with `data-widget="name"` in lesson HTML.
- New engine code goes in `js/core/` using `QG.module(...)`, listed in `js/core/manifest.txt` and `index.html`; add tests in `tests/`.
