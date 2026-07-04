#!/bin/bash
echo "=== Downloading NVIDIA Models ==="
huggingface-cli download ordlibrary/clawd-trading-wallet --local-dir training/nvidia/models/clawd-trading-wallet
huggingface-cli download ordlibrary/core-ai-clawd-1.5b --local-dir training/nvidia/models/core-ai-clawd
echo "✅ Core models downloaded"
