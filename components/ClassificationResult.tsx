"use client";

import { Button } from "@/components/ui/button";
import type { ClassificationResult as Result } from "@/lib/types";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

const LEVEL_CONFIG: Record<
  number,
  {
    accent: string;
    icon: string;
    description: string;
  }
> = {
  0: {
    accent: "var(--mezquite-oscuro)",
    icon: "○",
    description: "No se detecta heno motita en el árbol.",
  },
  1: {
    accent: "#5A8F32",
    icon: "◔",
    description: "Infestación leve, entre 1 y 25% de las ramas.",
  },
  2: {
    accent: "var(--heno-seco)",
    icon: "◑",
    description: "Infestación moderada, entre 25 y 50% de las ramas.",
  },
  3: {
    accent: "var(--terracota)",
    icon: "◕",
    description:
      "Infestación severa: 50–75%. Es el umbral crítico de mortalidad de brotes en mezquite.",
  },
  4: {
    accent: "var(--rojo-alerta)",
    icon: "●",
    description:
      "Infestación muy severa: más del 75%. Este es un árbol fuente que dispersa semillas a sus vecinos.",
  },
};

interface ClassificationResultProps {
  result: Result;
  onConfirm: () => void;
  onDiscard: () => void;
  submitting?: boolean;
  municipality?: string | null;
}

export function ClassificationResultView({
  result,
  onConfirm,
  onDiscard,
  submitting = false,
  municipality = null,
}: ClassificationResultProps) {
  const cfg = LEVEL_CONFIG[result.level];

  return (
    <article
      className={`field-card level-${result.level}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="badge-science !mb-3 !pb-1">Resultado del análisis</span>
      <header className="flex items-center gap-3 pb-3 border-b border-[color:var(--caliza)]">
        <span
          className="font-serif text-4xl"
          style={{ color: cfg.accent }}
          aria-hidden
        >
          {cfg.icon}
        </span>
        <div>
          <h2 className="text-[1.35rem] font-semibold leading-tight text-[color:var(--tinta)]">
            Nivel {result.level} — {result.label}
          </h2>
          <span className="font-mono text-[0.74rem] uppercase tracking-[0.06em] text-[color:var(--corteza)]">
            Confianza: {Math.round(result.confidence * 100)}%
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-4 pt-4">
        <p className="text-[0.95rem] leading-relaxed text-[color:var(--tinta)]">
          {cfg.description}
        </p>

        {result.tree_species_common && (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-[0.88rem]">
            <dt className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[color:var(--corteza)] pt-1">
              Especie
            </dt>
            <dd className="text-[color:var(--tinta)]">
              <span className="mini-tag">{result.tree_species_common}</span>
              {result.tree_species && (
                <em className="ml-2 text-[0.84rem] text-[color:var(--corteza)]">
                  {result.tree_species}
                </em>
              )}
            </dd>
          </dl>
        )}

        {result.ai_notes && (
          <p className="text-[0.88rem] italic text-[color:var(--corteza)]">
            {result.ai_notes}
          </p>
        )}

        {result.level >= 3 && (
          <aside className="nota-campo warning">
            <span className="nota-titulo flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              Árbol fuente potencial
            </span>
            <p className="text-[0.92rem] leading-relaxed text-[color:var(--tinta)]">
              Los árboles con &gt;50% de cobertura producen miles de semillas
              que infectan a los árboles vecinos. Considera reportar a CONAFOR
              {municipality
                ? ` o al programa municipal de ${municipality}.`
                : " o a tu autoridad ambiental local."}
            </p>
          </aside>
        )}

        {result.branch_dieback && (
          <aside className="nota-campo">
            <span className="nota-titulo flex items-center gap-2">
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              Daño avanzado visible
            </span>
            <p className="text-[0.92rem] leading-relaxed text-[color:var(--tinta)]">
              Se detectaron ramas muertas — señal de parasitismo avanzado.
            </p>
          </aside>
        )}

        {result.flag_reasons.includes("post_treatment_appearance") && (
          <aside className="nota-campo">
            <span className="nota-titulo flex items-center gap-2">
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              Posible tratamiento previo
            </span>
            <p className="text-[0.92rem] leading-relaxed text-[color:var(--tinta)]">
              Los cúmulos se ven café-secos, lo que sugiere fumigación previa.
              El musgo muerto puede persistir 18 meses a 10 años antes de caer.
            </p>
          </aside>
        )}

        <hr className="divider" aria-hidden="true" />

        <p className="font-mono text-[0.7rem] uppercase tracking-[0.05em] text-[color:var(--corteza)]">
          La clasificación es automática y debe validarse en campo para
          decisiones de manejo.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={onConfirm}
            disabled={submitting}
            className="h-16 w-full gap-2 text-base sm:flex-1"
            size="lg"
          >
            <CheckCircle2 className="h-5 w-5" />
            {submitting ? "Publicando…" : "Confirmar y publicar"}
          </Button>
          <Button
            variant="ghost"
            onClick={onDiscard}
            disabled={submitting}
            size="lg"
            className="w-full text-[color:var(--corteza)] hover:text-[color:var(--rojo-alerta)] sm:w-auto"
          >
            Descartar
          </Button>
        </div>
      </div>
    </article>
  );
}
