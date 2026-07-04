# 🦞 NVIDIA x Solana Clawd — Training Factory

**Published Models · Blueprints · Configs · Scripts · Integration**

This directory powers the NVIDIA-backed AI training pipeline for Solana-native agents, from cellular automaton encryption to onchain trading strategies.

---

## 📦 Published Models

| # | Model | Size | Type | Status |
|---|-------|------|------|--------|
| ⭐ | `ordlibrary/clawd-trading-wallet` | 986 MB | Wallet-bearing LLM | ✅ Live |
| 🧠 | `ordlibrary/hauhau-qwen36-onchain` | 11 GB | Onchain constitution | ✅ Live |
| 🧠 | `ordlibrary/hauhau-qwen36-uncensored` | 11 GB | Uncensored variant | ✅ Live |
| 🦞 | `ordlibrary/core-ai-clawd-1.5b` | 986 MB | Core AI Clawd | ✅ Live |
| 🦞 | `ordlibrary/core-ai-clawd-1.5b:finetuned` | 4.9 GB | Fine-tuned variant | ✅ Live |
| 🔬 | `solanaclawd/solana-clawd-core-ai-1.5b-lora` | ~9M params | LoRA adapter | ✅ Live |
| 🔬 | `solanaclawd/solana-nvidia-trading-factory-8b-lora` | ~9M params | Trading factory LoRA | ✅ Live |
| 🔄 | `solanaclawd/solana-tx-foundation-1.5b` | 1.5B params | In training | 🚧 Active |

### Pull Commands

```bash
# Wallet-bearing LLM (flagship)
huggingface-cli download ordlibrary/clawd-trading-wallet --local-dir training/nvidia/models/clawd-trading-wallet

# Onchain constitution
huggingface-cli download ordlibrary/hauhau-qwen36-onchain --local-dir training/nvidia/models/hauhau-onchain

# Core AI Clawd
huggingface-cli download ordlibrary/core-ai-clawd-1.5b --local-dir training/nvidia/models/core-ai-clawd

# Fine-tuned
huggingface-cli download ordlibrary/core-ai-clawd-1.5b:finetuned --local-dir training/nvidia/models/core-ai-clawd-finetuned

# LoRA adapters
huggingface-cli download solanaclawd/solana-clawd-core-ai-1.5b-lora --local-dir training/nvidia/models/clawd-core-lora
huggingface-cli download solanaclawd/solana-nvidia-trading-factory-8b-lora --local-dir training/nvidia/models/trading-factory-lora
```

### External Oracle Models

| Model | Purpose | Source |
|-------|---------|--------|
| Nemotron-4 340B | Ultra-agent planning | NVIDIA |
| DeepSeek-R1 | Inference-time compute oracle | DeepSeek |
| BGE-M3 | Embedding / reranking | BAAI |
| Llama-3.3-70B | Agent routing | Meta |
| Hermes-3 70B | Tool-use planning | Nous Research |

---

## 🗂 Directory Structure

```
training/nvidia/
├── README.md                   ← This file
├── MODEL.md                    ← Full model ecosystem (symlink to /MODEL.md)
├── LOCAL_MAC_STACK.md          ← Local Mac control plane
├── NEMOTRON_ULTRA_AGENT.md     ← Nemotron Ultra agent docs
├── nemotron_ultra_agent.py      ← 22.8 KB agent plan generator
├── blueprints/                 ← 6 NVIDIA blueprints
│   ├── aiq_blueprint.yaml
│   ├── enterprise_rag_blueprint.yaml
│   ├── model_distillation_blueprint.yaml
│   ├── portfolio_optimization_blueprint.yaml
│   ├── signal_discovery_blueprint.yaml
│   └── transaction_foundation_model_blueprint.yaml
├── configs/                    ← 6 YAML configs
│   ├── aiq_config.yaml
│   ├── nim_config.yaml
│   ├── clawd_factory_config.yaml
│   ├── pretrain_decoder_config.yaml
│   ├── pretrain_decoder_v2_config.yaml
│   └── solana_tx_foundation_config.yaml
├── cufolio/                    ← Portfolio optimization
│   ├── README.md
│   ├── constraints.py
│   ├── portfolio.py
│   └── rebalance.py
├── integration/                ← Bridge modules
│   ├── nim_bridge.py
│   ├── sft_builder.py
│   ├── nemo_clawd.py
│   ├── agent_plan_bridge.py
│   └── trading_factory.py
├── scripts/                    ← Automation
│   ├── verify_models.sh
│   ├── setup_training_env.sh
│   └── download_models.sh
└── outputs/                    ← Generated artifacts (empty)
```

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
pip install torch transformers nemo-toolkit huggingface-hub

# 2. Download models (or subset)
bash training/nvidia/scripts/download_models.sh

# 3. Verify
bash training/nvidia/scripts/verify_models.sh

# 4. Run NIM bridge
python training/nvidia/integration/nim_bridge.py

# 5. Build SFT
python training/nvidia/integration/sft_builder.py
```

---

## 🔗 Integration Points

| Component | Connects to | File |
|-----------|-------------|------|
| NIM Bridge | NVIDIA Inference Microservices | `integration/nim_bridge.py` |
| SFT Builder | Hugging Face Trainer + LoRA | `integration/sft_builder.py` |
| NeMo Clawd | NVIDIA NeMo + Solana | `integration/nemo_clawd.py` |
| Agent Plan Bridge | Nemotron Ultra plans | `integration/agent_plan_bridge.py` |
| Trading Factory | Trading strategy pipeline | `integration/trading_factory.py` |

---

## 📜 Historic Milestone

> **clawd-trading-wallet** (986 MB) is the **first LLM capable of bearing an on-chain wallet**, representing a breakthrough in sovereign AI agents. The wallet is derived from the PiedPiper CA-encryption lineage — cellular automaton PRNG -> PP_SSH -> Solana agent keypair management.

---

*See [MODEL.md](/MODEL.md) at the project root for the full ecosystem documentation.*