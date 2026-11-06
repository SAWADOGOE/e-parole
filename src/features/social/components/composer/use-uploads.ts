"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ACCEPTED_IMAGE_MIMES, MAX_UPLOAD_BYTES, type UploadPurpose } from "@/features/media/constants";
import type { AssetStatus, UploadTicket } from "@/features/media/types";

export type UploadState = "uploading" | "processing" | "ready" | "failed";

export interface UploadItem {
  key: string;
  assetId: string | null;
  state: UploadState;
  error: "tooLarge" | "wrongType" | "failed" | null;
  previewUrl: string | null;
  altText: string;
}

const POLL_MS = 1500;
const POLL_LIMIT = 40;

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as T;
}

/** Attend la fin du traitement par le worker : aucune image n'est montrée avant READY. */
async function waitReady(assetId: string): Promise<AssetStatus> {
  for (let attempt = 0; attempt < POLL_LIMIT; attempt += 1) {
    const status = await json<AssetStatus>(await fetch(`/api/uploads/${assetId}`, { cache: "no-store" }));
    if (status.status === "READY" || status.status === "REJECTED") return status;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error("timeout");
}

export function previewOf(status: AssetStatus): string | null {
  return status.image ? `/api/media/${status.assetId}/${Math.min(...status.image.variants.map((v) => v.width))}.webp` : null;
}

/** Envoi en trois temps (ADR-004) : URL présignée → PUT direct au stockage → confirmation, puis attente du traitement. */
export async function uploadFile(file: File, purpose: UploadPurpose): Promise<AssetStatus> {
  const ticket = await json<UploadTicket>(
    await fetch("/api/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purpose, mime: file.type, size: file.size }) }),
  );
  const put = await fetch(ticket.uploadUrl, { method: "PUT", headers: ticket.headers, body: file });
  if (!put.ok) throw new Error("put");
  await json<AssetStatus>(await fetch(`/api/uploads/${ticket.assetId}/complete`, { method: "POST" }));
  return waitReady(ticket.assetId);
}

export function validateFile(file: File): UploadItem["error"] {
  if (!(ACCEPTED_IMAGE_MIMES as readonly string[]).includes(file.type)) return "wrongType";
  if (file.size > MAX_UPLOAD_BYTES) return "tooLarge";
  return null;
}

export function useUploads(initial: readonly { assetId: string; altText: string }[], limit: number) {
  const [items, setItems] = useState<UploadItem[]>(() =>
    initial.map((image) => ({ key: image.assetId, assetId: image.assetId, state: "processing", error: null, previewUrl: null, altText: image.altText })),
  );
  const counter = useRef(0);
  const update = useCallback((key: string, patch: Partial<UploadItem>) => setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item))), []);

  // Images d'un brouillon restauré : leur état réel est revérifié auprès du serveur.
  useEffect(() => {
    for (const image of initial) {
      void waitReady(image.assetId)
        .then((status) => update(image.assetId, status.status === "READY" ? { state: "ready", previewUrl: previewOf(status) } : { state: "failed", error: "failed" }))
        .catch(() => update(image.assetId, { state: "failed", error: "failed" }));
    }
    // Uniquement au montage : les images ajoutées ensuite suivent leur propre envoi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function add(files: FileList | readonly File[]): void {
    for (const file of Array.from(files).slice(0, Math.max(0, limit - items.length))) {
      counter.current += 1;
      const key = `local-${counter.current}`;
      const error = validateFile(file);
      setItems((current) => [...current, { key, assetId: null, state: error ? "failed" : "uploading", error, previewUrl: null, altText: "" }]);
      if (error) continue;
      void uploadFile(file, "POST_IMAGE")
        .then((status) =>
          update(key, status.status === "READY" ? { assetId: status.assetId, state: "ready", previewUrl: previewOf(status) } : { assetId: status.assetId, state: "failed", error: "failed" }),
        )
        .catch(() => update(key, { state: "failed", error: "failed" }));
    }
  }

  return {
    items,
    add,
    remove: (key: string) => setItems((current) => current.filter((item) => item.key !== key)),
    setAlt: (key: string, altText: string) => update(key, { altText }),
    clear: () => setItems([]),
    pending: items.some((item) => item.state === "uploading" || item.state === "processing"),
  };
}
