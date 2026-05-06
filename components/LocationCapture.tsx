"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, AlertCircle } from "lucide-react";

export interface Coords {
  lat: number;
  lng: number;
  accuracy: number | null;
}

interface LocationCaptureProps {
  onLocate: (coords: Coords) => void;
}

const ERR_MSGS: Record<number, string> = {
  1: "Necesitas dar permiso de ubicación. Ve a Configuración → Permisos → Ubicación y permite el acceso para este sitio.",
  2: "No se pudo obtener tu ubicación. Verifica que el GPS esté activado.",
  3: "Tiempo de espera agotado. Intenta de nuevo en un lugar con mejor señal del cielo abierto.",
};

export function LocationCapture({ onLocate }: LocationCaptureProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  function requestGps() {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta ubicación. Usa Chrome en Android o Safari en iPhone.");
      setShowManual(true);
      return;
    }
    setError(null);
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        onLocate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        });
      },
      (err) => {
        setLoading(false);
        setError(ERR_MSGS[err.code] ?? "Error de ubicación desconocido.");
        setShowManual(true);
      },
      { timeout: 15000, maximumAge: 30000, enableHighAccuracy: true },
    );
  }

  function submitManual() {
    const lat = Number.parseFloat(manualLat);
    const lng = Number.parseFloat(manualLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("Coordenadas no válidas. Usa decimales (ej: 20.05, -99.34).");
      return;
    }
    onLocate({ lat, lng, accuracy: null });
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {!showManual && (
        <Button
          size="lg"
          onClick={requestGps}
          disabled={loading}
          className="h-14 w-full gap-2 text-base sm:w-auto"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <MapPin className="h-5 w-5" />
          )}
          {loading ? "Obteniendo ubicación..." : "Usar mi ubicación"}
        </Button>
      )}

      {error && (
        <aside className="nota-campo danger">
          <span className="nota-titulo flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            No pudimos obtener tu ubicación
          </span>
          <p className="text-[0.92rem] leading-relaxed text-[color:var(--tinta)]">
            {error}
          </p>
        </aside>
      )}

      {showManual && (
        <div className="flex flex-col gap-3 border border-[color:var(--caliza)] bg-[color:var(--papel)] p-4">
          <p className="text-[0.9rem] leading-relaxed text-[color:var(--corteza)]">
            Ingresa coordenadas manualmente (puedes copiarlas de Google Maps):
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="font-mono text-[0.7rem] uppercase tracking-[0.06em] text-[color:var(--corteza)]">
              Latitud
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="20.0533"
                className="mt-1 w-full border border-[color:var(--caliza)] bg-[color:var(--papel)] px-3 py-2 font-sans text-[0.95rem] text-[color:var(--tinta)] focus:border-[color:var(--mezquite-oscuro)] focus:outline-none"
              />
            </label>
            <label className="font-mono text-[0.7rem] uppercase tracking-[0.06em] text-[color:var(--corteza)]">
              Longitud
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="-99.3489"
                className="mt-1 w-full border border-[color:var(--caliza)] bg-[color:var(--papel)] px-3 py-2 font-sans text-[0.95rem] text-[color:var(--tinta)] focus:border-[color:var(--mezquite-oscuro)] focus:outline-none"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={submitManual} className="flex-1">
              Continuar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowManual(false);
                setError(null);
              }}
            >
              Reintentar GPS
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
