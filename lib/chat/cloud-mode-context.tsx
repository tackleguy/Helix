"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { detectCloudClient, isCloudClient } from "./cloud-client";

export interface CloudModeState {
  /** Browser should use localStorage sessions + stateless /api/chat. */
  onCloud: boolean;
  ready: boolean;
  cloudChat: boolean;
  huggingface: boolean;
  openai: boolean;
  defaultModel: string | null;
}

const defaultState: CloudModeState = {
  onCloud: false,
  ready: false,
  cloudChat: false,
  huggingface: false,
  openai: false,
  defaultModel: null,
};

const CloudModeContext = createContext<CloudModeState>(defaultState);

export function CloudModeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CloudModeState>(() => ({
    ...defaultState,
    onCloud: isCloudClient(),
  }));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const onCloud = isCloudClient() || (await detectCloudClient());
      if (cancelled) return;

      if (!onCloud) {
        setState({ ...defaultState, onCloud: false, ready: true });
        return;
      }

      try {
        const res = await fetch("/api/cloud-status", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as {
            cloudChat?: boolean;
            huggingface?: boolean;
            openai?: boolean;
            defaultModel?: string | null;
          };
          if (!cancelled) {
            setState({
              onCloud: true,
              ready: true,
              cloudChat: Boolean(data.cloudChat),
              huggingface: Boolean(data.huggingface),
              openai: Boolean(data.openai),
              defaultModel: data.defaultModel ?? null,
            });
          }
          return;
        }
      } catch {
        /* fall through */
      }

      if (!cancelled) {
        setState({
          onCloud: true,
          ready: true,
          cloudChat: false,
          huggingface: false,
          openai: false,
          defaultModel: null,
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return (
    <CloudModeContext.Provider value={value}>{children}</CloudModeContext.Provider>
  );
}

export function useCloudMode(): CloudModeState {
  return useContext(CloudModeContext);
}
