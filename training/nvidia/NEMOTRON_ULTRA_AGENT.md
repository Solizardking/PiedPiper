# Nemotron Ultra Agent

The Nemotron Ultra Agent generates multi-step agent plans using NVIDIA's Nemotron-4 340B model for Solana-native AI reasoning.

## Capabilities
- Multi-step agent plan generation
- Tool selection and sequencing
- Risk assessment per step
- Onchain attestation verification

## Usage
```python
from integration.agent_plan_bridge import AgentPlanBridge
bridge = AgentPlanBridge()
plan = bridge.generate_plan("swap SOL for USDC via Jupiter",
    {"wallet": "abc...", "slippage": 0.01})
```
