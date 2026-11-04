import type { AppErrorPayload } from "./app-error";

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppErrorPayload };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail<T = never>(error: AppErrorPayload): Result<T> {
  return { ok: false, error };
}
