/* Track 2: Many Qubits */
(function () {
  var QG = window.QG, R = String.raw, s = Math.SQRT1_2;
  function W(name, opts) { return '<div data-widget="' + name + '" data-opts=\'' + JSON.stringify(opts || {}).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/\$/g, '&#36;').replace(/</g, '&lt;') + '\'></div>'; }
  function L(o) { o.track = 't2'; QG.content.register(o); }

  L({ id: '2.1', title: 'Multi-qubit states and gates', minutes: 20, tags: ['basics'],
    objectives: ['Apply single-qubit gates inside a multi-qubit register', 'Create a uniform superposition over $2^n$ states', 'Read probabilities of multi-qubit outcomes'],
    body: R`
<span class="step-label">Idea</span>
<p>An n-qubit register is described by $2^n$ amplitudes, one for each bit string. A gate on one qubit acts on that qubit's "slot" in every term. For example, H on qubit 0 of $\ket{00}$:</p>
$$\ket{00} \xrightarrow{H_0} \tfrac{1}{\sqrt2}(\ket{00} + \ket{01}).$$
<p>Applying H to every qubit of $\ket{0\ldots0}$ produces the <b>uniform superposition</b> of all $2^n$ bit strings, each with amplitude $1/\sqrt{2^n}$. Almost every quantum algorithm starts this way.</p>
$$H^{\otimes n}\ket{0}^{\otimes n} = \frac{1}{\sqrt{2^n}}\sum_{x=0}^{2^n-1}\ket{x}$$

<span class="step-label">Try it</span>
<p>This example puts 3 qubits into a uniform superposition: 8 outcomes, each 12.5%. Remove one H and watch half of the outcomes vanish. Add a qubit with "+ Qubit".</p>
${W('composer', { preset: 'plus' })}

<span class="step-label">Challenge</span>
${W('composer', { nq: 2, fixedQubits: true, gates: ['h', 'x', 'z'], challenge: { id: 'c2.1-minusminus', text: 'Prepare $\\ket{-}\\otimes\\ket{-}$ (amplitudes +½, −½, −½, +½).', state: [[0.5, 0], [-0.5, 0], [-0.5, 0], [0.5, 0]], hint: '$\\ket{-} = HX\\ket{0}$: apply X then H on each qubit.' } })}`,
    quiz: [
      { q: 'After H on all 4 qubits of $\\ket{0000}$, what is the probability of $\\ket{1010}$?', options: ['1/4', '1/8', '1/16'], answer: 2, why: 'There are $2^4 = 16$ equally likely strings.' },
      { q: 'You apply X to qubit 0 of $\\ket{00}$. What is the result in Qiskit order?', options: ['$\\ket{01}$', '$\\ket{10}$'], answer: 0, why: 'Qubit 0 is the rightmost bit.' }
    ]
  });

  L({ id: '2.2', title: 'CNOT and Bell states', minutes: 25, tags: ['entanglement'],
    objectives: ['Describe CNOT on basis states and superpositions', 'Build all four Bell states', 'Explain the correlations of an entangled pair'],
    body: R`
<span class="step-label">Idea</span>
<p>The <span data-term="cnot">CNOT</span> (CX) gate flips the target qubit if and only if the control qubit is 1:</p>
$$\ket{00}\to\ket{00},\quad \ket{01}\to\ket{11},\quad \ket{10}\to\ket{10},\quad \ket{11}\to\ket{01}\quad(\text{control } q_0, \text{ target } q_1).$$
<p>On basis states it is just classical XOR. On a superposition it does something new. Put the control in $\ket{+}$ first:</p>
$$\text{CX}\;\tfrac{1}{\sqrt2}(\ket{00}+\ket{01}) = \tfrac{1}{\sqrt2}(\ket{00}+\ket{11}) = \ket{\Phi^+}.$$
<p>This is a <span data-term="bell state">Bell state</span>. It is <span data-term="entanglement">entangled</span>: neither qubit has a state of its own. Measure either qubit and you get a random bit, but the two results <b>always agree</b>.</p>

<span class="step-label">Try it</span>
<p>Run shots: only 00 and 11 appear. Open the Bloch tab: both arrows have shrunk to zero length. Each qubit on its own is maximally uncertain, yet together they are perfectly correlated.</p>
${W('composer', { preset: 'bell', fixedQubits: true })}

<span class="step-label">The four Bell states</span>
$$\ket{\Phi^\pm} = \tfrac{1}{\sqrt2}(\ket{00}\pm\ket{11}),\qquad \ket{\Psi^\pm} = \tfrac{1}{\sqrt2}(\ket{01}\pm\ket{10})$$
<p>Each comes from the Bell circuit by first preparing a different basis input: X on the target gives $\Psi$, and X on the control gives the minus sign.</p>
${W('composer', { nq: 2, fixedQubits: true, gates: ['h', 'x', 'z', 'cx'], challenge: { id: 'c2.2-psiminus', text: 'Build the singlet $\\ket{\\Psi^-} = \\frac{1}{\\sqrt2}(\\ket{01}-\\ket{10})$.', state: [[0, 0], [s, 0], [-s, 0], [0, 0]], hint: 'Start from $\\ket{11}$ (X on both), then H on q0 and CX from q0 to q1.' } })}
<div class="callout"><strong>No signalling</strong>Entanglement does not let you send messages. Each person alone sees perfectly random bits. The correlation only appears when the results are compared, and that needs ordinary communication.</div>`,
    quiz: [
      { q: 'What does CX (control q0, target q1) do to $\\ket{01}$?', options: ['$\\ket{01}$', '$\\ket{11}$', '$\\ket{00}$'], answer: 1, why: 'q0 = 1 (the rightmost bit), so the target q1 flips: $\\ket{01}\\to\\ket{11}$.' },
      { q: 'You measure q0 of $\\ket{\\Phi^+}$ and get 1. What is the state of q1?', options: ['$\\ket{0}$', '$\\ket{1}$', 'Still a superposition'], answer: 1, why: 'Only the $\\ket{11}$ term is compatible with q0 = 1.' },
      { q: 'Why do the Bloch vectors of a Bell pair have length 0?', options: ['A display bug', 'Each qubit alone is maximally mixed', 'The qubits are in $\\ket{0}$'], answer: 1, why: 'An entangled qubit has no pure state of its own. Its reduced state is $I/2$, the centre of the sphere.' }
    ]
  });

  L({ id: '2.3', title: 'GHZ states and spotting entanglement', minutes: 20, tags: ['entanglement'],
    objectives: ['Build an n-qubit GHZ state with a chain of CNOTs', 'Use the reduced Bloch vector to detect entanglement', 'Recognise product vs entangled states from amplitudes'],
    body: R`
<span class="step-label">Idea</span>
<p>The <b>GHZ state</b> $\frac{1}{\sqrt2}(\ket{0\ldots0}+\ket{1\ldots1})$ extends the Bell state to n qubits: all qubits agree, and all are individually random. It is built by one H and a chain of CNOTs.</p>
<p>A practical test for a <b>pure</b> multi-qubit state: compute each qubit's Bloch vector from its reduced state. If any qubit's vector is shorter than 1, that qubit is entangled with the rest.</p>

<span class="step-label">Try it</span>
${W('composer', { preset: 'ghz' })}
<p>Add a fourth qubit and extend the chain with CX(q2→q3). The histogram still shows only two outcomes, out of 16.</p>

<span class="step-label">Code it</span>
<pre><code>// GHZ on 16 qubits: 65,536 amplitudes, but only two are non-zero
const n = 16, qc = new QG.Circuit(n);
qc.h(0);
for (let i = 0; i < n - 1; i++) qc.cx(i, i + 1);
const s = QG.state(qc);
console.log('Bloch vector of qubit 7:', s.bloch(7));   // length 0: entangled
qc.measureAll();
QG.show.histogram(QG.run(qc, { shots: 1000 }));</code></pre>

<span class="step-label">Challenge</span>
${W('composer', { nq: 3, fixedQubits: true, gates: ['h', 'x', 'cx', 'z'], challenge: { id: 'c2.3-ghzminus', text: 'Prepare $\\frac{1}{\\sqrt2}(\\ket{000}-\\ket{111})$.', state: [[s, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [-s, 0]], hint: 'Build the GHZ state, then a Z on any one qubit adds a minus sign to $\\ket{111}$ only.' } })}`,
    quiz: [
      { q: 'Measure one qubit of a 5-qubit GHZ state and get 0. What do the other four give?', options: ['All 0', 'Random', 'All 1'], answer: 0, why: 'Only the $\\ket{00000}$ term survives.' },
      { q: 'Which state is entangled?', options: ['$\\frac{1}{2}(\\ket{00}+\\ket{01}+\\ket{10}+\\ket{11})$', '$\\frac{1}{\\sqrt2}(\\ket{01}+\\ket{10})$', '$\\ket{1}\\otimes\\ket{+}$'], answer: 1, why: 'The first is $\\ket{+}\\ket{+}$ and the third is a product. $\\Psi^+$ cannot be factored.' }
    ]
  });

  L({ id: '2.4', title: 'The no-cloning theorem', minutes: 15, tags: ['theory'],
    objectives: ['State the no-cloning theorem', 'Show why a CNOT "copier" fails on superpositions', 'Explain why no-cloning matters for cryptography and error correction'],
    body: R`
<span class="step-label">Idea</span>
<p>Classical bits can be copied freely. Quantum states cannot: no process maps $\ket{\psi}\ket{0}\to\ket{\psi}\ket{\psi}$ for every unknown $\ket{\psi}$. This is the <span data-term="no-cloning theorem">no-cloning theorem</span>.</p>
<p><b>Proof sketch.</b> Suppose $U$ copies $\ket{0}$ and $\ket{1}$. By linearity,</p>
$$U\big(\tfrac{1}{\sqrt2}(\ket{0}+\ket{1})\big)\ket{0} = \tfrac{1}{\sqrt2}(\ket{00}+\ket{11}),$$
<p>but a true copy would be $\ket{+}\ket{+} = \frac12(\ket{00}+\ket{01}+\ket{10}+\ket{11})$. These differ, so no such $U$ exists.</p>

<span class="step-label">Try it</span>
<p>CNOT copies basis states perfectly. Choose $\ket{+}$ or $\ket{-}$ and see it produce entanglement instead of a copy.</p>
${W('cloning')}

<span class="step-label">Why it matters</span>
<ul><li><b>Quantum key distribution</b> (BB84): an eavesdropper cannot copy the qubits in transit without disturbing them.</li>
<li><b>Error correction</b> cannot simply keep backup copies. Instead it spreads information over entangled qubits (Track 4).</li>
<li><b>Teleportation</b> (next lesson) moves a state; the original is destroyed in the process.</li></ul>`,
    quiz: [
      { q: 'Which states can a CNOT copy onto a fresh $\\ket{0}$?', options: ['Any state', 'Only $\\ket{0}$ and $\\ket{1}$', 'Only $\\ket{+}$'], answer: 1, why: 'CNOT copies basis states; superpositions become entangled instead.' },
      { q: 'The no-cloning theorem follows mainly from…', options: ['Linearity of quantum mechanics', 'The speed of light', 'Noise in hardware'], answer: 0, why: 'Linearity forces a copier of $\\ket{0}$ and $\\ket{1}$ to produce entanglement on superpositions.' }
    ]
  });

  L({ id: '2.5', title: 'Quantum teleportation', minutes: 30, tags: ['protocols'],
    objectives: ['Follow the teleportation circuit step by step', 'Explain why two classical bits are needed', 'Verify teleportation with mid-circuit measurement in code'],
    body: R`
<span class="step-label">Idea</span>
<p>Alice has a qubit in an unknown state $\ket{\psi}$. Alice and Bob share a Bell pair. Using only that pair and <b>two classical bits</b>, Alice can transfer $\ket{\psi}$ to Bob. This is <span data-term="teleportation">teleportation</span>. The state is not copied (no-cloning holds): Alice's original is destroyed by her measurement.</p>
<ol><li>Share $\ket{\Phi^+}$ between q1 (Alice) and q2 (Bob).</li>
<li>Alice applies CX(q0→q1) and H(q0), then measures q0 and q1, getting bits $m_0, m_1$.</li>
<li>She phones Bob the two bits. Bob applies $X^{m_1}$ then $Z^{m_0}$, and q2 is now $\ket{\psi}$.</li></ol>

<span class="step-label">Try it</span>
<p>This version replaces "measure and phone" with controlled gates (the <b>deferred measurement</b> principle). The state to send is $R_y(1.1)\ket{0}$. Step through it, then compare q0's Bloch sphere at step 1 with q2's at the end: they match.</p>
${W('composer', { preset: 'teleport', fixedQubits: true, tab: 'bloch' })}

<span class="step-label">Code it</span>
<p>The real protocol with mid-circuit measurements and classical control:</p>
<pre><code>const qc = new QG.Circuit(3, 3);
qc.ry(1.1, 0);                          // unknown state on q0
qc.h(1).cx(1, 2);                       // Bell pair q1-q2
qc.cx(0, 1).h(0);                       // Alice
qc.measure(0, 0).measure(1, 1);
qc.ifBit(1, 1, q => q.x(2));            // Bob's corrections
qc.ifBit(0, 1, q => q.z(2));
qc.measure(2, 2);
const r = QG.run(qc, { shots: 4000 });
let ones = 0; for (const k in r.counts) if (k[0] === '1') ones += r.counts[k];
console.log('P(1) on Bob:', ones / r.shots, 'expected', Math.sin(0.55) ** 2);</code></pre>
<p>Open this in the <a href="#/lab/code">Code Lab</a> (Examples → Teleportation). Export it to Qiskit: it uses <code>if_test</code>, the modern form of classical control.</p>
<div class="callout"><strong>Nothing faster than light</strong>Until Bob receives the two bits his qubit is completely random. Teleportation cannot send information faster than the classical message.</div>`,
    quiz: [
      { q: 'How many classical bits must Alice send?', options: ['1', '2', 'Infinitely many (to describe α and β)'], answer: 1, why: 'Two bits choose one of four corrections. Remarkably, that is enough to rebuild any state.' },
      { q: 'After teleportation, what is left of Alice\'s original qubit?', options: ['A copy of $\\ket{\\psi}$', 'A basis state from her measurement', 'An entangled state'], answer: 1, why: 'Her measurement collapses q0 and q1, as no-cloning requires.' }
    ]
  });

  L({ id: '2.6', title: 'Superdense coding', minutes: 15, tags: ['protocols'],
    objectives: ['Send two classical bits by transmitting one qubit', 'Relate superdense coding to teleportation'],
    body: R`
<span class="step-label">Idea</span>
<p><span data-term="superdense coding">Superdense coding</span> is teleportation in reverse. With a pre-shared Bell pair, Alice sends <b>two classical bits</b> by transmitting <b>one qubit</b>:</p>
<ol><li>Alice applies I, X, Z or ZX to her half of $\ket{\Phi^+}$. This turns it into one of the four Bell states.</li>
<li>She sends her qubit to Bob.</li>
<li>Bob undoes the Bell circuit (CX, then H) and measures both qubits, reading the two bits with certainty.</li></ol>
<p>The four Bell states are orthogonal, so Bob can tell them apart perfectly.</p>

<span class="step-label">Try it</span>
${W('superdense')}
<table class="amp-table" style="max-width:420px"><tr><th>Message</th><th>Alice applies</th><th>Bell state</th></tr>
<tr><td>00</td><td>I</td><td>$\ket{\Phi^+}$</td></tr><tr><td>01</td><td>X</td><td>$\ket{\Psi^+}$</td></tr>
<tr><td>10</td><td>Z</td><td>$\ket{\Phi^-}$</td></tr><tr><td>11</td><td>ZX</td><td>$\ket{\Psi^-}$ (up to phase)</td></tr></table>`,
    quiz: [
      { q: 'Without the shared Bell pair, how many classical bits can one qubit reliably carry?', options: ['1', '2', 'Unlimited'], answer: 0, why: 'Holevo\'s bound: n qubits carry at most n classical bits. The pre-shared entanglement doubles it.' },
      { q: 'Which Bell state does Alice create to send "10"?', options: ['$\\ket{\\Phi^-}$', '$\\ket{\\Psi^+}$', '$\\ket{\\Phi^+}$'], answer: 0, why: 'Z on her half flips the sign of $\\ket{11}$.' }
    ]
  });

  L({ id: '2.7', title: 'The CHSH game: entanglement beats classical', minutes: 25, tags: ['theory'],
    objectives: ['Explain the rules of the CHSH game', 'Show that classical strategies win at most 75%', 'Simulate the quantum strategy that wins about 85%'],
    body: R`
<span class="step-label">Idea</span>
<p>Alice and Bob are separated and cannot talk. A referee sends a random bit $x$ to Alice and $y$ to Bob. They reply with bits $a$ and $b$. They win if</p>
$$a \oplus b = x \cdot y,$$
<p>that is, their answers must agree unless both questions were 1, in which case they must differ.</p>
<p><b>Classically</b> the best strategy (for example, always answer 0) wins 3 of the 4 question pairs: 75%. No amount of shared randomness helps. This is a form of the <span data-term="chsh inequality">CHSH inequality</span>.</p>
<p><b>Quantum</b>: share $\ket{\Phi^+}$. Alice measures at angle 0 or $\pi/4$, Bob at $\pm\pi/8$. Their answers agree with probability $\cos^2(\Delta)$, where $\Delta$ is the angle between their bases, which is always $\pi/8$ in the right direction. They win with probability</p>
$$\cos^2\frac{\pi}{8} \approx 85.4\%.$$

<span class="step-label">Try it</span>
${W('chsh')}

<span class="step-label">Why it matters</span>
<p>Experiments that win the CHSH game more than 75% of the time, with all loopholes closed (Hensen et al. 2015 and others), show that nature cannot be explained by local hidden variables. Aspect, Clauser and Zeilinger received the 2022 Nobel Prize in Physics for this line of work. The same test underpins device-independent cryptography.</p>
<div class="callout green"><strong>Track 2 complete</strong>You can now build and reason about entangled states, the resource behind teleportation, superdense coding, and the algorithms of Track 3.</div>`,
    quiz: [
      { q: 'What is the best classical win rate in the CHSH game?', options: ['50%', '75%', '85.4%', '100%'], answer: 1, why: 'Deterministic strategies win at most 3 of the 4 cases, and shared randomness cannot beat the best deterministic one.' },
      { q: 'Can Alice use the CHSH correlations to send Bob a message?', options: ['Yes, instantly', 'No: each sees uniformly random bits'], answer: 1, why: 'Marginal outcomes are always 50/50 whatever the other party does (no-signalling).' }
    ],
    refs: ['J. F. Clauser, M. A. Horne, A. Shimony, R. A. Holt, <i>Phys. Rev. Lett.</i> 23, 880 (1969).', 'B. Hensen et al., "Loophole-free Bell inequality violation…", <i>Nature</i> 526, 682 (2015).']
  });
})();
