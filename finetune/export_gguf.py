"""
Export fine-tuned adapters to GGUF for Ollama / llama-server / LM Studio.

    python export_gguf.py
    python export_gguf.py --quant q8_0

After export, see README for Ollama Modelfile and Helix integration.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from unsloth import FastLanguageModel

DEFAULT_MODEL_DIR = "custom_llama"
DEFAULT_GGUF_DIR = "gguf"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export LoRA adapters to GGUF.")
    parser.add_argument("--model", default=DEFAULT_MODEL_DIR, help="Adapter directory from train.py.")
    parser.add_argument("--out", default=DEFAULT_GGUF_DIR, help="Output directory for GGUF files.")
    parser.add_argument(
        "--quant",
        default="q4_k_m",
        choices=["q4_k_m", "q8_0", "f16"],
        help="Quantization method (q4_k_m is a good default for local chat).",
    )
    parser.add_argument("--merge", action="store_true", help="Also save merged 16-bit weights.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    model_dir = Path(args.model)
    if not model_dir.is_dir():
        raise FileNotFoundError(f"Run train.py first. Missing: {model_dir.resolve()}")

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading adapters from {model_dir}…")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=str(model_dir),
        max_seq_length=2048,
        dtype=None,
        load_in_4bit=True,
    )

    if args.merge:
        merged = out_dir / "merged"
        print(f"Saving merged weights to {merged}…")
        model.save_pretrained_merged(str(merged), tokenizer, save_method="merged_16bit")

    print(f"Exporting GGUF ({args.quant}) to {out_dir}…")
    model.save_pretrained_gguf(
        str(out_dir),
        tokenizer,
        quantization_method=args.quant,
    )
    print(f"Done. GGUF files in: {out_dir.resolve()}")


if __name__ == "__main__":
    main()
