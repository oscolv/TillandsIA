"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        return <Badge className="bg-green-600 text-white">Aceptada</Badge>;
      case "corrected":
        return (
          <Badge className="bg-amber-600 text-white">
            Corregida → nivel {item.human_level}
          </Badge>
        );
      case "rejected":
        return <Badge variant="destructive">Rechazada</Badge>;
      default:
        return <Badge variant="outline">Pendiente</Badge>;
    }
  })();

  return (
    <article className="overflow-hidden rounded-lg border border-[color:var(--rule)] bg-background shadow-sm">
      <div className="grid gap-0 sm:grid-cols-[280px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.photo_url}
          alt={`Observación ${item.id}`}
          className="h-64 w-full object-cover sm:h-full"
          loading="lazy"
        />

        <div className="flex flex-col gap-3 p-4">
          <header className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--ink-m)]">
            {reviewedBadge}
            <Badge variant="outline">
              Modelo: nivel {item.level} · {item.label}
            </Badge>
            <Badge variant="outline">conf {confidencePct}</Badge>
            {item.flagged && (
              <Badge variant="destructive">flag: {item.flag_reasons.join(", ")}</Badge>
            )}
            {item.image_hash == null && (
              <Badge variant="outline">legacy (sin hash)</Badge>
            )}
          </header>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[color:var(--ink-m)]">
            <dt>Especie</dt>
            <dd className="text-foreground">
              {item.tree_species_common ?? "—"}{" "}
              {item.tree_species && (
                <em className="text-[color:var(--ink-m)]">({item.tree_species})</em>
              )}
            </dd>
            <dt>Municipio</dt>
            <dd className="text-foreground">{item.municipality ?? "—"}</dd>
            <dt>Coordenadas</dt>
            <dd>
              <a
                href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
              </a>{" "}
              {item.accuracy != null && (
                <span className="text-[color:var(--ink-m)]">
                  (±{Math.round(item.accuracy)} m)
                </span>
              )}
            </dd>
            <dt>Fecha</dt>
            <dd>{new Date(item.created_at).toLocaleString("es-MX")}</dd>
          </dl>

          {item.ai_notes && (
            <p className="rounded border-l-2 border-[color:var(--ochre)] bg-muted/40 px-2 py-1 text-xs italic">
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
            <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-2">
              <label className="text-xs font-medium">Nivel correcto</label>
              <div className="flex flex-wrap gap-1">
                {([0, 1, 2, 3, 4] as InfestationLevel[]).map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setHumanLevel(lv)}
                    className={
                      "rounded border px-2 py-1 text-xs " +
                      (humanLevel === lv
                        ? "border-[color:var(--green)] bg-[color:var(--green)] text-white"
                        : "border-[color:var(--rule)] bg-background hover:bg-muted")
                    }
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
                className="rounded border border-[color:var(--rule)] bg-background px-2 py-1 text-xs"
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
            <div className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-2">
              <label className="text-xs font-medium">Motivo del rechazo</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ej. líquenes, no es heno, fuera de zona…"
                rows={2}
                className="rounded border border-[color:var(--rule)] bg-background px-2 py-1 text-xs"
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
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
