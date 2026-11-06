import type { Route } from "next";

/** URL publique d'un profil : /@handle est réécrit vers /membres/[handle] (next.config.ts). */
export function profilePath(handle: string, section?: "abonnes" | "abonnements"): Route {
  return (section ? `/@${handle}/${section}` : `/@${handle}`);
}

export function postPath(postId: string): Route {
  return `/publications/${postId}` as Route;
}
