"""NeMo Clawd — NVIDIA NeMo training orchestration for Solana agents."""
import yaml


class NeMoClawd:
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)

    def _load_config(self, path):
        with open(path) as f:
            return yaml.safe_load(f)

    def pretrain(self):
        print(f"[NeMoClawd] Starting pretrain with config: {self.config['model']}")

    def finetune(self, dataset_path: str):
        print(f"[NeMoClawd] Fine-tuning on {dataset_path}")

    def export(self, export_format="tensorrt_llm"):
        print(f"[NeMoClawd] Exporting in {export_format} format")