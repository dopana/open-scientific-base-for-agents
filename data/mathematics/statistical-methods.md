---
id: math-002
title: Statistical Methods for Research
category: mathematics
tags: ["statistics", "probability", "hypothesis-testing", "bayesian"]
last_updated: 2026-07-04
version: 1.0.0
---

# Statistical Methods for Research

## Overview

Statistics provides the mathematical framework for designing experiments, analyzing data, and drawing conclusions from uncertainty. It is essential across all scientific disciplines for rigorous empirical research.

## Foundational Concepts

### 1. Probability Distributions

- **Normal Distribution**: Bell-shaped, symmetric, parameterized by μ and σ
- **Binomial Distribution**: Number of successes in n independent trials
- **Poisson Distribution**: Count of events in fixed interval
- **Exponential Family**: General class including many common distributions

### 2. Descriptive Statistics

Summarizing data characteristics:

- **Central Tendency**: Mean, median, mode
- **Dispersion**: Variance, standard deviation, IQR
- **Shape**: Skewness, kurtosis

## Inferential Statistics

### Hypothesis Testing

Framework for making decisions from data:

1. **Null Hypothesis (H₀)**: No effect or difference
2. **Alternative Hypothesis (H₁)**: There is an effect
3. **Test Statistic**: Calculated from sample data
4. **p-value**: Probability of observing data if H₀ is true
5. **Decision**: Reject H₀ if p < α (significance level)

### Common Tests

| Test | Use Case | Assumptions |
|------|----------|-------------|
| t-test | Compare two means | Normality, equal variance |
| ANOVA | Compare multiple means | Normality, independence |
| Chi-square | Test categorical associations | Expected frequencies ≥5 |
| Mann-Whitney | Non-parametric two-sample | Independent samples |

## Bayesian Statistics

An alternative framework treating probability as degree of belief:

```
P(θ|D) = P(D|θ) · P(θ) / P(D)
```

Where:
- P(θ|D): Posterior probability
- P(D|θ): Likelihood
- P(θ): Prior probability
- P(D): Evidence

## Regression Analysis

### Linear Regression

```
y = β₀ + β₁x₁ + β₂x₂ + ... + βₖxₖ + ε
```

### Model Evaluation

- R²: Proportion of variance explained
- Adjusted R²: Penalizes for number of predictors
- AIC/BIC: Information criteria for model selection

## Practical Guidelines

- **Power Analysis**: Determine required sample size before experiment
- **Multiple Testing Correction**: Bonferroni, FDR adjustment
- **Effect Size**: Report magnitude, not just significance
- **Confidence Intervals**: Provide range of plausible values

## Further Reading

1. Wasserman, L. (2004). *All of Statistics*
2. Gelman, A. et al. (2013). *Bayesian Data Analysis*
3. Hastie, T. et al. (2009). *The Elements of Statistical Learning*
