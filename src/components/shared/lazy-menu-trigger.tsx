"use client";

import { useState, type ReactNode } from "react";

interface LazyMenuTriggerProps {
  label: string;
  className: string;
  icon: ReactNode;
  /** Charge le module du menu ; appelé au survol, au focus, à l'appui, et attendu au clic. */
  preload: () => Promise<unknown>;
  /** Le menu complet, rendu ouvert dès qu'il est chargé ; il remplace ce bouton. */
  render: () => ReactNode;
}

/**
 * Menu chargé à la demande (docs/29, budget JS de /) : seul ce bouton est envoyé avec la page. Au clic, le bouton reste
 * en place (et garde le focus, `aria-busy`) jusqu'à ce que le module soit là ; le vrai menu s'ouvre alors avec le focus.
 */
export function LazyMenuTrigger({ label, className, icon, preload, render }: LazyMenuTriggerProps) {
  const [state, setState] = useState<"idle" | "loading" | "active">("idle");
  if (state === "active") return <>{render()}</>;
  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={false}
      aria-busy={state === "loading" || undefined}
      className={className}
      onPointerEnter={() => void preload()}
      onFocus={() => void preload()}
      onClick={() => {
        if (state !== "idle") return;
        setState("loading");
        void preload()
          .then(() => setState("active"))
          .catch(() => setState("idle"));
      }}
    >
      {icon}
    </button>
  );
}
