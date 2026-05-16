"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Skeleton } from "@/components/ui/skeleton";
import { PhotoCarousel } from "./PhotoCarousel";
import type { InfestationLevel, PublicObservation } from "@/lib/types";

// Centro del Valle del Mezquital (aprox. Ixmiquilpan)
const DEFAULT_CENTER: [number, number] = [20.48, -99.22];
const DEFAULT_ZOOM = 10;

// Color semáforo por nivel
const LEVEL_COLOR: Record<InfestationLevel, string> = {
  0: "#22c55e",
  1: "#84cc16",
  2: "#eab308",
  3: "#f97316",
  4: "#ef4444",
};

/**
 * Crea un divIcon con SVG inline. Forma de pin estándar (gota invertida)
 * con color semáforo + número del nivel adentro. Cumple WCAG (color +
 * número + forma como canales redundantes).
 */
function levelIcon(level: InfestationLevel): L.DivIcon {
  const color = LEVEL_COLOR[level];
  const html = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42" aria-label="Nivel ${level}">
      <path
        d="M16 0 C 7 0 0 7 0 16 C 0 28 16 42 16 42 C 16 42 32 28 32 16 C 32 7 25 0 16 0 Z"
        fill="${color}"
        stroke="#fff"
        stroke-width="2"
      />
      <circle cx="16" cy="16" r="9" fill="#fff" />
      <text x="16" y="20" font-family="system-ui, sans-serif" font-size="13"
            font-weight="700" fill="${color}" text-anchor="middle">${level}</text>
    </svg>`;
  return L.divIcon({
    html,
    className: "observation-pin",
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -36],
  });
}

function FlyToFirst({ obs }: { obs: PublicObservation[] }) {
  const map = useMap();
  useEffect(() => {
    if (obs.length === 0) return;
    const bounds = L.latLngBounds(obs.map((o) => [o.lat, o.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [obs, map]);
  return null;
}

export interface MapFilters {
  /** Si está vacío o no definido, mostrar todos los niveles */
  levels?: Set<InfestationLevel>;
  /** Si está vacío, mostrar todos los municipios */
  municipality?: string | null;
}

export function ObservationMap({ filters }: { filters?: MapFilters }) {
  const [observations, setObservations] = useState<PublicObservation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/observations?limit=500")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setObservations(data.observations ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudieron cargar las observaciones.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = applyFilters(observations, filters);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (observations === null) {
    return <Skeleton className="w-full h-full rounded-none" />;
  }

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      className="w-full h-full"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      {visible.length > 0 && <FlyToFirst obs={visible} />}
      {visible.map((o) => (
        <Marker
          key={o.id}
          position={[o.lat, o.lng]}
          icon={levelIcon(o.level)}
        >
          <Popup minWidth={220}>
            <div className="flex flex-col gap-2">
              <PhotoCarousel
                urls={o.photo_urls}
                alt={`Árbol con infestación nivel ${o.level}`}
              />
              <div className="text-xs">
                <strong>Nivel {o.level}</strong> — {o.label}
              </div>
              {o.tree_species_common && (
                <div className="text-xs">
                  <em>{o.tree_species_common}</em>
                </div>
              )}
              {o.municipality && (
                <div className="text-xs text-muted-foreground">
                  {o.municipality}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {new Date(o.created_at).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function applyFilters(
  obs: PublicObservation[] | null,
  filters: MapFilters | undefined,
): PublicObservation[] {
  if (!obs) return [];
  if (!filters) return obs;
  return obs.filter((o) => {
    if (filters.levels && filters.levels.size > 0 && !filters.levels.has(o.level)) {
      return false;
    }
    if (filters.municipality && o.municipality !== filters.municipality) {
      return false;
    }
    return true;
  });
}
