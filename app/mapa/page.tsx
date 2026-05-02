"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Filter, Leaf, X } from "lucide-react";
import { MUNICIPALITIES } from "@/lib/municipalities";
import type { InfestationLevel } from "@/lib/types";
import type { MapFilters } from "@/components/ObservationMap";

const ObservationMap = dynamic(
  () => import("@/components/ObservationMap").then((m) => m.ObservationMap),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full rounded-none" />,
  },
);

const LEVEL_COLOR: Record<InfestationLevel, string> = {
  0: "#22c55e",
  1: "#84cc16",
  2: "#eab308",
  3: "#f97316",
  4: "#ef4444",
};
const LEVEL_LABELS_SHORT: Record<InfestationLevel, string> = {
  0: "Sin",
  1: "Leve",
  2: "Mod.",
  3: "Severa",
  4: "Muy severa",
};

export default function MapaPage() {
  const [levelFilter, setLevelFilter] = useState<Set<InfestationLevel>>(new Set());
  const [muniFilter, setMuniFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filters: MapFilters = useMemo(
    () => ({ levels: levelFilter, municipality: muniFilter }),
    [levelFilter, muniFilter],
  );

  const activeCount = (levelFilter.size > 0 ? 1 : 0) + (muniFilter ? 1 : 0);

  function toggleLevel(lvl: InfestationLevel) {
    setLevelFilter((prev) => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });
  }

  function clearAll() {
    setLevelFilter(new Set());
    setMuniFilter(null);
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-border bg-card flex-shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3 gap-2">
          <h1 className="flex items-center gap-2 font-semibold min-w-0">
            <Leaf className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden="true" />
            <span className="truncate">Mapa</span>
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant={activeCount > 0 ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="gap-2"
              aria-expanded={showFilters}
              aria-controls="filter-panel"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filtros
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {activeCount}
                </Badge>
              )}
            </Button>
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Subir foto</span>
              </Button>
            </Link>
          </div>
        </div>

        {showFilters && (
          <div
            id="filter-panel"
            className="border-t border-border bg-card max-w-5xl mx-auto px-4 py-3 flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground">
                Nivel de infestación
              </span>
              <div className="flex flex-wrap gap-2">
                {([0, 1, 2, 3, 4] as InfestationLevel[]).map((lvl) => {
                  const active = levelFilter.has(lvl);
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => toggleLevel(lvl)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border-2 transition ${
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-card hover:bg-muted"
                      }`}
                      aria-pressed={active}
                    >
                      <span
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white text-[9px] font-bold text-white"
                        style={{ backgroundColor: LEVEL_COLOR[lvl] }}
                        aria-hidden="true"
                      >
                        {lvl}
                      </span>
                      {LEVEL_LABELS_SHORT[lvl]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="muni-select"
                className="text-xs font-semibold text-muted-foreground"
              >
                Municipio
              </label>
              <select
                id="muni-select"
                value={muniFilter ?? ""}
                onChange={(e) => setMuniFilter(e.target.value || null)}
                className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="">Todos</option>
                {MUNICIPALITIES.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="self-start gap-2"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Limpiar filtros
              </Button>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 relative">
        <ObservationMap filters={filters} />
        <Legend />
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { lvl: 0, color: "#22c55e", label: "Sin infestación" },
    { lvl: 1, color: "#84cc16", label: "Leve" },
    { lvl: 2, color: "#eab308", label: "Moderada" },
    { lvl: 3, color: "#f97316", label: "Severa" },
    { lvl: 4, color: "#ef4444", label: "Muy severa" },
  ];
  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-card border border-border rounded-md shadow-lg p-3 text-xs">
      <div className="font-semibold mb-2">Nivel de infestación</div>
      <ul className="flex flex-col gap-1">
        {items.map((it) => (
          <li key={it.lvl} className="flex items-center gap-2">
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
              style={{ backgroundColor: it.color }}
              aria-hidden="true"
            >
              {it.lvl}
            </span>
            <span>{it.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
