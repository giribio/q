namespace QuantumAcademy.Week03 {
    @EntryPoint()
    operation Main() : Unit {
        use q = Qubit();
        Ry(0.7, q);
        let result = M(q);
        Message($"Measurement after Ry(0.7): {result}");
        Reset(q);
    }
}
