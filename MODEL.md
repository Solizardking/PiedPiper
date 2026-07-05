# 🦞 PiedPiper — NVIDIA x Solana Model Ecosystem

## Published Models (8)

| # | Model ID | Size | Description | Status |
|---|----------|------|-------------|--------|
| ⭐ | `ordlibrary/clawd-trading-wallet` | 986 MB | First wallet-bearing LLM — carries on-chain Solana keypair for autonomous trading | ✅ Live |
| 🧠 | `ordlibrary/hauhau-qwen36-onchain` | 11 GB | Onchain constitution — Solana program semantics + CA encryption primitives | ✅ Live |
| 🧠 | `ordlibrary/hauhau-qwen36-uncensored` | 11 GB | Uncensored variant of onchain constitution model | ✅ Live |
| 🦞 | `ordlibrary/core-ai-clawd-1.5b` | 986 MB | Core AI Clawd — base agent model for Solana-native AI | ✅ Live |
| 🦞 | `ordlibrary/core-ai-clawd-1.5b:finetuned` | 4.9 GB | Fine-tuned variant for improved instruction following | ✅ Live |
| 🔬 | `solanaclawd/solana-clawd-core-ai-1.5b-lora` | ~9M params | LoRA adapter for core Clawd agent | ✅ Live |
| 🔬 | `solanaclawd/solana-nvidia-trading-factory-8b-lora` | ~9M params | LoRA adapter for NVIDIA trading factory pipeline | ✅ Live |
| 🔄 | `solanaclawd/solana-tx-foundation-1.5b` | 1.5B params | Transaction foundation model — in active training | 🚧 Active |

## External Oracle Models

| Model | Purpose | Provider |
|-------|---------|----------|
| Nemotron-4 340B | Ultra-agent planning | NVIDIA |
| DeepSeek-R1 | Inference-time compute | DeepSeek |
| BGE-M3 | Embedding / reranking | BAAI |
| Llama-3.3-70B | Agent routing | Meta |
| Hermes-3 70B | Tool-use planning | Nous Research |

## Training Pipeline

```
training/nvidia/
├── blueprints/         6 NVIDIA NeMo training blueprints
├── configs/            6 model/config YAML files
├── cufolio/            4 portfolio optimization modules
├── integration/        5 bridge modules (NIM, SFT, NeMo, Plan, Trading)
├── scripts/            3 automation scripts
├── nemotron_ultra_agent.py  22.8 KB agent plan generator
├── LOCAL_MAC_STACK.md       Mac development setup
├── NEMOTRON_ULTRA_AGENT.md  Ultra agent documentation
└── README.md                Full directory documentation
```

## Lineage

The model ecosystem descends from the PiedPiper cellular automaton encryption lineage:

```
CA-PRG (Rule 150) → PP_SSH → Solana Keypair → clawd-trading-wallet
```

This makes `clawd-trading-wallet` the **first LLM that can bear an on-chain Solana wallet** — a breakthrough in sovereign AI agents.

## Deployed dApp Surface

- `index.html`: Solana-native hub for the compression, encryption, cellular automaton, and model ecosystem.
- `encrypted-chat/index.html`: encrypted Solana chat using browser-derived AES-128-GCM room keys and wallet-signed Memo ciphertext.
- `silicon-valley/index.html`: multi-agent collision-avoidance simulator derived from `MultiAgent_CollisionAvoidance/agent.cpp`, with Solana state proofs.
- `son-of-anton/index.html`: AES, DES, RSA, CA-PRG, SHA-512, and PP_SSH encryption proof surface.
- `richard-hendricks/index.html`: compression proof surface for Huffman, Arithmetic, BWT/RLE, JPEG, K-means, and PBIC modules.
