# Week 07: Variational algorithms

## Instructor lecture script

Introduce Hamiltonian expectation values and the variational principle. Explain parameterised circuits as trial-state generators. Walk through the VQE loop: prepare, measure, estimate energy, update parameters. Then map a small graph optimisation problem to an Ising cost Hamiltonian and introduce QAOA. Discuss shot noise, optimizer sensitivity and barren plateaus.

## Suggested delivery
- Recorded lecture segments: 5–6 videos of 8–12 minutes each.
- Total recorded time: approximately 60–75 minutes for this week.
- Include a short pause for a worked example after each major concept.
- End with a 3-question retrieval-practice quiz.

## Key equations and concepts

- Variational energy: `E(θ) = ⟨ψ(θ)|H|ψ(θ)⟩`
- VQE objective: `min_θ E(θ)`

## Slide outline
1. Hamiltonians and expectation values
2. Parameterized ansatz
3. VQE workflow
4. QAOA and Ising mapping
5. Classical optimizers
6. Convergence and limitations

## Instructor prompts
- Ask learners to predict the result before running the code.
- Ask what assumptions make the model valid.
- Ask what a classical baseline would be.

## Suggested knowledge check
1. State the central concept in one sentence.
2. Identify one mathematical or computational assumption.
3. Name one limitation of the method.
