"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { errorKey } from "@/lib/error-key";
import { notifyError } from "@/lib/notify";
import { REACTION_EMOJI, REACTION_KINDS, type ReactionKindName } from "../constants";
import { reactAction } from "../server/actions";
import type { ReactionCounts } from "../types";

interface ReactionBarProps {
  target: "post" | "comment";
  targetId: string;
  counts: ReactionCounts;
  viewerReaction: ReactionKindName | null;
  compact?: boolean;
}

/** US-12 : trois réactions, une seule à la fois ; recliquer la même la retire. Libellé texte toujours visible. */
export function ReactionBar({ target, targetId, counts, viewerReaction, compact = false }: ReactionBarProps) {
  const t = useTranslations("social.reactions");
  const tErrors = useTranslations("errors.codes");
  const [state, setState] = useState({ counts, kind: viewerReaction });
  const [pending, startTransition] = useTransition();

  function choose(kind: ReactionKindName): void {
    if (pending) return;
    const next = state.kind === kind ? null : kind;
    const previous = state;
    const optimistic = { ...state.counts };
    if (state.kind) optimistic[state.kind] = Math.max(0, optimistic[state.kind] - 1);
    if (next) optimistic[next] += 1;
    setState({ counts: optimistic, kind: next });
    startTransition(async () => {
      try {
        const result = await reactAction({ target, targetId, kind: next });
        if (result.ok) setState({ counts: result.data.counts, kind: result.data.kind });
        else {
          setState(previous);
          notifyError(tErrors(errorKey(result.error.code)));
        }
      } catch {
        setState(previous);
        notifyError(tErrors("INTERNAL"));
      }
    });
  }

  return (
    <div role="group" aria-label={t(target === "post" ? "groupLabel" : "commentGroupLabel")} className="flex flex-wrap gap-1">
      {REACTION_KINDS.map((kind) => {
        const active = state.kind === kind;
        const count = state.counts[kind];
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={active}
            aria-disabled={pending || undefined}
            onClick={() => choose(kind)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border transition-colors duration-(--motion-fast) aria-disabled:opacity-70 ${compact ? "px-2.5 text-xs" : "px-3 text-sm"} ${active ? "border-accent bg-accent-subtle font-semibold text-fg" : "border-border text-fg hover:bg-bg-subtle"}`}
          >
            <span aria-hidden="true">{REACTION_EMOJI[kind]}</span>
            <span>{t(kind)}</span>
            {count > 0 ? <span className={`tabular-nums ${active ? "text-fg" : "text-muted"}`}>{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
