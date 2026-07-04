"""Portfolio construction and mean-variance optimization."""
import numpy as np

class Portfolio:
    def __init__(self, expected_returns, cov_matrix, risk_free_rate=0.05):
        self.mu = np.array(expected_returns)
        self.Sigma = np.array(cov_matrix)
        self.rf = risk_free_rate
        self.n = len(expected_returns)

    def max_sharpe(self):
        inv_Sigma = np.linalg.inv(self.Sigma)
        ones = np.ones(self.n)
        w = inv_Sigma @ (self.mu - self.rf)
        w = w / (ones @ w)
        return w

    def min_variance(self):
        inv_Sigma = np.linalg.inv(self.Sigma)
        ones = np.ones(self.n)
        w = inv_Sigma @ ones
        w = w / (ones @ w)
        return w

    def efficient_frontier(self, points=50):
        returns = np.linspace(self.mu.min(), self.mu.max(), points)
        weights = []
        for r in returns:
            inv_Sigma = np.linalg.inv(self.Sigma)
            ones = np.ones(self.n)
            w = inv_Sigma @ (self.mu - r * ones)
            w = w / (ones @ w)
            weights.append(w)
        return np.array(weights)
