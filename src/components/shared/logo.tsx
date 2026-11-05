import { cn } from "@/lib/cn";

/**
 * Logotype provisoire (docs/15, Logo) : livre ouvert dont la tranche forme une croix sobre,
 * rayon de lumière doré. À remplacer par le travail d'un designer (question Q6).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <path d="M16 3v4" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 5.5l1.5 2.5M22 5.5L20.5 8" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M4 11c4-1.5 8-1.2 12 1.2 4-2.4 8-2.7 12-1.2v15c-4-1.5-8-1.2-12 1.2-4-2.4-8-2.7-12-1.2V11z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M16 12.2v15M12.5 17h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-brand", className)}>
      <LogoMark />
      <span className="font-serif text-xl font-semibold tracking-tight">
        e<span className="text-gold">·</span>Parole
      </span>
    </span>
  );
}
