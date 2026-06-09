"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";
import { CommandPalette } from "./command-palette";
import { MobileDock } from "./mobile-dock";
import { CloudBootstrap } from "@/components/chat/cloud-bootstrap";
import { WorkspaceProvider, useWorkspace } from "./workspace-context";

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useWorkspace();

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#08090b] text-white">
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="hidden flex-shrink-0 overflow-hidden md:block"
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col pb-12 md:pb-0">
        {children}
      </div>

      <CommandPalette />
      <MobileDock />
    </div>
  );
}

export function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <CloudBootstrap />
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}

export { TopBar };
