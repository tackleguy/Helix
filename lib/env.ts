/** True when running on Vercel serverless (not local `vercel dev` unless VERCEL=1). */
export function isVercelDeploy(): boolean {
  return process.env.VERCEL === "1";
}

/** Cloud chat via OpenAI when deployed and key is configured. */
export function hasCloudChat(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function isCloudOnlyDeploy(): boolean {
  return isVercelDeploy() && !hasCloudChat();
}
