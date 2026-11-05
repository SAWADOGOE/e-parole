import { useId, type ComponentProps, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormFieldProps extends Omit<ComponentProps<"input">, "id"> {
  label: string;
  hint?: string;
  error?: string | undefined;
  trailing?: ReactNode;
}

/** Champ accessible : label lié, aide et erreur reliées par aria-describedby (docs/18). */
export function FormField({ label, hint, error, trailing, ...inputProps }: FormFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {trailing}
      </div>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...inputProps} />
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Région d'annonce unique et stable : seul son contenu change, pour une annonce fiable par les lecteurs d'écran.
 * Vide, elle reste présente mais invisible.
 */
export function FormAlert({ message, tone = "danger" }: { message: string | null; tone?: "danger" | "success" }) {
  const styles =
    tone === "danger"
      ? "rounded-md border border-danger bg-bg-elevated px-4 py-3 text-sm text-danger"
      : "rounded-md border border-accent bg-accent-subtle px-4 py-3 text-sm text-fg";
  return (
    <div role={tone === "danger" ? "alert" : "status"} aria-atomic="true" className={message ? styles : "sr-only"}>
      {message}
    </div>
  );
}
