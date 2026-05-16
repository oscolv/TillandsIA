"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import {
  LEVEL_LABELS,
  type HumanReviewStatus,
  type InfestationLevel,
  type ReviewItem,
} from "@/lib/types";

interface Props {
  item: ReviewItem;
  onReviewed: (id: string, patch: Partial<ReviewItem>) => void;
}

type Mode = "idle" | "correct" | "reject";

export function ReviewCard({ item, onReviewed }: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [humanLevel, setHumanLevel] = useState<InfestationLevel>(item.level);
  const [notes, setNotes] = useState<string>(item.reviewer_notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(
    status: HumanReviewStatus,
    extra: { humanLevel?: InfestationLevel | null; reviewerNotes?: string | null } = {},
  ) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/review/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          humanLevel: extra.humanLevel ?? null,
          reviewerNotes: extra.reviewerNotes ?? null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      onReviewed(item.id, {
        human_review_status: status,
        human_level: extra.humanLevel ?? null,
        reviewer_notes: extra.reviewerNotes ?? null,
      });
      setMode("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  }

  const confidencePct =
    item.confidence != null ? `${Math.round(item.confidence * 100)}%` : "—";

  const reviewedBadge = (() => {
    switch (item.human_review_status) {
      case "accepted":
        return <span className="mini-tag success">Aceptada</span>;
      case "corrected":
        return (
          <span className="mini-tag warning">
            Corregida → nivel {item.human_level}
          </span>
        );
      case "rejected":
        return <span className="mini-tag danger">Rechazada</span>;
      default:
        return <span className="mini-tag">Pendiente</span>;
    }
  })();

  const stateClass = (() => {
    switch (item.human_review_status) {
      case "accepted":
        return "border-l-[3px] border-l-[color:var(--mezquite-oscuro)]";
      case "corrected":
        return "border-l-[3px] border-l-[color:var(--terracota)]";
      case "rejected":
        return "border-l-[3px] border-l-[color:var(--rojo-alerta)]";
      default:
        return "border-l-[3px] border-l-[color:var(--caliza)]";
    }
  })();

  return (
    <article
      className={`overflow-hidden border border-[color:var(--caliza)] bg-[color:var(--papel)] ${stateClass}`}
    >
      <div className="grid gap-0 sm:grid-cols-[280px_1fr]">
        <div className="h-64 w-full overflow-hidden sm:h-full">
          <PhotoCarousel
            urls={item.photo_urls}
            alt={`Observación ${item.id}`}
            className="h-64 w-full object-cover sm:h-full"
          />
        </div>

        <div className="flex flex-col gap-3 p-4">
          <header className="flex flex-wrap items-center gap-2">
            {reviewedBadge}
            <span className="mini-tag">
              Modelo · nivel {item.level} · {item.label}
            </span>
            <span className="mini-tag">conf {confidencePct}</span>
            {item.flagged && (
              <span className="mini-tag danger">
                flag: {item.flag_reasons.join(", ")}
              </span>
            )}
            {(!item.image_hashes || item.image_hashes.length === 0) && (
              <span className="mini-tag">legacy (sin hash)</span>
            )}
            {item.photo_urls.length > 1 && (
              <span className="mini-tag">{item.photo_urls.length} fotos</span>
            )}
          </header>

          <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-[0.82rem]">
            <dt className="font-mono text-[0.7rem] uppercase tracking-[0.05em] text-[color:var(--corteza)]">
              Especie
            </dt>
            <dd className="text-[color:var(--tinta)]">
              {item.tree_species_common ?? "—"}{" "}
              {item.tree_species && (
                <em className="text-[color:var(--corteza)]">
                  ({item.tree_species})
                </em>
              )}
            </dd>
            <dt className="font-mono text-[0.7rem] uppercase tracking-[0.05em] text-[color:var(--corteza)]">
              Municipio
            </dt>
            <dd className="text-[color:var(--tinta)]">
              {item.municipality ?? "—"}
            </dd>
            <dt className="font-mono text-[0.7rem] uppercase tracking-[0.05em] text-[color:var(--corteza)]">
              Coordenadas
            </dt>
            <dd className="text-[color:var(--tinta)]">
              <a
                href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
              </a>{" "}
              {item.accuracy != null && (
                <span className="text-[color:var(--corteza)]">
                  (±{Math.round(item.accuracy)} m)
                </span>
              )}
            </dd>
            <dt className="font-mono text-[0.7rem] uppercase tracking-[0.05em] text-[color:var(--corteza)]">
              Fecha
            </dt>
            <dd className="text-[color:var(--tinta)]">
              {new Date(item.created_at).toLocaleString("es-MX")}
            </dd>
          </dl>

          {item.ai_notes && (
            <p className="border-l-2 border-[color:var(--heno-seco)] bg-[color:var(--papel-alt)] px-2.5 py-1.5 text-[0.85rem] italic text-[color:var(--tinta)]">
              {item.ai_notes}
            </p>
          )}

          {mode === "idle" && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                onClick={() => submit("accepted")}
                disabled={submitting}
                className="bg-green-700 text-white hover:bg-green-700/90"
              >
                Aceptar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setMode("correct");
                  setHumanLevel(item.level);
                }}
                disabled={submitting}
              >
                Corregir nivel
              </Button>
              <Button
                variant="destructive"
                onClick={() => setMode("reject")}
                disabled={submitting}
              >
                Rechazar
              </Button>
            </div>
          )}

          {mode === "correct" && (
            <div className="flex flex-col gap-2 border-l-[3px] border-l-[color:var(--terracota)] border-y border-r border-[color:var(--caliza)] bg-[color:var(--papel-alt)] p-3">
              <label className="font-mono text-[0.7rem] uppercase tracking-[0.06em] text-[color:var(--corteza)]">
                Nivel correcto
              </label>
              <div className="flex flex-wrap gap-1.5">
                {([0, 1, 2, 3, 4] as InfestationLevel[]).map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setHumanLevel(lv)}
                    className="muni-tag"
                    aria-pressed={humanLevel === lv}
                  >
                    {lv} · {LEVEL_LABELS[lv]}
                  </button>
                ))}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas (opcional)"
                rows={2}
                className="border border-[color:var(--caliza)] bg-[color:var(--papel)] px-2.5 py-1.5 font-sans text-[0.85rem] text-[color:var(--tinta)] focus:border-[color:var(--mezquite-oscuro)] focus:outline-none"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    submit("corrected", {
                      humanLevel,
                      reviewerNotes: notes.trim() || null,
                    })
                  }
                  disabled={submitting}
                >
                  Guardar corrección
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMode("idle");
                    setNotes(item.reviewer_notes ?? "");
                  }}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {mode === "reject" && (
            <div className="flex flex-col gap-2 border-l-[3px] border-l-[color:var(--rojo-alerta)] border-y border-r border-[color:var(--caliza)] bg-[color:var(--rojo-alerta-bg)] p-3">
              <label className="font-mono text-[0.7rem] uppercase tracking-[0.06em] text-[color:var(--rojo-alerta)]">
                Motivo del rechazo
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ej. líquenes, no es heno, fuera de zona…"
                rows={2}
                className="border border-[color:var(--caliza)] bg-[color:var(--papel)] px-2.5 py-1.5 font-sans text-[0.85rem] text-[color:var(--tinta)] focus:border-[color:var(--rojo-alerta)] focus:outline-none"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() =>
                    submit("rejected", { reviewerNotes: notes.trim() || null })
                  }
                  disabled={submitting}
                >
                  Confirmar rechazo
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMode("idle");
                    setNotes(item.reviewer_notes ?? "");
                  }}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p
              className="font-mono text-[0.78rem] text-[color:var(--rojo-alerta)]"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
