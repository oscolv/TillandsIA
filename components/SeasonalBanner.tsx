"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarRange, CloudRain } from "lucide-react";

/**
 * Banner contextual al mes actual.
 *
 * Enero–abril: ventana óptima de mapeo en el Valle del Mezquital.
 *   Los árboles están sin hojas y los cúmulos de heno motita son más
 *   visibles. Coincide con la pre-dispersión de semillas (PLOS ONE 2017,
 *   Pérez-Noyola 2019), así que las observaciones tomadas ahora informan
 *   a brigadas para intervenir antes de que se liberen las semillas.
 *
 * Julio–septiembre: temporada de lluvias. La lluvia inmoviliza las
 *   semillas y reduce la dispersión natural — sigue mapeando, pero el
 *   heno motita es más difícil de ver con dosel cubierto.
 *
 * Mayo–junio y oct–dic: sin banner (operación normal).
 */
export function SeasonalBanner() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(false); // hidratación, evita flash en SSR
  }, []);

  if (hidden) return null;

  const month = new Date().getMonth() + 1; // 1-12

  if (month >= 1 && month <= 4) {
    return (
      <Alert className="border-l-4 border-[color:var(--green-m)] bg-[#EBF3E0]">
        <CalendarRange
          className="h-4 w-4 text-[color:var(--green-m)]"
          aria-hidden="true"
        />
        <AlertTitle className="text-[color:var(--green)]">
          Ventana óptima de mapeo
        </AlertTitle>
        <AlertDescription>
          Enero–abril es la mejor época para mapear: los árboles están sin
          hojas y el heno motita es más visible. Tus observaciones ayudan a
          las brigadas a intervenir antes de la dispersión de semillas.
        </AlertDescription>
      </Alert>
    );
  }

  if (month >= 7 && month <= 9) {
    return (
      <Alert className="border-l-4 border-[color:var(--ochre)] bg-[#FFF8EA]">
        <CloudRain
          className="h-4 w-4 text-[color:var(--ochre)]"
          aria-hidden="true"
        />
        <AlertTitle className="text-[color:var(--ochre)]">
          Temporada de lluvias
        </AlertTitle>
        <AlertDescription>
          Las lluvias hacen el heno motita más difícil de ver, pero también
          reducen su dispersión. Sigue mapeando — cada observación cuenta.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
