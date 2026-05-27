"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Button,
  FieldLabel,
  Input,
  Select,
} from "@/components/shared/ui";
import type { AppSettings } from "@/lib/settings";
import type { ServiceUrls } from "@/lib/services/registry";
import type { ServiceHealth, ServiceId } from "@/lib/services/types";
import { getServiceConfigs } from "@/lib/services/base";

type Tab = "general" | "models" | "services" | "appearance" | "data";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "general", label: "General" },
  { id: "models", label: "Models" },
  { id: "services", label: "Services" },
  { id: "appearance", label: "Appearance" },
  { id: "data", label: "Data" },
];

interface SettingsPayload {
  app: AppSettings;
  services: ServiceUrls;
}

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (res.ok) {
      setData((await res.json()) as SettingsPayload);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (partial: {
    app?: Partial<AppSettings>;
    services?: Partial<ServiceUrls>;
  }) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      if (res.ok) {
        setData((await res.json()) as SettingsPayload);
        setMessage("Saved");
      } else {
        setMessage("Save failed");
      }
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 2000);
    }
  };

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-white/35">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-44 flex-shrink-0 border-r border-white/[0.06] p-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex w-full rounded-md px-2.5 py-1.5 text-left text-sm transition duration-200",
              tab === t.id
                ? "bg-white/[0.06] text-white"
                : "text-white/45 hover:text-white/75",
            )}
          >
            {t.label}
          </button>
        ))}
        {message && (
          <p className="mt-3 px-2 text-[11px] text-helix">{message}</p>
        )}
        {saving && (
          <p className="mt-3 px-2 text-[11px] text-white/30">Saving…</p>
        )}
      </aside>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {tab === "general" && (
          <GeneralTab app={data.app} onSave={(app) => patch({ app })} />
        )}
        {tab === "models" && (
          <ModelsTab app={data.app} onSave={(app) => patch({ app })} />
        )}
        {tab === "services" && (
          <ServicesTab
            urls={data.services}
            onSave={(services) => patch({ services })}
          />
        )}
        {tab === "appearance" && (
          <AppearanceTab app={data.app} onSave={(app) => patch({ app })} />
        )}
        {tab === "data" && <DataTab />}
      </div>
    </div>
  );
}

function GeneralTab({
  app,
  onSave,
}: {
  app: AppSettings;
  onSave: (app: Partial<AppSettings>) => void;
}) {
  const [language, setLanguage] = useState(app.language);
  const [theme, setTheme] = useState(app.theme);

  return (
    <section className="max-w-md space-y-4">
      <h2 className="text-sm font-medium text-white/85">General</h2>
      <FieldLabel hint="UI language (display only in Phase 1)">Language</FieldLabel>
      <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
      <FieldLabel>Theme</FieldLabel>
      <Select
        value={theme}
        onChange={(e) =>
          setTheme(e.target.value as AppSettings["theme"])
        }
      >
        <option value="dark">Dark (default)</option>
        <option value="graphite">Graphite</option>
        <option value="porcelain">Porcelain</option>
        <option value="vapor">Vapor</option>
      </Select>
      <Button
        variant="primary"
        onClick={() => onSave({ language, theme })}
      >
        Save
      </Button>
    </section>
  );
}

function ModelsTab({
  app,
  onSave,
}: {
  app: AppSettings;
  onSave: (app: Partial<AppSettings>) => void;
}) {
  const [chat, setChat] = useState(app.defaultChatModel);
  const [image, setImage] = useState(app.defaultImageModel);
  const [voice, setVoice] = useState(app.defaultVoice);

  return (
    <section className="max-w-md space-y-4">
      <h2 className="text-sm font-medium text-white/85">Default models</h2>
      <FieldLabel hint="Used when no override is set">Chat model</FieldLabel>
      <Select value={chat} onChange={(e) => setChat(e.target.value)}>
        <option value="llama-server">llama-server</option>
        <option value="lmstudio">LM Studio</option>
        <option value="ollama">Ollama</option>
      </Select>
      <FieldLabel>Image model</FieldLabel>
      <Select value={image} onChange={(e) => setImage(e.target.value)}>
        <option value="flux-schnell">FLUX Schnell</option>
        <option value="flux-dev">FLUX Dev</option>
        <option value="sdxl-lightning">SDXL Lightning</option>
      </Select>
      <FieldLabel>Voice</FieldLabel>
      <Select value={voice} onChange={(e) => setVoice(e.target.value)}>
        <option value="coqui">Coqui TTS</option>
      </Select>
      <Button
        variant="primary"
        onClick={() =>
          onSave({
            defaultChatModel: chat,
            defaultImageModel: image,
            defaultVoice: voice,
          })
        }
      >
        Save
      </Button>
    </section>
  );
}

function ServicesTab({
  urls,
  onSave,
}: {
  urls: ServiceUrls;
  onSave: (urls: Partial<ServiceUrls>) => void;
}) {
  const configs = getServiceConfigs();
  const [local, setLocal] = useState(urls);
  const [pinging, setPinging] = useState<ServiceId | null>(null);
  const [pingResult, setPingResult] = useState<string | null>(null);

  useEffect(() => setLocal(urls), [urls]);

  const ping = async (id: ServiceId) => {
    setPinging(id);
    setPingResult(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: id, url: local[id] }),
      });
      const body = (await res.json()) as { health?: ServiceHealth };
      setPingResult(
        body.health?.online
          ? `${id}: online (${body.health.latencyMs}ms)`
          : `${id}: offline — ${body.health?.detail ?? "unknown"}`,
      );
    } catch {
      setPingResult(`${id}: ping failed`);
    } finally {
      setPinging(null);
    }
  };

  return (
    <section className="max-w-lg space-y-4">
      <h2 className="text-sm font-medium text-white/85">Service URLs</h2>
      <p className="text-xs text-white/35">
        Helix pings each backend on startup and caches status for 60 seconds.
      </p>
      {configs.map((cfg) => (
        <div key={cfg.id}>
          <FieldLabel>{cfg.label}</FieldLabel>
          <div className="mt-1.5 flex gap-2">
            <Input
              value={local[cfg.id]}
              onChange={(e) =>
                setLocal((s) => ({ ...s, [cfg.id]: e.target.value }))
              }
            />
            <Button
              type="button"
              onClick={() => void ping(cfg.id)}
              disabled={pinging === cfg.id}
            >
              {pinging === cfg.id ? "…" : "Ping"}
            </Button>
          </div>
        </div>
      ))}
      {pingResult && (
        <p className="text-xs text-white/50">{pingResult}</p>
      )}
      <Button variant="primary" onClick={() => onSave(local)}>
        Save URLs
      </Button>
    </section>
  );
}

function AppearanceTab({
  app,
  onSave,
}: {
  app: AppSettings;
  onSave: (app: Partial<AppSettings>) => void;
}) {
  const [accent, setAccent] = useState(app.accentColor);

  return (
    <section className="max-w-md space-y-4">
      <h2 className="text-sm font-medium text-white/85">Appearance</h2>
      <FieldLabel hint="Default is Helix teal #5eead4">Accent color</FieldLabel>
      <div className="mt-1.5 flex items-center gap-3">
        <input
          type="color"
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-white/[0.06] bg-transparent"
        />
        <Input value={accent} onChange={(e) => setAccent(e.target.value)} />
      </div>
      <Button variant="primary" onClick={() => onSave({ accentColor: accent })}>
        Save
      </Button>
    </section>
  );
}

function DataTab() {
  const [busy, setBusy] = useState(false);

  const exportAll = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/data/export");
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `helix-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Check ~/.helix/logs/server.log");
    } finally {
      setBusy(false);
    }
  };

  const wipe = async () => {
    if (
      !confirm(
        "Wipe the entire Helix database? All chats, images, memory, and settings will be deleted.",
      )
    ) {
      return;
    }
    if (prompt('Type WIPE_ALL_DATA to confirm') !== "WIPE_ALL_DATA") return;

    setBusy(true);
    try {
      const res = await fetch("/api/data/wipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "WIPE_ALL_DATA" }),
      });
      if (!res.ok) throw new Error("wipe failed");
      alert("Database wiped. Reload the page.");
      window.location.href = "/chat";
    } catch {
      alert("Wipe failed. Check ~/.helix/logs/server.log");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-md space-y-4">
      <h2 className="text-sm font-medium text-white/85">Data</h2>
      <p className="text-xs text-white/35">
        Database: ~/.helix/helix.db · Logs: ~/.helix/logs/server.log
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={busy} onClick={() => void exportAll()}>
          Export all data (JSON)
        </Button>
        <Button variant="danger" disabled={busy} onClick={() => void wipe()}>
          Wipe database
        </Button>
      </div>
    </section>
  );
}
