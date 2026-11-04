import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeading({
  title,
  intro,
  actions,
  className,
}: {
  title: string;
  intro?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <h1 className="font-serif text-display-md text-fg">{title}</h1>
        {intro ? <p className="mt-2 text-base text-muted">{intro}</p> : null}
      </div>
      {actions}
    </header>
  );
}
