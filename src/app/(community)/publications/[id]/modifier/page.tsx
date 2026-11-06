import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPost } from "@/features/social";
import { EditPostForm } from "@/features/social/components/edit-post-form";
import { getCurrentSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("social");
  return { title: t("editTitle") };
}

/** Modification d'une publication : réservée à son auteur (sinon 404 ; l'action revérifie l'auteur côté serveur). */
export default async function EditPostPage(props: PageProps<"/publications/[id]/modifier">) {
  const { id } = await props.params;
  const session = await getCurrentSession();
  if (!session) redirect(`/connexion?retour=${encodeURIComponent(`/publications/${id}/modifier`)}`);
  if (!/^[a-z0-9]{1,64}$/.test(id)) notFound();
  const post = await getPost(session.actor, id);
  if (!post?.isOwn) notFound();
  const t = await getTranslations("social");
  return (
    <>
      <h1 className="font-serif text-display-sm text-fg">{t("editTitle")}</h1>
      <div className="mt-8">
        <EditPostForm postId={post.id} type={post.type} body={post.body} />
      </div>
    </>
  );
}
