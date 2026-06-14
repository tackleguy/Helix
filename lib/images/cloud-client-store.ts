"use client";

import type { ImageDto } from "./types";

const IMAGES_KEY = "helix:cloud:images";
const MAX_IMAGES = 20;

let memoryImages: ImageDto[] = [];

function canUseLocalStorage(): boolean {
  try {
    const k = "__helix_img_ls__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const useStorage = typeof window !== "undefined" && canUseLocalStorage();

function readImages(): ImageDto[] {
  if (typeof window === "undefined") return [];
  if (!useStorage) return memoryImages;
  try {
    const raw = localStorage.getItem(IMAGES_KEY);
    return raw ? (JSON.parse(raw) as ImageDto[]) : [];
  } catch {
    return memoryImages;
  }
}

function writeImages(images: ImageDto[]) {
  const trimmed = images.slice(0, MAX_IMAGES);
  memoryImages = trimmed;
  if (!useStorage) return;
  try {
    localStorage.setItem(IMAGES_KEY, JSON.stringify(trimmed));
  } catch {
    while (trimmed.length > 1) {
      trimmed.pop();
      try {
        localStorage.setItem(IMAGES_KEY, JSON.stringify(trimmed));
        memoryImages = trimmed;
        return;
      } catch {
        /* drop oldest until it fits */
      }
    }
  }
}

export function listCloudImages(): ImageDto[] {
  return readImages().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveCloudImage(image: ImageDto) {
  const next = [image, ...readImages().filter((i) => i.id !== image.id)];
  writeImages(next);
}

export function isEmbeddableImageUrl(url: string): boolean {
  return url.startsWith("data:image/");
}
