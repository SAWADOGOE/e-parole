/**
 * Données de démonstration du réseau social (Phase 3), base LOCALE uniquement : comptes et contenus marqués « [Démo] ».
 * Aucune donnée réelle. Usage : pnpm demo:social  (mot de passe des comptes : SEED_DEMO_PASSWORD, sinon généré et affiché).
 */
import "dotenv/config";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import sharp from "sharp";
import { PrismaClient } from "../../generated/prisma/client";
import { processAsset } from "../../src/features/media/server/process";
import { putObject } from "../../src/server/storage/s3";

if (process.env["NODE_ENV"] === "production" || process.env["APP_ENV"] === "production") {
  console.error("Démo refusée : environnement de production.");
  process.exit(1);
}
const url = process.env["MIGRATION_DATABASE_URL"] ?? "";
if (!/127\.0\.0\.1|localhost/.test(url)) {
  console.error("Démo refusée : la base doit être locale.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const password = process.env["SEED_DEMO_PASSWORD"] ?? randomBytes(9).toString("base64url");
const year = new Date().getUTCFullYear();

const PEOPLE = [
  { handle: "demo_ruth", name: "[Démo] Ruth Kaboré", birthYear: 1988, bio: "Choriste, maman de trois enfants. Le Psaume 23 m'accompagne chaque matin.", church: "[Démo] Église de l'Espérance" },
  { handle: "demo_paul", name: "[Démo] Paul Ouédraogo", birthYear: 1979, bio: "Enseignant de l'école du dimanche.", church: "[Démo] Assemblée de la Grâce" },
  { handle: "demo_esther", name: "[Démo] Esther Mensah", birthYear: 1995, bio: "J'aime les questions bibliques difficiles.", church: null },
  { handle: "demo_junior", name: "[Démo] Junior Sawadogo", birthYear: year - 15, bio: "Groupe de jeunes.", church: null },
] as const;

async function person(spec: (typeof PEOPLE)[number], hashed: string): Promise<string> {
  const email = `${spec.handle}@demo.eparole.local`;
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return existing.id;
  const user = await db.user.create({
    data: {
      email,
      name: spec.name,
      emailVerified: true,
      birthYear: spec.birthYear,
      createdAt: new Date(Date.now() - 40 * 86_400_000),
      profile: {
        create: {
          handle: spec.handle,
          displayName: spec.name,
          bio: spec.bio,
          churchName: spec.church,
          churchVisibility: spec.church ? "PUBLIC" : "PRIVATE",
          isDiscoverable: year - spec.birthYear >= 18,
        },
      },
    },
  });
  await db.account.create({ data: { userId: user.id, providerId: "credential", accountId: user.id, password: hashed } });
  return user.id;
}

async function demoImage(ownerId: string): Promise<string> {
  const svgText = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6ebd3"/><stop offset="1" stop-color="#2c8273"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#g)"/><circle cx="1200" cy="260" r="140" fill="#d5af64"/><rect x="0" y="760" width="1600" height="240" fill="#103b39"/></svg>`,
  );
  // Image de démonstration générée localement puis traitée par le vrai pipeline (JPEG → AVIF/WebP, sans EXIF).
  const jpeg = await sharp(svgText).jpeg({ quality: 88 }).toBuffer();
  const key = `originals/${ownerId}/${randomUUID()}`;
  await putObject(key, jpeg, "image/jpeg");
  const asset = await db.mediaAsset.create({ data: { ownerId, purpose: "POST_IMAGE", bucket: process.env["S3_BUCKET_PRIVATE"] ?? "eparole-private", key, mime: "image/jpeg", size: jpeg.length, status: "PROCESSING" } });
  await processAsset(asset.id);
  return asset.id;
}

async function main(): Promise<void> {
  const hashed = await hashPassword(password);
  const [ruth, paul, esther, junior] = await Promise.all(PEOPLE.map((p) => person(p, hashed)));
  if (!ruth || !paul || !esther || !junior) throw new Error("comptes de démo incomplets");
  if ((await db.post.count({ where: { authorId: { in: [ruth, paul, esther] } } })) > 0) {
    console.log("Démo déjà présente.");
    return;
  }
  const lsg = await db.bibleTranslation.findUnique({ where: { code: "lsg" }, select: { id: true } });
  const verse = (bookId: string, chapter: number, verseStart: number, verseEnd = verseStart) =>
    lsg ? { verseTranslationId: lsg.id, verseBookId: bookId, verseChapter: chapter, verseStart, verseEnd } : {};
  const hours = (h: number) => new Date(Date.now() - h * 3_600_000);

  for (const [a, b] of [[ruth, paul], [paul, ruth], [esther, ruth], [junior, ruth], [ruth, esther]] as const) {
    await db.follow.upsert({ where: { followerId_followingId: { followerId: a, followingId: b } }, create: { followerId: a, followingId: b }, update: {} });
  }
  const image = await demoImage(ruth);
  const testimony = await db.post.create({
    data: {
      authorId: ruth,
      type: "TESTIMONY",
      body: "[Démo] Après trois mois sans travail, une porte s'est ouverte cette semaine. Merci à @demo_paul et au groupe de prière pour votre fidélité. Relisez Philippiens 4:6-7 avec moi.",
      createdAt: hours(3),
      ...verse("PSA", 23, 1, 3),
      media: { create: [{ assetId: image, position: 0, altText: "[Démo] Lever de soleil doré au-dessus d'une colline verte" }] },
      amenCount: 2,
      loveCount: 1,
      commentCount: 2,
    },
  });
  await db.mention.create({ data: { postId: testimony.id, userId: paul, handle: "demo_paul" } });
  await db.reaction.createMany({ data: [{ userId: paul, postId: testimony.id, kind: "AMEN" }, { userId: esther, postId: testimony.id, kind: "AMEN" }, { userId: junior, postId: testimony.id, kind: "LOVE" }] });
  const comment = await db.comment.create({ data: { postId: testimony.id, authorId: paul, body: "[Démo] Gloire à Dieu, sœur Ruth ! Nous continuons de prier.", createdAt: hours(2), replyCount: 1 } });
  await db.comment.create({ data: { postId: testimony.id, authorId: ruth, parentId: comment.id, body: "[Démo] Merci frère Paul 🙏", createdAt: hours(1) } });

  await db.post.create({ data: { authorId: paul, type: "QUESTION", body: "[Démo] Que signifie « marcher selon l'Esprit » dans Galates 5:16 ? Vos lectures sont les bienvenues.", createdAt: hours(6), ...verse("GAL", 5, 16) } });
  await db.post.create({ data: { authorId: esther, type: "MEDITATION", body: "[Démo] Méditation du matin : la paix n'est pas l'absence de tempête, c'est la présence du Christ dans la barque (Marc 4:39).", createdAt: hours(20), encouragedCount: 1 } });
  await db.post.create({ data: { authorId: paul, type: "ANNOUNCEMENT", body: "[Démo] Étude biblique ouverte samedi à 16 h : l'Évangile selon Jean, chapitre 3.", createdAt: hours(30), ...verse("JHN", 3, 16) } });
  await db.post.create({ data: { authorId: ruth, type: "TEXT", body: "[Démo] Une parole qui m'a portée cette année.", createdAt: hours(80), ...verse("ROM", 8, 28) } });
  await db.post.create({ data: { authorId: esther, type: "TEXT", body: "[Démo] Publication plus ancienne, au-delà des 48 heures du fil.", createdAt: hours(120) } });
  await db.notification.create({ data: { recipientId: ruth, type: "REACTION", groupKey: `reaction:post:${testimony.id}`, postId: testimony.id, actors: { create: [{ actorId: paul }, { actorId: esther }, { actorId: junior }] } } });

  console.log(`Démo créée : ${PEOPLE.map((p) => `${p.handle}@demo.eparole.local`).join(", ")}`);
  if (!process.env["SEED_DEMO_PASSWORD"]) console.log(`Mot de passe des comptes de démo (local) : ${password}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void db.$disconnect());
