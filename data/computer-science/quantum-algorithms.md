---
id: cs-002
title: Quantum Algorithms: Shor and Grover
category: computer-science
tags: ["quantum-computing", "algorithms", "shor", "grover"]
last_updated: 2026-07-07
version: 1.0.0
---

# Quantum Algorithms: Shor and Grover

## Overview

Quantum algorithms leverage quantum mechanical phenomena to solve certain computational problems exponentially faster than classical algorithms. Two of the most important are Shor's algorithm for factorization and Grover's algorithm for unstructured search.

## Shor's Algorithm

### Problem
Given an integer N, find its prime factors.

### Classical Difficulty
The best classical algorithm (General Number Field Sieve) runs in sub-exponential time, making factorization of large numbers (e.g., 2048-bit RSA keys) practically impossible.

### Quantum Advantage
Shor's algorithm runs in polynomial time: O((log N)³)

### Key Steps

1. **Period Finding**: Find the period r of f(x) = a^x mod N
2. **Quantum Fourier Transform**: Extracts periodicity exponentially faster
3. **Classical Post-processing**: Use period to compute factors

```
Input: N (composite integer)
1. Choose a random a coprime to N
2. Find order r of a modulo N using QFT
3. If r is even and a^(r/2) ≠ -1 mod N:
     factors = gcd(a^(r/2) - 1, N), gcd(a^(r/2) + 1, N)
```

## Grover's Algorithm

### Problem
Search an unsorted database of N items to find a marked element.

### Classical Difficulty
O(N) queries are needed in the worst case.

### Quantum Advantage
Grover's algorithm requires only O(√N) queries — a quadratic speedup.

### Key Steps

1. **Superposition**: Initialize uniform superposition over all states
2. **Oracle**: Mark the target state with a phase flip
3. **Diffusion Operator**: Amplify the amplitude of marked states
4. **Repeat**: Apply steps 2-3 approximately √N times

## Practical Impact

### Shor's Algorithm
- Threatens RSA, ECC, and other public-key cryptosystems
- Post-quantum cryptography research is actively developing replacements

### Grover's Algorithm  
- Reduces effective key strength of symmetric ciphers by half
- AES-256 remains secure (effective 128-bit security)

## Resource Requirements

| Algorithm | Logical Qubits | Gate Depth |
|-----------|---------------|------------|
| Shor (2048-bit RSA) | ~20M | ~10¹² |
| Grover (AES-256) | ~6K | ~10¹⁸ |

## Further Reading

1. Shor, P. (1994). *Algorithms for quantum computation: discrete logarithms and factoring*
2. Grover, L. K. (1996). *A fast quantum mechanical algorithm for database search*
3. Nielsen, M. A. & Chuang, I. L. (2010). *Quantum Computation and Quantum Information*
