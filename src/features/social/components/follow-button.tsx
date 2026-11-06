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
  return (
    <Button
      variant={state ? "secondary" : "primary"}
      aria-pressed={state}
      aria-label={state ? t("unfollow", { name }) : undefined}
      disabled={busy}
      onClick={() =>
        void run(() => followAction({ userId, active: !state }), (data) => t(data.following ? "followed" : "unfollowed", { name })).then((data) => {
          if (data) setState(data.following);
        })
      }
    >
      {state ? t("following") : t("follow")}
    </Button>
  );
}
