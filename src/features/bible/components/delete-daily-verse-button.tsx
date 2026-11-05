"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { errorKey } from "@/lib/error-key";
import { deleteDailyVerseAction } from "../server/admin-actions";

export function DeleteDailyVerseButton({ date, label }: { date: string; label: string }) {
  const t = useTranslations("adminBible");
  const tErrors = useTranslations("errors.codes");
  const router = useRouter();

  async function remove(): Promise<void> {
    const result = await deleteDailyVerseAction({ date });
    toast(result.ok ? t("removed") : tErrors(errorKey(result.error.code)));
    if (result.ok) router.refresh();
  }

  return (
    <button type="button" aria-label={label} onClick={() => void remove()} className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-bg-subtle">
      <Trash2 aria-hidden="true" className="size-4" />
    </button>
  );
}
