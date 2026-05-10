import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, observations } from "@/lib/db";
import type {
  HumanReviewStatus,
  InfestationLevel,
  ReviewItem,
  TrainingSplit,
} from "@/lib/types";
import { ReviewQueue } from "@/components/admin/ReviewQueue";
import { ExportButton } from "@/components/admin/ExportButton";
import { LogoutButton } from "@/components/admin/LogoutButton";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Revisión · TillandsIA",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

type SearchParams = Promise<{ status?: string }>;

export default async function RevisionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const status = (sp.status as HumanReviewStatus | "all" | undefined) ?? "pending";

  const [rows, countsRaw, exportableRow] = await Promise.all([
    db
      .select({
        id: observations.id,
        createdAt: observations.createdAt,
        lat: observations.lat,
        lng: observations.lng,
        accuracy: observations.accuracy,
        photoUrl: observations.photoUrl,
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
        imageHash: observations.imageHash,
      })
      .from(observations)
      .where(
        status === "all" ? undefined : eq(observations.humanReviewStatus, status),
      )
      .orderBy(desc(observations.createdAt))
      .limit(PAGE_SIZE + 1),
    db
      .select({
        status: observations.humanReviewStatus,
        n: sql<number>`count(*)::int`,
      })
      .from(observations)
      .groupBy(observations.humanReviewStatus),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(observations)
      .where(
        and(
          inArray(observations.humanReviewStatus, ["accepted", "corrected"]),
          isNotNull(observations.imageHash),
        ),
      ),
  ]);
  const exportable = exportableRow[0]?.n ?? 0;

  const hasMore = rows.length > PAGE_SIZE;
  const initialItems: ReviewItem[] = (hasMore ? rows.slice(0, PAGE_SIZE) : rows).map(
    (r) => ({
      id: r.id,
      created_at: r.createdAt.toISOString(),
      lat: r.lat,
      lng: r.lng,
      accuracy: r.accuracy,
      photo_url: r.photoUrl,
      level: r.level as InfestationLevel,
      label: r.label,
      confidence: r.confidence,
      tree_species: r.treeSpecies,
      tree_species_common: r.treeSpeciesCommon,
      ai_notes: r.aiNotes,
      municipality: r.municipality,
      flagged: r.flagged,
      flag_reasons: r.flagReasons,
      human_review_status: r.humanReviewStatus as HumanReviewStatus,
      human_level: r.humanLevel as InfestationLevel | null,
      reviewer_notes: r.reviewerNotes,
      training_split: r.trainingSplit as TrainingSplit | null,
      image_hash: r.imageHash,
    }),
  );

  const initialCursor = hasMore
    ? initialItems[initialItems.length - 1].created_at
    : null;

  const counts = Object.fromEntries(countsRaw.map((c) => [c.status, c.n])) as Record<
    HumanReviewStatus,
    number
  >;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 px-4 py-7">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--caliza)] pb-4">
        <div>
          <span className="badge-science !mb-2">Admin · Curaduría</span>
          <h1 className="font-display text-[1.7rem] font-semibold leading-tight text-[color:var(--tinta)]">
            Revisión del dataset
          </h1>
          <p className="mt-1 text-[0.88rem] text-[color:var(--corteza)]">
            Acepta, corrige o rechaza las observaciones antes de exportarlas a
            Roboflow.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <a
            href="/admin/reporte"
            className="muni-tag"
            aria-label="Ver reporte interno del estado del mapeo"
          >
            Reporte →
          </a>
          <ExportButton exportable={exportable} />
          <LogoutButton />
        </div>
      </header>

      <nav
        aria-label="Filtro por estado"
        className="flex flex-wrap gap-2"
      >
        {(
          [
            ["pending", "Pendientes"],
            ["accepted", "Aceptadas"],
            ["corrected", "Corregidas"],
            ["rejected", "Rechazadas"],
            ["all", "Todas"],
          ] as const
        ).map(([key, label]) => {
          const active = status === key;
          const n = key === "all" ? undefined : counts[key as HumanReviewStatus];
          return (
            <a
              key={key}
              href={`/admin/revision?status=${key}`}
              className={`muni-tag ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {label}
              {n !== undefined && (
                <span className="ml-1 font-mono text-[0.62rem] opacity-70">
                  {n}
                </span>
              )}
            </a>
          );
        })}
      </nav>

      <ReviewQueue
        initialItems={initialItems}
        initialCursor={initialCursor}
        status={status}
      />
    </div>
  );
}
