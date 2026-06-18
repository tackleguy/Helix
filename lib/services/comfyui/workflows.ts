import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DiffusionImageModelId } from "@/lib/images/types";

export interface WorkflowParams {
  prompt: string;
  negativePrompt: string;
  seed: number;
  width: number;
  height: number;
  steps: number;
  cfg: number;
}

export interface WorkflowDefinition {
  id: DiffusionImageModelId;
  label: string;
  checkpoint: string;
  defaultSteps: number;
  defaultCfg: number;
  /** Node IDs to patch in the API workflow JSON */
  nodes: {
    positive: string;
    negative: string;
    sampler: string;
    latent: string;
  };
}

export const WORKFLOW_DEFS: Record<DiffusionImageModelId, WorkflowDefinition> = {
  "flux-schnell": {
    id: "flux-schnell",
    label: "FLUX Schnell",
    checkpoint: "flux1-schnell.safetensors",
    defaultSteps: 4,
    defaultCfg: 1,
    nodes: { positive: "2", negative: "3", sampler: "5", latent: "4" },
  },
  "flux-dev": {
    id: "flux-dev",
    label: "FLUX Dev",
    checkpoint: "flux1-dev.safetensors",
    defaultSteps: 20,
    defaultCfg: 3.5,
    nodes: { positive: "2", negative: "3", sampler: "5", latent: "4" },
  },
  "sdxl-lightning": {
    id: "sdxl-lightning",
    label: "SDXL Lightning",
    checkpoint: "sdxl_lightning_4step.safetensors",
    defaultSteps: 4,
    defaultCfg: 1,
    nodes: { positive: "2", negative: "3", sampler: "5", latent: "4" },
  },
};

const WORKFLOWS_DIR = join(process.cwd(), "lib", "services", "comfyui", "workflows");

export function loadWorkflowTemplate(model: DiffusionImageModelId): Record<string, unknown> {
  const path = join(WORKFLOWS_DIR, `${model}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

export function buildComfyPrompt(
  model: DiffusionImageModelId,
  params: WorkflowParams,
): Record<string, unknown> {
  const def = WORKFLOW_DEFS[model];
  const workflow = structuredClone(loadWorkflowTemplate(model)) as Record<
    string,
    { inputs?: Record<string, unknown>; class_type?: string }
  >;

  const ckpt = workflow["1"];
  if (ckpt?.inputs) {
    ckpt.inputs.ckpt_name = def.checkpoint;
  }

  const positive = workflow[def.nodes.positive];
  if (positive?.inputs) positive.inputs.text = params.prompt;

  const negative = workflow[def.nodes.negative];
  if (negative?.inputs) negative.inputs.text = params.negativePrompt;

  const latent = workflow[def.nodes.latent];
  if (latent?.inputs) {
    latent.inputs.width = params.width;
    latent.inputs.height = params.height;
  }

  const sampler = workflow[def.nodes.sampler];
  if (sampler?.inputs) {
    sampler.inputs.seed = params.seed;
    sampler.inputs.steps = params.steps;
    sampler.inputs.cfg = params.cfg;
  }

  return workflow;
}
