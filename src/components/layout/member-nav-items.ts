import { BookOpen, HandHeart, House, PenLine, UsersRound, type LucideIcon } from "lucide-react";
import type { Route } from "next";

export interface NavItem {
  href: Route;
  labelKey: "home" | "bible" | "publish" | "prayers" | "communities";
  icon: LucideIcon;
}

/** Onglets de l'espace membre (docs/14 : Accueil · Bible · Publier · Prières · Communautés). */
export const MEMBER_NAV: readonly NavItem[] = [
  { href: "/", labelKey: "home", icon: House },
  { href: "/bible", labelKey: "bible", icon: BookOpen },
  { href: "/publier", labelKey: "publish", icon: PenLine },
  { href: "/prieres", labelKey: "prayers", icon: HandHeart },
  { href: "/communautes", labelKey: "communities", icon: UsersRound },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
