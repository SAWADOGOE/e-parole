"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState, type SubmitEvent } from "react";
import { FormAlert } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { errorKey } from "@/lib/error-key";
import { notify } from "@/lib/notify";
import { POST_BODY_MAX, POST_TYPES, type PostTypeName } from "../constants";
import { postPath } from "../lib/paths";
import { updatePostAction } from "../server/actions";

/** Modification par l'auteur : texte et type. Le verset cité et les images restent tels quels. */
export function EditPostForm({ postId, type: initialType, body: initialBody }: { postId: string; type: PostTypeName; body: string }) {
  const t = useTranslations("social");
  const tComposer = useTranslations("composer");
  const tErrors = useTranslations("errors.codes");
  const router = useRouter();
  const id = useId();
  const [type, setType] = useState(initialType);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await updatePostAction({ postId, type, body: body.trim() });
      if (!result.ok) return setError(tErrors(errorKey(result.error.code)));
      notify(t("editSaved"));
      router.push(postPath(postId));
      router.refresh();
    } catch {
      setError(tErrors("INTERNAL"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-type`} className="text-sm font-medium text-fg">
          {tComposer("typeLabel")}
        </label>
        <select
          id={`${id}-type`}
          value={type}
          onChange={(event) => setType(POST_TYPES.find((value) => value === event.target.value) ?? "TEXT")}
          className="h-11 rounded-sm border border-border-strong bg-bg-elevated px-3 text-base text-fg"
        >
          {POST_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`types.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-body`} className="text-sm font-medium text-fg">
          {tComposer("bodyLabel")}
        </label>
        <textarea
          id={`${id}-body`}
          value={body}
          maxLength={POST_BODY_MAX}
          rows={8}
          aria-describedby={`${id}-help`}
          onChange={(event) => setBody(event.target.value)}
          className="rounded-sm border border-border-strong bg-bg-elevated px-3 py-2 text-lg text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <p id={`${id}-help`} className="text-sm text-muted">
          {t("edit.verseLocked")}
        </p>
      </div>
      <FormAlert message={error} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.push(postPath(postId))}>
          {tComposer("close")}
        </Button>
        <Button type="submit" disabled={busy}>
          {t("editSave")}
        </Button>
      </div>
    </form>
  );
}
