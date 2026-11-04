const BROWSERS: readonly [RegExp, string][] = [
  [/edg\//i, "Edge"],
  [/opr\//i, "Opera"],
  [/chrome\//i, "Chrome"],
  [/firefox\//i, "Firefox"],
  [/safari\//i, "Safari"],
];

const SYSTEMS: readonly [RegExp, string][] = [
  [/android/i, "Android"],
  [/iphone|ipad/i, "iOS"],
  [/windows/i, "Windows"],
  [/mac os/i, "macOS"],
  [/linux/i, "Linux"],
];

/** Libellé lisible d'un appareil à partir du User-Agent (aucune donnée transmise à un tiers). */
export function describeDevice(userAgent: string | null): { mobile: boolean; label: string | null } {
  if (!userAgent) return { mobile: false, label: null };
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const label = [browser, system].filter(Boolean).join(" · ");
  return { mobile: /android|iphone|ipad|mobile/i.test(userAgent), label: label || null };
}
