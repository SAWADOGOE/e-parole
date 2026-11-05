"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { errorKey } from "@/lib/error-key";
import { removeBookmarkAction, removeHighlightAction } from "../server/actions";

export function RemoveAnnotationButton({ id, kind, reference }: { id: string; kind: "highlight" | "bookmark"; reference: string }) {
  const t = useTranslations("bible.annotations");
  const tErrors = useTranslations("errors.codes");
  const router = useRouter();

  async function remove(): Promise<void> {
    const result = await (kind === "highlight" ? removeHighlightAction({ id }) : removeBookmarkAction({ id }));
    toast(result.ok ? t("removed") : tErrors(errorKey(result.error.code)));
    if (result.ok) router.refresh();
  }

  return (
    <button type="button" aria-label={t("remove", { reference })} onClick={() => void remove()} className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted hover:bg-bg-subtle">
      <Trash2 aria-hidden="true" className="size-5" />
    </button>
  );
}
