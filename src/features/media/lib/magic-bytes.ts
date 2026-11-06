import type { AcceptedImageMime } from "../constants";

export type DetectedFormat = AcceptedImageMime | "image/svg+xml" | "image/gif" | "image/heic" | "unknown";

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

/**
 * Format réel d'un fichier d'après ses premiers octets : le type MIME déclaré par le navigateur n'est jamais cru.
 * SVG (texte pouvant contenir du script) et GIF sont reconnus pour être refusés explicitement.
 */
export function detectImageFormat(bytes: Uint8Array): DetectedFormat {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (ascii(bytes, 0, 4) === "GIF8") return "image/gif";
  if (ascii(bytes, 4, 8) === "ftyp" && /^(heic|heix|hevc|hevx|mif1|msf1)$/.test(ascii(bytes, 8, 12))) return "image/heic";
  const head = ascii(bytes, 0, Math.min(bytes.length, 512)).replace(/^﻿/, "").trimStart().toLowerCase();
  if (head.startsWith("<?xml") || head.startsWith("<svg") || head.includes("<svg")) return "image/svg+xml";
  return "unknown";
}
