"""Portfolio constraints for Solana asset optimization."""
from dataclasses import dataclass, field
from typing import List

@dataclass
class PortfolioConstraints:
    max_position_size: float = 0.25
    min_position_size: float = 0.01
    min_diversification: int = 4
    max_leverage: float = 2.0
    rebalance_threshold: float = 0.05
    forbidden_tokens: List[str] = field(default_factory=list)

    def validate(self, weights: List[float]) -> bool:
        if any(w > self.max_position_size for w in weights):
            return False
        if sum(1 for w in weights if w > 0) < self.min_diversification:
            return False
        if sum(w for w in weights if w < 0) < -self.max_leverage + 1:
            return False
        return True
