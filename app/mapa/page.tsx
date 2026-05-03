"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
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
    <div className="flex h-screen flex-col">
      <SiteHeader>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2 sm:px-6">
          <span className="eyebrow on-dark">Mapa público</span>
          <Button
            variant={activeCount > 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={`gap-2 ${
              activeCount > 0
                ? ""
                : "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            }`}
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
        </div>

        {showFilters && (
          <div
            id="filter-panel"
            className="mx-auto flex max-w-5xl flex-col gap-3 border-t border-white/10 px-4 py-3 sm:px-6"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-white/65">
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
                      className={`flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? "border-white bg-white text-[color:var(--forest)]"
                          : "border-white/30 bg-transparent text-white hover:bg-white/10"
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
                className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-white/65"
              >
                Municipio
              </label>
              <select
                id="muni-select"
                value={muniFilter ?? ""}
                onChange={(e) => setMuniFilter(e.target.value || null)}
                className="w-full max-w-xs rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white backdrop-blur"
              >
                <option value="">Todos</option>
                {MUNICIPALITIES.map((m) => (
                  <option key={m.name} value={m.name} className="text-foreground">
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
                className="self-start gap-2 text-white hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Limpiar filtros
              </Button>
            )}
          </div>
        )}
      </SiteHeader>

      <div className="relative flex-1">
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
