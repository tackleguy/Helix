"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";

interface WorkspaceContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((v: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  paletteOpen: boolean;
  setPaletteOpen: Dispatch<SetStateAction<boolean>>;
  runCommand: (action: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const toggleSidebar = useCallback(
    () => setSidebarOpen((v) => !v),
    [],
  );

  const runCommand = useCallback(
    async (action: string) => {
      switch (action) {
        case "new-chat": {
          const res = await fetch("/api/chat/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          if (res.ok) {
            const { session } = (await res.json()) as {
              session: { id: string };
            };
            router.push(`/chat/${session.id}`);
          }
          break;
        }
        case "clear-chats": {
          if (
            !confirm(
              "Clear all chat sessions? This cannot be undone.",
            )
          ) {
            return;
          }
          await fetch("/api/chat/sessions", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirm: true }),
          });
          router.push("/chat");
          router.refresh();
          break;
        }
        case "toggle-sidebar":
          toggleSidebar();
          break;
      }
    },
    [router, toggleSidebar],
  );

  const value = useMemo(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      toggleSidebar,
      paletteOpen,
      setPaletteOpen,
      runCommand,
    }),
    [sidebarOpen, toggleSidebar, paletteOpen, runCommand],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}
