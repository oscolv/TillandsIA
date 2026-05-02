"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TreePine, MapPin, AlertTriangle, CalendarDays } from "lucide-react";

interface Stats {
  total: number;
  municipalities: number;
  severeCount: number;
  severePct: number;
  thisWeek: number;
}

export function ImpactStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return null;

  if (!stats) {
    return (
      <Card>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Si no hay observaciones, ocultar el panel — evita "0 árboles" deprimente.
  if (stats.total === 0) return null;

  const items: { icon: React.ReactNode; value: string; label: string; tone?: string }[] = [
    {
      icon: <TreePine className="h-5 w-5 text-emerald-600" aria-hidden="true" />,
      value: stats.total.toLocaleString("es-MX"),
      label: stats.total === 1 ? "árbol mapeado" : "árboles mapeados",
    },
    {
      icon: <MapPin className="h-5 w-5 text-sky-600" aria-hidden="true" />,
      value: stats.municipalities.toLocaleString("es-MX"),
      label: stats.municipalities === 1 ? "municipio cubierto" : "municipios cubiertos",
    },
    {
      icon: <AlertTriangle className="h-5 w-5 text-orange-600" aria-hidden="true" />,
      value: `${stats.severePct}%`,
      label: "severa o muy severa",
      tone: stats.severePct >= 25 ? "text-orange-700 font-semibold" : undefined,
    },
    {
      icon: <CalendarDays className="h-5 w-5 text-violet-600" aria-hidden="true" />,
      value: `+${stats.thisWeek.toLocaleString("es-MX")}`,
      label: "esta semana",
    },
  ];

  return (
    <Card aria-label="Estadísticas de impacto del proyecto">
      <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
        {items.map((it, i) => (
          <div key={i} className="flex flex-col items-center text-center gap-1">
            {it.icon}
            <div className={`text-2xl font-bold ${it.tone ?? ""}`}>
              {it.value}
            </div>
            <div className="text-xs text-muted-foreground">{it.label}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
