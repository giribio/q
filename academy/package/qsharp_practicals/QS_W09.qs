namespace QuantumAcademy.Week09 {
    operation PrepareAnsatz(theta : Double, q : Qubit) : Unit {
        Ry(theta, q);
    }

    @EntryPoint()
    operation Main() : Unit {
        use q = Qubit();
        PrepareAnsatz(0.9, q);
        // Measure in computational basis. A full VQE requires repeated
        // measurements of Hamiltonian terms and a classical optimizer.
        let result = M(q);
        Message($"Molecular ansatz sample: {result}");
        Reset(q);
    }
}
