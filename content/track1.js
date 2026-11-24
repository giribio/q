/* Track 1: The Qubit */
(function () {
  var QG = window.QG, R = String.raw, s = Math.SQRT1_2;
  function W(name, opts) { return '<div data-widget="' + name + '" data-opts=\'' + JSON.stringify(opts || {}).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/\$/g, '&#36;').replace(/</g, '&lt;') + '\'></div>'; }
  function L(o) { o.track = 't1'; QG.content.register(o); }

  L({ id: '1.1', title: 'From bits to qubits', minutes: 15, tags: ['basics'],
    objectives: ['Contrast a bit, a random bit and a qubit', 'Write the general single-qubit state', 'Name some physical systems used as qubits'],
    body: R`
<span class="step-label">Idea</span>
<p>Three kinds of "bit" help explain what is new:</p>
<table class="amp-table">
<tr><th></th><th>Described by</th><th>Example</th></tr>
<tr><td>Bit</td><td>0 or 1</td><td>a light switch</td></tr>
<tr><td>Random bit</td><td>probabilities $p_0, p_1 \geq 0$, $p_0+p_1 = 1$</td><td>a coin being flipped</td></tr>
<tr><td><b>Qubit</b></td><td>amplitudes $\alpha, \beta \in \mathbb{C}$, $|\alpha|^2+|\beta|^2=1$</td><td>an electron spin, a photon's polarisation</td></tr>
</table>
<p>The general qubit state is</p>
$$\ket{\psi} = \alpha\ket{0} + \beta\ket{1}.$$
<p>Measuring gives 0 with probability $|\alpha|^2$ and 1 with probability $|\beta|^2$, just like a random bit. The difference is that amplitudes can be <b>negative or complex</b>, so they can cancel. Probabilities never cancel.</p>

<span class="step-label">Visual</span>
<p>Physical qubits being built today include superconducting circuits (IBM, Google), trapped ions (Quantinuum, IonQ), neutral atoms, photons and electron spins in silicon. They all share the same maths, which is what you learn here.</p>

<span class="step-label">Try it</span>
<p>Your first circuit: a single qubit starts in $\ket{0}$. Place an <b>X</b> gate on the wire (click X, then click the wire) and watch the probability move to $\ket{1}$. Then replace it with <b>H</b> and see a 50/50 split.</p>
${W('composer', { nq: 1, fixedQubits: true, gates: ['x', 'h', 'measure'], tabs: [['probs', 'Probabilities'], ['shots', 'Run shots'], ['bloch', 'Bloch sphere']] })}
<p>Now run shots with H in place. Each shot is a fresh coin flip. With 10 shots you rarely get exactly 5/5. With 8192 the result is close to 50%.</p>`,
    quiz: [
      { q: 'What can a qubit\'s amplitudes be that a coin\'s probabilities cannot?', options: ['Larger than 1', 'Negative or complex', 'Zero'], answer: 1, why: 'Amplitudes are complex numbers. That allows cancellation (interference), which probabilities never do.' },
      { q: 'A qubit is $\\frac{1}{\\sqrt2}\\ket{0} - \\frac{1}{\\sqrt2}\\ket{1}$. What is P(0)?', options: ['$-\\frac12$', '$\\frac12$', '$0$'], answer: 1, why: '$|1/\\sqrt2|^2 = 1/2$. The minus sign does not change the probability.' }
    ]
  });

  L({ id: '1.2', title: 'Superposition and measurement', minutes: 20, tags: ['basics'],
    objectives: ['Explain what measurement does to a superposition', 'Estimate probabilities from shots and judge the statistical error', 'Distinguish $\\ket{+}$ from a 50/50 coin'],
    body: R`
<span class="step-label">Idea</span>
<p><span data-term="measurement">Measurement</span> is the only way to get information out of a qubit, and it is destructive. After measuring $\alpha\ket{0}+\beta\ket{1}$ and getting 1, the qubit <b>is</b> $\ket{1}$. Measuring again gives 1 every time.</p>
<p>One shot gives one bit. To learn the probabilities you repeat the experiment many times (many <span data-term="shot">shots</span>). With $N$ shots the estimate of a probability $p$ has a typical error of about</p>
$$\sigma \approx \sqrt{\frac{p(1-p)}{N}},$$
<p>so 100 shots of a 50/50 state give about ±5%, and 10,000 shots about ±0.5%.</p>

<span class="step-label">Try it</span>
${W('measure-sim', { theta: 1.5707963268 })}
<p>Set θ to 90° to prepare $\ket{+} = \frac{1}{\sqrt2}(\ket{0}+\ket{1})$. Press "Measure ×1" several times and notice that each result is random.</p>

<span class="step-label">Superposition is not just ignorance</span>
<p>Measured in the 0/1 basis, $\ket{+}$ and a fair coin look identical. The difference shows up when you apply a gate <b>before</b> measuring. H turns $\ket{+}$ back into $\ket{0}$ with certainty. No operation on a coin can make it land heads every time. Try it: one H gives randomness, two H gates give certainty again.</p>
${W('composer', { preset: 'interference', fixedQubits: true, gates: ['h', 'x', 'z', 'measure'] })}
<div class="callout"><strong>Key point</strong>A superposition is a definite quantum state with definite amplitudes. It is uncertain only about the outcome of a measurement in a particular basis.</div>`,
    quiz: [
      { q: 'You measure a qubit and get 1. You measure it again immediately. What do you get?', options: ['0 or 1 at random', 'Always 1', 'Always 0'], answer: 1, why: 'The first measurement collapsed the state to $\\ket{1}$.' },
      { q: 'How many shots do you need to estimate a 50% probability to about ±1%?', options: ['100', '2,500', '1,000,000'], answer: 1, why: '$\\sqrt{0.25/N} = 0.01$ gives $N = 2500$.' },
      { q: 'What is $H\\ket{+}$?', options: ['$\\ket{0}$', '$\\ket{1}$', '$\\ket{+}$', 'A random bit'], answer: 0, why: 'H is its own inverse and $H\\ket{0}=\\ket{+}$, so $H\\ket{+} = \\ket{0}$.' }
    ]
  });

  L({ id: '1.3', title: 'The Bloch sphere', minutes: 25, tags: ['visual'],
    objectives: ['Locate $\\ket{0}, \\ket{1}, \\ket{\\pm}, \\ket{\\pm i}$ on the Bloch sphere', 'Convert between amplitudes and the angles θ, φ', 'Explain why global phase does not appear on the sphere'],
    body: R`
<span class="step-label">Idea</span>
<p>Any single-qubit state can be written, up to an unobservable global phase, as</p>
$$\ket{\psi} = \cos\frac{\theta}{2}\ket{0} + e^{i\varphi}\sin\frac{\theta}{2}\ket{1}.$$
<p>The two angles $\theta \in [0,\pi]$ and $\varphi \in [0, 2\pi)$ pick a point on a sphere: the <span data-term="bloch sphere">Bloch sphere</span>. $\theta$ is the latitude measured from the north pole, $\varphi$ the longitude.</p>
<ul><li>North pole: $\ket{0}$. South pole: $\ket{1}$.</li>
<li>On the equator: $\ket{+}$ (+x), $\ket{-}$ (−x), $\ket{i}$ (+y), $\ket{-i}$ (−y).</li>
<li>Opposite points are orthogonal states: they can be told apart perfectly.</li></ul>

<span class="step-label">Try it</span>
<p>Move the sliders or press gates. Drag the sphere to rotate your view. Watch P(0) depend only on the height: $P(0) = \cos^2\frac{\theta}{2} = \frac{1+z}{2}$.</p>
${W('bloch', { sliders: true, size: 280 })}

<span class="step-label">Why θ/2?</span>
<p>$\ket{0}$ and $\ket{1}$ are orthogonal (an "angle" of 90° in the vector space), yet they sit 180° apart on the sphere. The half-angle doubles state-space angles into sphere angles. This is also why a full 360° rotation of a spin gives a minus sign: $R(2\pi) = -I$.</p>
<div class="callout"><strong>Global phase</strong>$\ket{\psi}$ and $e^{i\gamma}\ket{\psi}$ give identical probabilities for every measurement, so they are the same physical state and the same point on the sphere. Only <b>relative</b> phase ($\varphi$) is physical.</div>`,
    quiz: [
      { q: 'Where is $\\ket{-} = \\frac{1}{\\sqrt2}(\\ket{0}-\\ket{1})$ on the Bloch sphere?', options: ['North pole', 'Equator, along −x', 'Equator, along +y', 'South pole'], answer: 1, why: '$\\theta = 90°$ and $\\varphi = 180°$: on the equator pointing along −x.' },
      { q: 'A state has Bloch vector $z = 0.6$. What is P(0)?', options: ['0.6', '0.8', '0.36'], answer: 1, why: '$P(0) = (1+z)/2 = 0.8$.' },
      { q: 'Are $\\ket{1}$ and $-\\ket{1}$ different points on the sphere?', options: ['Yes', 'No: they differ only by a global phase'], answer: 1, why: 'A global phase of $-1 = e^{i\\pi}$ is unobservable.' }
    ]
  });

  L({ id: '1.4', title: 'Pauli gates and the Hadamard', minutes: 25, tags: ['gates'],
    objectives: ['Describe X, Y, Z and H as rotations of the Bloch sphere', 'Predict the output of short gate sequences', 'Use H to measure in the X basis'],
    body: R`
<span class="step-label">Idea</span>
<p>On the Bloch sphere every single-qubit gate is a <b>rotation</b>.</p>
<table class="amp-table">
<tr><th>Gate</th><th>Matrix</th><th>Rotation</th><th>Effect</th></tr>
<tr><td>X</td><td>$\begin{pmatrix}0&1\\1&0\end{pmatrix}$</td><td>180° about x</td><td>bit flip $\ket{0}\leftrightarrow\ket{1}$</td></tr>
<tr><td>Y</td><td>$\begin{pmatrix}0&-i\\i&0\end{pmatrix}$</td><td>180° about y</td><td>bit and phase flip</td></tr>
<tr><td>Z</td><td>$\begin{pmatrix}1&0\\0&-1\end{pmatrix}$</td><td>180° about z</td><td>phase flip $\ket{+}\leftrightarrow\ket{-}$</td></tr>
<tr><td>H</td><td>$\frac{1}{\sqrt2}\begin{pmatrix}1&1\\1&-1\end{pmatrix}$</td><td>180° about the x+z diagonal</td><td>$\ket{0}\leftrightarrow\ket{+}$, $\ket{1}\leftrightarrow\ket{-}$</td></tr>
</table>
<p>H swaps the z axis and the x axis. That makes it the bridge between the <b>computational basis</b> and the <b>X basis</b>: H, then measure, is a measurement in the $\{\ket{+},\ket{-}\}$ <span data-term="basis">basis</span>.</p>

<span class="step-label">Try it</span>
<p>Use the gate buttons. Check these identities on the sphere: $HZH = X$ and $HXH = Z$.</p>
${W('bloch', { gates: ['x', 'y', 'z', 'h'], rotations: false, size: 260, target: { bloch: [-1, 0, 0], text: 'Reach $\\ket{-}$ starting from $\\ket{0}$. Use as few gates as you can (two are enough).', id: 'c1.4-minus' } })}

<span class="step-label">Challenge</span>
<p>Build the state $\ket{1}$ using only H and Z gates (X is not allowed).</p>
${W('composer', { nq: 1, fixedQubits: true, gates: ['h', 'z'], challenge: { id: 'c1.4-hzh', text: 'Prepare $\\ket{1}$ with only H and Z.', state: [[0, 0], [1, 0]], hint: 'Z is a bit flip in the X basis. Sandwich it between two H gates.' } })}

<span class="step-label">Code it</span>
<pre><code>// Verify HZH = X by comparing states for a random input
const a = new QG.Circuit(1); a.ry(0.7, 0).h(0).z(0).h(0);
const b = new QG.Circuit(1); b.ry(0.7, 0).x(0);
console.log('fidelity', QG.state(a).fidelity(QG.state(b)));   // 1</code></pre>`,
    quiz: [
      { q: 'What does Z do to $\\ket{0}$?', options: ['Nothing', 'Turns it into $\\ket{1}$', 'Turns it into $\\ket{-}$'], answer: 0, why: '$Z\\ket{0} = \\ket{0}$. $\\ket{0}$ lies on the z axis, so a rotation about z leaves it in place.' },
      { q: 'Which sequence equals X?', options: ['$HZH$', '$ZHZ$', '$HH$'], answer: 0, why: 'H swaps x and z, so conjugating Z by H gives X.' },
      { q: 'How do you measure a qubit in the X basis on hardware that only measures 0/1?', options: ['Apply H, then measure', 'Apply X, then measure', 'Measure twice'], answer: 0, why: 'H maps $\\ket{+}\\to\\ket{0}$ and $\\ket{-}\\to\\ket{1}$.' }
    ]
  });

  L({ id: '1.5', title: 'Phase gates and interference', minutes: 25, tags: ['gates'],
    objectives: ['Use S, T and P(λ) to change relative phase', 'Explain why phase is invisible to a Z measurement but matters after H', 'Predict P(0) for H·P(φ)·H'],
    body: R`
<span class="step-label">Idea</span>
<p>Phase gates leave $\ket{0}$ alone and multiply $\ket{1}$ by a phase:</p>
$$P(\lambda) = \begin{pmatrix}1&0\\0&e^{i\lambda}\end{pmatrix},\quad S = P(\tfrac{\pi}{2}),\quad T = P(\tfrac{\pi}{4}),\quad Z = P(\pi).$$
<p>On the Bloch sphere $P(\lambda)$ rotates about the z axis by $\lambda$. Probabilities of 0 and 1 never change, so a measurement straight after a phase gate cannot see it. Yet the phase decides what happens after the next H.</p>

<span class="step-label">Visual: interference</span>
<p>The circuit H → P(φ) → H sends the qubit along two "paths" ($\ket{0}$ and $\ket{1}$) and then recombines them. The amplitude to end in $\ket{0}$ is</p>
$$\tfrac12\left(1 + e^{i\varphi}\right) \quad\Rightarrow\quad P(0) = \cos^2\frac{\varphi}{2}.$$
${W('interference')}
<p>This is a Mach–Zehnder interferometer in one qubit, and the core of phase estimation, Grover search and quantum chemistry algorithms.</p>

<span class="step-label">Try it</span>
<p>Starting from $\ket{+}$, press T repeatedly. The arrow turns 45° each time around the equator and returns after 8 presses, because $T^8 = I$.</p>
${W('bloch', { gates: ['h', 's', 'sdg', 't', 'tdg', 'z'], rotations: false, size: 260, target: { bloch: [0, 1, 0], text: 'Reach $\\ket{i}$ (the +y point) from $\\ket{0}$.', id: 'c1.5-i' } })}

<span class="step-label">Challenge</span>
${W('composer', { nq: 1, fixedQubits: true, gates: ['h', 't', 's', 'z'], challenge: { id: 'c1.5-t4', text: 'Using only H and T gates, prepare $\\ket{1}$. (Hint: how many T gates make a Z?)', state: [[0, 0], [1, 0]], hint: '$T^4 = Z$, and $HZH = X$.' } })}`,
    quiz: [
      { q: 'What is $S^2$?', options: ['$T$', '$Z$', '$I$', '$X$'], answer: 1, why: '$S = P(\\pi/2)$, so $S^2 = P(\\pi) = Z$.' },
      { q: 'You apply T to $\\ket{0}$ and measure. What is P(1)?', options: ['0', '1/2', '$\\sin^2(\\pi/8)$'], answer: 0, why: 'Phase gates do nothing to $\\ket{0}$. The qubit stays $\\ket{0}$.' },
      { q: 'For H · P(φ) · H acting on $\\ket{0}$, which φ gives P(1) = 1?', options: ['0', '$\\pi/2$', '$\\pi$'], answer: 2, why: '$P(0) = \\cos^2(\\varphi/2)$ is 0 at $\\varphi = \\pi$. In fact $HZH = X$.' }
    ]
  });

  L({ id: '1.6', title: 'Rotations and any single-qubit gate', minutes: 25, tags: ['gates'],
    objectives: ['Use Rx, Ry, Rz with arbitrary angles', 'Prepare any target state with Ry and Rz', 'Know that U(θ,φ,λ) covers every single-qubit gate'],
    body: R`
<span class="step-label">Idea</span>
<p>Rotation gates turn the Bloch vector by any angle θ about an axis:</p>
$$R_x(\theta) = e^{-i\theta X/2},\quad R_y(\theta) = e^{-i\theta Y/2} = \begin{pmatrix}\cos\frac\theta2 & -\sin\frac\theta2\\ \sin\frac\theta2 & \cos\frac\theta2\end{pmatrix},\quad R_z(\theta) = e^{-i\theta Z/2}.$$
<p>Any single-qubit gate can be written as three rotations, and Qiskit's general gate is</p>
$$U(\theta,\varphi,\lambda) = R_z(\varphi)\,R_y(\theta)\,R_z(\lambda) \quad\text{(up to global phase)}.$$
<p>To prepare $\cos\frac{\theta}{2}\ket{0} + e^{i\varphi}\sin\frac{\theta}{2}\ket{1}$ from $\ket{0}$: apply $R_y(\theta)$, then $R_z(\varphi)$ (or $P(\varphi)$).</p>

<span class="step-label">Try it</span>
${W('bloch', { gates: ['h', 'x'], size: 280, sliders: false, target: { bloch: [0.5, 0.5, 0.7071067812], text: 'Reach θ = 45°, φ = 45° (Bloch vector (0.5, 0.5, 0.71)) using Ry and Rz with the angle slider.', id: 'c1.6-target' } })}

<span class="step-label">Challenge</span>
<p>Prepare a state with P(1) = 25% exactly. Place an Ry gate, then click it to set its angle (expressions like <code>pi/3</code> work).</p>
${W('composer', { nq: 1, fixedQubits: true, gates: ['ry', 'rz', 'rx', 'h'], challenge: { id: 'c1.6-quarter', text: 'Make P(0) = 0.75 and P(1) = 0.25.', probs: { '0': 0.75, '1': 0.25 }, hint: '$\\sin^2(\\theta/2) = 1/4$ gives $\\theta/2 = \\pi/6$.' } })}

<span class="step-label">Code it</span>
<pre><code>// Sweep Ry(θ) and plot the probability of 1: a sin² curve
const xs = [], ys = [];
for (let k = 0; k <= 40; k++) {
  const t = k * Math.PI / 20, qc = new QG.Circuit(1);
  qc.ry(t, 0);
  xs.push(t); ys.push(QG.state(qc).probabilities()[1]);
}
QG.show.plot([{ name: 'P(1)', x: xs, y: ys }], { xLabel: 'θ', yLabel: 'P(1)' });</code></pre>
<div class="callout green"><strong>Track 1 complete</strong>You now know everything about a single qubit: states, measurement, the Bloch sphere and every gate. Next: what happens when qubits interact.</div>`,
    quiz: [
      { q: 'Which gate equals $R_y(\\pi)$ up to a global phase?', options: ['X', 'Y', 'H'], answer: 1, why: 'A 180° rotation about y is the Pauli Y gate (times $-i$).' },
      { q: 'To prepare $\\cos(\\pi/8)\\ket{0} + \\sin(\\pi/8)\\ket{1}$, apply…', options: ['$R_y(\\pi/8)$', '$R_y(\\pi/4)$', '$R_x(\\pi/4)$'], answer: 1, why: '$R_y(\\theta)\\ket{0} = \\cos\\frac\\theta2\\ket{0} + \\sin\\frac\\theta2\\ket{1}$, so $\\theta = \\pi/4$.' },
      { q: 'How many real parameters does a general single-qubit gate need (ignoring global phase)?', options: ['1', '2', '3'], answer: 2, why: 'Three: for example U(θ, φ, λ).' }
    ]
  });
})();
