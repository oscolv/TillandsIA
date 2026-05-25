"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Skeleton } from "@/components/ui/skeleton";
import { PhotoCarousel } from "./PhotoCarousel";
import type { InfestationLevel, PublicObservation } from "@/lib/types";
import { VALLE_BBOX } from "@/lib/validate-coords";

// Centro del Valle del Mezquital (aprox. Ixmiquilpan)
const DEFAULT_CENTER: [number, number] = [20.48, -99.22];
const DEFAULT_ZOOM = 10;
const FOCUS_ZOOM = 16;

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

/**
 * Encuadre inicial del mapa.
 *
 * - Con `focusId` (al venir de publicar): flyTo al pin con zoom alto.
 * - Sin focus: encuadra el bbox del Valle del Mezquital (zona objetivo del
 *   proyecto y donde está la inmensa mayoría de datos). NO se hace fitBounds
 *   sobre todas las observaciones porque puntos legítimos fuera de zona
 *   (flag `out_of_bbox`) ensanchan el viewport y sacan al usuario de la
 *   región relevante.
 */
function FitView({
  obs,
  focusId,
}: {
  obs: PublicObservation[];
  focusId?: string | null;
}) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    if (focusId) {
      const target = obs.find((o) => o.id === focusId);
      if (target) {
        map.flyTo([target.lat, target.lng], FOCUS_ZOOM, { duration: 0.8 });
        done.current = true;
        return;
      }
      // focusId desconocido (observación filtrada o borrada): cae al default.
    }
    const bounds = L.latLngBounds(
      [VALLE_BBOX.latMin, VALLE_BBOX.lngMin],
      [VALLE_BBOX.latMax, VALLE_BBOX.lngMax],
    );
    map.fitBounds(bounds, { padding: [20, 20] });
    done.current = true;
  }, [obs, focusId, map]);
  return null;
}

export interface MapFilters {
  /** Si está vacío o no definido, mostrar todos los niveles */
  levels?: Set<InfestationLevel>;
  /** Si está vacío, mostrar todos los municipios */
  municipality?: string | null;
}

export function ObservationMap({
  filters,
  focusId,
}: {
  filters?: MapFilters;
  focusId?: string | null;
}) {
  const [observations, setObservations] = useState<PublicObservation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());

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

  // Tras cargar y filtrar, abrir el popup del pin enfocado (post-publicación).
  useEffect(() => {
    if (!focusId || !observations) return;
    const marker = markerRefs.current.get(focusId);
    if (!marker) return;
    // Esperar a que termine flyTo (duración ~0.8s) antes de abrir.
    const t = setTimeout(() => marker.openPopup(), 900);
    return () => clearTimeout(t);
  }, [focusId, observations]);

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
      <FitView obs={visible} focusId={focusId} />
      {visible.map((o) => (
        <Marker
          key={o.id}
          position={[o.lat, o.lng]}
          icon={levelIcon(o.level)}
          ref={(ref) => {
            if (ref) markerRefs.current.set(o.id, ref);
            else markerRefs.current.delete(o.id);
          }}
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
