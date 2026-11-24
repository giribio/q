namespace QuantumAcademy.Week04 {
    @EntryPoint()
    operation Main() : Unit {
        use qs = Qubit[2];
        H(qs[0]);
        CNOT(qs[0], qs[1]);
        let a = M(qs[0]);
        let b = M(qs[1]);
        Message($"Bell pair: {a}, {b}");
        ResetAll(qs);
    }
}
