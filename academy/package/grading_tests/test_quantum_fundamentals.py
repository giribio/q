import numpy as np

def test_hadamard_is_unitary():
    H = np.array([[1,1],[1,-1]], dtype=complex) / np.sqrt(2)
    assert np.allclose(H.conj().T @ H, np.eye(2))

def test_bell_state_probabilities():
    bell = np.array([1,0,0,1], dtype=complex) / np.sqrt(2)
    assert np.allclose(np.abs(bell)**2, [0.5,0,0,0.5])

def test_tensor_product_normalization():
    plus = np.array([1,1], dtype=complex) / np.sqrt(2)
    zero = np.array([1,0], dtype=complex)
    state = np.kron(plus, zero)
    assert np.isclose(np.linalg.norm(state), 1.0)

def test_rotation_unitarity():
    theta = 0.37
    I = np.eye(2, dtype=complex)
    X = np.array([[0,1],[1,0]], dtype=complex)
    Rx = np.cos(theta/2)*I - 1j*np.sin(theta/2)*X
    assert np.allclose(Rx.conj().T @ Rx, I)
