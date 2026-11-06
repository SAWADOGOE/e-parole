"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { THEME_STORAGE_KEY, THEMES, type ThemePreference } from "@/components/shared/theme-constants";
import { DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { useStoredPreference } from "@/hooks/use-stored-preference";
import { DATA_SAVER_COOKIE } from "@/lib/data-saver";

function applyTheme(preference: ThemePreference): void {
  const dark = preference === "dark" || (preference === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/**
 * Réglages du menu du compte sous forme de vrais éléments de menu (WCAG 2.1.1) : un bouton ou un groupe radio posé
 * dans un menu Radix n'est pas joignable au clavier (Tab bloqué, flèches limitées aux éléments du menu).
 */
export function AccountPreferences({ dataSaver }: { dataSaver: boolean | undefined }) {
  const tTheme = useTranslations("theme");
  const t = useTranslations("nav");
  const router = useRouter();
  const [stored, setStored] = useStoredPreference(THEME_STORAGE_KEY);
  const theme: ThemePreference = stored === "light" || stored === "dark" ? stored : "system";
  const [saver, setSaver] = useState(dataSaver ?? false);

  return (
    <>
      <DropdownMenuLabel>{tTheme("label")}</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={theme}
        onValueChange={(value) => {
          const next = THEMES.find((candidate) => candidate === value) ?? "system";
          setStored(next === "system" ? null : next);
          applyTheme(next);
        }}
      >
        {THEMES.map((value) => (
          // Le menu reste ouvert : on peut comparer les thèmes sans le rouvrir.
          <DropdownMenuRadioItem key={value} value={value} onSelect={(event) => event.preventDefault()}>
            {tTheme(value)}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      {dataSaver === undefined ? null : (
        <DropdownMenuCheckboxItem
          checked={saver}
          onSelect={(event) => event.preventDefault()}
          onCheckedChange={(checked) => {
            setSaver(checked);
            document.cookie = `${DATA_SAVER_COOKIE}=${checked ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax`;
            router.refresh();
          }}
        >
          <span>
            {t("dataSaver")}
            <span className="block text-xs text-muted">{t("dataSaverHelp")}</span>
          </span>
        </DropdownMenuCheckboxItem>
      )}
    </>
  );
}
