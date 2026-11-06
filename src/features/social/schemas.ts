import { z } from "zod";
import { assetIdSchema } from "@/features/media";
import {
  ALT_TEXT_MAX,
  BIO_MAX,
  COMMENT_BODY_MAX,
  DISPLAY_NAME_MAX,
  FIELD_VISIBILITIES,
  HANDLE_PATTERN,
  MAX_POST_IMAGES,
  MAX_QUOTED_VERSES,
  POST_BODY_MAX,
  POST_TYPES,
  REACTION_KINDS,
} from "./constants";

const noNul = (value: string): boolean => !value.includes("\u0000");
export const entityIdSchema = z.string().min(1).max(64).regex(/^[a-z0-9]+$/);
const cursorSchema = z.string().max(120).optional();

const text = (max: number) => z.string().trim().max(max).refine(noNul);

export const quotedVerseSchema = z
  .strictObject({
    bookId: z.string().regex(/^[1-3A-Z][A-Z0-9]{2}$/),
    chapter: z.number().int().min(1).max(150),
    verseStart: z.number().int().min(1).max(200),
    verseEnd: z.number().int().min(1).max(200),
  })
  .refine((v) => v.verseEnd >= v.verseStart && v.verseEnd - v.verseStart < MAX_QUOTED_VERSES, { message: "invalidRange" });

/** Aucune visibilité : toute publication est publique (décision du 2026-11-05). Un champ inconnu est refusé. */
export const createPostSchema = z
  .strictObject({
    type: z.enum(POST_TYPES),
    body: text(POST_BODY_MAX),
    verse: quotedVerseSchema.nullable().default(null),
    images: z
      .array(z.strictObject({ assetId: assetIdSchema, altText: text(ALT_TEXT_MAX).default("") }))
      .max(MAX_POST_IMAGES)
      .default([])
      .refine((images) => new Set(images.map((i) => i.assetId)).size === images.length, { message: "duplicateImage" }),
  })
  .refine((post) => post.body.length > 0 || post.verse !== null || post.images.length > 0, { message: "emptyPost", path: ["body"] });

export const updatePostSchema = z.strictObject({
  postId: entityIdSchema,
  type: z.enum(POST_TYPES),
  body: text(POST_BODY_MAX),
});

export const postRefSchema = z.strictObject({ postId: entityIdSchema });
export const lockCommentsSchema = z.strictObject({ postId: entityIdSchema, locked: z.boolean() });

export const createCommentSchema = z.strictObject({
  postId: entityIdSchema,
  parentId: entityIdSchema.nullable().default(null),
  body: text(COMMENT_BODY_MAX).min(1),
});
export const updateCommentSchema = z.strictObject({ commentId: entityIdSchema, body: text(COMMENT_BODY_MAX).min(1) });
export const commentRefSchema = z.strictObject({ commentId: entityIdSchema });
export const hideCommentSchema = z.strictObject({ commentId: entityIdSchema, hidden: z.boolean() });

export const reactionSchema = z.strictObject({
  target: z.enum(["post", "comment"]),
  targetId: entityIdSchema,
  /** null retire la réaction. */
  kind: z.enum(REACTION_KINDS).nullable(),
});

export const relationSchema = z.strictObject({ userId: entityIdSchema, active: z.boolean() });
export const bookmarkSchema = z.strictObject({ postId: entityIdSchema, saved: z.boolean() });

const visibility = z.enum(FIELD_VISIBILITIES);
const optionalField = (max: number) => text(max).default("");

export const handleSchema = z.string().trim().toLowerCase().regex(HANDLE_PATTERN, { message: "handleFormat" });

export const updateProfileSchema = z.strictObject({
  displayName: text(DISPLAY_NAME_MAX).min(1),
  handle: handleSchema,
  bio: optionalField(BIO_MAX),
  churchName: optionalField(100),
  churchVisibility: visibility,
  city: optionalField(80),
  locationVisibility: visibility,
  country: optionalField(60),
  countryVisibility: visibility,
  denomination: optionalField(80),
  denominationVisibility: visibility,
  isDiscoverable: z.boolean(),
});

export const profileImageSchema = z.strictObject({
  slot: z.enum(["avatar", "banner"]),
  /** null retire l'image. */
  assetId: assetIdSchema.nullable(),
});

export const feedPageSchema = z.strictObject({ feed: z.enum(["following", "discover"]), cursor: cursorSchema });

/** Page suivante d'une liste de publications : fil, profil ou favoris (une seule Server Action). */
export const postPageSchema = z.strictObject({
  source: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("feed"), feed: z.enum(["following", "discover"]) }),
    z.strictObject({ kind: z.literal("profile"), userId: entityIdSchema }),
    z.strictObject({ kind: z.literal("bookmarks") }),
  ]),
  cursor: z.string().max(120),
  markerShown: z.boolean(),
});
export const commentsPageSchema = z.strictObject({ postId: entityIdSchema, cursor: cursorSchema });
export const mentionSearchSchema = z.strictObject({ query: z.string().trim().max(30).refine(noNul) });
export const peopleSearchSchema = z.object({
  q: z.string().trim().max(60).refine(noNul).catch(""),
  curseur: z.string().max(120).optional().catch(undefined),
});
export const listQuerySchema = z.object({ curseur: z.string().max(120).optional().catch(undefined) });
export const verseReferenceSchema = z.strictObject({ reference: z.string().trim().min(1).max(80).refine(noNul) });
