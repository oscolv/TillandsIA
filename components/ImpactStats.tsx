"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="grid grid-cols-2 gap-px border border-[color:var(--caliza)] bg-[color:var(--caliza)] sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[color:var(--papel)] p-4">
            <Skeleton className="h-16" />
          </div>
        ))}
      </div>
    );
  }

  // Si no hay observaciones, ocultar el panel — evita "0 árboles" deprimente.
  if (stats.total === 0) return null;

  const items: { value: string; label: string; emphasis?: boolean }[] = [
    {
      value: stats.total.toLocaleString("es-MX"),
      label: stats.total === 1 ? "árbol mapeado" : "árboles mapeados",
    },
    {
      value: stats.municipalities.toLocaleString("es-MX"),
      label: stats.municipalities === 1 ? "municipio" : "municipios",
    },
    {
      value: `${stats.severePct}%`,
      label: "severa o muy severa",
      emphasis: stats.severePct >= 25,
    },
    {
      value: `+${stats.thisWeek.toLocaleString("es-MX")}`,
      label: "esta semana",
    },
  ];

  return (
    <section
      aria-label="Estadísticas de impacto del proyecto"
      className="grid grid-cols-2 border border-[color:var(--caliza)] sm:grid-cols-4"
    >
      {items.map((it, i) => (
        <div
          key={i}
          className="pstat border-[color:var(--caliza)] [&:not(:last-child)]:border-r [&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r"
        >
          <span
            className={`pstat-num ${
              it.emphasis ? "!text-[color:var(--terracota)]" : ""
            }`}
          >
            {it.value}
          </span>
          <span className="pstat-label">{it.label}</span>
        </div>
      ))}
    </section>
  );
}
