/* Track 0: Math Launchpad */
(function () {
  var QG = window.QG, R = String.raw;
  function W(name, opts) { return '<div data-widget="' + name + '" data-opts=\'' + JSON.stringify(opts || {}).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/\$/g, '&#36;').replace(/</g, '&lt;') + '\'></div>'; }
  function L(o) { o.track = 't0'; QG.content.register(o); }

  L({ id: '0.1', title: 'Start here: quantum computing for everyone', minutes: 30, tags: ['orientation', 'start here'],
    objectives: ['Use the Bloch sphere (the "arrow on a ball") to see what a qubit is doing', 'Build, run and read a circuit in the Circuit Composer', 'Explain in one sentence what a quantum computer does differently'],
    body: R`
<div class="callout green"><strong>New here? Start with this page.</strong>No maths needed for the first part. In about 15 minutes you will learn the four things you need for every simulator on this site: <b>qubits</b>, the <b>arrow-on-a-ball picture</b>, <b>gates</b> and <b>circuits</b>.</div>

<span class="step-label">1 · A coin that can spin</span>
<p>A normal computer stores everything as <b>bits</b>. A bit is like a coin lying on a table: it shows <b>0</b> (heads) or <b>1</b> (tails). Nothing in between.</p>
<p>A quantum computer uses <b>qubits</b>. A qubit is like a coin that is <b>spinning</b>. While it spins it is not yet heads or tails: it is a bit of both. This is called <span data-term="superposition">superposition</span>.</p>
<p>When you <b>look</b> at the coin (we say <b>measure</b>), it stops and shows 0 or 1. Which one? It is random, but some spins make 0 more likely and some make 1 more likely.</p>
<table class="amp-table" style="max-width:560px">
<tr><th></th><th>Normal bit</th><th>Qubit</th></tr>
<tr><td>Like…</td><td>a coin lying still</td><td>a spinning coin</td></tr>
<tr><td>Can be</td><td>0 or 1</td><td>0, 1, or a mix of both</td></tr>
<tr><td>When you look</td><td>you see what it is</td><td>it "chooses" 0 or 1, and stays that way</td></tr>
</table>

<span class="step-label">2 · The arrow on a ball (the Bloch sphere)</span>
<p>Scientists draw a qubit as an <b>arrow inside a ball</b>, like a globe. This picture is called the <span data-term="bloch sphere">Bloch sphere</span>.</p>
<ul>
<li>Arrow pointing to the <b>top</b> (north pole) = the qubit is surely <b>0</b>. We write this <b>|0⟩</b> and say "ket zero".</li>
<li>Arrow pointing to the <b>bottom</b> (south pole) = surely <b>1</b>, written <b>|1⟩</b>.</li>
<li>Arrow on the <b>middle line</b> (the equator) = a perfect 50/50 spinning coin.</li>
<li>The <b>higher</b> the arrow, the more likely you get 0. The <b>lower</b>, the more likely 1.</li>
</ul>
<p><b>Try it:</b> every qubit starts at the top (0). Press the buttons and watch the arrow move. You can also drag the ball to turn it around.</p>
${W('bloch', { gates: ['x', 'h', 'z'], rotations: false, size: 250 })}
<ol>
<li>Press <b>X</b>: the arrow flips to the bottom. The qubit is now 1. Press X again to flip it back.</li>
<li>Press <b>H</b>: the arrow lies down on the equator. Now it is a 50/50 spinning coin (see "P(measure 0)" = 0.5).</li>
<li>Now press <b>Z</b>: the arrow swings around the equator to the other side. The chances are <i>still</i> 50/50, but the qubit is different. Press <b>H</b> again and it lands on <b>1</b> instead of 0! This hidden "direction" is what makes quantum computers special.</li>
<li>Press "Reset to |0⟩" to start again.</li>
</ol>

<span class="step-label">3 · Gates are buttons that turn the arrow</span>
<p>A <span data-term="gate">gate</span> is an action you do to a qubit. Every gate turns the arrow in a fixed way. Here are the ones you will use most:</p>
<table class="amp-table">
<tr><th>Gate</th><th>Nickname</th><th>What it does to the arrow</th><th>Coin picture</th></tr>
<tr><td><b>X</b></td><td>flip</td><td>top ↔ bottom</td><td>turn the coin over</td></tr>
<tr><td><b>H</b></td><td>spin it</td><td>top → equator (50/50), and back again</td><td>start (or stop) the spin</td></tr>
<tr><td><b>Z</b></td><td>half twist</td><td>turns the arrow halfway around the equator; top and bottom stay put</td><td>changes the spin's hidden direction</td></tr>
<tr><td><b>S</b>, <b>T</b></td><td>small twists</td><td>smaller turns around the equator (a quarter and an eighth)</td><td>tiny pushes</td></tr>
<tr><td><b>Rx, Ry, Rz</b></td><td>dials</td><td>turn by any amount you choose</td><td>fine control</td></tr>
<tr><td><b>M</b></td><td>look</td><td>measures: you get 0 or 1</td><td>stop the coin and read it</td></tr>
<tr><td><b>CX</b></td><td>if-then</td><td>flips a second qubit <i>only if</i> the first one is 1</td><td>two coins working together</td></tr>
</table>

<span class="step-label">4 · A circuit is like a music sheet</span>
<p>When you use several gates, you write them on a <b>circuit</b>. It looks like a music sheet:</p>
<ul>
<li>Each <b>line</b> is one qubit (q0, q1, …). Every qubit starts as 0.</li>
<li>Gates are boxes on the lines. You read them <b>from left to right</b>, like notes in a song.</li>
<li>At the end, you <b>measure</b> to see the answer.</li>
</ul>
<p><b>How to build a circuit in the Composer below:</b></p>
<ol>
<li><b>Pick</b> a gate: click a coloured button, for example <b>H</b>. It gets a dark outline.</li>
<li><b>Place</b> it: click on the line of the qubit. The box appears.</li>
<li><b>Look</b> at the bars on the "Probabilities" tab: they show the chance of each answer.</li>
<li><b>Change your mind?</b> Click a placed gate to move or delete it, or use <b>Undo</b> and <b>Clear</b>. Press <b>Esc</b> to put the gate button down.</li>
<li><b>Watch it like a movie:</b> drag the <b>Step</b> slider or press <b>▶ Play</b> to see the circuit step by step.</li>
<li><b>Try it for real:</b> the <b>Run shots</b> tab "plays" the circuit many times, like flipping the coin 100 or 1000 times, and counts the answers. The counts wobble a little each time, just like real coin flips.</li>
</ol>
${W('composer', { nq: 1, fixedQubits: true, gates: ['x', 'h', 'z', 'measure'], tabs: [['probs', 'Probabilities'], ['shots', 'Run shots'], ['bloch', 'Bloch sphere']], challenge: { id: 'c0.1-one', text: 'Mini challenge: make the qubit <b>always</b> give 1.', state: [[0, 0], [1, 0]], hint: 'One flip is enough: use X.' } })}
<p>Now try <b>H</b> on its own, then run 1000 shots: about half 0s and half 1s. Then try <b>H, H</b>: the second H "un-spins" the coin and you always get 0 again. A normal coin can't do that!</p>

<span class="step-label">5 · Two qubits: magic twins</span>
<p>With two qubits there are four possible answers: <code>00</code>, <code>01</code>, <code>10</code>, <code>11</code>.</p>
<div class="callout"><strong>Reading the answers</strong>Read from <b>right to left</b>: the rightmost digit is q0, the next is q1. So <code>01</code> means "q0 is 1 and q1 is 0". (This is the same rule real quantum computers from IBM use.)</div>
<p>Use the "if-then" gate <b>CX</b>: click CX, then click line q0 (the <i>control</i>, a dot), then click line q1 (the <i>target</i>, a ⊕). Put an <b>H</b> on q0 first. Now the two qubits always give the <b>same</b> answer, 00 or 11, never 01 or 10, like twins. This is called <span data-term="entanglement">entanglement</span>.</p>
${W('composer', { nq: 2, fixedQubits: true, gates: ['h', 'x', 'cx', 'measure'], tabs: [['probs', 'Probabilities'], ['shots', 'Run shots']], challenge: { id: 'c0.1-twins', text: 'Make the twins: only 00 and 11, each half the time.', probs: { '00': 0.5, '11': 0.5 }, hint: 'H on q0, then CX with q0 as control and q1 as target.' } })}

<span class="step-label">6 · Your first five experiments</span>
<table class="amp-table">
<tr><th>Try this</th><th>You should see</th></tr>
<tr><td>Nothing at all, then measure</td><td>always 0 (every qubit starts at 0)</td></tr>
<tr><td>X</td><td>always 1</td></tr>
<tr><td>H</td><td>0 or 1, half and half</td></tr>
<tr><td>H then H</td><td>always 0 again (the spins cancel out)</td></tr>
<tr><td>H on q0, then CX from q0 to q1</td><td>00 or 11 only: the twins</td></tr>
</table>
<p>That's it! With these ideas you can use every simulator on this site. The rest of this course explains the <i>why</i> step by step, with a little more maths each time.</p>

<span class="step-label">For the curious: why it matters</span>
<p>A classical computer stores information in <b>bits</b>, each 0 or 1. A quantum computer uses <span data-term="qubit">qubits</span>. A qubit can be in a <span data-term="superposition">superposition</span>: a combination of 0 and 1 weighted by complex numbers called <span data-term="amplitude">amplitudes</span>.</p>
<p>The power does not come from "trying every answer at once". Measurement returns only one answer. The power comes from <span data-term="interference">interference</span>: a quantum algorithm arranges the amplitudes so that wrong answers cancel and right answers reinforce, like waves on water.</p>
<div class="callout"><strong>The one-sentence version</strong>A quantum computer manipulates a list of $2^n$ complex amplitudes with physical operations, then samples from the result.</div>

<span class="step-label">Visual</span>
<p>For $n$ qubits, a full description needs $2^n$ complex numbers. Each complex number takes 16 bytes on a classical computer:</p>
<table class="amp-table" style="max-width:520px">
<tr><th>Qubits</th><th>Amplitudes</th><th>Memory to simulate</th></tr>
<tr><td>10</td><td>1,024</td><td>16 KB</td></tr>
<tr><td>20</td><td>about 1 million</td><td>16 MB: easy, runs in this page</td></tr>
<tr><td>30</td><td>about 1 billion</td><td>16 GB: a big workstation</td></tr>
<tr><td>50</td><td>about $10^{15}$</td><td>16 PB: beyond any supercomputer's memory</td></tr>
</table>
<p>Every added qubit <b>doubles</b> the cost. This is why nature (molecules, enzymes, materials) is hard to simulate classically, and why Richard Feynman suggested in 1981 that we build computers out of quantum systems.</p>

<span class="step-label">Try it</span>
<p>Below is a two-qubit circuit. The H gate creates a superposition and the CX gate links the two qubits. Look at the probabilities: only <code>00</code> and <code>11</code> ever appear. Open the <b>Bloch spheres</b> tab: each arrow has shrunk to a dot, a sign of <span data-term="entanglement">entanglement</span>, which you will meet in Track 2.</p>
${W('composer', { preset: 'bell', fixedQubits: true })}

<span class="step-label">How to use this platform</span>
<ul>
<li><b>Learn</b>: work through the tracks in order. Each lesson takes 15–30 minutes.</li>
<li><b>Playground</b>: run the same problem on a classical CPU, a parallel GPU and qubits, and compare. A great next stop after this lesson: <a href="#/playground">open the Playground</a>.</li>
<li><b>Simulators</b>: open any lab directly, for example the <a href="#/lab/composer">Circuit Composer</a> or the <a href="#/lab/bloch">Bloch Sphere Explorer</a>.</li>
<li><b>Code Lab</b>: write your own programs with a small JavaScript API, and export them to Qiskit for real hardware.</li>
<li>Dotted terms like <span data-term="qubit">qubit</span> have glossary definitions: hover or focus them.</li>
</ul>
<div class="callout reality"><strong>Honest expectations</strong>Quantum computers are not faster at everything. They are expected to help with specific problems: simulating molecules and materials, some optimisation and search problems, and breaking certain cryptography. Much of that is still years away. This course shows you how the ideas work.</div>`,
    quiz: [
      { q: 'On the arrow-on-a-ball picture, where does the arrow point when the qubit is surely 1?', options: ['To the top (north pole)', 'To the bottom (south pole)', 'To the equator'], answer: 1, why: 'Top is 0, bottom is 1, and the equator is a 50/50 mix.' },
      { q: 'Which gate turns a qubit that is 0 into a 50/50 spinning coin?', options: ['X', 'H', 'M'], answer: 1, why: 'H puts the arrow on the equator. X would flip it to 1, and M only looks at it.' },
      { q: 'You measure the answer <code>10</code> on two qubits. What is q0?', options: ['0', '1'], answer: 0, why: 'Read right to left: the rightmost digit is q0, which is 0 here; q1 is 1.' },
      { q: 'Where does the advantage of quantum algorithms come from?', options: ['Reading out all $2^n$ answers at once', 'Interference that cancels wrong answers', 'Qubits being faster transistors'], answer: 1, why: 'A measurement returns only one outcome. Algorithms work by making amplitudes interfere so the right outcome becomes likely.' },
      { q: 'How much memory does a full simulation of 21 qubits need compared with 20 qubits?', options: ['1 more byte', '5% more', 'Twice as much'], answer: 2, why: 'Each extra qubit doubles the number of amplitudes: $2^{21} = 2 \\times 2^{20}$.' },
      { q: 'Which application is quantum computing most naturally suited to?', options: ['Word processing', 'Simulating molecules', 'Streaming video'], answer: 1, why: 'Molecules are quantum systems. Their state grows exponentially with size, just like qubits.' }
    ],
    refs: ['R. P. Feynman, "Simulating physics with computers", <i>Int. J. Theor. Phys.</i> 21, 467 (1982).', 'M. A. Nielsen & I. L. Chuang, <i>Quantum Computation and Quantum Information</i>, Ch. 1.']
  });

  L({ id: '0.2', title: 'Complex numbers', minutes: 20, tags: ['maths'],
    objectives: ['Add and multiply complex numbers', 'Convert between $a+bi$ and polar form $re^{i\\theta}$', 'Explain why $|z|^2$ is always a non-negative real number'],
    body: R`
<span class="step-label">Idea</span>
<p>A <span data-term="complex number">complex number</span> is $z = a + bi$, where $i^2 = -1$. $a$ is the real part and $b$ the imaginary part. Quantum amplitudes are complex numbers, so this is the most important maths in the course.</p>
<ul>
<li>Add: $(1+2i) + (3-i) = 4 + i$</li>
<li>Multiply: $(1+2i)(3-i) = 3 - i + 6i - 2i^2 = 5 + 5i$</li>
<li>Conjugate: $z^* = a - bi$ (flip the imaginary sign)</li>
<li>Modulus squared: $|z|^2 = z^* z = a^2 + b^2$, always real and $\geq 0$</li>
</ul>

<span class="step-label">Visual</span>
<p>Draw $z$ as a point: real part across, imaginary part up. Then $|z|$ is its distance from the origin and its angle $\theta$ (the argument) is measured from the positive real axis. <b>Euler's formula</b> connects the two descriptions:</p>
$$e^{i\theta} = \cos\theta + i\sin\theta \quad\Rightarrow\quad z = |z|\,e^{i\theta}$$
<p>Multiplying by $e^{i\theta}$ <b>rotates</b> a point by $\theta$ without changing its length. Multiplying by $i = e^{i\pi/2}$ rotates by 90°. In quantum computing, that rotation is a change of <span data-term="phase">phase</span>.</p>

<span class="step-label">Try it</span>
<p>Drag the point (or use the arrow keys). Press "× i" four times and watch it come back home. Note that conjugating and multiplying by $-1$ never change $|z|^2$.</p>
${W('complex-plane')}

<span class="step-label">Why it matters</span>
<p>An amplitude $\alpha$ gives a probability $|\alpha|^2$. Multiplying an amplitude by a phase $e^{i\theta}$ leaves its probability unchanged, because $|e^{i\theta}|=1$. Yet phases matter when amplitudes are <b>added</b>: $1 + 1 = 2$ but $1 + e^{i\pi} = 0$. That cancellation is interference.</p>

<span class="step-label">Code it</span>
<pre><code>// JavaScript has no built-in complex type; the simulator stores re and im separately.
const a = { re: 1, im: 2 }, b = { re: 3, im: -1 };
const product = { re: a.re*b.re - a.im*b.im, im: a.re*b.im + a.im*b.re };
console.log(product);           // { re: 5, im: 5 }
console.log(a.re**2 + a.im**2); // |a|^2 = 5</code></pre>
<p>Paste this into the <a href="#/lab/code">Code Lab</a> to run it.</p>`,
    quiz: [
      { q: 'What is $(2 + i)(2 - i)$?', options: ['$4 - i$', '$5$', '$3$', '$4 + 2i$'], answer: 1, why: '$(2+i)(2-i) = 4 - i^2 = 4 + 1 = 5$. A number times its conjugate is $|z|^2$.' },
      { q: 'What is $|e^{i\\pi/3}|^2$?', options: ['$1$', '$\\pi/3$', '$1/2$', 'It depends on the angle'], answer: 0, why: 'Any $e^{i\\theta}$ lies on the unit circle, so its modulus is 1.' },
      { q: 'Multiplying $z$ by $i$ is the same as…', options: ['Doubling its length', 'Rotating it by 90°', 'Reflecting it in the real axis'], answer: 1, why: '$i = e^{i\\pi/2}$, a rotation by 90° with unchanged length. Reflection in the real axis is conjugation.' }
    ],
    refs: ['3Blue1Brown, "Euler\'s formula with introductory group theory" (video).', 'Nielsen & Chuang, Appendix: Notes on basic linear algebra.']
  });

  L({ id: '0.3', title: 'Vectors and matrices', minutes: 25, tags: ['maths'],
    objectives: ['Write a qubit state as a 2-entry column vector', 'Multiply a 2×2 matrix by a vector', 'State what makes a matrix unitary'],
    body: R`
<span class="step-label">Idea</span>
<p>A qubit state is a <b>column vector</b> of two complex amplitudes. The two basis states are</p>
$$\ket{0} = \begin{pmatrix}1\\0\end{pmatrix}, \qquad \ket{1} = \begin{pmatrix}0\\1\end{pmatrix}, \qquad \alpha\ket{0} + \beta\ket{1} = \begin{pmatrix}\alpha\\\beta\end{pmatrix}.$$
<p>A quantum <span data-term="gate">gate</span> on one qubit is a 2×2 <b>matrix</b>. Applying the gate means multiplying the matrix by the vector: each output entry is a row of the matrix multiplied entry-by-entry with the column, then summed.</p>
$$\begin{pmatrix}a & b\\ c & d\end{pmatrix}\begin{pmatrix}x\\y\end{pmatrix} = \begin{pmatrix}ax + by\\ cx + dy\end{pmatrix}$$

<span class="step-label">Try it</span>
<p>Pick a gate and an input. Check, for example, that X swaps the entries (a NOT gate), Z flips the sign of the second entry, and H turns $\ket{0}$ into $\ket{+}$.</p>
${W('matrix-vector')}

<span class="step-label">Unitary matrices</span>
<p>Probabilities must add up to 1 before and after a gate. The matrices that guarantee this are called <span data-term="unitary">unitary</span>: $U^\dagger U = I$, where $U^\dagger$ ("U dagger") is the conjugate transpose. Unitary also means <b>reversible</b>: you can always undo $U$ by applying $U^\dagger$.</p>
<p>Check with H: $H^\dagger = H$ and $H\cdot H = I$. Applying H twice does nothing, which you will use constantly.</p>
<div class="callout green"><strong>Rule of thumb</strong>Columns of a unitary matrix are the images of $\ket{0}$ and $\ket{1}$. For H, column 1 is $\ket{+}$ and column 2 is $\ket{-}$.</div>

<span class="step-label">Code it</span>
<pre><code>// The simulator applies gates without building big matrices, but you can check one:
const qc = new QG.Circuit(1);
qc.h(0).h(0);                 // H·H = I
console.log(QG.state(qc));    // back to |0⟩
QG.show.state(qc);</code></pre>`,
    quiz: [
      { q: 'What is $X\\ket{1}$?', options: ['$\\ket{0}$', '$\\ket{1}$', '$-\\ket{1}$', '$\\ket{+}$'], answer: 0, why: 'X swaps the two entries: $(0,1)^T \\to (1,0)^T = \\ket{0}$.' },
      { q: 'What is $Z\\ket{+}$?', options: ['$\\ket{+}$', '$\\ket{-}$', '$\\ket{0}$', '$\\ket{1}$'], answer: 1, why: '$Z$ flips the sign of the $\\ket{1}$ part: $\\frac{1}{\\sqrt2}(\\ket{0}+\\ket{1}) \\to \\frac{1}{\\sqrt2}(\\ket{0}-\\ket{1}) = \\ket{-}$.' },
      { q: 'Why must quantum gates be unitary?', options: ['So they run faster', 'So total probability stays 1 and the operation is reversible', 'So they only use real numbers'], answer: 1, why: 'Unitaries preserve the length of the state vector, hence the sum of probabilities, and $U^\\dagger$ undoes them.' }
    ]
  });

  L({ id: '0.4', title: 'Dirac notation and probability', minutes: 20, tags: ['maths'],
    objectives: ['Read kets, bras and inner products', 'Compute measurement probabilities with the Born rule', 'Check whether a state is normalised'],
    body: R`
<span class="step-label">Idea</span>
<p>Physicists write vectors as <span data-term="ket">kets</span>, $\ket{\psi}$, and their conjugate transposes as <span data-term="bra">bras</span>, $\bra{\psi}$. Putting a bra next to a ket gives the <span data-term="inner product">inner product</span>, a single complex number:</p>
$$\braket{\phi}{\psi} = \phi_0^*\psi_0 + \phi_1^*\psi_1.$$
<p>The <span data-term="born rule">Born rule</span> says: if you measure $\ket{\psi}$, the probability of getting outcome $x$ is</p>
$$P(x) = |\braket{x}{\psi}|^2.$$
<p>For $\ket{\psi} = \alpha\ket{0}+\beta\ket{1}$ this is simply $P(0)=|\alpha|^2$ and $P(1)=|\beta|^2$. Since probabilities sum to 1, every valid state is <b>normalised</b>: $|\alpha|^2+|\beta|^2 = 1$.</p>

<span class="step-label">Try it</span>
<p>Choose an angle to prepare $\cos\frac{\theta}{2}\ket{0} + \sin\frac{\theta}{2}\ket{1}$. Measure once: you get a single random bit, and the state <span data-term="collapse">collapses</span>. Measure 1000 times and the frequencies approach the Born-rule probabilities.</p>
${W('measure-sim', { theta: 1.0471975512 })}

<span class="step-label">Worked example</span>
<p>Let $\ket{\psi} = \frac{1}{\sqrt3}\ket{0} + \sqrt{\frac{2}{3}}\,i\ket{1}$.</p>
<ul><li>$P(0) = \left|\frac{1}{\sqrt3}\right|^2 = \frac{1}{3}$</li>
<li>$P(1) = \left|\sqrt{\tfrac{2}{3}}\, i\right|^2 = \frac{2}{3}$ (the $i$ does not change the probability)</li>
<li>Normalised: $\frac13 + \frac23 = 1$ ✓</li></ul>
<div class="callout"><strong>Measuring in another basis</strong>The probability of finding $\ket{\psi}$ in state $\ket{+}$ is $|\braket{+}{\psi}|^2$. In circuits we do this by applying H and then measuring normally, which you will practise in Track 1.</div>`,
    quiz: [
      { q: 'For $\\ket{\\psi} = \\frac{3}{5}\\ket{0} + \\frac{4}{5}\\ket{1}$, what is $P(1)$?', options: ['$4/5$', '$16/25$', '$9/25$', '$1/2$'], answer: 1, why: '$P(1) = (4/5)^2 = 16/25 = 0.64$.' },
      { q: 'Which of these is a valid (normalised) state?', options: ['$\\ket{0}+\\ket{1}$', '$\\frac{1}{2}\\ket{0}+\\frac{1}{2}\\ket{1}$', '$\\frac{1}{\\sqrt2}\\ket{0}-\\frac{i}{\\sqrt2}\\ket{1}$'], answer: 2, why: '$\\frac12 + \\frac12 = 1$. The first sums to 2, the second to $\\frac12$.' },
      { q: 'What is $\\braket{0}{1}$?', options: ['$0$', '$1$', '$i$'], answer: 0, why: '$\\ket{0}$ and $\\ket{1}$ are orthogonal: their inner product is 0, so they can be perfectly distinguished.' }
    ]
  });

  L({ id: '0.5', title: 'Tensor products', minutes: 20, tags: ['maths'],
    objectives: ['Combine two qubit states with $\\otimes$', 'Read multi-qubit bit strings in Qiskit order', 'Explain why n qubits need $2^n$ amplitudes'],
    body: R`
<span class="step-label">Idea</span>
<p>To describe two qubits together we take the <span data-term="tensor product">tensor product</span>: multiply every amplitude of the first by every amplitude of the second.</p>
$$\begin{pmatrix}a\\b\end{pmatrix}\otimes\begin{pmatrix}c\\d\end{pmatrix} = \begin{pmatrix}ac\\ad\\bc\\bd\end{pmatrix} \quad\leftrightarrow\quad ac\ket{00} + ad\ket{01} + bc\ket{10} + bd\ket{11}.$$
<p>Two qubits have $2\times2 = 4$ amplitudes; three have 8; $n$ have $2^n$. This is the exponential growth you saw in Lesson 0.1.</p>

<span class="step-label">Bit-string order</span>
<p>This platform follows <span data-term="qiskit">Qiskit</span>: in $\ket{q_1 q_0}$ the <b>rightmost</b> bit is qubit 0. So $\ket{01}$ means $q_1 = 0$ and $q_0 = 1$. Many textbooks use the opposite order. Always check which convention you're reading!</p>

<span class="step-label">Try it</span>
<p>Combine two single-qubit states. Try $\ket{+}\otimes\ket{+}$: all four amplitudes become $\frac12$, an equal superposition of 4 states.</p>
${W('tensor')}

<span class="step-label">Not every state is a product</span>
<p>Can you find $a,b,c,d$ so that $ac\ket{00}+ad\ket{01}+bc\ket{10}+bd\ket{11} = \frac{1}{\sqrt2}(\ket{00}+\ket{11})$? You would need $ad = 0$ but $ac \neq 0$ and $bd\neq0$, which is impossible. Such states are <span data-term="entanglement">entangled</span>. Track 2 is all about them.</p>

<span class="step-label">Code it</span>
<pre><code>const qc = new QG.Circuit(2);
qc.h(0).h(1);                  // |+⟩ ⊗ |+⟩
QG.show.state(qc);             // four amplitudes of 0.5
qc.x(0);                       // flip only qubit 0 (the rightmost bit)
console.log(QG.state(qc));</code></pre>`,
    quiz: [
      { q: 'What is $\\ket{1}\\otimes\\ket{0}$ in Qiskit bit-string notation?', options: ['$\\ket{01}$', '$\\ket{10}$', '$\\ket{11}$'], answer: 1, why: 'Writing $q_1 \\otimes q_0$ with $q_1 = 1$ and $q_0 = 0$ gives the string "10".' },
      { q: 'How many amplitudes describe 5 qubits?', options: ['10', '25', '32'], answer: 2, why: '$2^5 = 32$.' },
      { q: 'Is $\\frac{1}{\\sqrt2}(\\ket{00}+\\ket{01})$ a product state?', options: ['Yes: $\\ket{0}\\otimes\\ket{+}$', 'No, it is entangled'], answer: 0, why: '$\\ket{0}\\otimes\\frac{1}{\\sqrt2}(\\ket{0}+\\ket{1}) = \\frac{1}{\\sqrt2}(\\ket{00}+\\ket{01})$.' }
    ]
  });
})();
