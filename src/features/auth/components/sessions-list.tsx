"use client";

import { Laptop, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { errorKey } from "@/lib/error-key";
import type { Result } from "@/server/errors/result";
import { describeDevice } from "../lib/device";
import { revokeOtherSessionsAction, revokeSessionAction } from "../server/session-actions";

export interface SessionView {
  id: string;
  createdAt: string;
  userAgent: string | null;
}

/** Sessions chargées côté serveur ; après révocation, la page est rechargée (router.refresh). */
export function SessionsList({ sessions, currentSessionId }: { sessions: SessionView[]; currentSessionId: string }) {
  const t = useTranslations("security");
  const tErrors = useTranslations("errors.codes");
  const format = useFormatter();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(task: () => Promise<Result<unknown>>) {
    setBusy(true);
    try {
      const result = await task();
      if (result.ok) toast(t("revokedToast"));
      else toast.error(tErrors(errorKey(result.error.code)));
    } catch {
      toast.error(tErrors(errorKey("INTERNAL")));
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <section aria-labelledby="sessions" className="border-t py-8">
      <h2 id="sessions" className="text-xl font-semibold text-fg">
        {t("sessionsTitle")}
      </h2>
      <p className="mt-2 text-muted">{t("sessionsIntro")}</p>
      <ul className="mt-6 divide-y border-y">
        {sessions.map((session) => {
          const device = describeDevice(session.userAgent);
          const Icon = device.mobile ? Smartphone : Laptop;
          const current = session.id === currentSessionId;
          return (
            <li key={session.id} className="flex flex-wrap items-center gap-3 py-4">
              <Icon aria-hidden="true" className="size-6 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{device.label ?? t("sessionUnknownDevice")}</p>
                <p className="text-sm text-muted">
                  {t("sessionStarted", {
                    date: format.dateTime(new Date(session.createdAt), { dateStyle: "medium", timeStyle: "short" }),
                  })}
                </p>
              </div>
              {current ? (
                <Badge tone="accent">{t("sessionCurrent")}</Badge>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => void run(() => revokeSessionAction({ sessionId: session.id }))}
                >
                  {t("revoke")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {sessions.length > 1 ? (
        <Button variant="secondary" className="mt-4" disabled={busy} onClick={() => void run(() => revokeOtherSessionsAction())}>
          {t("revokeOthers")}
        </Button>
      ) : (
        <p className="mt-4 text-sm text-muted">{t("noSessions")}</p>
      )}
    </section>
  );
}
