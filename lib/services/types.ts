export type ServiceId =
  | "lmstudio"
  | "ollama"
  | "llama-server"
  | "comfyui"
  | "whisper"
  | "coqui"
  | "chroma";

export interface ServiceHealth {
  id: ServiceId;
  label: string;
  url: string;
  online: boolean;
  latencyMs: number | null;
  detail: string | null;
  checkedAt: number;
}

export interface ServiceConfig {
  id: ServiceId;
  label: string;
  defaultUrl: string;
  healthPath: string;
}
