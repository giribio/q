namespace QuantumAcademy.Week07 {
    operation PrepareTrial(theta : Double, q : Qubit) : Unit {
        Ry(theta, q);
    }

    @EntryPoint()
    operation Main() : Unit {
        use q = Qubit();
        PrepareTrial(1.2, q);
        let result = M(q);
        Message($"Trial-state measurement: {result}");
        Reset(q);
    }
}
