import Link from "next/link";
import { Download } from "lucide-react";
import { getAppDownloadMeta } from "@/lib/app-download";
import { HELIX_CLOUD_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function DownloadPage() {
  const download = getAppDownloadMeta();

  return (
    <div className="min-h-dvh overflow-y-auto bg-[#08090b] text-white scrollbar-thin">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link
          href="/"
          className="text-xs text-white/35 hover:text-white/60"
        >
          ← Back
        </Link>

        <h1 className="wordmark mt-6 text-3xl text-white/90">Download Helix</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/45">
          The Mac app bundles Helix with local AI — chat via llama-server and
          images via ComfyUI. Models download on first launch to{" "}
          <code className="rounded bg-white/[0.06] px-1 font-mono text-[11px]">
            ~/.helix/workspace
          </code>
          .
        </p>

        <div className="glass mt-8 rounded-2xl p-6">
          <p className="text-sm text-white/60">{download.platform}</p>
          <p className="mt-1 text-xs text-white/35">{download.sizeHint}</p>

          {download.ready ? (
            <a
              href={download.downloadUrl}
              download={download.filename}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-helix px-4 py-2.5 text-sm font-medium text-ink-900 hover:brightness-110"
            >
              <Download className="h-4 w-4" />
              Download {download.filename}
            </a>
          ) : (
            <p className="mt-5 text-sm text-amber-200/70">
              {download.message ?? "Download not ready yet."}
            </p>
          )}
        </div>

        <section className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
          <h2 className="text-sm font-medium text-amber-100/90">
            “Apple could not verify…” or “cannot be opened”?
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-white/45">
            Helix is not signed with an Apple Developer certificate yet, so
            macOS blocks it after download. The app is safe — this is normal for
            indie open-source Mac apps. Pick one fix:
          </p>
          <ol className="mt-4 space-y-3 text-sm text-white/55">
            <li>
              <span className="text-helix">A.</span>{" "}
              <strong className="text-white/75">Right-click</strong>{" "}
              <code className="font-mono text-xs">Helix.app</code> →{" "}
              <strong className="text-white/75">Open</strong> → click{" "}
              <strong className="text-white/75">Open</strong> in the dialog
              (not double-click)
            </li>
            <li>
              <span className="text-helix">B.</span> Open{" "}
              <strong className="text-white/75">System Settings</strong> →{" "}
              <strong className="text-white/75">Privacy &amp; Security</strong> →
              scroll down → <strong className="text-white/75">Open Anyway</strong>
            </li>
            <li>
              <span className="text-helix">C.</span> In Terminal, after moving to
              Applications:
              <pre className="mt-2 overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-[11px] text-white/70">
                xattr -dr com.apple.quarantine /Applications/Helix.app
              </pre>
            </li>
          </ol>
        </section>

        <ol className="mt-8 space-y-4 text-sm text-white/50">
          <li>
            <span className="text-helix">1.</span> Unzip and drag{" "}
            <strong className="text-white/70">Helix.app</strong> to Applications
          </li>
          <li>
            <span className="text-helix">2.</span> Use option A, B, or C above if
            macOS blocks the first launch
          </li>
          <li>
            <span className="text-helix">3.</span> Wait for first-run model
            download (~15–20 GB)
          </li>
          <li>
            <span className="text-helix">4.</span> Browser opens at{" "}
            <code className="font-mono text-xs">localhost:3000</code>
          </li>
        </ol>

        <p className="mt-10 text-xs text-white/30">
          Prefer the browser? Use the{" "}
          <a href={HELIX_CLOUD_URL} className="text-helix hover:underline">
            cloud workspace
          </a>{" "}
          instead — no install, runs on Hugging Face.
        </p>
      </div>
    </div>
  );
}
