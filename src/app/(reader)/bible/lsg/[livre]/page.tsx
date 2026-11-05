import type { Route } from "next";
import { redirect } from "next/navigation";

/** Un livre sans chapitre ouvre son premier chapitre ; la route du chapitre canonise ensuite le slug. */
export default async function BookPage({ params }: { params: Promise<{ livre: string }> }) {
  const { livre } = await params;
  redirect(`/bible/lsg/${encodeURIComponent(livre)}/1` as Route);
}
