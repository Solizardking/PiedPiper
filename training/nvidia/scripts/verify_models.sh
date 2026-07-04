#!/bin/bash
echo "=== NVIDIA Model Verification ==="
MODELS_DIR="training/nvidia/models"
for dir in "$MODELS_DIR"/*/; do
    name=$(basename "$dir")
    if [ -f "$dir/config.json" ]; then
        echo "✅ $name — config.json present"
    else
        echo "⚠️  $name — config.json MISSING (run download)"
    fi
done
echo "=== Verification Complete ==="
