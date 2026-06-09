"use client";

import { useEffect } from "react";
import { detectCloudClient } from "@/lib/chat/cloud-client";

/** Warms cloud-mode detection for custom Vercel domains. */
export function CloudBootstrap() {
  useEffect(() => {
    void detectCloudClient();
  }, []);
  return null;
}
