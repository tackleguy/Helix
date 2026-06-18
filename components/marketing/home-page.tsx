import Link from "next/link";
import { Cloud, Download, MessageSquare, Sparkles } from "lucide-react";
import { HELIX_CLOUD_URL } from "@/lib/site";
import type { getAppDownloadMeta } from "@/lib/app-download";

type DownloadMeta = ReturnType<typeof getAppDownloadMeta>;

interface HomePageProps {
  isCloudHost: boolean;
  cloudChat: boolean;
  download: DownloadMeta;
}

export function HomePage({
  isCloudHost,
  cloudChat,
  download,
}: HomePageProps) {
  const cloudReady = isCloudHost && cloudChat;
  const cloudHref = isCloudHost ? "/chat" : HELIX_CLOUD_URL;

  return (
    <div className="min-h-dvh overflow-y-auto bg-[#08090b] text-white scrollbar-thin">
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-6 py-12">
        <header className="mb-16">
          <p className="wordmark text-3xl text-white/90">Helix</p>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/45">
            AI workspace for chat and images. Use the cloud in your browser, or
            download the Mac app to run everything locally — no credits required.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="glass flex flex-col rounded-2xl p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-helix/10 text-helix">
              <Cloud className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h2 className="text-lg font-medium text-white/90">Cloud</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-white/40">
              Open Helix in your browser. Chat and images powered by Hugging
              Face — sign in with your deployed API keys, nothing to install.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-white/35">
              <li className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-helix" />
                Streaming chat in the browser
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-helix" />
                FLUX image generation via HF
              </li>
            </ul>
            {isCloudHost ? (
              <Link
                href="/chat"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-helix px-4 py-2.5 text-sm font-medium text-ink-900 transition hover:brightness-110"
              >
                {cloudReady ? "Open workspace" : "Open workspace"}
              </Link>
            ) : (
              <a
                href={cloudHref}
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-helix px-4 py-2.5 text-sm font-medium text-ink-900 transition hover:brightness-110"
              >
                Open cloud site
              </a>
            )}
            {!cloudReady && isCloudHost && (
              <p className="mt-2 text-[11px] text-amber-200/60">
                Set HF_API_KEY on Vercel to enable cloud AI.
              </p>
            )}
          </section>

          <section className="glass flex flex-col rounded-2xl p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-white/70">
              <Download className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h2 className="text-lg font-medium text-white/90">Local Mac app</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-white/40">
              Download Helix for macOS. Runs chat and images fully offline with
              llama-server and ComfyUI on your machine.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-white/35">
              <li>· {download.platform}</li>
              <li>· {download.sizeHint}</li>
              <li>· No Hugging Face credits needed</li>
            </ul>
            {download.ready ? (
              <a
                href={download.downloadUrl}
                download={download.filename}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/85 transition hover:border-white/[0.16] hover:bg-white/[0.06]"
              >
                <Download className="h-4 w-4" strokeWidth={1.75} />
                Download {download.filename}
              </a>
            ) : (
              <Link
                href="/download"
                className="mt-6 inline-flex items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/85 transition hover:border-white/[0.16]"
              >
                Download details
              </Link>
            )}
            <Link
              href="/download"
              className="mt-2 text-center text-[11px] text-white/30 hover:text-helix"
            >
              Install instructions →
            </Link>
          </section>
        </div>

        {!isCloudHost && (
          <section className="mt-4 glass rounded-2xl p-6">
            <h2 className="text-sm font-medium text-white/75">Local development</h2>
            <p className="mt-1 text-xs text-white/40">
              Running from source on this machine?
            </p>
            <Link
              href="/chat"
              className="mt-4 inline-flex rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-white/70 hover:text-white"
            >
              Open local workspace →
            </Link>
          </section>
        )}

        <footer className="mt-auto pt-16 text-[11px] text-white/25">
          {isCloudHost ? (
            <span>Cloud workspace · </span>
          ) : (
            <span>Local dev · </span>
          )}
          <a href={HELIX_CLOUD_URL} className="hover:text-white/45">
            {HELIX_CLOUD_URL.replace(/^https?:\/\//, "")}
          </a>
        </footer>
      </div>
    </div>
  );
}
