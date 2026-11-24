# QGiriBio - quantum computing from qubits to biology

A free, standalone course and simulator for undergraduate beginners. Everything runs in the
visitor's browser on their own CPU, with no server, no internet, no install and no account.

## Open it

- **Offline:** double-click `index.html` (or copy the whole folder to a USB stick first).
- **Hosted:** upload the folder to any static host (GitHub Pages, a university web space…).

Diagnostics: `tests/test.html` runs the engine tests in your browser. `tests/smoke.html` checks
that scripts, storage and background workers are allowed when the page is opened as a file.
Teachers: see [INSTRUCTOR.md](INSTRUCTOR.md) for a 12-week plan, learning outcomes and a capstone rubric.

## What's inside

**60 lessons in 10 tracks**, each with quizzes and/or auto-graded challenges:

| Track | Lessons | Topics |
|---|---|---|
| 0 Math Launchpad | 5 | complex numbers, vectors and matrices, Dirac notation, tensor products |
| 1 The Qubit | 6 | superposition, measurement, Bloch sphere, Pauli/phase/rotation gates |
| 2 Many Qubits | 7 | CNOT, Bell and GHZ states, no-cloning, teleportation, superdense coding, CHSH |
| 3 Quantum Algorithms | 7 | oracles, Deutsch–Jozsa, Bernstein–Vazirani, Grover, QFT, phase estimation, Shor |
| 4 Real Hardware & Noise | 6 | T1/T2, density matrices, noise channels, gate fidelity, repetition codes, error mitigation |
| 5 Variational Algorithms | 5 | ansätze, optimisers, parameter shift, barren plateaus, VQE, QAOA, quantum ML |
| 6 Quantum Chemistry | 7 | basis sets, Hartree–Fock, Jordan–Wigner/parity mappings, VQE for H₂, energy curves |
| 7 Quantum Biology | 7 | enzyme tunnelling, kinetic isotope effects, FMO photosynthesis, noise-assisted transport, bird compass, DNA |
| 8 Drug Discovery | 6 | pipeline, binding energies, docking as max-clique, lattice folding, QSAR with QML, reality check |
| 9 Capstones | 4 | H₂ dissociation, enzyme KIE study, FMO dephasing sweep, mini virtual-screening pipeline |

**Playground page** (`#/playground`, next to Learn): four problems (random bits, unsorted search, entanglement/CHSH, factoring) run on a classical CPU, an ideal parallel-GPU model and qubits, with costs in one stated unit, growth charts and honest explanations.

**Academy** (`#/academy`, after Playground): the 12-week Quantum Computing Academy programme (Python + Q#), with eight sections: Overview, Curriculum (a page per week with outcomes, a live widget, QGiriBio lessons and simulators, references), Lecture Studio (lecture notes and 71 slides in a keyboard/full-screen presenter), Coding Labs (12 Jupyter notebooks and 12 Q# practicals, each with a runnable QGiriBio equivalent), Assessment (grade weights, rubric, certification progress, 20-question quiz, GIFT flashcards, the pytest checks re-run live), Research Projects (6 capstone tracks), Faculty & Delivery, and Resources (a searchable library of all 58 package files with viewers and downloads, the original .zip, docs, textbooks, blogs and every reference). The package lives in `academy/package/`; after editing it, run `node tools/build-academy.js` to regenerate `academy/academy-files.js` (a page opened from disk cannot read neighbouring files, so they are embedded).

**14 simulators:** Circuit Composer, Bloch Sphere Explorer, Code Lab, Algorithm Animator, Noise Lab,
Variational Playground, QAOA Studio, Molecule Lab, Tunnelling Lab, Light-Harvesting Lab,
Radical-Pair Compass, Docking Lab, Protein Folding Lab, QML Activity Classifier.

**Engine (all in-browser JavaScript, tested):**
- State-vector simulator (Qiskit bit order, 30 gates, mid-circuit measurement, classical control), OpenQASM 2.0 import/export, Qiskit 1.x/2.x and Q# (Microsoft QDK) export.
- Density matrices (≤10 qubits) with Qiskit-compatible noise channels, readout mitigation, zero-noise extrapolation.
- Algorithm builders (DJ, BV, Grover, QFT, QPE, order finding, repetition codes).
- Pauli Hamiltonians, exact diagonalisation, Nelder–Mead/SPSA/Adam, parameter shift, VQE, QAOA, quantum kernels and classifiers.
- STO-3G integrals, restricted Hartree–Fock, fermion-to-qubit mappings (H₂, HeH⁺), validated against Szabo & Ostlund and published Qiskit coefficients.
- Quantum biology: 1D Schrödinger solver (pivoted tridiagonal eigensolver + split-operator FFT), FMO Lindblad transport, radical-pair spin dynamics.
- Playground runners (`js/core/playground.js`): CPU, modelled GPU and real quantum runs (Grover, Bell/CHSH, Shor order finding) for the Playground page.
- Drug discovery toys: max-clique docking QUBO, HP lattice folding, QAOA on diagonal costs, Grover screening, synthetic QSAR data.

## Layout

```
index.html          app shell (classic <script> tags only, so it works from file://)
css/app.css         Google-style theme: blue/green/yellow, light + dark
js/core/            simulation engine, no DOM; also loaded into the worker and by Node tests
js/ui/              DOM helpers, maths renderer, charts, Bloch sphere, circuit view, router/pages
js/labs/            simulators and lesson widgets
content/            course structure, glossary, lessons (one file per track), academy.js (Academy programme data)
academy/            course package (package/), original .zip, generated academy-files.js
tools/              build-academy.js (embeds the package for file:// use)
tests/              tests.js + tests-p3..p9.js (shared), run-tests.js (Node), test.html (browser), smoke.html
INSTRUCTOR.md       teaching guide
```

## Develop

```
node tests/run-tests.js
```

Rules that keep it standalone:
- No ES modules, `fetch()` or CDNs. Add new files as classic `<script>` tags in `index.html`.
- Core engine modules use `QG.module(name, fn)`, and `fn` may only use `QG` and built-ins,
  because its source is copied into the background worker. List new core files in `js/core/manifest.txt`.
- Lessons register themselves with `QG.content.register({...})`. Use `$…$` and `$$…$$` for maths,
  and `data-widget="name"` placeholders for interactive widgets.

## Honesty policy

Every chemistry, biology and drug-discovery lab is a deliberately small teaching model and says so.
The compound data are synthetic (`SYN-…` IDs). Lessons distinguish what is established, what is debated,
and where quantum advantage does not (yet) exist.
