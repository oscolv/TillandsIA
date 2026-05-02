"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CameraCapture } from "./CameraCapture";
import { LocationCapture, type Coords } from "./LocationCapture";
import { ClassificationResultView } from "./ClassificationResult";
import type { ClassificationResult } from "@/lib/types";
import { ArrowRight, Info, Loader2, MapPin, Camera, CheckCircle2 } from "lucide-react";

type Step = "intro" | "photo" | "location" | "classifying" | "result" | "submitting" | "done";

interface FlowState {
  step: Step;
  photoFile: File | null;
  photoPreview: string | null;
  coords: Coords | null;
  classification: ClassificationResult | null;
  photoBase64: string | null; // sanitizado por el server, devuelto en /api/classify
  error: string | null;
}

type Action =
  | { type: "PHOTO_TAKEN"; file: File; previewUrl: string }
  | { type: "LOCATED"; coords: Coords }
  | { type: "CLASSIFYING" }
  | { type: "CLASSIFIED"; classification: ClassificationResult; photoBase64: string }
  | { type: "SUBMITTING" }
  | { type: "DONE" }
  | { type: "ERROR"; error: string }
  | { type: "RESET" }
  | { type: "GO_TO_PHOTO" };

const initialState: FlowState = {
  step: "intro",
  photoFile: null,
  photoPreview: null,
  coords: null,
  classification: null,
  photoBase64: null,
  error: null,
};

function reducer(s: FlowState, a: Action): FlowState {
  switch (a.type) {
    case "GO_TO_PHOTO":
      return { ...s, step: "photo", error: null };
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

  async function classify() {
    if (!state.photoFile || !state.coords) return;
    dispatch({ type: "CLASSIFYING" });
    setProgress(10);

    const formData = new FormData();
    formData.append("photo", state.photoFile);

    try {
      setProgress(30);
      const res = await fetch("/api/classify", {
        method: "POST",
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

      dispatch({
        type: "CLASSIFIED",
        classification: data.classification,
        photoBase64: data.photoBase64,
      });
    } catch {
      const msg = "Sin conexión. Verifica tu red e intenta de nuevo.";
      dispatch({ type: "ERROR", error: msg });
      toast.error(msg);
    }
  }

  async function confirm() {
    if (!state.classification || !state.coords || !state.photoBase64) return;
    dispatch({ type: "SUBMITTING" });

    try {
      const res = await fetch("/api/observations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: state.coords.lat,
          lng: state.coords.lng,
          accuracy: state.coords.accuracy,
          photoBase64: state.photoBase64,
          classification: state.classification,
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

      {state.step === "intro" && (
        <Card>
          <CardHeader>
            <CardTitle>Bienvenido</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Ayúdanos a mapear el heno motita en el Valle del Mezquital.
              Solo necesitas tomar una foto del árbol completo (incluyendo el
              dosel) y compartir tu ubicación.
            </p>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Privacidad</AlertTitle>
              <AlertDescription>
                Sin registro ni cookies. No tomes fotos con personas.
              </AlertDescription>
            </Alert>
            <Button
              size="lg"
              onClick={() => dispatch({ type: "GO_TO_PHOTO" })}
              className="gap-2"
            >
              Empezar <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {state.step === "photo" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Toma una foto del árbol
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CameraCapture
              onCapture={(file, previewUrl) =>
                dispatch({ type: "PHOTO_TAKEN", file, previewUrl })
              }
            />
          </CardContent>
        </Card>
      )}

      {state.step === "location" && (
        <Card>
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
                // arranca clasificación automáticamente
                setTimeout(classify, 0);
              }}
            />
          </CardContent>
        </Card>
      )}

      {state.step === "classifying" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Analizando la foto...
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">
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
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Publicando observación...</span>
          </CardContent>
        </Card>
      )}

      {state.step === "done" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
              ¡Observación publicada!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Te llevamos al mapa para que veas tu pin...
            </p>
          </CardContent>
        </Card>
      )}

      {state.error && state.step !== "classifying" && state.step !== "submitting" && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => dispatch({ type: "RESET" })}>
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
  return (
    <ol className="flex items-center justify-between text-xs sm:text-sm">
      {steps.map((s, i) => (
        <li key={s.id} className="flex-1 flex items-center">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 font-semibold ${
              i <= idx
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/30 text-muted-foreground"
            }`}
            aria-current={i === idx ? "step" : undefined}
          >
            {i + 1}
          </span>
          <span
            className={`ml-2 ${
              i <= idx ? "font-medium" : "text-muted-foreground"
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 ${
                i < idx ? "bg-primary" : "bg-muted-foreground/20"
              }`}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

function stepIndex(step: Step): number {
  switch (step) {
    case "intro":
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
