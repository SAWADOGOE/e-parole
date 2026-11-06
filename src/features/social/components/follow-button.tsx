"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { followAction } from "../server/actions";
import { useActionRunner } from "./use-action-runner";

/** US-13 : suivre / ne plus suivre ; l'état affiché suit la réponse du serveur. */
export function FollowButton({ userId, name, following }: { userId: string; name: string; following: boolean }) {
  const t = useTranslations("people");
  const { busy, run } = useActionRunner();
  const [state, setState] = useState(following);
  // Le nom accessible commence par le texte visible (WCAG 2.5.3) et nomme la personne ; l'action change avec l'état.
  return (
    <Button
      variant={state ? "secondary" : "primary"}
      aria-label={state ? t("unfollow", { name }) : t("followName", { name })}
      aria-disabled={busy || undefined}
      onClick={() => {
        if (busy) return;
        void run(() => followAction({ userId, active: !state }), (data) => t(data.following ? "followed" : "unfollowed", { name })).then((data) => {
          if (data) setState(data.following);
        });
      }}
    >
      {state ? t("unfollowShort") : t("follow")}
    </Button>
  );
}
