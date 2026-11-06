"use client";

import { useState, type ReactNode } from "react";

interface LazyMenuTriggerProps {
  label: string;
  className: string;
  icon: ReactNode;
  /** Précharge le module du menu (survol, focus, appui) pour qu'il s'ouvre sans attente perceptible. */
  preload: () => void;
  /** Le menu complet, rendu ouvert dès qu'il est demandé ; il remplace ce bouton. */
  render: () => ReactNode;
}

/**
 * Menu chargé à la demande (docs/29, budget JS de /) : seul ce bouton est envoyé avec la page ; Radix et les dialogues
 * ne sont téléchargés qu'au premier signe d'intention, puis le vrai menu s'ouvre avec le focus.
 */
export function LazyMenuTrigger({ label, className, icon, preload, render }: LazyMenuTriggerProps) {
  const [active, setActive] = useState(false);
  if (active) return <>{render()}</>;
  return (
    <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={false} className={className} onPointerEnter={preload} onFocus={preload} onPointerDown={preload} onClick={() => setActive(true)}>
      {icon}
    </button>
  );
}
