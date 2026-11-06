import { describe, expect, it } from "vitest";
import { detectImageFormat } from "@/features/media/lib/magic-bytes";
import { targetWidths } from "@/features/media/server/process";
import { casePriority, dominantReason, shouldAutoHide } from "@/features/moderation/lib/priority";
import { decisionSchema, reportSchema } from "@/features/moderation/schemas";
import { groupMessage } from "@/features/notifications/lib/group";
import { extractMentionHandles, tokenizeRichText, type RichTextResolvers } from "@/features/social/lib/rich-text";
import { createCommentSchema, createPostSchema, updateProfileSchema } from "@/features/social/schemas";
import { decodeCursor, encodeCursor } from "@/lib/cursor";

const resolvers: RichTextResolvers = {
  mention: (handle) => (handle === "ruth_k" ? "ruth_k" : handle === "ancien" ? "nouveau_nom" : null),
  verse: (candidate) => (/^(Jean|1 Co|Psaume) \d/.test(candidate) ? `/bible/lsg/x/${candidate.length}` : null),
};

describe("rendu du texte d'un membre", () => {
  it("reconnaît liens, mentions et références bibliques, le reste reste du texte", () => {
    const tokens = tokenizeRichText("Merci @ruth_k ! Lire Jean 3:16 et https://exemple.org/page.", resolvers);
    expect(tokens.map((t) => t.kind)).toEqual(["text", "mention", "text", "verse", "text", "link", "text"]);
    expect(tokens.find((t) => t.kind === "link")).toMatchObject({ href: "https://exemple.org/page", text: "https://exemple.org/page" });
    expect(tokens.at(-1)).toEqual({ kind: "text", text: "." });
  });

  it("ne transforme jamais de HTML : les balises restent du texte", () => {
    const tokens = tokenizeRichText('<img src=x onerror="alert(1)"> <script>', resolvers);
    expect(tokens).toEqual([{ kind: "text", text: '<img src=x onerror="alert(1)"> <script>' }]);
  });

  it("refuse les schémas d'URL dangereux", () => {
    expect(tokenizeRichText("javascript:alert(1) data:text/html,x", resolvers).every((t) => t.kind === "text")).toBe(true);
  });

  it("une mention non résolue (bloquée, inconnue, non découvrable) reste du texte ; une mention suit le handle courant", () => {
    expect(tokenizeRichText("@inconnu", resolvers)).toEqual([{ kind: "text", text: "@inconnu" }]);
    expect(tokenizeRichText("@ancien", resolvers)).toEqual([{ kind: "mention", text: "@ancien", handle: "nouveau_nom" }]);
  });

  it("ne détecte ni mention ni référence à l'intérieur d'une URL ou d'une adresse email", () => {
    const tokens = tokenizeRichText("https://exemple.org/@ruth_k/Jean 3:16 et contact@ruth_k", resolvers);
    expect(tokens.filter((t) => t.kind === "mention")).toEqual([]);
    expect(extractMentionHandles("contact@ruth_k https://x.org/@paul_b", 10)).toEqual([]);
  });

  it("extrait des mentions uniques, en minuscules, dans la limite donnée", () => {
    expect(extractMentionHandles("@Ruth_K @ruth_k @paul_b @abc", 2)).toEqual(["ruth_k", "paul_b"]);
  });

  it("reconnaît « 1 Co 13:4-7 » et « Psaume 23 »", () => {
    expect(tokenizeRichText("Voir 1 Co 13:4-7.", resolvers).map((t) => t.kind)).toEqual(["text", "verse", "text"]);
    expect(tokenizeRichText("Psaume 23", resolvers)[0]?.kind).toBe("verse");
  });
});

describe("curseur de pagination", () => {
  it("aller-retour exact", () => {
    const cursor = { createdAt: new Date("2026-11-06T08:00:00.123Z"), id: "abc123" };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("curseur falsifié ou invalide : première page", () => {
    for (const value of ["", "xxx", Buffer.from("pas une date|abc").toString("base64url"), Buffer.from("2026-11-06T08:00:00.000Z|a b").toString("base64url"), "a".repeat(200)]) {
      expect(decodeCursor(value)).toBeNull();
    }
  });
});

describe("validation Zod", () => {
  it("publication : aucune visibilité acceptée, au plus 4 images, contenu requis", () => {
    expect(createPostSchema.safeParse({ type: "TEXT", body: "Bonjour", visibility: "FOLLOWERS" }).success).toBe(false);
    expect(createPostSchema.safeParse({ type: "TEXT", body: "" }).success).toBe(false);
    expect(createPostSchema.safeParse({ type: "TEXT", body: "", verse: { bookId: "JHN", chapter: 3, verseStart: 16, verseEnd: 16 } }).success).toBe(true);
    const five = Array.from({ length: 5 }, (_, i) => ({ assetId: `a${i}` }));
    expect(createPostSchema.safeParse({ type: "TEXT", body: "x", images: five }).success).toBe(false);
    expect(createPostSchema.safeParse({ type: "PRAYER_SHARE", body: "x" }).success).toBe(false);
    expect(createPostSchema.safeParse({ type: "TEXT", body: "x".repeat(5001) }).success).toBe(false);
    expect(createPostSchema.safeParse({ type: "TEXT", body: "x", verse: { bookId: "JHN", chapter: 3, verseStart: 1, verseEnd: 40 } }).success).toBe(false);
  });

  it("commentaire : 1 à 2 000 caractères, caractère NUL refusé", () => {
    expect(createCommentSchema.safeParse({ postId: "p1", body: "" }).success).toBe(false);
    expect(createCommentSchema.safeParse({ postId: "p1", body: "a\u0000b" }).success).toBe(false);
    expect(createCommentSchema.safeParse({ postId: "p1", body: "x".repeat(2001) }).success).toBe(false);
  });

  it("profil : handle au bon format, visibilité COMMUNITY refusée", () => {
    const base = { displayName: "Ruth", handle: "ruth_k", churchVisibility: "PRIVATE", locationVisibility: "PRIVATE", countryVisibility: "PRIVATE", denominationVisibility: "PRIVATE", isDiscoverable: true };
    expect(updateProfileSchema.safeParse(base).success).toBe(true);
    expect(updateProfileSchema.safeParse({ ...base, handle: "Ruth K" }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ ...base, churchVisibility: "COMMUNITY" }).success).toBe(false);
  });

  it("signalement : détails ≤ 1 000 caractères ; suspension : durée obligatoire", () => {
    expect(reportSchema.safeParse({ targetType: "POST", targetId: "p1", reason: "SPAM", details: "x".repeat(1001) }).success).toBe(false);
    expect(reportSchema.safeParse({ targetType: "MESSAGE", targetId: "p1", reason: "SPAM" }).success).toBe(false);
    expect(decisionSchema.safeParse({ caseId: "c1", decision: "SUSPEND", publicReason: "x" }).success).toBe(false);
    expect(decisionSchema.safeParse({ caseId: "c1", decision: "SUSPEND", publicReason: "x", durationDays: 7 }).success).toBe(true);
    expect(decisionSchema.safeParse({ caseId: "c1", decision: "WARN", publicReason: "" }).success).toBe(false);
  });
});

describe("priorités de modération", () => {
  it("priorité selon le motif le plus urgent, relevée à 1 pour un mineur", () => {
    expect(casePriority(["OTHER"], false)).toBe(3);
    expect(casePriority(["SPAM", "SEXUAL"], false)).toBe(2);
    expect(casePriority(["SPAM", "HATE"], false)).toBe(1);
    expect(casePriority(["OTHER", "SELF_HARM"], false)).toBe(0);
    expect(casePriority(["OTHER"], true)).toBe(1);
    expect(casePriority(["MINOR_SAFETY"], true)).toBe(0);
  });

  it("motif dominant : le plus fréquent, à égalité le plus urgent", () => {
    expect(dominantReason({ SPAM: 3, HATE: 1 })).toBe("SPAM");
    expect(dominantReason({ SPAM: 2, HATE: 2 })).toBe("HATE");
  });

  it("masquage provisoire : seuil atteint, contenu seulement, une seule fois", () => {
    expect(shouldAutoHide(5, 5, false, true)).toBe(true);
    expect(shouldAutoHide(4, 5, false, true)).toBe(false);
    expect(shouldAutoHide(9, 5, true, true)).toBe(false);
    expect(shouldAutoHide(9, 5, false, false)).toBe(false);
  });
});

describe("regroupement des notifications", () => {
  const actors = [{ handle: "ruth", displayName: "Ruth" }, { handle: "paul", displayName: "Paul" }];
  it("une, deux, plusieurs personnes", () => {
    expect(groupMessage({ type: "REACTION", actorCount: 1, actors: actors.slice(0, 1), data: {} })).toEqual({ key: "reaction.one", values: { name: "Ruth" } });
    expect(groupMessage({ type: "REACTION", actorCount: 2, actors, data: {} })).toEqual({ key: "reaction.two", values: { name: "Ruth", other: "Paul" } });
    expect(groupMessage({ type: "COMMENT", actorCount: 5, actors, data: {} })).toEqual({ key: "comment.many", values: { name: "Ruth", count: 4 } });
  });
  it("modération et retour au signaleur", () => {
    expect(groupMessage({ type: "MODERATION", actorCount: 0, actors: [], data: { decision: "HIDE" } }).key).toBe("moderation.HIDE");
    expect(groupMessage({ type: "REPORT_REVIEWED", actorCount: 0, actors: [], data: {} }).key).toBe("reportReviewed");
  });
});

describe("images", () => {
  const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array<number>(20).fill(0)]);
  it("reconnaît JPEG, PNG, WebP par leurs magic bytes", () => {
    expect(detectImageFormat(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectImageFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(detectImageFormat(new TextEncoder().encode("RIFF\u0000\u0000\u0000\u0000WEBPVP8 "))).toBe("image/webp");
  });
  it("repère SVG (même avec BOM ou espaces), GIF et HEIC pour les refuser", () => {
    expect(detectImageFormat(new TextEncoder().encode("﻿  <?xml version='1.0'?><svg/>"))).toBe("image/svg+xml");
    expect(detectImageFormat(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBe("image/svg+xml");
    expect(detectImageFormat(new TextEncoder().encode("GIF89a"))).toBe("image/gif");
    expect(detectImageFormat(new TextEncoder().encode("\u0000\u0000\u0000\u0018ftypheic"))).toBe("image/heic");
    expect(detectImageFormat(new TextEncoder().encode("bonjour"))).toBe("unknown");
  });
  it("tailles produites sans agrandissement", () => {
    expect(targetWidths("POST_IMAGE", 4000)).toEqual([320, 640, 960, 1280]);
    expect(targetWidths("POST_IMAGE", 700)).toEqual([320, 640]);
    expect(targetWidths("POST_IMAGE", 200)).toEqual([200]);
    expect(targetWidths("AVATAR", 1000)).toEqual([320]);
  });
});
