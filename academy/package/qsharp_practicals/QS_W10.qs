namespace QuantumAcademy.Week10 {
    @EntryPoint()
    operation Main() : Unit {
        use qs = Qubit[2];
        H(qs[0]);
        H(qs[1]);
        CNOT(qs[0], qs[1]);
        let a = M(qs[0]);
        let b = M(qs[1]);
        Message($"Two-spin correlated sample: {a}, {b}");
        ResetAll(qs);
    }
}
