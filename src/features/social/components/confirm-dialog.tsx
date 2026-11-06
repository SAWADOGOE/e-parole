"use client";

import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** Élément qui reprend le focus à la fermeture (le bouton « … » du menu qui a ouvert le dialogue). */
  returnFocus?: () => void;
}

/** Confirmation destructive : la conséquence est nommée, « Annuler » reçoit le focus (docs/16). */
export function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel, onConfirm, returnFocus }: ConfirmDialogProps) {
  const tCommon = useTranslations("common");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          if (!returnFocus) return;
          event.preventDefault();
          returnFocus();
        }}
      >
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{body}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
          <AlertDialogAction danger onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
