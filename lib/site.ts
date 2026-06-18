import { isVercelDeploy } from "@/lib/env";

/** Public URL of the hosted cloud workspace (Vercel). */
export const HELIX_CLOUD_URL =
  process.env.NEXT_PUBLIC_HELIX_CLOUD_URL?.trim() ||
  "https://helix-five-wheat.vercel.app";

export function isCloudSite(): boolean {
  return isVercelDeploy();
}
