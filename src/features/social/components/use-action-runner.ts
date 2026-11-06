"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { errorKey } from "@/lib/error-key";
import { notify, notifyError } from "@/lib/notify";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

/** Exécute une Server Action, annonce le résultat (toast aria-live) et rafraîchit la page ; la 3G peut faire échouer l'appel. */
export function useActionRunner() {
  const tErrors = useTranslations("errors.codes");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run<T>(call: () => Promise<ActionResult<T>>, success: string | ((data: T) => string), options: { refresh?: boolean } = {}): Promise<T | null> {
    setBusy(true);
    try {
      const result = await call();
      if (!result.ok) {
        notifyError(result.error.code === "FORBIDDEN" && result.error.message ? result.error.message : tErrors(errorKey(result.error.code)));
        return null;
      }
      notify(typeof success === "string" ? success : success(result.data));
      if (options.refresh !== false) router.refresh();
      return result.data;
    } catch {
      notifyError(tErrors("INTERNAL"));
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { busy, run };
}
