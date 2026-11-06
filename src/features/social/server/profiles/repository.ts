import { findOwnedReadyAssets, mediaImageFromStored, type MediaImage } from "@/features/media";
import { db, Prisma, type TransactionClient } from "@/server/db";
import type { FieldVisibility } from "../../constants";
import type { VerifiedBadgeName } from "../../types";
import { col, notBlocked, visibleAccount } from "../sql";

export interface ProfileRow {
  userId: string;
  handle: string;
  handleChangedAt: Date | null;
  displayName: string;
  bio: string | null;
  verifiedBadge: VerifiedBadgeName | null;
  churchName: string | null;
  churchVisibility: FieldVisibility;
  city: string | null;
  locationVisibility: FieldVisibility;
  country: string | null;
  countryVisibility: FieldVisibility;
  denomination: string | null;
  denominationVisibility: FieldVisibility;
  isDiscoverable: boolean;
  createdAt: Date;
  birthYear: number | null;
  avatar: MediaImage | null;
  banner: MediaImage | null;
}

const IMAGE_SELECT = { id: true, width: true, height: true, dominantColor: true, variants: true, status: true } as const;

function image(asset: { id: string; width: number | null; height: number | null; dominantColor: string | null; variants: unknown; status: string } | null): MediaImage | null {
  if (asset?.status !== "READY") return null;
  return mediaImageFromStored({ assetId: asset.id, width: asset.width, height: asset.height, dominantColor: asset.dominantColor, variants: asset.variants });
}

async function loadProfile(where: Prisma.ProfileWhereInput): Promise<ProfileRow | null> {
  const profile = await db.profile.findFirst({
    where,
    select: {
      userId: true,
      handle: true,
      handleChangedAt: true,
      displayName: true,
      bio: true,
      verifiedBadge: true,
      churchName: true,
      churchVisibility: true,
      city: true,
      locationVisibility: true,
      country: true,
      countryVisibility: true,
      denomination: true,
      denominationVisibility: true,
      isDiscoverable: true,
      user: { select: { createdAt: true, birthYear: true } },
      avatar: { select: IMAGE_SELECT },
      banner: { select: IMAGE_SELECT },
    },
  });
  if (!profile) return null;
  const { user, avatar, banner, churchVisibility, locationVisibility, countryVisibility, denominationVisibility, ...rest } = profile;
  return {
    ...rest,
    churchVisibility: narrow(churchVisibility),
    locationVisibility: narrow(locationVisibility),
    countryVisibility: narrow(countryVisibility),
    denominationVisibility: narrow(denominationVisibility),
    createdAt: user.createdAt,
    birthYear: user.birthYear,
    avatar: image(avatar),
    banner: image(banner),
  };
}

/** La contrainte SQL profile_field_visibility_chk exclut COMMUNITY : repli prudent sur PRIVATE. */
function narrow(value: "PUBLIC" | "FOLLOWERS" | "COMMUNITY" | "PRIVATE"): FieldVisibility {
  return value === "COMMUNITY" ? "PRIVATE" : value;
}

/** Profil d'un compte affiché, sans blocage avec l'acteur ; sinon null (404). */
export async function findVisibleProfileByHandle(viewerId: string, handle: string): Promise<ProfileRow | null> {
  const rows = await db.$queryRaw<{ userId: string }[]>`
    SELECT pr."userId" FROM "profile" pr JOIN "user" u ON u."id" = pr."userId"
    WHERE lower(pr."handle") = lower(${handle}) AND ${visibleAccount(col("u"))} AND ${notBlocked(viewerId, col('pr."userId"'))}`;
  const userId = rows[0]?.userId;
  return userId ? loadProfile({ userId }) : null;
}

export async function findOwnProfile(userId: string): Promise<ProfileRow | null> {
  return loadProfile({ userId });
}

export async function isHandleTaken(handle: string, exceptUserId: string): Promise<boolean> {
  const count = await db.profile.count({ where: { handle: { equals: handle, mode: "insensitive" }, NOT: { userId: exceptUserId } } });
  return count > 0;
}

export async function updateProfile(
  userId: string,
  data: Omit<Prisma.ProfileUpdateInput, "user" | "avatar" | "banner">,
): Promise<void> {
  await db.profile.update({ where: { userId }, data });
}

/** Remplace l'avatar ou la bannière par une image prête du membre lui-même (vérifiée dans la même transaction). */
export async function setProfileImage(userId: string, slot: "avatar" | "banner", assetId: string | null): Promise<boolean> {
  return db.$transaction(async (tx) => {
    if (assetId !== null) {
      const owned = await findOwnedReadyAssets(userId, [assetId], slot === "avatar" ? "AVATAR" : "BANNER", tx);
      if (owned.length !== 1) return false;
    }
    await tx.profile.update({ where: { userId }, data: slot === "avatar" ? { avatarId: assetId } : { bannerId: assetId } });
    return true;
  });
}

/**
 * Mentions résolues à l'écriture : la personne existe, reste visible, n'a aucun blocage avec l'auteur,
 * et accepte d'être trouvée (profil découvrable, ou elle suit déjà l'auteur).
 */
export async function resolveMentionTargets(
  authorId: string,
  handles: readonly string[],
  tx: TransactionClient = db,
  /** Auteur de la publication commentée : la personne mentionnée doit aussi pouvoir la voir (aucun blocage avec lui). */
  postAuthorId: string | null = null,
): Promise<{ userId: string; handle: string }[]> {
  if (handles.length === 0) return [];
  const postVisible = postAuthorId ? Prisma.sql`AND ${notBlocked(postAuthorId, col('pr."userId"'))}` : Prisma.empty;
  return tx.$queryRaw<{ userId: string; handle: string }[]>`
    SELECT pr."userId", lower(pr."handle") AS "handle"
    FROM "profile" pr JOIN "user" u ON u."id" = pr."userId"
    WHERE lower(pr."handle") = ANY(${[...handles]}::text[]) AND pr."userId" <> ${authorId}
      AND ${visibleAccount(col("u"))} AND ${notBlocked(authorId, col('pr."userId"'))}
      AND (pr."isDiscoverable" OR EXISTS (SELECT 1 FROM "follow" f WHERE f."followerId" = pr."userId" AND f."followingId" = ${authorId}))
      ${postVisible}`;
}

/** Autocomplétion des mentions : mêmes règles que la résolution, préfixe sur le handle ou le nom. */
export async function suggestMentions(viewerId: string, prefix: string, limit: number): Promise<{ handle: string; displayName: string }[]> {
  const like = `${prefix.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return db.$queryRaw<{ handle: string; displayName: string }[]>`
    SELECT pr."handle", pr."displayName"
    FROM "profile" pr JOIN "user" u ON u."id" = pr."userId"
    WHERE (pr."handle" ILIKE ${like} OR pr."displayName" ILIKE ${like}) AND pr."userId" <> ${viewerId}
      AND ${visibleAccount(col("u"))} AND ${notBlocked(viewerId, col('pr."userId"'))}
      AND (pr."isDiscoverable" OR EXISTS (SELECT 1 FROM "follow" f WHERE f."followerId" = pr."userId" AND f."followingId" = ${viewerId}))
    ORDER BY (EXISTS (SELECT 1 FROM "follow" f2 WHERE f2."followerId" = ${viewerId} AND f2."followingId" = pr."userId")) DESC, pr."handle"
    LIMIT ${limit}`;
}
