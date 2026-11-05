"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { READER_FONTS, READER_FONT_SIZES, READER_LINE_HEIGHTS, READER_THEMES } from "../constants";
import type { ReaderPrefs } from "../types";
import { ReaderSheet } from "./reader-sheet";

const LINE_LABELS = { 1.5: "lineCompact", 1.7: "lineNormal", 1.9: "lineAiry" } as const;

function Choice<T extends string | number | boolean>({ label, options, value, onChange }: { label: string; options: readonly { value: T; label: string }[]; value: T; onChange: (next: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-fg">{label}</legend>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => (
          <label
            key={String(option.value)}
            className={cn(
              "relative inline-flex h-11 min-w-11 flex-1 cursor-pointer items-center justify-center rounded-md border px-3 text-sm text-fg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
              option.value === value && "border-accent bg-accent-subtle font-semibold",
            )}
          >
            <input type="radio" name={label} className="sr-only" checked={option.value === value} onChange={() => onChange(option.value)} />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Stepper({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="inline-flex size-11 items-center justify-center rounded-md border text-fg hover:bg-bg-subtle disabled:opacity-50">
      {children}
    </button>
  );
}

export default function SettingsSheet({ prefs, persisted, onChange, onClose }: { prefs: ReaderPrefs; persisted: boolean; onChange: (next: ReaderPrefs) => void; onClose: () => void }) {
  const t = useTranslations("bible.settings");
  const sizes = READER_FONT_SIZES;
  const index = sizes.indexOf(prefs.fontSize as (typeof sizes)[number]);
  const setSize = (next: number | undefined): void => {
    if (next !== undefined) onChange({ ...prefs, fontSize: next });
  };
  return (
    <ReaderSheet title={t("title")} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-fg">{t("size")}</p>
          <div className="flex items-center gap-3">
            <Stepper label={t("smaller")} disabled={index <= 0} onClick={() => setSize(sizes[index - 1])}>
              <Minus aria-hidden="true" className="size-5" />
            </Stepper>
            <output aria-live="polite" className="min-w-14 text-center text-sm text-fg tabular-nums">
              {t("sizeValue", { size: prefs.fontSize })}
            </output>
            <Stepper label={t("larger")} disabled={index >= sizes.length - 1} onClick={() => setSize(sizes[index + 1])}>
              <Plus aria-hidden="true" className="size-5" />
            </Stepper>
          </div>
        </div>
        <Choice
          label={t("lineHeight")}
          value={prefs.lineHeight}
          options={READER_LINE_HEIGHTS.map((value) => ({ value: value, label: t(LINE_LABELS[value]) }))}
          onChange={(lineHeight) => onChange({ ...prefs, lineHeight })}
        />
        <Choice
          label={t("theme")}
          value={prefs.theme}
          options={READER_THEMES.map((value) => ({ value, label: t(`theme${value}`) }))}
          onChange={(theme) => onChange({ ...prefs, theme })}
        />
        <Choice
          label={t("font")}
          value={prefs.font}
          options={READER_FONTS.map((value) => ({ value, label: t(`font${value}`) }))}
          onChange={(font) => onChange({ ...prefs, font })}
        />
        <Choice
          label={t("numbers")}
          value={prefs.showVerseNumbers}
          options={[
            { value: true, label: t("numbersOn") },
            { value: false, label: t("numbersOff") },
          ]}
          onChange={(showVerseNumbers) => onChange({ ...prefs, showVerseNumbers })}
        />
        {persisted ? null : <p className="text-sm text-muted">{t("localOnly")}</p>}
      </div>
    </ReaderSheet>
  );
}
