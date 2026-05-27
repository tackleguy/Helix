"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  GitBranch,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { groupSessions, type SessionListItem } from "@/lib/chat/session-buckets";

export function ChatSessionList() {
  const pathname = usePathname();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/chat/sessions", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as {
        sessions: Array<{ id: string; title: string; updatedAt: string | Date }>;
      };
      setSessions(
        data.sessions.map((s) => ({
          id: s.id,
          title: s.title,
          updatedAt: new Date(s.updatedAt).getTime(),
        })),
      );
    }
  }, []);

  useEffect(() => {
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const newChat = async () => {
    const res = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const { session } = (await res.json()) as { session: { id: string } };
      router.push(`/chat/${session.id}`);
      void load();
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm("Delete this chat?")) return;
    await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
    if (pathname.includes(id)) router.push("/chat");
    void load();
  };

  const archiveSession = async (id: string) => {
    await fetch(`/api/chat/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (pathname.includes(id)) router.push("/chat");
    void load();
  };

  const renameSession = async (id: string, title: string) => {
    const next = prompt("Rename chat", title);
    if (!next?.trim()) return;
    await fetch(`/api/chat/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next.trim() }),
    });
    void load();
  };

  const branchSession = async (id: string) => {
    const res = await fetch(`/api/chat/sessions/${id}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      messages: Array<{ id: string; role: string }>;
    };
    const last = [...data.messages].reverse()[0];
    if (!last) return;
    const branchRes = await fetch(`/api/chat/sessions/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ untilMessageId: last.id }),
    });
    if (branchRes.ok) {
      const { session } = (await branchRes.json()) as { session: { id: string } };
      router.push(`/chat/${session.id}`);
      void load();
    }
  };

  const grouped = groupSessions(sessions);
  const activeId = pathname.match(/\/chat\/([^/]+)/)?.[1];

  return (
    <div className="border-t border-white/[0.06] px-2 pb-2 pt-2">
      <button
        type="button"
        onClick={() => void newChat()}
        className="mb-2 flex w-full items-center gap-2 rounded-md border border-white/[0.06] px-2.5 py-1.5 text-xs text-white/60 transition hover:border-white/[0.12] hover:text-white/85"
      >
        <Plus className="h-3.5 w-3.5 text-helix" strokeWidth={1.75} />
        New chat
      </button>

      <div className="max-h-[40vh] overflow-y-auto scrollbar-thin">
        {grouped.length === 0 ? (
          <p className="px-2 py-3 text-[11px] text-white/25">No chats yet</p>
        ) : (
          grouped.map(([bucket, items]) => (
            <div key={bucket} className="mb-2">
              <p className="px-2 pb-0.5 text-[10px] uppercase tracking-wider text-white/25">
                {bucket}
              </p>
              <ul className="space-y-0.5">
                {items.map((s) => {
                  const active = s.id === activeId;
                  return (
                    <li key={s.id} className="group relative">
                      <Link
                        href={`/chat/${s.id}`}
                        className={cn(
                          "block truncate rounded-md border-l-2 py-1.5 pl-2.5 pr-8 text-xs transition duration-200",
                          active
                            ? "border-helix bg-white/[0.04] text-white"
                            : "border-transparent text-white/45 hover:bg-white/[0.03] hover:text-white/75",
                        )}
                      >
                        {s.title || "New chat"}
                      </Link>
                      <div className="absolute right-0 top-0 flex items-center gap-0.5 py-0.5 pr-1 opacity-0 transition group-hover:opacity-100">
                        <IconBtn
                          icon={Pencil}
                          label="Rename"
                          onClick={() => void renameSession(s.id, s.title)}
                        />
                        <IconBtn
                          icon={GitBranch}
                          label="Branch"
                          onClick={() => void branchSession(s.id)}
                        />
                        <IconBtn
                          icon={Archive}
                          label="Archive"
                          onClick={() => void archiveSession(s.id)}
                        />
                        <IconBtn
                          icon={Trash2}
                          label="Delete"
                          onClick={() => void deleteSession(s.id)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function IconBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="grid h-6 w-6 place-items-center rounded-md text-white/30 hover:bg-white/[0.06] hover:text-white/70"
    >
      <Icon className="h-3 w-3" strokeWidth={1.75} />
    </button>
  );
}
