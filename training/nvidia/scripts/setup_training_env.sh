#!/bin/bash
echo "=== Setting up NVIDIA Training Environment ==="
pip install torch==2.4.0 transformers==4.44.0 nemo-toolkit==1.23.0 \
    huggingface-hub==0.24.0 peft==0.12.0 bitsandbytes==0.43.0 \
    triton==3.0.0 tensorrt-llm==0.12.0
echo "✅ Environment ready"
