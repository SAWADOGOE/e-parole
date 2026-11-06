import "server-only";
import type { z } from "zod";
import { AppError } from "@/server/errors/app-error";
import { authorize, type Actor } from "@/server/policies";
import { HANDLE_CHANGE_COOLDOWN_HOURS, MENTION_SUGGESTIONS, type FieldVisibility } from "../constants";
import type { mentionSearchSchema, profileImageSchema, updateProfileSchema } from "../schemas";
import type { OwnProfile, ProfileFieldName, ProfileFieldValue, ProfileView } from "../types";
import { countAuthorPosts } from "./posts/repository";
import { RESERVED_HANDLES } from "./reserved-handles";
import { findOwnProfile, findVisibleProfileByHandle, isHandleTaken, setProfileImage, suggestMentions, updateProfile, type ProfileRow } from "./profiles/repository";
import { countFollows, relationState } from "./relations/repository";

const ADULT_AGE = 18;

export function isMinorBirthYear(birthYear: number | null, now: Date = new Date()): boolean {
  return birthYear === null || now.getUTCFullYear() - birthYear < ADULT_AGE;
}

/** Visibilité d'un champ pour un lecteur donné : public, abonnés (le lecteur suit le titulaire), ou soi seul. */
export function canSeeField(visibility: FieldVisibility, viewer: { isSelf: boolean; follows: boolean }): boolean {
  if (viewer.isSelf) return true;
  if (visibility === "PUBLIC") return true;
  return visibility === "FOLLOWERS" && viewer.follows;
}

function visibleFields(row: ProfileRow, viewer: { isSelf: boolean; follows: boolean }): ProfileView["fields"] {
  const minor = isMinorBirthYear(row.birthYear);
  const candidates: [ProfileFieldName, string | null, FieldVisibility][] = [
    ["church", row.churchName, row.churchVisibility],
    // Pas de géolocalisation d'un mineur : ville et pays ne sont jamais montrés à autrui.
    ["city", row.city, minor ? "PRIVATE" : row.locationVisibility],
    ["country", row.country, minor ? "PRIVATE" : row.countryVisibility],
    ["denomination", row.denomination, row.denominationVisibility],
  ];
  const fields: Partial<Record<ProfileFieldName, ProfileFieldValue>> = {};
  for (const [name, value, visibility] of candidates) {
    if (value && canSeeField(visibility, viewer)) fields[name] = { value, visibility };
  }
  return fields;
}

/** Profil public /@handle : 404 si le compte n'est plus affiché ou s'il existe un blocage dans un sens ou dans l'autre. */
export async function getProfile(actor: Actor, handle: string): Promise<ProfileView | null> {
  const row = await findVisibleProfileByHandle(actor.userId, handle);
  if (!row) return null;
  const isSelf = row.userId === actor.userId;
  const [relation, counts, posts] = await Promise.all([
    isSelf ? Promise.resolve({ following: false, followedBy: false, muted: false }) : relationState(actor.userId, row.userId),
    countFollows(row.userId),
    countAuthorPosts(row.userId),
  ]);
  return {
    userId: row.userId,
    handle: row.handle,
    displayName: row.displayName,
    bio: row.bio,
    avatar: row.avatar,
    banner: row.banner,
    verifiedBadge: row.verifiedBadge,
    joinedAt: row.createdAt,
    fields: visibleFields(row, { isSelf, follows: relation.following }),
    counts: { ...counts, posts },
    relation: { isSelf, ...relation },
  };
}

export async function getOwnProfile(actor: Actor): Promise<OwnProfile> {
  const row = await findOwnProfile(actor.userId);
  if (!row) throw new AppError("NOT_FOUND");
  return {
    userId: row.userId,
    handle: row.handle,
    displayName: row.displayName,
    bio: row.bio ?? "",
    avatar: row.avatar,
    banner: row.banner,
    churchName: row.churchName ?? "",
    churchVisibility: row.churchVisibility,
    city: row.city ?? "",
    locationVisibility: row.locationVisibility,
    country: row.country ?? "",
    countryVisibility: row.countryVisibility,
    denomination: row.denomination ?? "",
    denominationVisibility: row.denominationVisibility,
    isDiscoverable: row.isDiscoverable,
    isMinor: isMinorBirthYear(row.birthYear),
  };
}

const empty = (value: string): string | null => (value.length === 0 ? null : value);

export async function editProfile(actor: Actor, input: z.infer<typeof updateProfileSchema>): Promise<{ handle: string }> {
  authorize(actor, "profile:update", { ownerId: actor.userId });
  const current = await findOwnProfile(actor.userId);
  if (!current) throw new AppError("NOT_FOUND");
  const minor = isMinorBirthYear(current.birthYear);
  const handleChanged = input.handle !== current.handle.toLowerCase();
  if (handleChanged) {
    if (RESERVED_HANDLES.has(input.handle)) throw new AppError("VALIDATION", { fieldErrors: { handle: ["handleReserved"] } });
    if (current.handleChangedAt && Date.now() - current.handleChangedAt.getTime() < HANDLE_CHANGE_COOLDOWN_HOURS * 3_600_000) {
      throw new AppError("VALIDATION", { fieldErrors: { handle: ["handleCooldown"] } });
    }
    if (await isHandleTaken(input.handle, actor.userId)) throw new AppError("CONFLICT", { fieldErrors: { handle: ["handleTaken"] } });
  }
  try {
    await updateProfile(actor.userId, {
      displayName: input.displayName,
      ...(handleChanged ? { handle: input.handle, handleChangedAt: new Date() } : {}),
      bio: empty(input.bio),
      churchName: empty(input.churchName),
      churchVisibility: input.churchVisibility,
      city: empty(input.city),
      country: empty(input.country),
      // Mineur : ville et pays restent privés quoi que demande le formulaire (pas de géolocalisation, docs/20).
      locationVisibility: minor ? "PRIVATE" : input.locationVisibility,
      countryVisibility: minor ? "PRIVATE" : input.countryVisibility,
      denomination: empty(input.denomination),
      denominationVisibility: input.denominationVisibility,
      isDiscoverable: input.isDiscoverable,
    });
  } catch (error: unknown) {
    // Course entre deux membres sur le même handle : l'index unique insensible à la casse tranche.
    if ((error as { code?: unknown }).code === "P2002") throw new AppError("CONFLICT", { fieldErrors: { handle: ["handleTaken"] } });
    throw error;
  }
  return { handle: handleChanged ? input.handle : current.handle };
}

export async function changeProfileImage(actor: Actor, input: z.infer<typeof profileImageSchema>): Promise<void> {
  authorize(actor, "profile:update", { ownerId: actor.userId });
  if (!(await setProfileImage(actor.userId, input.slot, input.assetId))) {
    throw new AppError("VALIDATION", { fieldErrors: { assetId: ["imageNotReady"] } });
  }
}

/** Autocomplétion @ : jamais un compte bloqué, jamais un profil non découvrable qui ne suit pas l'acteur. */
export async function searchMentions(actor: Actor, input: z.infer<typeof mentionSearchSchema>): Promise<{ handle: string; displayName: string }[]> {
  const prefix = input.query.replace(/^@/, "");
  if (prefix.length < 1) return [];
  return suggestMentions(actor.userId, prefix, MENTION_SUGGESTIONS);
}
