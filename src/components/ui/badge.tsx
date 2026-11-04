import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-border bg-bg-subtle text-fg",
        accent: "border-transparent bg-accent-subtle text-accent",
        gold: "border-gold bg-bg-elevated text-gold-fg",
        danger: "border-danger text-danger",
        warning: "border-warning text-warning",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

/** Toujours un libellé texte : jamais de statut signalé par la couleur seule. */
export function Badge({ className, tone, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />;
}
