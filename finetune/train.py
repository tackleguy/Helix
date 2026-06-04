"""
Fine-tune a Llama instruct model on Helix-style conversations (LoRA / QLoRA).

Designed for Google Colab free tier or a local GPU. Run from the finetune/ directory:

    python train.py
    python train.py --max-steps 300 --dataset dataset.jsonl
"""

from __future__ import annotations

import argparse
from pathlib import Path

from datasets import load_dataset
from transformers import TrainingArguments
from trl import SFTTrainer
from unsloth import FastLanguageModel

# Defaults match the beginner guide; override via CLI.
DEFAULT_MODEL = "unsloth/Meta-Llama-3.1-8B-Instruct"
DEFAULT_DATASET = "dataset.jsonl"
DEFAULT_OUTPUT = "custom_llama"
DEFAULT_RUN_DIR = "outputs"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="LoRA fine-tune for Helix-style chat.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="HuggingFace model id.")
    parser.add_argument("--dataset", default=DEFAULT_DATASET, help="Path to dataset.jsonl.")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Folder for saved adapters.")
    parser.add_argument("--run-dir", default=DEFAULT_RUN_DIR, help="Trainer checkpoints/logs.")
    parser.add_argument("--max-seq-length", type=int, default=2048)
    parser.add_argument("--max-steps", type=int, default=60, help="Increase (e.g. 300) for stronger fit.")
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--grad-accum", type=int, default=4)
    parser.add_argument("--learning-rate", type=float, default=2e-4)
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=16)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    dataset_path = Path(args.dataset)
    if not dataset_path.is_file():
        raise FileNotFoundError(
            f"Dataset not found: {dataset_path.resolve()}\n"
            "Add examples to dataset.jsonl (see README)."
        )

    print(f"Loading base model: {args.model}")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=args.model,
        max_seq_length=args.max_seq_length,
        dtype=None,
        load_in_4bit=True,
    )

    print("Attaching LoRA adapters…")
    model = FastLanguageModel.get_peft_model(
        model,
        r=args.lora_r,
        target_modules=[
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ],
        lora_alpha=args.lora_alpha,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
    )

    print(f"Loading dataset: {dataset_path}")
    train_dataset = load_dataset("json", data_files=str(dataset_path), split="train")
    print(f"Training examples: {len(train_dataset)}")

    def to_text(examples):
        texts = []
        for conversation in examples["messages"]:
            texts.append(
                tokenizer.apply_chat_template(
                    conversation,
                    tokenize=False,
                    add_generation_prompt=False,
                )
            )
        return {"text": texts}

    train_dataset = train_dataset.map(to_text, batched=True)

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=train_dataset,
        dataset_text_field="text",
        max_seq_length=args.max_seq_length,
        args=TrainingArguments(
            per_device_train_batch_size=args.batch_size,
            gradient_accumulation_steps=args.grad_accum,
            warmup_steps=5,
            max_steps=args.max_steps,
            learning_rate=args.learning_rate,
            fp16=True,
            logging_steps=1,
            output_dir=args.run_dir,
            optim="adamw_8bit",
            save_strategy="steps",
            save_steps=max(10, args.max_steps // 3),
            report_to="none",
        ),
    )

    print("Starting training…")
    trainer.train()

    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(out))
    tokenizer.save_pretrained(str(out))
    print(f"Done. Adapters saved to: {out.resolve()}")
    print("Next: python chat.py   or   python export_gguf.py")


if __name__ == "__main__":
    main()
