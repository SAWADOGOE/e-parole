import { cva } from "class-variance-authority";

/**
 * Styles des boutons, séparés du composant Button : un îlot client qui n'a besoin que des classes n'embarque pas
 * le Slot de Radix (budget JS de /, docs/29).
 */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-[background-color,color,transform] duration-(--motion-fast) select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:bg-primary-hover",
        secondary: "border border-border-strong bg-bg-elevated text-fg hover:bg-bg-subtle",
        ghost: "text-fg hover:bg-bg-subtle",
        link: "h-auto px-0 text-accent underline-offset-4 hover:underline",
        danger: "bg-danger text-danger-fg hover:opacity-90",
        brand: "bg-brand text-brand-fg hover:opacity-95",
      },
      size: {
        md: "h-11 px-4 text-base",
        sm: "h-11 px-3 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
