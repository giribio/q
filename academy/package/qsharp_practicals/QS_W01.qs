namespace QuantumAcademy.Week01 {
    @EntryPoint()
    operation Main() : Unit {
        use q = Qubit();
        H(q);
        let m = M(q);
        Message($"Measurement result: {m}");
        Reset(q);
    }
}
