import { NextResponse } from "next/server";
import { getCatalog, getTranslation } from "@/features/bible";

const ONE_DAY_SECONDS = 86_400;

/** Liste publique des livres pour le sélecteur, chargée à l'ouverture du panneau : rien dans la charge initiale. */
export async function GET(): Promise<NextResponse> {
  const translation = await getTranslation();
  if (!translation) return NextResponse.json({ books: [] }, { status: 404 });
  const books = await getCatalog(translation);
  return NextResponse.json(
    {
      books: books.map(({ id, order, testament, name, slug, chapterCount, abbreviations }) => ({
        id,
        order,
        testament,
        name,
        slug,
        chapterCount,
        abbreviations,
      })),
    },
    { headers: { "Cache-Control": `public, max-age=${ONE_DAY_SECONDS}` } },
  );
}
