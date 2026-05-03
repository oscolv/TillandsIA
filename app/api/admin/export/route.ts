import { NextResponse } from "next/server";
import JSZip from "jszip";
import { buildRoboflowExport } from "@/lib/dataset-export";

export const runtime = "nodejs";
export const maxDuration = 300; // hasta 5 min para datasets grandes
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/export
 *
 * Empaqueta el dataset Roboflow en memoria y lo devuelve como un ZIP
 * descargable. Replica la lógica del script `npm run db:export-roboflow`
 * (mismo helper `buildRoboflowExport`) para que el resultado sea idéntico.
 *
 * El ZIP contiene:
 *   {train|valid|test}/{nivel_slug}/{id}.jpg
 *   {train|valid|test}/_classes.csv
 *   metadata.jsonl
 *
 * Si no hay observaciones revisadas devuelve 409 con un mensaje claro
 * para que el frontend lo muestre.
 */
export async function POST() {
  let result;
  try {
    result = await buildRoboflowExport();
  } catch (err) {
    console.error("export error:", err);
    return NextResponse.json(
      { error: "No se pudo construir el export." },
      { status: 500 },
    );
  }

  if (result.summary.total === 0) {
    return NextResponse.json(
      {
        error:
          "No hay observaciones revisadas (accepted | corrected) con image_hash. Revisa observaciones primero.",
      },
      { status: 409 },
    );
  }

  const zip = new JSZip();
  for (const f of result.files) {
    zip.file(f.path, f.data);
  }
  const buf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "STORE", // las JPG ya están comprimidas; STORE evita CPU
  });

  const filename = `roboflow-${result.summary.stamp}.zip`;
  const summaryHeader = encodeURIComponent(JSON.stringify(result.summary));

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buf.byteLength),
      // Permite que el frontend lea el resumen sin parsear el ZIP.
      "X-Export-Summary": summaryHeader,
      "X-Export-Failed": String(result.summary.failed),
      "Cache-Control": "no-store",
    },
  });
}
