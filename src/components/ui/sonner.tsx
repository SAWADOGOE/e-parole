"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      duration={3000}
      offset={{ bottom: "calc(var(--bottom-nav-height) + 16px)" }}
      toastOptions={{
        classNames: {
          toast: "!rounded-md !border !border-border !bg-bg-elevated !text-fg !shadow-sm !font-sans",
          description: "!text-muted",
        },
      }}
    />
  );
}
