"use client";

import dynamic from "next/dynamic";

/** Les dialogues des notes ne concernent que l'auteur connecté : un visiteur ne télécharge pas ce code. */
export const LazyNoteList = dynamic(() => import("./note-list").then((module) => module.NoteList), { ssr: false });
