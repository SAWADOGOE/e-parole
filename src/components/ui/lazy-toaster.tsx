"use client";

import dynamic from "next/dynamic";

/** Hors de la charge initiale : les messages n'apparaissent jamais avant une action de l'utilisateur. */
export const LazyToaster = dynamic(() => import("./sonner").then((module) => module.Toaster), { ssr: false });
