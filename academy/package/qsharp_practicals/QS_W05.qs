namespace QuantumAcademy.Week05 {
    operation OracleMarkedZero(q : Qubit) : Unit {
        // Phase oracle for |1>; X conjugation changes the marked basis state.
        Z(q);
    }

    @EntryPoint()
    operation Main() : Unit {
        use q = Qubit();
        H(q);
        OracleMarkedZero(q);
        H(q);
        let result = M(q);
        Message($"One-qubit phase-oracle demonstration: {result}");
        Reset(q);
    }
}
