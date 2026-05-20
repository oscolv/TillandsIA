"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PhotoGallery, MAX_PHOTOS_PER_OBSERVATION } from "./PhotoGallery";
import { LocationCapture, type Coords } from "./LocationCapture";
import { ClassificationResultView } from "./ClassificationResult";
import { municipalityFor } from "@/lib/municipalities";
import type { ClassificationResult } from "@/lib/types";
import { compressImage } from "@/lib/compress-image";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { getBypassTokenHeader } from "@/lib/bypass-token-client";
import { ShareWhatsAppButton } from "./ShareWhatsAppButton";
import {
  Loader2,
  MapPin,
  Camera,
  CheckCircle2,
  ShieldCheck,
  Search,
} from "lucide-react";

/** Umbral de confianza por debajo del cual se sugiere un acercamiento. */
const LOW_CONFIDENCE_THRESHOLD = 0.6;

type Step = "gallery" | "location" | "result" | "submitting" | "done";

interface PhotoEntry {
  file: File;
  previewUrl: string;
}

interface FlowState {
  step: Step;
  photos: PhotoEntry[]; // 0–3 fotos del mismo árbol
  coords: Coords | null;
  classifying: boolean; // hay una llamada a /api/classify en vuelo
  classification: ClassificationResult | null;
  // Estos arrays son paralelos 1:1 con `photos`, y los emite /api/classify
  // tras sanitizar cada imagen. Se mandan tal cual a /api/observations.
  photoBase64s: string[];
  imageHashes: string[];
  combinedHash: string | null;
  error: string | null;
}

type Action =
  | { type: "PHOTO_ADDED"; file: File; previewUrl: string }
  | { type: "PHOTO_REMOVED"; index: number }
  | { type: "RECLASSIFY_START" }
  | {
      type: "CLASSIFIED";
      classification: ClassificationResult;
      photos: { base64: string; hash: string }[];
      combinedHash: string;
    }
  | { type: "CLASSIFY_FAILED"; error: string }
  | { type: "GO_TO_LOCATION" }
  | { type: "LOCATED"; coords: Coords }
  | { type: "SUBMITTING" }
  | { type: "DONE" }
  | { type: "ERROR"; error: string }
  | { type: "RESET" };

const initialState: FlowState = {
  step: "gallery",
  photos: [],
  coords: null,
  classifying: false,
  classification: null,
  photoBase64s: [],
  imageHashes: [],
  combinedHash: null,
  error: null,
};

function reducer(s: FlowState, a: Action): FlowState {
  switch (a.type) {
    case "PHOTO_ADDED":
      if (s.photos.length >= MAX_PHOTOS_PER_OBSERVATION) return s;
      return {
        ...s,
        photos: [...s.photos, { file: a.file, previewUrl: a.previewUrl }],
        error: null,
      };
    case "PHOTO_REMOVED": {
      const removed = s.photos[a.index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      const nextPhotos = s.photos.filter((_, i) => i !== a.index);
      // Si ya no queda foto, limpiamos la clasificación pendiente; si quedan,
      // se va a re-clasificar (el side-effect lo dispara el caller).
      return {
        ...s,
        photos: nextPhotos,
        classification: nextPhotos.length === 0 ? null : s.classification,
        photoBase64s: nextPhotos.length === 0 ? [] : s.photoBase64s,
        imageHashes: nextPhotos.length === 0 ? [] : s.imageHashes,
        combinedHash: nextPhotos.length === 0 ? null : s.combinedHash,
        error: null,
      };
    }
    case "RECLASSIFY_START":
      return { ...s, classifying: true, error: null };
    case "CLASSIFIED":
      return {
        ...s,
        classifying: false,
        classification: a.classification,
        photoBase64s: a.photos.map((p) => p.base64),
        imageHashes: a.photos.map((p) => p.hash),
        combinedHash: a.combinedHash,
        error: null,
      };
    case "CLASSIFY_FAILED":
      return {
        ...s,
        classifying: false,
        classification: null,
        photoBase64s: [],
        imageHashes: [],
        combinedHash: null,
        error: a.error,
      };
    case "GO_TO_LOCATION":
      return { ...s, step: "location", error: null };
    case "LOCATED":
      return { ...s, step: "result", coords: a.coords };
    case "SUBMITTING":
      return { ...s, step: "submitting" };
    case "DONE":
      return { ...s, step: "done" };
    case "ERROR":
      return { ...s, error: a.error };
    case "RESET":
      for (const p of s.photos) URL.revokeObjectURL(p.previewUrl);
      return initialState;
    default:
      return s;
  }
}

export function UploadFlow() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [progress, setProgress] = useState(0);

  async function classifyAll(files: File[]) {
    if (files.length === 0) return;
    dispatch({ type: "RECLASSIFY_START" });
    setProgress(10);

    // Comprimimos en paralelo. Si alguna falla, mandamos el original.
    const blobs = await Promise.all(
      files.map(async (file) => {
        try {
          const compressed = await compressImage(file);
          return compressed.blob;
        } catch (err) {
          console.warn("[upload] compresión falló, enviando original:", err);
          return file as Blob;
        }
      }),
    );
    setProgress(30);

    const formData = new FormData();
    for (const blob of blobs) {
      formData.append("photo", blob, "photo.jpg");
    }

    try {
      setProgress(50);
      const res = await fetchWithRetry("/api/classify", {
        method: "POST",
        headers: { ...getBypassTokenHeader() },
        body: formData,
      });
      setProgress(85);
      const data = await res.json();
      setProgress(100);

      if (res.status === 429) {
        dispatch({ type: "CLASSIFY_FAILED", error: data.error });
        toast.error(data.error);
        return;
      }

      if (data.rejected) {
        // Rechazo del modelo (rostro, foto insuficiente, etc.) — limpia todo
        // y deja el mensaje en el banner.
        dispatch({ type: "RESET" });
        toast.error(data.reason);
        dispatch({ type: "ERROR", error: data.reason });
        return;
      }

      if (!res.ok) {
        const msg = data.error ?? "No se pudo clasificar la foto.";
        dispatch({ type: "CLASSIFY_FAILED", error: msg });
        toast.error(msg);
        return;
      }

      if (
        !Array.isArray(data.photos) ||
        typeof data.combinedHash !== "string"
      ) {
        const msg = "Respuesta del servidor incompleta. Intenta de nuevo.";
        dispatch({ type: "CLASSIFY_FAILED", error: msg });
        toast.error(msg);
        return;
      }

      dispatch({
        type: "CLASSIFIED",
        classification: data.classification,
        photos: data.photos,
        combinedHash: data.combinedHash,
      });
    } catch {
      const msg = "Sin conexión. Verifica tu red e intenta de nuevo.";
      dispatch({ type: "CLASSIFY_FAILED", error: msg });
      toast.error(msg);
    }
  }

  function handlePhotoAdded(file: File, previewUrl: string) {
    dispatch({ type: "PHOTO_ADDED", file, previewUrl });
    void classifyAll([...state.photos.map((p) => p.file), file]);
  }

  function handlePhotoRemoved(index: number) {
    dispatch({ type: "PHOTO_REMOVED", index });
    const remaining = state.photos.filter((_, i) => i !== index).map((p) => p.file);
    if (remaining.length > 0) {
      void classifyAll(remaining);
    }
  }

  async function confirm() {
    if (
      !state.classification ||
      !state.coords ||
      state.photoBase64s.length === 0 ||
      state.imageHashes.length !== state.photoBase64s.length ||
      !state.combinedHash
    ) {
      return;
    }
    dispatch({ type: "SUBMITTING" });

    try {
      const res = await fetchWithRetry("/api/observations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...getBypassTokenHeader(),
        },
        body: JSON.stringify({
          lat: state.coords.lat,
          lng: state.coords.lng,
          accuracy: state.coords.accuracy,
          photos: state.photoBase64s.map((base64, i) => ({
            base64,
            hash: state.imageHashes[i],
          })),
          combinedHash: state.combinedHash,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error ?? "No se pudo guardar la observación.";
        dispatch({ type: "ERROR", error: msg });
        toast.error(msg);
        return;
      }

      toast.success("¡Observación publicada!");
      dispatch({ type: "DONE" });
      setTimeout(() => router.push("/mapa"), 1200);
    } catch {
      dispatch({ type: "ERROR", error: "Sin conexión al guardar." });
      toast.error("Sin conexión al guardar la observación.");
    }
  }

  const canContinue =
    state.photos.length >= 1 &&
    state.classification !== null &&
    !state.classifying &&
    !state.error;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
      <Stepper step={state.step} />

      {state.step === "gallery" && (
        <Card className="card-editorial">
          <CardHeader className="!pb-3">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Fotos del árbol
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <PhotoGallery
              previews={state.photos.map((p) => p.previewUrl)}
              onAdd={handlePhotoAdded}
              onRemove={handlePhotoRemoved}
              busy={state.classifying}
            />

            {state.photos.length === 0 && (
              <p className="text-[0.9rem] leading-relaxed text-[color:var(--corteza)]">
                Toma 1–3 fotos del mismo árbol. Te sugerimos una del dosel,
                una de las hojas y una del tronco, pero el orden no importa
                y cualquier combinación funciona.
              </p>
            )}

            <ClassificationBanner
              classifying={state.classifying}
              classification={state.classification}
              canAddMore={state.photos.length < MAX_PHOTOS_PER_OBSERVATION}
            />

            {state.classifying && (
              <Progress
                value={progress}
                aria-label={`Progreso del análisis: ${progress}%`}
              />
            )}

            {state.photos.length === 0 && (
              <p className="flex items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-[0.06em] text-[color:var(--corteza)]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Sin registro · sin cookies · no tomes fotos con personas
              </p>
            )}

            {state.photos.length >= 1 && (
              <Button
                size="lg"
                onClick={() => dispatch({ type: "GO_TO_LOCATION" })}
                disabled={!canContinue}
                className="h-14 w-full gap-2 text-base"
              >
                {state.classifying
                  ? "Analizando…"
                  : `Continuar con ${state.photos.length} ${
                      state.photos.length === 1 ? "foto" : "fotos"
                    }`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {state.step === "location" && (
        <Card className="card-editorial">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Comparte la ubicación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LocationCapture
              onLocate={(coords) => dispatch({ type: "LOCATED", coords })}
            />
          </CardContent>
        </Card>
      )}

      {state.step === "result" && state.classification && (
        <ClassificationResultView
          result={state.classification}
          onConfirm={confirm}
          onDiscard={() => dispatch({ type: "RESET" })}
          municipality={
            state.coords
              ? municipalityFor(state.coords.lat, state.coords.lng)
              : null
          }
        />
      )}

      {state.step === "submitting" && (
        <Card className="card-editorial">
          <CardContent className="pt-6 flex items-center gap-3 text-[color:var(--tinta)]">
            <Loader2 className="h-5 w-5 animate-spin text-[color:var(--mezquite-oscuro)]" />
            <span>Publicando observación…</span>
          </CardContent>
        </Card>
      )}

      {state.step === "done" && (
        <Card className="card-editorial">
          <CardHeader>
            <span className="badge-science success !text-[color:var(--mezquite-oscuro)]">Confirmado</span>
            <CardTitle className="flex items-center gap-2 text-[color:var(--mezquite-oscuro)]">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              ¡Observación publicada!
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-[0.92rem] leading-relaxed text-[color:var(--corteza)]">
              Te llevamos al mapa para que veas tu pin…
            </p>
            {state.classification && (
              <ShareWhatsAppButton
                variant="primary"
                url={
                  typeof window !== "undefined"
                    ? `${window.location.origin}/mapa`
                    : "/mapa"
                }
                message={`Acabo de mapear un árbol con infestación ${state.classification.label} (nivel ${state.classification.level}) de heno motita en el Valle del Mezquital con TillandsIA. ¡Ayúdanos mapeando más árboles!`}
              />
            )}
          </CardContent>
        </Card>
      )}

      {state.error && state.step !== "submitting" && state.step !== "gallery" && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => dispatch({ type: "RESET" })}
            className="w-full sm:w-auto"
          >
            Empezar de nuevo
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Banner inline que se muestra debajo de la galería:
 *  - Mientras clasifica: nada (el Progress se muestra debajo).
 *  - Si la confianza es baja o no se identificó especie y aún se pueden
 *    agregar fotos: banner ámbar sugiriendo un acercamiento.
 *  - Si la especie quedó identificada con confianza buena: banner verde
 *    con la especie + invitación a continuar.
 */
function ClassificationBanner({
  classifying,
  classification,
  canAddMore,
}: {
  classifying: boolean;
  classification: ClassificationResult | null;
  canAddMore: boolean;
}) {
  if (classifying || !classification) return null;

  const lowConfidence =
    classification.confidence < LOW_CONFIDENCE_THRESHOLD ||
    classification.tree_species === null;

  if (lowConfidence && canAddMore) {
    return (
      <aside className="nota-campo warning" aria-live="polite">
        <span className="nota-titulo flex items-center gap-2">
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          Identificación incierta
        </span>
        <p className="text-[0.92rem] leading-relaxed text-[color:var(--tinta)]">
          La IA no logró identificar la especie con seguridad. Te
          sugerimos tomar un acercamiento de las ramas para que pueda
          clasificar mejor.
        </p>
      </aside>
    );
  }

  return (
    <aside className="nota-campo" aria-live="polite">
      <span className="nota-titulo flex items-center gap-2">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        Identificación lista
      </span>
      <p className="text-[0.92rem] leading-relaxed text-[color:var(--tinta)]">
        {classification.tree_species_common
          ? `Especie identificada: ${classification.tree_species_common}.`
          : "Listo para continuar."}{" "}
        {canAddMore
          ? "Puedes continuar o agregar otra foto del mismo árbol."
          : "Continúa para registrar la ubicación."}
      </p>
    </aside>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps = [
    { id: "gallery", label: "Fotos" },
    { id: "location", label: "Ubicación" },
    { id: "result", label: "Resultado" },
  ];
  const idx = stepIndex(step);
  const currentLabel = steps[idx]?.label ?? "";
  return (
    <nav aria-label="Progreso del envío de observación">
      <ol className="flex items-center justify-between font-mono text-[0.7rem] uppercase tracking-[0.06em] sm:text-[0.74rem]">
        {steps.map((s, i) => {
          const isCurrent = i === idx;
          const isComplete = i < idx;
          const status = isCurrent
            ? "actual"
            : isComplete
              ? "completado"
              : "pendiente";
          const filled = i <= idx;
          return (
            <li key={s.id} className="flex flex-1 items-center">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center border-2 font-mono text-[0.78rem] font-semibold ${
                  filled
                    ? "border-[color:var(--tinta)] bg-[color:var(--tinta)] text-[color:var(--papel)]"
                    : "border-[color:var(--caliza)] bg-[color:var(--papel)] text-[color:var(--corteza)]"
                }`}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Paso ${i + 1} de ${steps.length}: ${s.label} (${status})`}
              >
                <span aria-hidden="true">{i + 1}</span>
              </span>
              <span
                className={`ml-2 hidden sm:inline ${
                  filled ? "text-[color:var(--tinta)]" : "text-[color:var(--corteza)]"
                }`}
                aria-hidden="true"
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`mx-2 h-px flex-1 sm:mx-3 ${
                    i < idx ? "bg-[color:var(--tinta)]" : "bg-[color:var(--caliza)]"
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
      <p
        className="mt-2 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-[color:var(--corteza)] sm:hidden"
        aria-hidden="true"
      >
        Paso {idx + 1} de {steps.length} · <span className="text-[color:var(--tinta)]">{currentLabel}</span>
      </p>
    </nav>
  );
}

function stepIndex(step: Step): number {
  switch (step) {
    case "gallery":
      return 0;
    case "location":
      return 1;
    case "result":
    case "submitting":
    case "done":
      return 2;
  }
}
