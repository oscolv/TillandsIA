"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CameraCapture } from "./CameraCapture";
import { LocationCapture, type Coords } from "./LocationCapture";
import { ClassificationResultView } from "./ClassificationResult";
import type { ClassificationResult } from "@/lib/types";
import { compressImage } from "@/lib/compress-image";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { getBypassTokenHeader } from "@/lib/bypass-token-client";
import { share } from "@/lib/share";
import {
  Loader2,
  MapPin,
  Camera,
  CheckCircle2,
  Share2,
  ShieldCheck,
} from "lucide-react";

type Step = "photo" | "location" | "classifying" | "result" | "submitting" | "done";

interface FlowState {
  step: Step;
  photoFile: File | null;
  photoPreview: string | null;
  coords: Coords | null;
  classification: ClassificationResult | null;
  photoBase64: string | null; // sanitizado por el server, devuelto en /api/classify
  imageHash: string | null; // sha256 de la foto sanitizada — lo emite /api/classify
  error: string | null;
}

type Action =
  | { type: "PHOTO_TAKEN"; file: File; previewUrl: string }
  | { type: "LOCATED"; coords: Coords }
  | { type: "CLASSIFYING" }
  | {
      type: "CLASSIFIED";
      classification: ClassificationResult;
      photoBase64: string;
      imageHash: string;
    }
  | { type: "SUBMITTING" }
  | { type: "DONE" }
  | { type: "ERROR"; error: string }
  | { type: "RESET" };

const initialState: FlowState = {
  step: "photo",
  photoFile: null,
  photoPreview: null,
  coords: null,
  classification: null,
  photoBase64: null,
  imageHash: null,
  error: null,
};

function reducer(s: FlowState, a: Action): FlowState {
  switch (a.type) {
    case "PHOTO_TAKEN":
      return {
        ...s,
        step: "location",
        photoFile: a.file,
        photoPreview: a.previewUrl,
      };
    case "LOCATED":
      return { ...s, step: "classifying", coords: a.coords };
    case "CLASSIFYING":
      return { ...s, step: "classifying" };
    case "CLASSIFIED":
      return {
        ...s,
        step: "result",
        classification: a.classification,
        photoBase64: a.photoBase64,
        imageHash: a.imageHash,
      };
    case "SUBMITTING":
      return { ...s, step: "submitting" };
    case "DONE":
      return { ...s, step: "done" };
    case "ERROR":
      return { ...s, error: a.error };
    case "RESET":
      return initialState;
    default:
      return s;
  }
}

export function UploadFlow() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [progress, setProgress] = useState(0);

  async function classify(file: File) {
    dispatch({ type: "CLASSIFYING" });
    setProgress(5);

    let photoBlob: Blob;
    try {
      const compressed = await compressImage(file);
      photoBlob = compressed.blob;
      if (compressed.compressedSize < compressed.originalSize) {
        const savedKb = Math.round(
          (compressed.originalSize - compressed.compressedSize) / 1024,
        );
        console.info(
          `[upload] comprimida ${Math.round(compressed.originalSize / 1024)} KB → ${Math.round(
            compressed.compressedSize / 1024,
          )} KB (${compressed.width}×${compressed.height}, -${savedKb} KB)`,
        );
      }
    } catch (err) {
      console.warn("[upload] compresión falló, enviando original:", err);
      photoBlob = file;
    }
    setProgress(20);

    const formData = new FormData();
    formData.append("photo", photoBlob, "photo.jpg");

    try {
      setProgress(35);
      const res = await fetchWithRetry("/api/classify", {
        method: "POST",
        headers: { ...getBypassTokenHeader() },
        body: formData,
      });
      setProgress(80);

      const data = await res.json();
      setProgress(100);

      if (res.status === 429) {
        dispatch({ type: "ERROR", error: data.error });
        toast.error(data.error);
        return;
      }

      if (data.rejected) {
        dispatch({ type: "ERROR", error: data.reason });
        toast.error(data.reason);
        return;
      }

      if (!res.ok) {
        const msg = data.error ?? "No se pudo clasificar la foto.";
        dispatch({ type: "ERROR", error: msg });
        toast.error(msg);
        return;
      }

      if (typeof data.imageHash !== "string") {
        const msg = "Respuesta del servidor incompleta. Intenta de nuevo.";
        dispatch({ type: "ERROR", error: msg });
        toast.error(msg);
        return;
      }

      dispatch({
        type: "CLASSIFIED",
        classification: data.classification,
        photoBase64: data.photoBase64,
        imageHash: data.imageHash,
      });
    } catch {
      const msg = "Sin conexión. Verifica tu red e intenta de nuevo.";
      dispatch({ type: "ERROR", error: msg });
      toast.error(msg);
    }
  }

  async function confirm() {
    if (
      !state.classification ||
      !state.coords ||
      !state.photoBase64 ||
      !state.imageHash
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
          photoBase64: state.photoBase64,
          imageHash: state.imageHash,
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

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
      <Stepper step={state.step} />

      {state.step === "photo" && (
        <Card className="card-editorial">
          <CardHeader className="!pb-3">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Toma una foto del árbol
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <CameraCapture
              onCapture={(file, previewUrl) =>
                dispatch({ type: "PHOTO_TAKEN", file, previewUrl })
              }
            />
            <p className="text-[0.9rem] leading-relaxed text-[color:var(--corteza)]">
              Captura el árbol completo, incluyendo el dosel. Después
              compartirás tu ubicación.
            </p>
            <p className="flex items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-[0.06em] text-[color:var(--corteza)]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Sin registro · sin cookies · no tomes fotos con personas
            </p>
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
              onLocate={(coords) => {
                dispatch({ type: "LOCATED", coords });
                // arranca clasificación automáticamente — pasamos el File
                // por argumento (no por state) para evitar closure stale.
                if (state.photoFile) {
                  void classify(state.photoFile);
                }
              }}
            />
          </CardContent>
        </Card>
      )}

      {state.step === "classifying" && (
        <Card className="card-editorial" aria-busy="true" aria-live="polite">
          <CardHeader>
            <span className="badge-science">Análisis</span>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-[color:var(--mezquite-oscuro)]" aria-hidden="true" />
              Analizando la foto…
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Progress
              value={progress}
              aria-label={`Progreso del análisis: ${progress}%`}
            />
            <p className="text-[0.92rem] leading-relaxed text-[color:var(--corteza)]">
              El modelo está identificando heno motita y estimando el nivel de
              infestación.
            </p>
          </CardContent>
        </Card>
      )}

      {state.step === "result" && state.classification && (
        <ClassificationResultView
          result={state.classification}
          onConfirm={confirm}
          onDiscard={() => dispatch({ type: "RESET" })}
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
              <Button
                variant="outline"
                className="w-full gap-2 sm:w-auto"
                onClick={async () => {
                  const lvl = state.classification!.level;
                  const lbl = state.classification!.label;
                  const method = await share({
                    title: "TillandsIA — Observación publicada",
                    text: `Acabo de mapear un árbol con infestación ${lbl} (nivel ${lvl}) de heno motita en el Valle del Mezquital. ¡Ayúdanos mapeando más árboles!`,
                    url: `${window.location.origin}/mapa`,
                  });
                  if (method === "clipboard") toast.success("Enlace copiado");
                }}
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Compartir
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {state.error && state.step !== "classifying" && state.step !== "submitting" && (
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

function Stepper({ step }: { step: Step }) {
  const steps = [
    { id: "photo", label: "Foto" },
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
    case "photo":
      return 0;
    case "location":
      return 1;
    case "classifying":
    case "result":
    case "submitting":
    case "done":
      return 2;
  }
}
