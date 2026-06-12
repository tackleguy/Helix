"use client";

import { useEffect } from "react";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Helix workspace error", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#08090b] px-6 text-center text-white">
      <h1 className="text-lg font-medium text-white/90">Something went wrong</h1>
      <p className="max-w-md text-sm text-white/45">
        Helix hit an error while loading this page. Try again, or open{" "}
        <a href="/chat" className="text-helix underline">
          /chat
        </a>{" "}
        in your browser.
      </p>
      {error.message ? (
        <p className="max-w-md font-mono text-[11px] text-red-300/80">
          {error.message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-md bg-helix px-4 py-2 text-sm font-medium text-black transition hover:bg-helix/90"
      >
        Try again
      </button>
    </div>
  );
}
