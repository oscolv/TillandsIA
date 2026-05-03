import { desc, eq, sql } from "drizzle-orm";
import { db, observations } from "@/lib/db";
import type {
  HumanReviewStatus,
  InfestationLevel,
  ReviewItem,
  TrainingSplit,
} from "@/lib/types";
import { ReviewQueue } from "@/components/admin/ReviewQueue";

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

  const [rows, countsRaw] = await Promise.all([
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
  ]);

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
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--rule)] pb-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[color:var(--green)]">
            Revisión del dataset
          </h1>
          <p className="text-xs text-[color:var(--ink-m)]">
            Acepta, corrige o rechaza las observaciones antes de exportarlas a
            Roboflow.
          </p>
        </div>
        <form action="/api/admin/login" method="post" className="hidden">
          <input type="hidden" name="_method" value="DELETE" />
        </form>
      </header>

      <nav className="flex flex-wrap gap-2 text-xs">
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
              className={
                "rounded-md border px-2 py-1 transition " +
                (active
                  ? "border-[color:var(--green)] bg-[color:var(--green)] text-white"
                  : "border-[color:var(--rule)] text-[color:var(--ink-m)] hover:bg-muted")
              }
            >
              {label}
              {n !== undefined && <span className="ml-1 opacity-70">({n})</span>}
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
