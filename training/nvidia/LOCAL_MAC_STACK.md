# Local Mac Control Plane

For development on Apple Silicon (M1/M2/M3) Macs.

## Stack
- **CPU**: Apple Silicon (MPS acceleration via PyTorch MPS)
- **Memory**: 16GB+ recommended for 1.5B models
- **Storage**: 50GB+ for model weights

## Setup
```bash
# Create conda environment
conda create -n clawd-nvidia python=3.10
conda activate clawd-nvidia

# Install with MPS support
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/mps

# Install remaining deps
pip install transformers huggingface-hub peft bitsandbytes
```

## Testing
```bash
# Run agent on local Mac
python training/nvidia/nemotron_ultra_agent.py --local
```
