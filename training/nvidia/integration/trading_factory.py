"""Trading Factory — Strategy pipeline for Solana trading agents."""


class TradingFactory:
    def __init__(
        self, model="solanaclawd/solana-nvidia-trading-factory-8b-lora"
    ):
        self.model = model
        self.strategies = []

    def load_strategy(self, strategy_config: dict):
        self.strategies.append(strategy_config)
        print(
            f"[TradingFactory] Loaded strategy: {strategy_config.get('name', 'unknown')}"
        )

    def execute(self, market_data: dict):
        signals = []
        for s in self.strategies:
            signal = self._evaluate_strategy(s, market_data)
            signals.append(signal)
        return self._aggregate_signals(signals)

    def _evaluate_strategy(self, strategy, data):
        return {
            "strategy": strategy["name"],
            "action": "hold",
            "confidence": 0.5,
        }

    def _aggregate_signals(self, signals):
        if not signals:
            return {"action": "hold", "confidence": 0}
        return max(signals, key=lambda x: x["confidence"])