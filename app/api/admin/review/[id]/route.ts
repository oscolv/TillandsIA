import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, observations } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ReviewSchema = z
  .object({
    status: z.enum(["accepted", "corrected", "rejected"]),
    humanLevel: z.number().int().min(0).max(4).nullable().optional(),
    reviewerNotes: z.string().max(2000).nullable().optional(),
  })
  .refine(
    (v) =>
      v.status === "corrected"
        ? typeof v.humanLevel === "number"
        : v.humanLevel == null,
    {
      message:
        "humanLevel solo aplica con status='corrected' y debe estar entre 0-4",
      path: ["humanLevel"],
    },
  );

/**
 * PATCH /api/admin/review/:id — registra una decisión humana sobre la observación.
 *  - accepted  → la etiqueta del modelo es correcta.
 *  - corrected → humanLevel reemplaza level al exportar; reviewerNotes opcional.
 *  - rejected  → la foto no entra al dataset; reviewerNotes opcional para auditoría.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  let body: z.infer<typeof ReviewSchema>;
  try {
    body = ReviewSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      {
        error: "Payload inválido",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }

  const [row] = await db
    .update(observations)
    .set({
      humanReviewStatus: body.status,
      humanLevel: body.status === "corrected" ? body.humanLevel ?? null : null,
      reviewerNotes: body.reviewerNotes ?? null,
    })
    .where(eq(observations.id, id))
    .returning({
      id: observations.id,
      humanReviewStatus: observations.humanReviewStatus,
      humanLevel: observations.humanLevel,
      reviewerNotes: observations.reviewerNotes,
    });

  if (!row) {
    return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    human_review_status: row.humanReviewStatus,
    human_level: row.humanLevel,
    reviewer_notes: row.reviewerNotes,
  });
}
