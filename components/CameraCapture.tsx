"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (file: File, previewUrl: string) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleSelect(file: File) {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onCapture(file, url);
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-4">
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

      {previewUrl ? (
        <div className="w-full flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Vista previa de la foto del árbol que vas a enviar"
            className="max-h-[60vh] w-auto border border-[color:var(--caliza)]"
          />
          <Button
            variant="outline"
            onClick={reset}
            className="w-full gap-2 sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Tomar otra foto
          </Button>
        </div>
      ) : (
        <Button
          size="lg"
          onClick={() => inputRef.current?.click()}
          className="h-14 w-full gap-2 text-base sm:w-auto"
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
          Tomar foto del árbol
        </Button>
      )}
    </div>
  );
}
