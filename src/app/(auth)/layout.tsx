import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/shared/logo";

/** Espace d'authentification : formulaire sobre, panneau éditorial sur grand écran. */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("common");
  const tAuth = await getTranslations("auth");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] xl:grid-cols-[minmax(0,1fr)_32rem]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand p-12 text-brand-fg lg:order-2 lg:flex">
        <div aria-hidden="true" className="absolute -top-24 -right-24 size-96 rounded-full border border-gold/40" />
        <div aria-hidden="true" className="absolute -top-8 -right-8 size-64 rounded-full border border-gold/30" />
        <p className="text-sm tracking-[0.2em] text-gold uppercase dark:text-brand-fg">{t("tagline")}</p>
        <blockquote className="relative max-w-md">
          <p className="font-serif text-display-md">{tAuth("asideVerse")}</p>
          <footer className="mt-4 text-sm text-gold dark:text-brand-fg">{tAuth("asideReference")}</footer>
        </blockquote>
      </aside>
      <main id="contenu" className="flex flex-col px-4 py-8 sm:px-8 lg:order-1 lg:justify-center lg:px-16">
        <Link href="/" className="mb-10 self-start rounded-md lg:mb-12">
          <Wordmark />
        </Link>
        <div className="w-full max-w-md lg:mx-auto">{children}</div>
      </main>
    </div>
  );
}
