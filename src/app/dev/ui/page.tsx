import { HandHeart } from "lucide-react";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";
import { Wordmark } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/* Vitrine des composants — développement uniquement (docs/16). Textes de démonstration non traduits. */

const SWATCHES = [
  "bg-bg",
  "bg-bg-elevated",
  "bg-bg-subtle",
  "bg-brand",
  "bg-primary",
  "bg-accent",
  "bg-accent-subtle",
  "bg-gold",
  "bg-danger",
] as const;

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main id="contenu" className="mx-auto max-w-4xl space-y-12 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Wordmark />
        <ThemeToggle />
      </header>
      <Badge tone="gold">Données de démonstration</Badge>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Couleurs sémantiques</h2>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {SWATCHES.map((swatch) => (
            <li key={swatch} className="text-xs text-muted">
              <span className={`mb-1 block h-14 rounded-md border ${swatch}`} />
              {swatch}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Typographie</h2>
        <p className="font-serif text-display-lg">Grandir dans la foi</p>
        <p className="font-serif text-display-md">Titre de page</p>
        <p className="font-serif text-reading-md">
          <sup className="mr-1 text-xs text-gold-fg select-none">16</sup>Car Dieu a tant aimé le monde qu’il a donné son
          Fils unique, afin que quiconque croit en lui ne périsse point, mais qu’il ait la vie éternelle.
        </p>
        <p className="text-base">Texte d’interface Inter 16/24.</p>
        <p className="text-sm text-muted">Métadonnées 14/20.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Boutons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Principal</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="ghost">Discret</Button>
          <Button variant="brand">Marque</Button>
          <Button variant="danger">Supprimer</Button>
          <Button variant="link">Lien</Button>
          <Button disabled>Désactivé</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Neutre</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="gold">Or</Badge>
          <Badge tone="warning">Attention</Badge>
          <Badge tone="danger">Danger</Badge>
        </div>
      </section>

      <section className="max-w-sm space-y-4">
        <h2 className="text-xl font-semibold">Champs</h2>
        <FormField name="demo" label="Adresse email" hint="Aide contextuelle." />
        <FormField name="demo-error" label="Mot de passe" error="Le mot de passe doit contenir au moins 10 caractères." />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Skeleton</h2>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </section>

      <EmptyState
        icon={HandHeart}
        title="État vide"
        body="Une phrase qui donne du sens, et une action."
        verse="« Portez les fardeaux les uns des autres. » — Galates 6:2"
        actions={<Button>Action</Button>}
      />
    </main>
  );
}
