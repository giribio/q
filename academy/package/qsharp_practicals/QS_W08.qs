namespace QuantumAcademy.Week08 {
    operation EncodeFeature(x : Double, q : Qubit) : Unit {
        H(q);
        Rz(x, q);
    }

    @EntryPoint()
    operation Main() : Unit {
        use q = Qubit();
        EncodeFeature(0.8, q);
        let result = M(q);
        Message($"Feature-encoded measurement: {result}");
        Reset(q);
    }
}
