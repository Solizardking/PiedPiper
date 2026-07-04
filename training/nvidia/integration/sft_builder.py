"""SFT Builder — Supervised Fine-Tuning with LoRA."""
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer
from peft import LoraConfig, get_peft_model


class SFTBuilder:
    def __init__(self, base_model: str, lora_r=16, lora_alpha=32, lora_dropout=0.05):
        self.tokenizer = AutoTokenizer.from_pretrained(base_model)
        self.model = AutoModelForCausalLM.from_pretrained(
            base_model, torch_dtype=torch.bfloat16
        )
        lora_config = LoraConfig(
            r=lora_r, lora_alpha=lora_alpha, lora_dropout=lora_dropout
        )
        self.model = get_peft_model(self.model, lora_config)

    def train(
        self, dataset, output_dir: str, num_epochs=3, batch_size=4, lr=1e-5
    ):
        args = TrainingArguments(
            output_dir=output_dir,
            num_train_epochs=num_epochs,
            per_device_train_batch_size=batch_size,
            learning_rate=lr,
            bf16=True,
            save_strategy="epoch",
            logging_steps=10,
        )
        trainer = Trainer(model=self.model, args=args, train_dataset=dataset)
        trainer.train()
        return trainer