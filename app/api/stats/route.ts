import { NextResponse } from "next/server";
import { db, observations } from "@/lib/db";
import { count, countDistinct, sql } from "drizzle-orm";

export const runtime = "nodejs";
// `dynamic = "force-dynamic"` evita que Next intente prerender al build
// time (que rompería con env placeholders en CI). El caché real lo da el
// header Cache-Control de abajo, servido por el edge de Vercel.
export const dynamic = "force-dynamic";

/**
 * GET /api/stats — métricas agregadas para el panel de impacto en home.
 *
 * Devuelve totales y derivados:
 *  - total: observaciones totales
 *  - municipalities: municipios únicos cubiertos
 *  - severeCount / severePct: nivel >= 3 (umbral crítico de mortalidad)
 *  - thisWeek: observaciones en los últimos 7 días
 *
 * Caché HTTP: s-maxage 60s + SWR 300s. Edge cache de Vercel cubre el
 * spike — la DB recibe ~1 query por minuto sin importar tráfico.
 */
export async function GET() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [row] = await db
    .select({
      total: count(),
      municipalities: countDistinct(observations.municipality),
      severeCount: sql<number>`count(*) filter (where ${observations.level} >= 3)`,
      thisWeek: sql<number>`count(*) filter (where ${observations.createdAt} >= ${oneWeekAgo})`,
    })
    .from(observations);

  const total = Number(row.total ?? 0);
  const severeCount = Number(row.severeCount ?? 0);
  const severePct = total > 0 ? Math.round((severeCount / total) * 100) : 0;

  return NextResponse.json(
    {
      total,
      municipalities: Number(row.municipalities ?? 0),
      severeCount,
      severePct,
      thisWeek: Number(row.thisWeek ?? 0),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
