/** Client-side: true on *.vercel.app deploys. */
export function isVercelHost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname.includes("vercel.app");
}
