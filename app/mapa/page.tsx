"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Leaf } from "lucide-react";

const ObservationMap = dynamic(
  () => import("@/components/ObservationMap").then((m) => m.ObservationMap),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full rounded-none" />,
  },
);

export default function MapaPage() {
  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-border bg-card flex-shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="flex items-center gap-2 font-semibold">
            <Leaf className="h-5 w-5 text-emerald-600" />
            <span>Mapa de observaciones</span>
          </h1>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Subir foto
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 relative">
        <ObservationMap />
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
              aria-hidden
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
