"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, Filter, X, ChevronDown, Info } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { MUNICIPALITIES } from "@/lib/municipalities";
import type { InfestationLevel } from "@/lib/types";
import type { MapFilters } from "@/components/ObservationMap";

const ObservationMap = dynamic(
  () => import("@/components/ObservationMap").then((m) => m.ObservationMap),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full" />,
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
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
          <span className="badge-science !mb-0 !pb-0 !border-b-0">
            Mapa público
          </span>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="muni-tag"
            aria-expanded={showFilters}
            aria-controls="filter-panel"
            aria-pressed={showFilters || activeCount > 0}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            Filtros
            {activeCount > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center bg-[color:var(--terracota)] px-1 font-mono text-[0.62rem] font-semibold text-[color:var(--papel)]">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div
            id="filter-panel"
            className="mx-auto flex max-w-5xl flex-col gap-3 border-t border-[color:var(--caliza)] px-4 py-4 sm:px-6"
          >
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-[color:var(--corteza)]">
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
                      className="muni-tag"
                      aria-pressed={active}
                    >
                      <span
                        className="inline-flex h-4 w-4 items-center justify-center border border-[color:var(--tinta)] font-mono text-[9px] font-bold text-[color:var(--papel)]"
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

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="muni-select"
                className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-[color:var(--corteza)]"
              >
                Municipio
              </label>
              <select
                id="muni-select"
                value={muniFilter ?? ""}
                onChange={(e) => setMuniFilter(e.target.value || null)}
                className="w-full max-w-xs border border-[color:var(--caliza)] bg-[color:var(--papel)] px-3 py-1.5 font-sans text-[0.9rem] text-[color:var(--tinta)] focus:border-[color:var(--mezquite-oscuro)] focus:outline-none"
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
              <button
                type="button"
                onClick={clearAll}
                className="self-start inline-flex items-center gap-1.5 font-mono text-[0.72rem] uppercase tracking-[0.06em] text-[color:var(--corteza)] hover:text-[color:var(--tinta)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </SiteHeader>

      <div className="relative flex-1">
        <ObservationMap filters={filters} />
        <Legend />
        <Link
          href="/"
          aria-label="Mapear un nuevo árbol"
          className="fab-mapear sm:hidden"
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
          <span>Mapear árbol</span>
        </Link>
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
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Mostrar leyenda"
        className="absolute left-4 z-[1000] inline-flex h-10 w-10 items-center justify-center border border-[color:var(--caliza)] bg-[color:var(--papel)] text-[color:var(--tinta)] shadow-[0_1px_3px_rgba(26,22,17,0.12)] sm:hidden"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      className="absolute left-4 z-[1000] max-w-[min(15rem,calc(100vw-6rem))] border border-[color:var(--caliza)] bg-[color:var(--papel)] p-3 text-[0.78rem] shadow-[0_1px_3px_rgba(26,22,17,0.08)] sm:max-w-none"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mb-2 flex items-center justify-between gap-3 border-b border-[color:var(--caliza)] pb-1.5 sm:border-0 sm:pb-0">
        <span className="font-mono text-[0.66rem] font-medium uppercase tracking-[0.1em] text-[color:var(--terracota)]">
          Nivel de infestación
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Ocultar leyenda"
          className="-mr-1 inline-flex h-7 w-7 items-center justify-center text-[color:var(--corteza)] hover:text-[color:var(--tinta)] sm:hidden"
        >
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((it) => (
          <li
            key={it.lvl}
            className="flex items-center gap-2 text-[color:var(--tinta)]"
          >
            <span
              className="inline-flex h-5 w-5 items-center justify-center border border-[color:var(--tinta)] font-mono text-[10px] font-bold text-[color:var(--papel)]"
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
