"use client";

import dynamic from "next/dynamic";

/** Sélecteur de thème de l'en-tête visiteur, chargé seulement quand il est affiché (les membres l'ont dans leur menu). */
export const VisitorThemeToggle = dynamic(() => import("./theme-toggle").then((module) => module.ThemeToggle), {
  ssr: false,
  loading: () => <span aria-hidden="true" className="hidden h-[54px] w-[146px] sm:inline-block" />,
});
