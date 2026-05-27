"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button, FieldLabel } from "@/components/shared/ui";

interface SystemPromptPanelProps {
  open: boolean;
  value: string;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
}

export function SystemPromptPanel({
  open,
  value,
  onClose,
  onSave,
}: SystemPromptPanelProps) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(value), [value, open]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 360 }}
            animate={{ x: 0 }}
            exit={{ x: 360 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-y-0 right-0 z-[160] flex w-full max-w-md flex-col border-l border-white/[0.06] bg-ink-900"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <h2 className="text-sm font-medium text-white/85">
                System prompt
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="grid h-7 w-7 place-items-center rounded-md text-white/40 hover:bg-white/[0.04]"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <FieldLabel hint="Instructions for this session only">
                Prompt
              </FieldLabel>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={12}
                placeholder="You are Helix, a precise local assistant…"
                className="flex-1 resize-none rounded-lg border border-white/[0.06] bg-[#08090b] px-3 py-2 text-sm text-white/85 placeholder:text-white/25 focus:border-white/[0.12] focus:outline-none scrollbar-thin"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={saving}
                  onClick={() => void save()}
                >
                  Save
                </Button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
