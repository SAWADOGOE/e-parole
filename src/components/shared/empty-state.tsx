import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  verse?: string;
  actions?: ReactNode;
  className?: string;
}

/** État vide porteur de sens : illustration linéaire, phrase, action éventuelle (docs/14, États). */
export function EmptyState({ icon: Icon, title, body, verse, actions, className }: EmptyStateProps) {
  return (
    <section className={cn("flex flex-col items-center px-4 py-12 text-center", className)}>
      <span className="mb-6 inline-flex size-16 items-center justify-center rounded-full border border-gold text-gold-fg">
        <Icon aria-hidden="true" className="size-7" strokeWidth={1.5} />
      </span>
      <h2 className="font-serif text-display-sm text-fg">{title}</h2>
      <p className="mt-3 max-w-md text-base text-muted">{body}</p>
      {verse ? <p className="mt-4 max-w-md font-serif text-base text-gold-fg italic">{verse}</p> : null}
      {actions ? <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </section>
  );
}
