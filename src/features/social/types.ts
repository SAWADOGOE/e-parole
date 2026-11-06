import type { MediaImage } from "@/features/media";
import type { FieldVisibility, PostTypeName, ReactionKindName } from "./constants";

export type ReactionCounts = Readonly<Record<ReactionKindName, number>>;

export type VerifiedBadgeName = "PASTOR" | "CHURCH_LEADER" | "BIBLE_TEACHER";

export interface AuthorSummary {
  userId: string;
  handle: string;
  displayName: string;
  avatar: MediaImage | null;
  verifiedBadge: VerifiedBadgeName | null;
}

/** Mention résolue : forme écrite (minuscules) vers le handle courant de la personne. */
export interface MentionView {
  written: string;
  handle: string;
}

export interface QuotedVerse {
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

export interface PostMediaView {
  image: MediaImage;
  altText: string;
}

/** Publication telle qu'un acteur précis a le droit de la voir (filtrage fait par le repository). */
export interface PostView {
  id: string;
  type: PostTypeName;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  /** Masquée par la modération : seul l'auteur la reçoit, avec une mention. */
  isHidden: boolean;
  commentsLocked: boolean;
  isOwn: boolean;
  author: AuthorSummary;
  reactions: ReactionCounts;
  commentCount: number;
  viewerReaction: ReactionKindName | null;
  bookmarked: boolean;
  media: readonly PostMediaView[];
  mentions: readonly MentionView[];
  verse: QuotedVerse | null;
}

export interface PostPage {
  items: PostView[];
  nextCursor: string | null;
}

export interface CommentView {
  id: string;
  postId: string;
  parentId: string | null;
  /** Vide si le commentaire a été supprimé mais garde des réponses visibles. */
  body: string;
  deleted: boolean;
  isHidden: boolean;
  hiddenByPostAuthor: boolean;
  createdAt: Date;
  editedAt: Date | null;
  isOwn: boolean;
  author: AuthorSummary;
  reactions: ReactionCounts;
  viewerReaction: ReactionKindName | null;
  replyCount: number;
  mentions: readonly MentionView[];
  replies: CommentView[];
}

export interface CommentPage {
  items: CommentView[];
  nextCursor: string | null;
}

export interface ProfileFieldValue {
  value: string;
  visibility: FieldVisibility;
}

export type ProfileFieldName = "church" | "city" | "country" | "denomination";

export interface ProfileView {
  userId: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatar: MediaImage | null;
  banner: MediaImage | null;
  verifiedBadge: VerifiedBadgeName | null;
  joinedAt: Date;
  /** Seuls les champs que l'acteur a le droit de voir sont présents. */
  fields: Partial<Record<ProfileFieldName, ProfileFieldValue>>;
  counts: { followers: number; following: number; posts: number };
  relation: { isSelf: boolean; following: boolean; followedBy: boolean; muted: boolean };
}

/** Profil complet de l'acteur lui-même, pour l'édition. */
export interface OwnProfile {
  userId: string;
  handle: string;
  displayName: string;
  bio: string;
  avatar: MediaImage | null;
  banner: MediaImage | null;
  churchName: string;
  churchVisibility: FieldVisibility;
  city: string;
  locationVisibility: FieldVisibility;
  country: string;
  countryVisibility: FieldVisibility;
  denomination: string;
  denominationVisibility: FieldVisibility;
  isDiscoverable: boolean;
  isMinor: boolean;
}

export interface PersonSummary extends AuthorSummary {
  bio: string | null;
  following: boolean;
}

export interface PeoplePage {
  items: PersonSummary[];
  nextCursor: string | null;
}

export interface RelationEntry {
  userId: string;
  handle: string;
  displayName: string;
  since: Date;
}
