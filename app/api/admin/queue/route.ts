import { NextResponse } from "next/server";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db, observations } from "@/lib/db";
import type { HumanReviewStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUS = new Set<HumanReviewStatus | "all">([
  "pending",
  "accepted",
  "corrected",
  "rejected",
  "all",
]);

/**
 * GET /api/admin/queue?status=pending&limit=20&cursor=<ISO>
 *
 * Devuelve un lote de observaciones para revisar, ordenadas por created_at DESC
 * usando el índice observations_review_idx. `cursor` es el created_at del último
 * item del lote anterior (paginación por keyset, estable bajo inserciones).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const statusParam = (url.searchParams.get("status") ?? "pending") as
    | HumanReviewStatus
    | "all";
  if (!VALID_STATUS.has(statusParam)) {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }

  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "20", 10)),
  );
  const cursor = url.searchParams.get("cursor");

  const conditions = [];
  if (statusParam !== "all") {
    conditions.push(eq(observations.humanReviewStatus, statusParam));
  }
  if (cursor) {
    const d = new Date(cursor);
    if (!Number.isNaN(d.getTime())) {
      conditions.push(lt(observations.createdAt, d));
    }
  }

  const where =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  const rows = await db
    .select({
      id: observations.id,
      createdAt: observations.createdAt,
      lat: observations.lat,
      lng: observations.lng,
      accuracy: observations.accuracy,
      photoUrls: observations.photoUrls,
      level: observations.level,
      label: observations.label,
      confidence: observations.confidence,
      treeSpecies: observations.treeSpecies,
      treeSpeciesCommon: observations.treeSpeciesCommon,
      aiNotes: observations.aiNotes,
      municipality: observations.municipality,
      flagged: observations.flagged,
      flagReasons: observations.flagReasons,
      humanReviewStatus: observations.humanReviewStatus,
      humanLevel: observations.humanLevel,
      reviewerNotes: observations.reviewerNotes,
      trainingSplit: observations.trainingSplit,
      imageHashes: observations.imageHashes,
    })
    .from(observations)
    .where(where)
    .orderBy(desc(observations.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1].createdAt.toISOString() : null;

  // Conteo agregado por status (rápido gracias al índice review_idx).
  const counts = await db
    .select({
      status: observations.humanReviewStatus,
      n: sql<number>`count(*)::int`,
    })
    .from(observations)
    .groupBy(observations.humanReviewStatus);

  return NextResponse.json({
    items: page.map((r) => ({
      id: r.id,
      created_at: r.createdAt.toISOString(),
      lat: r.lat,
      lng: r.lng,
      accuracy: r.accuracy,
      photo_urls: r.photoUrls,
      level: r.level,
      label: r.label,
      confidence: r.confidence,
      tree_species: r.treeSpecies,
      tree_species_common: r.treeSpeciesCommon,
      ai_notes: r.aiNotes,
      municipality: r.municipality,
      flagged: r.flagged,
      flag_reasons: r.flagReasons,
      human_review_status: r.humanReviewStatus,
      human_level: r.humanLevel,
      reviewer_notes: r.reviewerNotes,
      training_split: r.trainingSplit,
      image_hashes: r.imageHashes,
    })),
    next_cursor: nextCursor,
    counts: Object.fromEntries(counts.map((c) => [c.status, c.n])),
  });
}
