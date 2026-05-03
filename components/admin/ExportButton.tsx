"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Summary {
  total: number;
  failed: number;
  bySplit: { train: number; valid: number; test: number };
  byLevel: Record<"0" | "1" | "2" | "3" | "4", number>;
  stamp: string;
}

interface Props {
  /** Número de observaciones aceptadas + corregidas con image_hash. */
  exportable: number;
}

export function ExportButton({ exportable }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<Summary | null>(null);

  async function downloadZip() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/export", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      const summaryHeader = res.headers.get("X-Export-Summary");
      if (summaryHeader) {
        try {
          setLastSummary(JSON.parse(decodeURIComponent(summaryHeader)));
        } catch {
          // resumen opcional; el download es lo importante
        }
      }

      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(cd);
      const filename = match?.[1] ?? "roboflow-export.zip";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || exportable === 0;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={downloadZip}
        disabled={disabled}
        title={
          exportable === 0
            ? "Acepta o corrige observaciones primero"
            : `Empacar ${exportable} observaciones revisadas`
        }
      >
        {busy ? "Generando ZIP…" : "Descargar ZIP Roboflow"}
      </Button>
      {exportable > 0 && !busy && !error && !lastSummary && (
        <span className="font-mono text-[0.66rem] uppercase tracking-[0.06em] text-[color:var(--corteza)]">
          {exportable} observaciones listas
        </span>
      )}
      {lastSummary && (
        <span className="font-mono text-[0.66rem] uppercase tracking-[0.06em] text-[color:var(--mezquite-oscuro)]">
          ✓ {lastSummary.total} fotos · train={lastSummary.bySplit.train} valid=
          {lastSummary.bySplit.valid} test={lastSummary.bySplit.test}
          {lastSummary.failed > 0 && ` (${lastSummary.failed} fallidas)`}
        </span>
      )}
      {error && (
        <span
          className="font-mono text-[0.7rem] text-[color:var(--rojo-alerta)]"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}
