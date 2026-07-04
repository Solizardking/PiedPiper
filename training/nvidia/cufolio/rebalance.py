"""Portfolio rebalancing with threshold and schedule-based triggers."""
import numpy as np
from .constraints import PortfolioConstraints

class RebalanceEngine:
    def __init__(self, constraints: PortfolioConstraints):
        self.constraints = constraints
        self.last_rebalance = None

    def should_rebalance(self, current_weights, target_weights):
        drift = np.max(np.abs(current_weights - target_weights))
        return drift > self.constraints.rebalance_threshold

    def rebalance(self, current_weights, target_weights, liquidity):
        if not self.should_rebalance(current_weights, target_weights):
            return current_weights
        alpha = min(1.0, liquidity / sum(abs(target_weights - current_weights)))
        new_weights = current_weights + alpha * (target_weights - current_weights)
        if not self.constraints.validate(new_weights):
            return current_weights
        return new_weights
