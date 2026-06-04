"""
Chat with your fine-tuned Helix model (terminal REPL).

Loads LoRA adapters from custom_llama/ by default. Uses the chat template so
formatting matches training.

    python chat.py
    python chat.py --model custom_llama --system-prompt system_prompt.txt
"""

from __future__ import annotations

import argparse
from pathlib import Path

import torch
from unsloth import FastLanguageModel

DEFAULT_MODEL_DIR = "custom_llama"
DEFAULT_SYSTEM_PROMPT_FILE = "system_prompt.txt"


def load_system_prompt(path: Path | None) -> str:
    if path is None:
        return "You are Helix, a fast conversational AI assistant."
    if not path.is_file():
        raise FileNotFoundError(f"System prompt file not found: {path}")
    return path.read_text(encoding="utf-8").strip()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Chat with fine-tuned Helix adapters.")
    parser.add_argument("--model", default=DEFAULT_MODEL_DIR, help="Saved adapter directory.")
    parser.add_argument(
        "--system-prompt",
        default=DEFAULT_SYSTEM_PROMPT_FILE,
        help="Text file for system message (pass empty string to disable file).",
    )
    parser.add_argument("--max-new-tokens", type=int, default=256)
    parser.add_argument("--temperature", type=float, default=0.7)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    model_dir = Path(args.model)
    if not model_dir.is_dir():
        raise FileNotFoundError(
            f"Model folder not found: {model_dir.resolve()}\nRun train.py first."
        )

    system_path = Path(args.system_prompt) if args.system_prompt else None
    system_content = load_system_prompt(system_path)

    print(f"Loading {model_dir}…")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=str(model_dir),
        max_seq_length=2048,
        dtype=None,
        load_in_4bit=True,
    )
    FastLanguageModel.for_inference(model)

    history: list[dict[str, str]] = []
    print("Helix fine-tune chat (Ctrl+C to exit)\n")

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye.")
            break

        if not user_input:
            continue
        if user_input.lower() in {"/quit", "/exit", "quit", "exit"}:
            break

        messages: list[dict[str, str]] = [{"role": "system", "content": system_content}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_input})

        prompt = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=args.max_new_tokens,
                temperature=args.temperature,
                do_sample=True,
                use_cache=True,
            )

        full = tokenizer.decode(outputs[0], skip_special_tokens=True)
        # Reply is everything after the last "assistant" turn in the decoded text.
        reply = full.split("assistant")[-1].strip() if "assistant" in full.lower() else full
        print(f"Helix: {reply}\n")

        history.append({"role": "user", "content": user_input})
        history.append({"role": "assistant", "content": reply})
        # Keep context bounded for interactive chat.
        if len(history) > 12:
            history = history[-12:]


if __name__ == "__main__":
    main()
