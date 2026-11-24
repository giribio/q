namespace QuantumAcademy.Week02 {
    @EntryPoint()
    operation Main() : Unit {
        // Demonstrate basis preparation and measurement.
        use qs = Qubit[2];
        X(qs[1]);
        let a = M(qs[0]);
        let b = M(qs[1]);
        Message($"Expected computational basis results: {a}, {b}");
        ResetAll(qs);
    }
}
