"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Plus, X } from "lucide-react";

export const MAX_PHOTOS_PER_OBSERVATION = 3;

/**
 * Etiquetas sugeridas por posición. Son puramente informativas para el
 * usuario; el backend trata las fotos como intercambiables y el modelo deduce
 * `photo_angle` por sí mismo, así que cualquier foto en cualquier slot
 * funciona (orden libre, repeticiones permitidas).
 */
const SUGGESTED_ANGLES: Array<{ short: string; long: string }> = [
  { short: "Dosel", long: "Dosel / árbol completo" },
  { short: "Hojas", long: "Acercamiento de ramas u hojas" },
  { short: "Tronco", long: "Tronco o corteza" },
];

interface PhotoGalleryProps {
  /** URLs de preview (object URLs) en orden de subida; 0–3 elementos. */
  previews: string[];
  /** Llamado cuando el usuario selecciona/captura una nueva foto. */
  onAdd: (file: File, previewUrl: string) => void;
  /** Llamado cuando el usuario elimina una miniatura. */
  onRemove: (index: number) => void;
  /** Si está procesando la última (clasificando), el slot "+" se desactiva. */
  busy?: boolean;
}

/**
 * Galería de captura con crecimiento progresivo (1–3 fotos del mismo árbol).
 *
 * Diseño:
 *  - Sin fotos: un solo botón grande "Tomar foto del árbol".
 *  - Con ≥1 foto: row de miniaturas con X, + botón "Agregar otra foto"
 *    al lado si quedan slots. Texto fino "máximo 3 fotos por árbol".
 *  - Con 3 fotos: solo miniaturas, sin slot "+".
 */
export function PhotoGallery({
  previews,
  onAdd,
  onRemove,
  busy = false,
}: PhotoGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canAdd = previews.length < MAX_PHOTOS_PER_OBSERVATION && !busy;

  function handleSelect(file: File) {
    const url = URL.createObjectURL(file);
    onAdd(file, url);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-stretch gap-3">
      <input
        ref={inputRef}
        id="photo-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleSelect(file);
        }}
      />
      <label htmlFor="photo-input" className="sr-only">
        Tomar foto del árbol
      </label>

      {previews.length === 0 ? (
        <Button
          size="lg"
          onClick={() => inputRef.current?.click()}
          className="h-14 w-full gap-2 text-base sm:w-auto sm:self-center"
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
          Tomar foto del árbol
        </Button>
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-3">
            {previews.map((url, i) => {
              const suggested = SUGGESTED_ANGLES[i];
              return (
                <div key={url} className="flex flex-col items-center gap-1.5">
                  <div
                    className="relative shrink-0 overflow-hidden border border-[color:var(--caliza)]"
                    style={{ height: 88, width: 88 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Foto ${i + 1} del árbol`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => onRemove(i)}
                      disabled={busy}
                      aria-label={`Quitar foto ${i + 1}`}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  {suggested && (
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.06em] text-[color:var(--texto-secundario)]">
                      {`${i + 1}. ${suggested.short}`}
                    </span>
                  )}
                </div>
              );
            })}
            {canAdd && (() => {
              const next = SUGGESTED_ANGLES[previews.length];
              return (
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    aria-label={
                      next
                        ? `Agregar foto ${previews.length + 1}: sugerido ${next.long}`
                        : "Agregar otra foto del mismo árbol"
                    }
                    className="flex shrink-0 items-center justify-center border border-dashed border-[color:var(--caliza)] text-[color:var(--texto-secundario)] transition hover:border-[color:var(--mezquite)] hover:text-[color:var(--mezquite)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ height: 88, width: 88 }}
                  >
                    <Plus className="h-5 w-5" aria-hidden="true" />
                  </button>
                  {next && (
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.06em] text-[color:var(--texto-secundario)]">
                      {`${previews.length + 1}. ${next.short}`}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
          <p className="text-xs text-[color:var(--texto-secundario)]">
            {previews.length === MAX_PHOTOS_PER_OBSERVATION
              ? `Máximo ${MAX_PHOTOS_PER_OBSERVATION} fotos por árbol alcanzado.`
              : `Sugerencia: dosel, hojas y tronco. El orden no importa y cualquier foto del mismo árbol funciona.`}
          </p>
        </>
      )}
    </div>
  );
}
