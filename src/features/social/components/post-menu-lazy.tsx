"use client";

import { MoreHorizontal } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { LazyMenuTrigger } from "@/components/shared/lazy-menu-trigger";
import type { PostMenuProps } from "./post-menu";

const load = () => import("./post-menu");
const BUTTON = "inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-bg-subtle";
// Pendant le téléchargement, un bouton identique reste en place : rien ne bouge à l'écran.
const PostMenu = dynamic(load, {
  ssr: false,
  loading: () => (
    <span aria-hidden="true" className={BUTTON}>
      <MoreHorizontal className="size-5" />
    </span>
  ),
});

/** Bouton « … » léger ; le menu complet (Radix, dialogues, signalement) n'est chargé qu'à la demande. */
export function PostMenuLazy(props: Omit<PostMenuProps, "initialOpen">) {
  const t = useTranslations("social");
  return (
    <LazyMenuTrigger
      label={t("menu.label")}
      className={BUTTON}
      icon={<MoreHorizontal aria-hidden="true" className="size-5" />}
      preload={() => void load()}
      render={() => <PostMenu {...props} initialOpen />}
    />
  );
}
