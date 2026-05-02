"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ClassificationResult as Result } from "@/lib/types";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

const LEVEL_CONFIG: Record<
  number,
  {
    color: string;
    bg: string;
    icon: string;
    description: string;
  }
> = {
  0: {
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: "○",
    description: "No se detecta heno motita en el árbol.",
  },
  1: {
    color: "text-lime-700",
    bg: "bg-lime-50 border-lime-200",
    icon: "◔",
    description: "Infestación leve, entre 1 y 25% de las ramas.",
  },
  2: {
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
    icon: "◑",
    description: "Infestación moderada, entre 25 y 50% de las ramas.",
  },
  3: {
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
    icon: "◕",
    description:
      "Infestación severa: 50–75%. Es el umbral crítico de mortalidad de brotes en mezquite.",
  },
  4: {
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
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
}

export function ClassificationResultView({
  result,
  onConfirm,
  onDiscard,
  submitting = false,
}: ClassificationResultProps) {
  const cfg = LEVEL_CONFIG[result.level];

  return (
    <Card className={`w-full ${cfg.bg} border-2`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-3">
            <span className={`text-4xl ${cfg.color}`} aria-hidden>
              {cfg.icon}
            </span>
            <span>
              <span className="block text-2xl font-bold">
                Nivel {result.level} — {result.label}
              </span>
              <span className="block text-xs text-muted-foreground font-normal">
                Confianza: {Math.round(result.confidence * 100)}%
              </span>
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm">{cfg.description}</p>

        {result.tree_species_common && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Especie:</span>
            <Badge variant="secondary">{result.tree_species_common}</Badge>
            {result.tree_species && (
              <span className="text-xs italic text-muted-foreground">
                {result.tree_species}
              </span>
            )}
          </div>
        )}

        {result.ai_notes && (
          <p className="text-sm text-muted-foreground italic">
            {result.ai_notes}
          </p>
        )}

        {result.level >= 3 && (
          <Alert className="border-orange-300 bg-orange-100">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Árbol fuente potencial</AlertTitle>
            <AlertDescription>
              Los árboles con &gt;50% de cobertura producen miles de semillas
              que infectan a los árboles vecinos. Considera reportar a
              CONAFOR o al programa municipal de Tula de Allende.
            </AlertDescription>
          </Alert>
        )}

        {result.branch_dieback && (
          <Alert variant="default">
            <Info className="h-4 w-4" />
            <AlertTitle>Daño avanzado visible</AlertTitle>
            <AlertDescription>
              Se detectaron ramas muertas — señal de parasitismo avanzado.
            </AlertDescription>
          </Alert>
        )}

        {result.flag_reasons.includes("post_treatment_appearance") && (
          <Alert variant="default">
            <Info className="h-4 w-4" />
            <AlertTitle>Posible tratamiento previo</AlertTitle>
            <AlertDescription>
              Los cúmulos se ven café-secos, lo que sugiere fumigación previa.
              El musgo muerto puede persistir 18 meses a 10 años antes de caer.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        <p className="text-xs text-muted-foreground">
          La clasificación es automática y debe validarse en campo para
          decisiones de manejo.
        </p>

        <div className="flex gap-2">
          <Button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 gap-2"
            size="lg"
          >
            <CheckCircle2 className="h-5 w-5" />
            {submitting ? "Publicando..." : "Confirmar y publicar"}
          </Button>
          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={submitting}
            size="lg"
          >
            Descartar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
