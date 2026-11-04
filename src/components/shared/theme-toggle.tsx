"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useStoredPreference } from "@/hooks/use-stored-preference";
import { cn } from "@/lib/cn";
import { THEME_STORAGE_KEY, THEMES, type ThemePreference } from "./theme-constants";

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

function apply(preference: ThemePreference): void {
  const dark = preference === "dark" || (preference === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("theme");
  const [stored, setStored] = useStoredPreference(THEME_STORAGE_KEY);
  const preference: ThemePreference = stored === "light" || stored === "dark" ? stored : "system";

  function choose(next: ThemePreference): void {
    setStored(next === "system" ? null : next);
    apply(next);
  }

  return (
    <div role="radiogroup" aria-label={t("label")} className={cn("inline-flex rounded-md border bg-bg-elevated p-1", className)}>
      {THEMES.map((theme) => {
        const Icon = ICONS[theme];
        const selected = preference === theme;
        return (
          <button
            key={theme}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => choose(theme)}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-sm text-muted transition-colors",
              selected && "bg-accent-subtle text-accent",
            )}
          >
            <Icon aria-hidden="true" className="size-5" />
            <span className="sr-only">{t(theme)}</span>
          </button>
        );
      })}
    </div>
  );
}
