import { NextResponse } from "next/server";
import { z } from "zod";
import { db, observations } from "@/lib/db";
import { uploadPhoto } from "@/lib/blob";
import { isInsideMezquital, validateCoords } from "@/lib/validate-coords";
import { municipalityFor } from "@/lib/municipalities";
import { hashIP } from "@/lib/hash-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasValidBypassToken } from "@/lib/bypass-token";
import {
  CLASSIFIER_VERSION,
  MODEL_VERSION,
} from "@/lib/classify";
import {
  deriveHashes,
  getCachedClassification,
  hashImage,
} from "@/lib/classification-cache";
import type { FlagReason, InfestationLevel, PublicObservation } from "@/lib/types";
import { desc, eq, gte, sql } from "drizzle-orm";
import { LEVEL_LABELS } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 15;
export const dynamic = "force-dynamic";

/**
 * sha256 hex tiene 64 chars. Strict para evitar payloads malformados.
 * Cada observación lleva 1–3 fotos del mismo árbol; el orden se conserva
 * porque el combinedHash depende de él.
 */
const PhotoSchema = z.object({
  base64: z.string().min(1),
  hash: z.string().regex(/^[a-f0-9]{64}$/, "hash debe ser sha256 hex"),
});

const NewObservationSchema = z.object({
  lat: z.number().finite(),
  lng: z.number().finite(),
  accuracy: z.number().finite().nullable(),
  photos: z.array(PhotoSchema).min(1).max(3),
  combinedHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/, "combinedHash debe ser sha256 hex"),
});

/**
 * POST /api/observations — guarda la observación tras confirmación del usuario.
 *
 * Integridad classification ↔ imágenes:
 *  - El cliente NO envía level/confidence/etc. Solo `photos: [{base64, hash}]`
 *    (1–3 fotos en orden de subida) y `combinedHash`.
 *  - El servidor recalcula sha256 de cada base64 y verifica el hash 1:1.
 *  - Recomputa combinedHash sobre los hashes individuales en orden y compara.
 *  - Lee la classification del cache de Redis usando `combinedHash`.
 *  - Si el cache expiró (TTL 15 min) → 410 y el usuario debe volver a clasificar.
 *
 * Defensa en profundidad:
 *  - Re-valida coordenadas contra bbox global
 *  - Re-aplica rate limit
 *  - Re-rechaza si has_human_face o rejection_reason
 *  - Calcula municipality, season_window server-side
 */
export async function POST(req: Request) {
  // Rate limit
  let identifier: string;
  try {
    identifier = hashIP(req);
  } catch (err) {
    console.error("hashIP error:", err);
    return NextResponse.json(
      { error: "Configuración del servidor incompleta" },
      { status: 500 },
    );
  }

  const tier = hasValidBypassToken(req) ? "bypass" : "normal";
  const rl = await checkRateLimit(`obs:${identifier}`, tier);
  if (!rl.success) {
    const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: `Límite de ${rl.limit} observaciones por hora alcanzado.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  // Parse body
  let payload: z.infer<typeof NewObservationSchema>;
  try {
    payload = NewObservationSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Payload inválido", details: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  // Validar coordenadas globales
  const coordsErr = validateCoords(payload.lat, payload.lng);
  if (coordsErr) {
    return NextResponse.json({ error: coordsErr }, { status: 400 });
  }

  // Decode cada base64 → buffer y verificar hash individual 1:1.
  // Si alguno no cuadra, el cliente está intentando montar la classification
  // sobre fotos distintas a las que el modelo vio.
  const photoBufs: Buffer[] = [];
  for (let i = 0; i < payload.photos.length; i++) {
    const p = payload.photos[i];
    let buf: Buffer;
    try {
      buf = Buffer.from(p.base64, "base64");
      if (buf.length === 0) throw new Error("buffer vacío");
    } catch {
      return NextResponse.json(
        { error: `Foto ${i + 1} base64 inválida` },
        { status: 400 },
      );
    }
    if (hashImage(buf) !== p.hash) {
      return NextResponse.json(
        {
          error: `El hash de la foto ${i + 1} no corresponde con la imagen enviada.`,
        },
        { status: 400 },
      );
    }
    photoBufs.push(buf);
  }

  // Recomputar combinedHash sobre los hashes individuales en orden de subida
  // y comparar con el declarado. Esto detecta reordenamientos en cliente.
  const { combined: recomputedCombined } = deriveHashes(photoBufs);
  if (recomputedCombined !== payload.combinedHash) {
    return NextResponse.json(
      {
        error:
          "El conjunto de fotos no corresponde con la sesión clasificada (combinedHash distinto).",
      },
      { status: 400 },
    );
  }

  // Leer la classification real desde el cache (es la del servidor, no del cliente).
  let classification;
  try {
    classification = await getCachedClassification(payload.combinedHash);
  } catch (err) {
    console.error("classification-cache read error:", err);
    return NextResponse.json(
      { error: "Configuración del servidor incompleta" },
      { status: 500 },
    );
  }
  if (!classification) {
    return NextResponse.json(
      {
        error:
          "La sesión de clasificación expiró o no existe. Toma las fotos de nuevo.",
      },
      { status: 410 },
    );
  }

  // Defensa en profundidad: rechazos cacheados nunca deberían llegar aquí, pero por si acaso.
  if (classification.has_human_face || classification.rejection_reason) {
    return NextResponse.json(
      { error: "Esta foto fue rechazada y no se puede publicar." },
      { status: 422 },
    );
  }

  // Acumular flags (incluye out_of_bbox calculado server-side)
  const flag_reasons: FlagReason[] = [...classification.flag_reasons];
  let flagged = flag_reasons.length > 0;

  if (!isInsideMezquital(payload.lat, payload.lng)) {
    if (!flag_reasons.includes("out_of_bbox")) flag_reasons.push("out_of_bbox");
    flagged = true;
  }

  // Subir todas las fotos a Blob en paralelo. Si una falla, abortar — no se
  // crea la observación parcial; Vercel Blob deja huérfanas las que ya subieron
  // (cleanup posterior con scripts/cleanup-blob-orphans.ts).
  let photo_urls: string[];
  try {
    photo_urls = await Promise.all(photoBufs.map((b) => uploadPhoto(b)));
  } catch (err) {
    console.error("blob upload error:", err);
    return NextResponse.json(
      { error: "No se pudieron guardar las fotos. Intenta de nuevo." },
      { status: 500 },
    );
  }

  // season_window: created_at en enero-abril (ventana óptima)
  const month = new Date().getUTCMonth(); // 0-11
  const season_window = month >= 0 && month <= 3;

  const municipality = municipalityFor(payload.lat, payload.lng);

  try {
    const [row] = await db
      .insert(observations)
      .values({
        lat: payload.lat,
        lng: payload.lng,
        accuracy: payload.accuracy,
        photoUrls: photo_urls,
        level: classification.level,
        label: classification.label,
        confidence: classification.confidence,
        treeSpecies: classification.tree_species,
        treeSpeciesCommon: classification.tree_species_common,
        aiNotes: classification.ai_notes,
        infestationActive: classification.infestation_active,
        branchDieback: classification.branch_dieback,
        photoAngle: classification.photo_angle,
        municipality,
        seasonWindow: season_window,
        flagged,
        flagReasons: flag_reasons,
        classifierVersion: CLASSIFIER_VERSION,
        modelVersion: MODEL_VERSION,
        ipHash: identifier,
        imageHashes: payload.photos.map((p) => p.hash),
      })
      .returning({ id: observations.id, createdAt: observations.createdAt });

    return NextResponse.json({
      id: row.id,
      created_at: row.createdAt.toISOString(),
      flagged,
      municipality,
    });
  } catch (err) {
    console.error("db insert error:", err);
    return NextResponse.json(
      { error: "No se pudo guardar la observación." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/observations — lista paginada para alimentar el mapa.
 *
 * Query params:
 *   ?limit=N (1-500, default 200)
 *   ?level=0|1|2|3|4 (filtro opcional)
 *   ?since=ISO (created_at >= since)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(
    500,
    Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "200", 10)),
  );
  const levelParam = url.searchParams.get("level");
  const since = url.searchParams.get("since");

  const conditions = [];
  if (levelParam !== null) {
    const lv = Number.parseInt(levelParam, 10);
    if (lv >= 0 && lv <= 4) conditions.push(eq(observations.level, lv));
  }
  if (since) {
    const d = new Date(since);
    if (!Number.isNaN(d.getTime())) conditions.push(gte(observations.createdAt, d));
  }

  const rows = await db
    .select({
      id: observations.id,
      createdAt: observations.createdAt,
      lat: observations.lat,
      lng: observations.lng,
      level: observations.level,
      label: observations.label,
      photoUrls: observations.photoUrls,
      treeSpecies: observations.treeSpecies,
      treeSpeciesCommon: observations.treeSpeciesCommon,
      aiNotes: observations.aiNotes,
      municipality: observations.municipality,
      flagged: observations.flagged,
    })
    .from(observations)
    .where(conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined)
    .orderBy(desc(observations.createdAt))
    .limit(limit);

  const result: PublicObservation[] = rows.map((r) => ({
    id: r.id,
    created_at: r.createdAt.toISOString(),
    lat: r.lat,
    lng: r.lng,
    level: r.level as InfestationLevel,
    label: r.label || LEVEL_LABELS[r.level as InfestationLevel],
    photo_urls: r.photoUrls,
    tree_species: r.treeSpecies,
    tree_species_common: r.treeSpeciesCommon,
    ai_notes: r.aiNotes,
    municipality: r.municipality,
    flagged: r.flagged,
  }));

  return NextResponse.json(
    { observations: result, count: result.length },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
