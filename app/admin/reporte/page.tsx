import Link from "next/link";
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import {
  classificationEvents,
  db,
  observations,
} from "@/lib/db";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { Sparkline } from "@/components/admin/Sparkline";
import type { InfestationLevel } from "@/lib/types";
import { MUNICIPALITIES } from "@/lib/municipalities";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Reporte · TillandsIA",
  robots: { index: false, follow: false },
};

type Periodo = "30d" | "90d" | "all";
type SearchParams = Promise<{ periodo?: string }>;

const LEVEL_COLOR: Record<InfestationLevel, string> = {
  0: "#22c55e",
  1: "#84cc16",
  2: "#eab308",
  3: "#f97316",
  4: "#ef4444",
};

export default async function ReportePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const periodo: Periodo =
    sp.periodo === "90d" || sp.periodo === "all" ? sp.periodo : "30d";

  const since = periodo === "all" ? null : daysAgo(periodo === "30d" ? 30 : 90);
  const sinceCondition = since
    ? gte(observations.createdAt, since)
    : undefined;
  const sinceCondEvents = since
    ? gte(classificationEvents.createdAt, since)
    : undefined;

  // ─── Consultas en paralelo ───────────────────────────────────────────────
  const [
    statusCounts,
    timeToReview,
    lowConfidencePending,
    confusionRows,
    dailyVolume,
    municipalityRows,
    monthlyConfidence,
    monthlyEvents,
    topContributors,
    recentErrors,
    eventOutcomeCounts,
    abandonRate,
  ] = await Promise.all([
    // Conteo por status (todos los tiempos)
    db
      .select({
        status: observations.humanReviewStatus,
        n: sql<number>`count(*)::int`,
      })
      .from(observations)
      .groupBy(observations.humanReviewStatus),

    // Tiempo captura → revisión (segundos): avg, p50, p95
    db
      .select({
        avgSec: sql<number | null>`avg(extract(epoch from (${observations.reviewedAt} - ${observations.createdAt})))::float`,
        p50Sec: sql<number | null>`percentile_cont(0.5) within group (order by extract(epoch from (${observations.reviewedAt} - ${observations.createdAt})))::float`,
        p95Sec: sql<number | null>`percentile_cont(0.95) within group (order by extract(epoch from (${observations.reviewedAt} - ${observations.createdAt})))::float`,
        n: sql<number>`count(*)::int`,
      })
      .from(observations)
      .where(isNotNull(observations.reviewedAt)),

    // Pendientes con baja confianza (<0.7) — prioridad de revisión
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(observations)
      .where(
        and(
          eq(observations.humanReviewStatus, "pending"),
          sql`${observations.confidence} is not null and ${observations.confidence} < 0.7`,
        ),
      ),

    // Matriz de confusión modelo↔humano (de revisadas: accepted/corrected)
    db
      .select({
        modelLevel: observations.level,
        humanLevel: sql<number>`coalesce(${observations.humanLevel}, ${observations.level})`,
        n: sql<number>`count(*)::int`,
      })
      .from(observations)
      .where(
        and(
          inArray(observations.humanReviewStatus, ["accepted", "corrected"]),
          sinceCondition,
        ),
      )
      .groupBy(
        observations.level,
        sql`coalesce(${observations.humanLevel}, ${observations.level})`,
      ),

    // Volumen diario (para sparkline)
    db
      .select({
        day: sql<string>`date_trunc('day', ${observations.createdAt})::date::text`,
        n: sql<number>`count(*)::int`,
      })
      .from(observations)
      .where(sinceCondition)
      .groupBy(sql`date_trunc('day', ${observations.createdAt})`)
      .orderBy(sql`date_trunc('day', ${observations.createdAt})`),

    // Cobertura por municipio
    db
      .select({
        municipality: observations.municipality,
        total: sql<number>`count(*)::int`,
        avgLevel: sql<number | null>`avg(${observations.level})::float`,
        lastCapture: sql<Date | string | null>`max(${observations.createdAt})`,
        corrections: sql<number>`sum(case when ${observations.humanReviewStatus} = 'corrected' then 1 else 0 end)::int`,
        reviewed: sql<number>`sum(case when ${observations.humanReviewStatus} in ('accepted','corrected') then 1 else 0 end)::int`,
      })
      .from(observations)
      .where(sinceCondition)
      .groupBy(observations.municipality)
      .orderBy(desc(sql`count(*)`)),

    // Confianza promedio por mes (drift)
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${observations.createdAt}), 'YYYY-MM')`,
        avgConf: sql<number | null>`avg(${observations.confidence})::float`,
        n: sql<number>`count(*)::int`,
      })
      .from(observations)
      .where(isNotNull(observations.confidence))
      .groupBy(sql`date_trunc('month', ${observations.createdAt})`)
      .orderBy(sql`date_trunc('month', ${observations.createdAt})`),

    // Eventos por mes y outcome (rejection rate over time)
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${classificationEvents.createdAt}), 'YYYY-MM')`,
        outcome: classificationEvents.outcome,
        n: sql<number>`count(*)::int`,
      })
      .from(classificationEvents)
      .groupBy(
        sql`date_trunc('month', ${classificationEvents.createdAt})`,
        classificationEvents.outcome,
      )
      .orderBy(
        sql`date_trunc('month', ${classificationEvents.createdAt})`,
        classificationEvents.outcome,
      ),

    // Top contribuidores por ip_hash (anónimo)
    db
      .select({
        ipHash: observations.ipHash,
        total: sql<number>`count(*)::int`,
        avgConf: sql<number | null>`avg(${observations.confidence})::float`,
        corrections: sql<number>`sum(case when ${observations.humanReviewStatus} = 'corrected' then 1 else 0 end)::int`,
        reviewed: sql<number>`sum(case when ${observations.humanReviewStatus} in ('accepted','corrected') then 1 else 0 end)::int`,
      })
      .from(observations)
      .where(sinceCondition)
      .groupBy(observations.ipHash)
      .orderBy(desc(sql`count(*)`))
      .limit(10),

    // Últimos errores en /api/classify
    db
      .select({
        createdAt: classificationEvents.createdAt,
        ipHash: classificationEvents.ipHash,
        imageHash: classificationEvents.imageHash,
        modelVersion: classificationEvents.modelVersion,
      })
      .from(classificationEvents)
      .where(eq(classificationEvents.outcome, "error"))
      .orderBy(desc(classificationEvents.createdAt))
      .limit(10),

    // Resumen total de eventos por outcome (para tabla de rechazos)
    db
      .select({
        outcome: classificationEvents.outcome,
        n: sql<number>`count(*)::int`,
        avgConf: sql<number | null>`avg(${classificationEvents.confidence})::float`,
      })
      .from(classificationEvents)
      .where(sinceCondEvents)
      .groupBy(classificationEvents.outcome),

    // Tasa de abandono: clasificadas que nunca terminaron en una observación
    db
      .select({
        classified: sql<number>`count(*) filter (where ${classificationEvents.outcome} = 'classified')::int`,
        confirmed: sql<number>`count(distinct ${classificationEvents.imageHash}) filter (where ${classificationEvents.outcome} = 'classified' and exists (select 1 from ${observations} o where o.image_hash = ${classificationEvents.imageHash}))::int`,
      })
      .from(classificationEvents)
      .where(sinceCondEvents),
  ]);

  // ─── Procesado de datos ─────────────────────────────────────────────────
  const counts = Object.fromEntries(
    statusCounts.map((r) => [r.status, r.n]),
  ) as Record<string, number>;
  const totalAll = (counts.pending ?? 0) + (counts.accepted ?? 0) + (counts.corrected ?? 0) + (counts.rejected ?? 0);
  const totalReviewed = (counts.accepted ?? 0) + (counts.corrected ?? 0) + (counts.rejected ?? 0);

  const timeRow = timeToReview[0];

  // Confusion matrix 5x5
  const matrix: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  let matrixTotal = 0;
  let matrixDiagonal = 0;
  for (const r of confusionRows) {
    const m = r.modelLevel;
    const h = r.humanLevel;
    if (m >= 0 && m <= 4 && h >= 0 && h <= 4) {
      matrix[m][h] += r.n;
      matrixTotal += r.n;
      if (m === h) matrixDiagonal += r.n;
    }
  }
  const agreement = matrixTotal > 0 ? matrixDiagonal / matrixTotal : null;
  const matrixMax = Math.max(1, ...matrix.flat());

  // Pares más confundidos (off-diagonal con n>0, top 5)
  const confusedPairs: { model: number; human: number; n: number }[] = [];
  for (let m = 0; m <= 4; m++) {
    for (let h = 0; h <= 4; h++) {
      if (m !== h && matrix[m][h] > 0) {
        confusedPairs.push({ model: m, human: h, n: matrix[m][h] });
      }
    }
  }
  confusedPairs.sort((a, b) => b.n - a.n);
  const topConfused = confusedPairs.slice(0, 5);

  // Volume sparkline: rellenar días sin datos con 0 para que la línea no se distorsione
  const dailySeries = fillDailySeries(dailyVolume, since);

  // Confidence drift: serie por mes
  const confidenceMonths = monthlyConfidence.map((r) => ({
    month: r.month,
    avg: r.avgConf ?? 0,
    n: r.n,
  }));

  // Rejection breakdown by month: pivotear
  const rejectionByMonth = pivotByMonth(monthlyEvents);

  // Eventos summary
  const eventsByOutcome = Object.fromEntries(
    eventOutcomeCounts.map((r) => [r.outcome, { n: r.n, avgConf: r.avgConf }]),
  ) as Record<string, { n: number; avgConf: number | null }>;
  const totalEvents = Object.values(eventsByOutcome).reduce((s, r) => s + r.n, 0);

  // Abandono
  const ab = abandonRate[0];
  const abandonPct = ab && ab.classified > 0
    ? 1 - ab.confirmed / ab.classified
    : null;

  // Cobertura: municipios sin datos
  const seenMunis = new Set(
    municipalityRows.map((r) => r.municipality).filter(Boolean),
  );
  const missingMunis = MUNICIPALITIES.map((m) => m.name).filter(
    (n) => !seenMunis.has(n),
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-7 px-4 py-7">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--caliza)] pb-4 print:hidden">
        <div>
          <span className="badge-science !mb-2">Admin · Reporte</span>
          <h1 className="font-display text-[1.7rem] font-semibold leading-tight text-[color:var(--tinta)]">
            Estado del mapeo
          </h1>
          <p className="mt-1 text-[0.88rem] text-[color:var(--corteza)]">
            Dashboard interno. Periodo:{" "}
            <strong className="text-[color:var(--tinta)]">
              {periodo === "all" ? "Todo" : periodo === "30d" ? "Últimos 30 días" : "Últimos 90 días"}
            </strong>
            .
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Link
            href="/admin/revision"
            className="muni-tag"
          >
            ← Cola de revisión
          </Link>
          <LogoutButton />
        </div>
      </header>

      <nav aria-label="Periodo" className="flex flex-wrap gap-2 print:hidden">
        {(["30d", "90d", "all"] as const).map((p) => (
          <Link
            key={p}
            href={`/admin/reporte?periodo=${p}`}
            className={`muni-tag ${periodo === p ? "active" : ""}`}
            aria-current={periodo === p ? "page" : undefined}
          >
            {p === "30d" ? "30 días" : p === "90d" ? "90 días" : "Todo"}
          </Link>
        ))}
      </nav>

      {/* ─── §1 KPIs ────────────────────────────────────────────────────── */}
      <section>
        <SectionHeading n={1}>Backlog de curaduría</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            label="Total"
            value={fmtInt(totalAll)}
            hint={`${fmtInt(totalReviewed)} revisadas · ${fmtInt(counts.pending ?? 0)} pendientes`}
          />
          <Kpi
            label="Pendientes"
            value={fmtInt(counts.pending ?? 0)}
            hint={`${fmtInt(lowConfidencePending[0]?.n ?? 0)} con confianza <0.7`}
            href="/admin/revision?status=pending"
          />
          <Kpi
            label="Aceptadas / Corregidas"
            value={fmtInt((counts.accepted ?? 0) + (counts.corrected ?? 0))}
            hint={`${fmtInt(counts.accepted ?? 0)} sin cambio · ${fmtInt(counts.corrected ?? 0)} corregidas`}
          />
          <Kpi
            label="Rechazadas"
            value={fmtInt(counts.rejected ?? 0)}
            hint={
              totalReviewed > 0
                ? `${fmtPct((counts.rejected ?? 0) / totalReviewed)} del total revisado`
                : "—"
            }
          />
        </div>

        <Subsection>
          <h3 className="report-subhead">Tiempo captura → revisión</h3>
          {timeRow && timeRow.n > 0 && timeRow.avgSec != null ? (
            <dl className="grid grid-cols-3 gap-2 font-mono text-[0.9rem]">
              <Stat label="Promedio" value={fmtDuration(timeRow.avgSec)} />
              <Stat label="Mediana (p50)" value={fmtDuration(timeRow.p50Sec ?? 0)} />
              <Stat label="P95" value={fmtDuration(timeRow.p95Sec ?? 0)} />
            </dl>
          ) : (
            <p className="text-[0.88rem] text-[color:var(--corteza)]">
              Aún no hay observaciones revisadas con timestamp. Se llenará a
              medida que pasen por <code>/admin/revision</code>.
            </p>
          )}
        </Subsection>
      </section>

      {/* ─── §2 Calidad del modelo ────────────────────────────────────────── */}
      <section>
        <SectionHeading n={2}>Calidad del modelo</SectionHeading>
        {matrixTotal === 0 ? (
          <p className="text-[0.88rem] text-[color:var(--corteza)]">
            Sin observaciones revisadas en el periodo. La matriz se construye
            con observaciones aceptadas o corregidas.
          </p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
            <div>
              <h3 className="report-subhead">
                Matriz de confusión (modelo ↔ humano)
              </h3>
              <table className="report-matrix">
                <thead>
                  <tr>
                    <th aria-hidden="true"></th>
                    <th colSpan={5} className="text-center font-mono text-[0.66rem] uppercase tracking-[0.08em] text-[color:var(--corteza)]">
                      Humano dijo
                    </th>
                  </tr>
                  <tr>
                    <th className="text-right font-mono text-[0.7rem] text-[color:var(--corteza)]">Modelo ↓</th>
                    {[0, 1, 2, 3, 4].map((h) => (
                      <th key={h} className="text-center font-mono text-[0.78rem]">
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center border border-[color:var(--tinta)] font-mono text-[10px] font-bold text-[color:var(--papel)]"
                          style={{ backgroundColor: LEVEL_COLOR[h as InfestationLevel] }}
                        >
                          {h}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3, 4].map((m) => (
                    <tr key={m}>
                      <th className="text-right pr-2 font-mono text-[0.78rem]">
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center border border-[color:var(--tinta)] font-mono text-[10px] font-bold text-[color:var(--papel)]"
                          style={{ backgroundColor: LEVEL_COLOR[m as InfestationLevel] }}
                        >
                          {m}
                        </span>
                      </th>
                      {[0, 1, 2, 3, 4].map((h) => {
                        const v = matrix[m][h];
                        const isDiag = m === h;
                        const intensity = matrixMax > 0 ? v / matrixMax : 0;
                        return (
                          <td
                            key={h}
                            className={`px-3 py-1.5 text-center font-mono text-[0.85rem] ${isDiag ? "font-semibold" : ""}`}
                            style={{
                              backgroundColor: v === 0
                                ? "transparent"
                                : isDiag
                                  ? `rgba(34, 197, 94, ${0.15 + intensity * 0.35})`
                                  : `rgba(239, 68, 68, ${0.10 + intensity * 0.30})`,
                              color: "var(--tinta)",
                            }}
                          >
                            {v || ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3">
              <Subsection>
                <h3 className="report-subhead">Acuerdo modelo↔humano</h3>
                <p className="font-mono text-[1.4rem] font-semibold text-[color:var(--tinta)]">
                  {agreement != null ? fmtPct(agreement) : "—"}
                </p>
                <p className="text-[0.82rem] text-[color:var(--corteza)]">
                  {fmtInt(matrixDiagonal)} de {fmtInt(matrixTotal)} revisadas
                  conservaron el nivel del modelo.
                </p>
              </Subsection>

              <Subsection>
                <h3 className="report-subhead">Pares más confundidos</h3>
                {topConfused.length === 0 ? (
                  <p className="text-[0.88rem] text-[color:var(--corteza)]">
                    Sin discrepancias en el periodo.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1 font-mono text-[0.82rem]">
                    {topConfused.map((p, i) => (
                      <li key={i} className="flex items-center justify-between">
                        <span>
                          modelo {p.model} → humano {p.human}
                        </span>
                        <span className="font-semibold text-[color:var(--tinta)]">
                          {p.n}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Subsection>
            </div>
          </div>
        )}
      </section>

      {/* ─── §3 Volumen y ritmo ───────────────────────────────────────────── */}
      <section>
        <SectionHeading n={3}>Volumen y ritmo</SectionHeading>
        <Subsection>
          <h3 className="report-subhead">Observaciones por día</h3>
          {dailySeries.length === 0 ? (
            <p className="text-[0.88rem] text-[color:var(--corteza)]">
              Sin observaciones en el periodo.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-[color:var(--mezquite-oscuro)]">
                <Sparkline
                  values={dailySeries.map((d) => d.n)}
                  width={640}
                  height={60}
                  ariaLabel={`Observaciones por día (${dailySeries.length} días)`}
                />
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[0.78rem] text-[color:var(--corteza)]">
                <span>
                  Total periodo:{" "}
                  <strong className="text-[color:var(--tinta)]">
                    {fmtInt(dailySeries.reduce((s, d) => s + d.n, 0))}
                  </strong>
                </span>
                <span>
                  Mejor día:{" "}
                  <strong className="text-[color:var(--tinta)]">
                    {fmtInt(Math.max(...dailySeries.map((d) => d.n)))}
                  </strong>
                </span>
                <span>
                  Días con captura:{" "}
                  <strong className="text-[color:var(--tinta)]">
                    {fmtInt(dailySeries.filter((d) => d.n > 0).length)} / {dailySeries.length}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </Subsection>
      </section>

      {/* ─── §4 Cobertura geográfica ─────────────────────────────────────── */}
      <section>
        <SectionHeading n={4}>Cobertura geográfica</SectionHeading>
        <Subsection>
          <h3 className="report-subhead">Por municipio</h3>
          {municipalityRows.length === 0 ? (
            <p className="text-[0.88rem] text-[color:var(--corteza)]">
              Sin observaciones en el periodo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Municipio</th>
                    <th className="text-right">Conteo</th>
                    <th className="text-right">Nivel prom.</th>
                    <th className="text-right">% corregido</th>
                    <th>Última captura</th>
                  </tr>
                </thead>
                <tbody>
                  {municipalityRows.map((m, i) => {
                    const correctRate = m.reviewed > 0 ? m.corrections / m.reviewed : null;
                    return (
                      <tr key={i}>
                        <td>{m.municipality ?? <em className="text-[color:var(--corteza)]">sin asignar</em>}</td>
                        <td className="text-right font-mono">{fmtInt(m.total)}</td>
                        <td className="text-right font-mono">{m.avgLevel != null ? m.avgLevel.toFixed(2) : "—"}</td>
                        <td className="text-right font-mono">{correctRate != null ? fmtPct(correctRate) : "—"}</td>
                        <td className="font-mono text-[0.82rem]">{m.lastCapture ? fmtDate(m.lastCapture) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Subsection>

        {missingMunis.length > 0 && (
          <Subsection>
            <h3 className="report-subhead">Municipios sin observaciones</h3>
            <p className="text-[0.85rem] text-[color:var(--corteza)]">
              {missingMunis.join(" · ")}
            </p>
          </Subsection>
        )}
      </section>

      {/* ─── §5 Salud del modelo (drift) ───────────────────────────────── */}
      <section>
        <SectionHeading n={5}>Salud del modelo</SectionHeading>

        <Subsection>
          <h3 className="report-subhead">Confianza promedio por mes</h3>
          {confidenceMonths.length === 0 ? (
            <p className="text-[0.88rem] text-[color:var(--corteza)]">
              Sin datos suficientes.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th className="text-right">Confianza prom.</th>
                    <th className="text-right">N</th>
                    <th>Tendencia</th>
                  </tr>
                </thead>
                <tbody>
                  {confidenceMonths.map((c, i) => (
                    <tr key={i}>
                      <td className="font-mono text-[0.82rem]">{c.month}</td>
                      <td className="text-right font-mono">{c.avg.toFixed(3)}</td>
                      <td className="text-right font-mono">{fmtInt(c.n)}</td>
                      <td>
                        <div
                          className="inline-block h-2 align-middle"
                          style={{
                            width: `${Math.round(c.avg * 100)}%`,
                            maxWidth: "180px",
                            backgroundColor:
                              c.avg >= 0.85
                                ? "#22c55e"
                                : c.avg >= 0.7
                                  ? "#eab308"
                                  : "#ef4444",
                          }}
                          aria-hidden="true"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Subsection>

        <Subsection>
          <h3 className="report-subhead">
            Eventos de clasificación (todo el tiempo)
          </h3>
          {totalEvents === 0 ? (
            <p className="text-[0.88rem] text-[color:var(--corteza)]">
              Sin eventos registrados todavía. Se llenará desde la próxima
              foto que pase por <code>/api/classify</code>.
            </p>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th>Outcome</th>
                  <th className="text-right">Conteo</th>
                  <th className="text-right">% del total</th>
                  <th className="text-right">Confianza prom.</th>
                </tr>
              </thead>
              <tbody>
                {[
                  "classified",
                  "rejected_face",
                  "rejected_insufficient",
                  "rejected_other",
                  "error",
                ].map((outcome) => {
                  const e = eventsByOutcome[outcome];
                  if (!e) return null;
                  return (
                    <tr key={outcome}>
                      <td className="font-mono text-[0.82rem]">{outcome}</td>
                      <td className="text-right font-mono">{fmtInt(e.n)}</td>
                      <td className="text-right font-mono">{fmtPct(e.n / totalEvents)}</td>
                      <td className="text-right font-mono">
                        {e.avgConf != null ? e.avgConf.toFixed(3) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {abandonPct != null && (
            <p className="mt-2 font-mono text-[0.82rem] text-[color:var(--corteza)]">
              Tasa de abandono (clasificadas no confirmadas):{" "}
              <strong className="text-[color:var(--tinta)]">{fmtPct(abandonPct)}</strong>
            </p>
          )}
        </Subsection>

        {Object.keys(rejectionByMonth).length > 0 && (
          <Subsection>
            <h3 className="report-subhead">Eventos por mes</h3>
            <div className="overflow-x-auto">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th className="text-right">Clasif.</th>
                    <th className="text-right">Rech. rostro</th>
                    <th className="text-right">Rech. insuf.</th>
                    <th className="text-right">Rech. otro</th>
                    <th className="text-right">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(rejectionByMonth).map(([month, row]) => (
                    <tr key={month}>
                      <td className="font-mono text-[0.82rem]">{month}</td>
                      <td className="text-right font-mono">{fmtInt(row.classified ?? 0)}</td>
                      <td className="text-right font-mono">{fmtInt(row.rejected_face ?? 0)}</td>
                      <td className="text-right font-mono">{fmtInt(row.rejected_insufficient ?? 0)}</td>
                      <td className="text-right font-mono">{fmtInt(row.rejected_other ?? 0)}</td>
                      <td className="text-right font-mono">{fmtInt(row.error ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Subsection>
        )}
      </section>

      {/* ─── §6 Top contribuidores ────────────────────────────────────── */}
      <section>
        <SectionHeading n={6}>Top contribuidores (por hash de IP)</SectionHeading>
        <Subsection>
          {topContributors.length === 0 ? (
            <p className="text-[0.88rem] text-[color:var(--corteza)]">
              Sin observaciones en el periodo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Hash IP</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Confianza prom.</th>
                    <th className="text-right">% corregido</th>
                  </tr>
                </thead>
                <tbody>
                  {topContributors.map((c, i) => {
                    const correctRate = c.reviewed > 0 ? c.corrections / c.reviewed : null;
                    return (
                      <tr key={i}>
                        <td className="font-mono text-[0.78rem]">
                          {c.ipHash.slice(0, 8)}…{c.ipHash.slice(-4)}
                        </td>
                        <td className="text-right font-mono">{fmtInt(c.total)}</td>
                        <td className="text-right font-mono">
                          {c.avgConf != null ? c.avgConf.toFixed(3) : "—"}
                        </td>
                        <td className="text-right font-mono">
                          {correctRate != null ? fmtPct(correctRate) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Subsection>
      </section>

      {/* ─── §7 Errores recientes ────────────────────────────────────── */}
      <section>
        <SectionHeading n={7}>Errores recientes</SectionHeading>
        <Subsection>
          {recentErrors.length === 0 ? (
            <p className="text-[0.88rem] text-[color:var(--corteza)]">
              Sin errores registrados en <code>classification_events</code>.
              Para errores en <code>/api/observations</code> y otros 5xx,
              consulta los logs de Vercel.
            </p>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hash IP</th>
                  <th>Image hash</th>
                  <th>Modelo</th>
                </tr>
              </thead>
              <tbody>
                {recentErrors.map((e, i) => (
                  <tr key={i}>
                    <td className="font-mono text-[0.78rem]">{fmtDate(e.createdAt)}</td>
                    <td className="font-mono text-[0.78rem]">{e.ipHash.slice(0, 8)}…</td>
                    <td className="font-mono text-[0.78rem]">
                      {e.imageHash ? `${e.imageHash.slice(0, 12)}…` : "—"}
                    </td>
                    <td className="font-mono text-[0.78rem]">{e.modelVersion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Subsection>
      </section>

      <footer className="border-t border-[color:var(--caliza)] pt-4 font-mono text-[0.68rem] uppercase tracking-[0.06em] text-[color:var(--corteza)] print:block">
        Generado:{" "}
        <span className="text-[color:var(--tinta)]">
          {new Date().toISOString()}
        </span>
        {" · "}
        Periodo: {periodo}
      </footer>

      {/* Estilos del reporte. Tailwind v4 + tokens del design system. */}
      <style>{`
        .report-subhead {
          font-family: var(--font-mono), ui-monospace, monospace;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--terracota);
          margin: 0 0 0.5rem 0;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
        }
        .report-table th {
          text-align: left;
          padding: 0.4rem 0.6rem;
          font-family: var(--font-mono), ui-monospace, monospace;
          font-size: 0.7rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--corteza);
          border-bottom: 1px solid var(--caliza);
        }
        .report-table td {
          padding: 0.4rem 0.6rem;
          border-bottom: 1px solid var(--caliza);
          color: var(--tinta);
        }
        .report-table tr:hover td {
          background: var(--papel-alt);
        }
        .report-matrix {
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        .report-matrix th, .report-matrix td {
          border: 1px solid var(--caliza);
        }
        .report-matrix th {
          padding: 0.4rem 0.5rem;
          background: var(--papel-alt);
          color: var(--tinta);
        }
        @media print {
          nav[aria-label="Periodo"], header { display: none !important; }
          section { break-inside: avoid; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Helpers de presentación

function SectionHeading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-display text-[1.15rem] font-semibold text-[color:var(--tinta)]">
      <span className="font-mono text-[0.7rem] text-[color:var(--corteza)]">§{n}</span>
      {children}
    </h2>
  );
}

function Subsection({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 border border-[color:var(--caliza)] bg-[color:var(--papel)] p-4">
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <div className="flex flex-col gap-1 border border-[color:var(--caliza)] bg-[color:var(--papel)] p-3 transition-colors hover:bg-[color:var(--papel-alt)]">
      <span className="font-mono text-[0.66rem] uppercase tracking-[0.08em] text-[color:var(--corteza)]">
        {label}
      </span>
      <span className="font-display text-[1.5rem] font-semibold leading-none text-[color:var(--tinta)]">
        {value}
      </span>
      {hint && (
        <span className="font-mono text-[0.7rem] text-[color:var(--corteza)]">
          {hint}
        </span>
      )}
    </div>
  );
  return href ? <Link href={href} className="!no-underline">{inner}</Link> : inner;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[0.66rem] uppercase tracking-[0.08em] text-[color:var(--corteza)]">
        {label}
      </dt>
      <dd className="text-[1.05rem] font-semibold text-[color:var(--tinta)]">
        {value}
      </dd>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Helpers de datos

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fillDailySeries(
  rows: { day: string; n: number }[],
  since: Date | null,
): { day: string; n: number }[] {
  const map = new Map(rows.map((r) => [r.day, r.n]));
  const start = since ?? (rows.length > 0 ? new Date(rows[0].day) : new Date());
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const out: { day: string; n: number }[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, n: map.get(key) ?? 0 });
  }
  return out;
}

function pivotByMonth(
  rows: { month: string; outcome: string; n: number }[],
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    if (!out[r.month]) out[r.month] = {};
    out[r.month][r.outcome] = r.n;
  }
  return out;
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat("es-MX").format(n);
}

function fmtPct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (d == null) return "—";
  // neon-http devuelve timestamps de aggregates como strings ISO; los regulares
  // como Date. Normalizamos antes de formatear.
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)} s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / 86400).toFixed(1)} d`;
}

