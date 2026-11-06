import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { cleanupExpiredMedia } from "@/features/media/server/cleanup";
import { processAsset } from "@/features/media/server/process";
import { completeUpload, requestUpload } from "@/features/media/server/uploads";
import { db } from "@/server/db";
import { getObjectBytes, headObjectSize, putObject } from "@/server/storage/s3";
import { createTestUser } from "../factories/db-users";
import { resetDatabase } from "../support/db";

beforeEach(async () => {
  await resetDatabase();
});

/** JPEG de test avec EXIF (appareil) et GPS : ces métadonnées ne doivent jamais survivre au traitement. */
async function jpegWithGps(width = 1600, height = 1000): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 30, g: 110, b: 98 } } })
    .jpeg({ quality: 90 })
    .withExif({
      IFD0: { Make: "TestCam", Model: "Exif-Leak", Copyright: "secret" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "12/1 22/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "1/1 31/1 0/1" },
    })
    .toBuffer();
}

async function stagedAsset(ownerId: string, bytes: Uint8Array, mime: string, purpose: "POST_IMAGE" | "AVATAR" = "POST_IMAGE") {
  const key = `originals/${ownerId}/${randomUUID()}`;
  await putObject(key, bytes, mime);
  return db.mediaAsset.create({ data: { ownerId, purpose, bucket: "eparole-private", key, mime, size: bytes.length, status: "PROCESSING" } });
}

describe("pipeline d'images (job media.process)", () => {
  it("ré-encode en AVIF et WebP aux tailles prévues, sans EXIF ni GPS, et supprime l'original", async () => {
    const { actor } = await createTestUser();
    const original = await jpegWithGps();
    expect((await sharp(original).metadata()).exif).toBeDefined();
    const asset = await stagedAsset(actor.userId, original, "image/jpeg");

    expect(await processAsset(asset.id)).toEqual({ status: "READY", variants: 8 });
    const ready = await db.mediaAsset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(ready.status).toBe("READY");
    expect(ready.width).toBe(1280);
    expect(ready.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(ready.dominantColor).toMatch(/^#[0-9a-f]{6}$/);
    expect(await headObjectSize(asset.key)).toBeNull();

    const variants = ready.variants as { width: number; format: string; key: string; bytes: number }[];
    expect(variants.map((v) => `${v.width}.${v.format}`).sort()).toEqual(
      ["1280.avif", "1280.webp", "320.avif", "320.webp", "640.avif", "640.webp", "960.avif", "960.webp"].sort(),
    );
    for (const variant of variants) {
      const meta = await sharp(Buffer.from(await getObjectBytes(variant.key))).metadata();
      expect(meta.exif).toBeUndefined();
      expect(meta.xmp).toBeUndefined();
      expect(meta.width).toBe(variant.width);
    }
  });

  it("refuse un SVG déguisé en PNG (magic bytes), sans rien conserver", async () => {
    const { actor } = await createTestUser();
    const svg = Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const asset = await stagedAsset(actor.userId, svg, "image/png");
    expect(await processAsset(asset.id)).toEqual({ status: "REJECTED", errorCode: "UNSUPPORTED_FORMAT" });
    const rejected = await db.mediaAsset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.variants).toEqual([]);
    expect(await headObjectSize(asset.key)).toBeNull();
  });

  it("refuse un MIME déclaré qui ne correspond pas au contenu réel", async () => {
    const { actor } = await createTestUser();
    const png = await sharp({ create: { width: 400, height: 400, channels: 3, background: "#ffffff" } }).png().toBuffer();
    const asset = await stagedAsset(actor.userId, png, "image/jpeg");
    expect(await processAsset(asset.id)).toEqual({ status: "REJECTED", errorCode: "MAGIC_MISMATCH" });
  });

  it("refuse un GIF et un fichier corrompu", async () => {
    const { actor } = await createTestUser();
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } }).gif().toBuffer();
    expect(await processAsset((await stagedAsset(actor.userId, gif, "image/png")).id)).toMatchObject({ status: "REJECTED" });
    const corrupt = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]);
    expect(await processAsset((await stagedAsset(actor.userId, corrupt, "image/jpeg")).id)).toEqual({ status: "REJECTED", errorCode: "DECODE_FAILED" });
  });

  it("un avatar est recadré en carré 320 px ; une petite image n'est jamais agrandie", async () => {
    const { actor } = await createTestUser();
    const avatar = await stagedAsset(actor.userId, await jpegWithGps(900, 600), "image/jpeg", "AVATAR");
    await processAsset(avatar.id);
    const row = await db.mediaAsset.findUniqueOrThrow({ where: { id: avatar.id } });
    expect([row.width, row.height]).toEqual([320, 320]);
    const small = await stagedAsset(actor.userId, await jpegWithGps(200, 150), "image/jpeg");
    await processAsset(small.id);
    expect((await db.mediaAsset.findUniqueOrThrow({ where: { id: small.id } })).width).toBe(200);
  });

  it("poids des images de fil : ≤ 200 Ko en mobile (960 px) et ≤ 60 Ko en économie de données (320 px)", async () => {
    const { actor } = await createTestUser();
    // Photo bruitée (le pire cas pour la compression), 2400 × 1600.
    const noise = Buffer.alloc(2400 * 1600 * 3);
    let state = 2463534242;
    for (let i = 0; i < noise.length; i += 1) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      noise[i] = (state >>> 0) % 256;
    }
    const photo = await sharp(noise, { raw: { width: 2400, height: 1600, channels: 3 } }).blur(1.5).jpeg({ quality: 92 }).toBuffer();
    const asset = await stagedAsset(actor.userId, photo, "image/jpeg");
    await processAsset(asset.id);
    const variants = (await db.mediaAsset.findUniqueOrThrow({ where: { id: asset.id } })).variants as { width: number; format: string; bytes: number }[];
    const size = (width: number, format: string) => variants.find((v) => v.width === width && v.format === format)?.bytes ?? Infinity;
    console.info("poids mesurés (octets)", Object.fromEntries(variants.map((v) => [`${v.width}.${v.format}`, v.bytes])));
    expect(size(960, "avif")).toBeLessThanOrEqual(200 * 1024);
    expect(size(960, "webp")).toBeLessThanOrEqual(200 * 1024);
    expect(size(320, "avif")).toBeLessThanOrEqual(60 * 1024);
    expect(size(320, "webp")).toBeLessThanOrEqual(60 * 1024);
  });
});

describe("envoi (URL présignée) et nettoyage", () => {
  it("URL PUT de 60 s pour le propriétaire ; la confirmation d'un asset d'autrui répond 404", async () => {
    const { actor } = await createTestUser();
    const other = await createTestUser();
    const ticket = await requestUpload(actor, { purpose: "POST_IMAGE", mime: "image/jpeg", size: 1234 });
    expect(ticket.expiresInSeconds).toBe(60);
    expect(new URL(ticket.uploadUrl).searchParams.get("X-Amz-Expires")).toBe("60");
    await expect(completeUpload(other.actor, { assetId: ticket.assetId })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("le stockage refuse un envoi plus gros que la taille signée", async () => {
    const { actor } = await createTestUser();
    const ticket = await requestUpload(actor, { purpose: "POST_IMAGE", mime: "image/jpeg", size: 100 });
    const response = await fetch(ticket.uploadUrl, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: new Uint8Array(5000) });
    expect(response.ok).toBe(false);
  });

  it("refuse l'envoi à un email non vérifié", async () => {
    const { actor } = await createTestUser({ emailVerified: false });
    await expect(requestUpload(actor, { purpose: "POST_IMAGE", mime: "image/jpeg", size: 10 })).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  it("supprime les envois abandonnés après 24 h et garde ceux rattachés", async () => {
    const { actor } = await createTestUser();
    const old = new Date(Date.now() - 2 * 86_400_000);
    const abandoned = await db.mediaAsset.create({ data: { ownerId: actor.userId, purpose: "POST_IMAGE", bucket: "b", key: `x/${randomUUID()}`, mime: "image/jpeg", size: 1, createdAt: old } });
    const fresh = await db.mediaAsset.create({ data: { ownerId: actor.userId, purpose: "POST_IMAGE", bucket: "b", key: `x/${randomUUID()}`, mime: "image/jpeg", size: 1 } });
    const avatar = await db.mediaAsset.create({
      data: { ownerId: actor.userId, purpose: "AVATAR", bucket: "b", key: `x/${randomUUID()}`, mime: "image/jpeg", size: 1, status: "READY", createdAt: new Date(Date.now() - 30 * 86_400_000) },
    });
    await db.profile.update({ where: { userId: actor.userId }, data: { avatarId: avatar.id } });
    expect(await cleanupExpiredMedia()).toBe(1);
    expect(await db.mediaAsset.findMany({ select: { id: true }, orderBy: { createdAt: "asc" } })).toEqual(
      expect.arrayContaining([{ id: fresh.id }, { id: avatar.id }]),
    );
    expect(await db.mediaAsset.findUnique({ where: { id: abandoned.id } })).toBeNull();
  });
});
