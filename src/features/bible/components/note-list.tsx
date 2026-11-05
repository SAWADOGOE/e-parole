"use client";

import { Pencil, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { errorKey } from "@/lib/error-key";
import { deleteNoteAction, editNoteAction } from "../server/actions";

const NoteSheet = dynamic(() => import("./note-sheet"), { ssr: false });

export interface NoteListItem {
  id: string;
  reference: string;
  body: string;
}

/** Notes privées de l'utilisateur : le contenu n'est transmis qu'à son auteur. */
export function NoteList({ notes }: { notes: readonly NoteListItem[] }) {
  const t = useTranslations("bible.notes");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors.codes");
  const router = useRouter();
  const [editing, setEditing] = useState<NoteListItem | null>(null);
  const [deleting, setDeleting] = useState<NoteListItem | null>(null);

  async function remove(note: NoteListItem): Promise<void> {
    const result = await deleteNoteAction({ id: note.id });
    toast(result.ok ? t("deleted") : tErrors(errorKey(result.error.code)));
    if (result.ok) router.refresh();
  }

  return (
    <>
      <ul className="flex flex-col divide-y">
        {notes.map((note) => (
          <li key={note.id} className="py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-sm font-semibold text-fg">{note.reference}</p>
              <div className="flex shrink-0">
                <button type="button" aria-label={t("edit", { reference: note.reference })} onClick={() => setEditing(note)} className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-bg-subtle">
                  <Pencil aria-hidden="true" className="size-5" />
                </button>
                <button type="button" aria-label={t("delete", { reference: note.reference })} onClick={() => setDeleting(note)} className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-bg-subtle">
                  <Trash2 aria-hidden="true" className="size-5" />
                </button>
              </div>
            </div>
            <p className="text-base break-words whitespace-pre-wrap text-fg">{note.body}</p>
          </li>
        ))}
      </ul>

      {editing ? (
        <NoteSheet
          reference={editing.reference}
          initialBody={editing.body}
          onClose={() => setEditing(null)}
          onSubmit={(body) => editNoteAction({ id: editing.id, body })}
          onSaved={() => router.refresh()}
        />
      ) : null}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("deleteConfirmBody", { reference: deleting?.reference ?? "" })}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              danger
              onClick={() => {
                const note = deleting;
                setDeleting(null);
                if (note) void remove(note);
              }}
            >
              {tCommon("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
