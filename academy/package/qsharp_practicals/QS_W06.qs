namespace QuantumAcademy.Week06 {
    @EntryPoint()
    operation Main() : Unit {
        // Prepare a phase eigenstate and demonstrate phase kickback.
        use qs = Qubit[2];
        X(qs[1]);
        H(qs[0]);
        // Controlled-Z applies a phase to |11>; target |1> is an eigenstate of Z.
        Controlled Z([qs[0]], qs[1]);
        let a = M(qs[0]);
        let b = M(qs[1]);
        Message($"Control and target measurements: {a}, {b}");
        ResetAll(qs);
    }
}
