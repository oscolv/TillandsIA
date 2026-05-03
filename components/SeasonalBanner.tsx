"use client";

import { useEffect, useState } from "react";
import { CalendarRange, CloudRain } from "lucide-react";

export function SeasonalBanner() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    // Evita hydration mismatch al mostrar banner basado en mes actual del cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(false);
  }, []);

  if (hidden) return null;

  const month = new Date().getMonth() + 1;

  if (month >= 1 && month <= 4) {
    return (
      <aside className="nota-campo success">
        <span className="nota-titulo flex items-center gap-2">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
          Ventana óptima de mapeo
        </span>
        <p className="text-[0.92rem] leading-relaxed text-[color:var(--tinta)]">
          Enero–abril es la mejor época para mapear: los árboles están sin hojas
          y el heno motita es más visible. Tus observaciones ayudan a las
          brigadas a intervenir antes de la dispersión de semillas.
        </p>
      </aside>
    );
  }

  if (month >= 7 && month <= 9) {
    return (
      <aside className="nota-campo warning">
        <span className="nota-titulo flex items-center gap-2">
          <CloudRain className="h-3.5 w-3.5" aria-hidden="true" />
          Temporada de lluvias
        </span>
        <p className="text-[0.92rem] leading-relaxed text-[color:var(--tinta)]">
          Las lluvias hacen el heno motita más difícil de ver, pero también
          reducen su dispersión. Sigue mapeando — cada observación cuenta.
        </p>
      </aside>
    );
  }

  return null;
}
