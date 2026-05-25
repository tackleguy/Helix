"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Hexagon, Loader2, AlertCircle, ExternalLink } from "lucide-react";

interface StatusResp {
  configured: boolean;
  reachable: boolean;
  baseUrl: string | null;
  error?: string;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusResp | null>(null);

  useEffect(() => {
    fetch("/api/librechat/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: StatusResp) => setStatus(d))
      .catch(() => setStatus({ configured: false, reachable: false, baseUrl: null }));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/librechat/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { token?: string; user?: { email: string } };
      if (data.token) {
        // Stash the short-lived access token client-side; refresh cookie is
        // already in the browser via Set-Cookie on the proxy response.
        try {
          window.localStorage.setItem("helix-lc-token", data.token);
          if (data.user) {
            window.localStorage.setItem("helix-lc-user", JSON.stringify(data.user));
          }
        } catch {
          /* ignore quota */
        }
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-bg text-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
      />

      <div className="glass relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-panel">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-accent to-accent/40 shadow-glow">
            <Hexagon className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-semibold">Helix</div>
            <div className="text-[11px] text-fg-subtle">Sign in via LibreChat</div>
          </div>
        </div>

        {status && !status.configured && (
          <BackendBanner kind="amber">
            <span className="font-medium">LibreChat not configured.</span> Set{" "}
            <code className="rounded bg-bg-elevated px-1 py-0.5 font-mono text-[10px]">
              HELIX_LIBRECHAT_URL
            </code>{" "}
            in your env and restart Helix. Until then this form will fail.
          </BackendBanner>
        )}
        {status?.configured && !status.reachable && (
          <BackendBanner kind="amber">
            <span className="font-medium">Backend unreachable</span> at{" "}
            <code className="rounded bg-bg-elevated px-1 py-0.5 font-mono text-[10px]">
              {status.baseUrl}
            </code>
            . Start LibreChat (e.g. <code className="font-mono text-[10px]">docker compose up</code>) and retry.
          </BackendBanner>
        )}

        <form onSubmit={submit} className="space-y-3">
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-400/30 bg-red-400/10 p-2 text-[12px] text-red-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!email || !password || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white shadow-glow transition hover:bg-accent/90 disabled:bg-bg-elevated disabled:text-fg-subtle disabled:shadow-none"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-fg-subtle">
          Or skip auth and{" "}
          <a className="text-accent underline-offset-2 hover:underline" href="/">
            use local Helix
          </a>{" "}
          (llama.cpp + Pollinations).
        </p>
        {status?.configured && status.baseUrl && (
          <p className="mt-2 flex items-center justify-center gap-1 text-center text-[10px] text-fg-subtle">
            backend: <code className="font-mono">{status.baseUrl}</code>
            <a
              href={status.baseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg-subtle hover:text-fg"
            >
              <ExternalLink className="inline h-3 w-3" />
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-line-subtle bg-bg-panel px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-line focus:outline-none"
      />
    </label>
  );
}

function BackendBanner({
  kind,
  children,
}: {
  kind: "amber" | "red";
  children: React.ReactNode;
}) {
  const c = kind === "amber"
    ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
    : "border-red-400/30 bg-red-400/10 text-red-300";
  return (
    <div className={`mb-4 rounded-md border ${c} p-2.5 text-[12px]`}>
      {children}
    </div>
  );
}
