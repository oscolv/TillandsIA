import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { effectiveLevel, levelSlug, splitFromId } from "@/lib/dataset";
import type { TrainingSplit } from "@/lib/types";

interface Row {
  id: string;
  created_at: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  photo_urls: string[];
  level: number;
  label: string;
  confidence: number | null;
  tree_species: string | null;
  tree_species_common: string | null;
  ai_notes: string | null;
  human_review_status: string;
  human_level: number | null;
  reviewer_notes: string | null;
  training_split: string | null;
  image_hashes: string[] | null;
}

export interface ExportFile {
  /** Path relativo a la raíz del export (sin prefijo). */
  path: string;
  data: Buffer | string;
}

export interface ExportSummary {
  total: number;
  failed: number;
  bySplit: Record<TrainingSplit, number>;
  byLevel: Record<0 | 1 | 2 | 3 | 4, number>;
  /** YYYYMMDD-HHmmss para nombrar la carpeta o el ZIP. */
  stamp: string;
}

export interface ExportResult {
  files: ExportFile[];
  summary: ExportSummary;
  /** Errores no fatales por foto que falló al descargar. */
  errors: Array<{ id: string; error: string }>;
}

const SPLITS: TrainingSplit[] = ["train", "valid", "test"];
const LEVELS = [0, 1, 2, 3, 4] as const;
const DEFAULT_CONCURRENCY = 6;

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

/**
 * Construye el dataset Roboflow en memoria:
 *   {split}/{nivel_slug}/{id}_{i}.jpg  ← una entrada por FOTO (1..N por obs)
 *   {split}/_classes.csv               ← filename,class por split
 *   metadata.jsonl                     ← una línea por FOTO con datos extra
 *
 * Las observaciones multifoto generan N entradas con sufijo `_1`, `_2`, …
 * Todas comparten la misma `label`/`level`/anotaciones (el árbol es el mismo).
 *
 * Persiste `training_split` en la DB para las observaciones que aún no lo
 * tenían, garantizando que re-exports respetan la asignación previa.
 *
 * Retorna los archivos como un arreglo en memoria — el caller decide si
 * los escribe a disco (script CLI) o los empaqueta en ZIP (API endpoint).
 */
export async function buildRoboflowExport(
  options: {
    sql?: NeonQueryFunction<false, false>;
    concurrency?: number;
    onProgress?: (msg: string) => void;
  } = {},
): Promise<ExportResult> {
  const { concurrency = DEFAULT_CONCURRENCY, onProgress } = options;
  const log = onProgress ?? (() => {});

  const sql =
    options.sql ??
    (() => {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL no está configurada");
      return neon(url);
    })();

  log("Leyendo observaciones revisadas (accepted | corrected)…");
  const rows = (await sql`
    SELECT id, created_at, lat, lng, accuracy, photo_urls, level, label, confidence,
           tree_species, tree_species_common, ai_notes,
           human_review_status, human_level, reviewer_notes, training_split, image_hashes
    FROM observations
    WHERE human_review_status IN ('accepted', 'corrected')
      AND image_hashes IS NOT NULL
      AND array_length(image_hashes, 1) > 0
      AND array_length(photo_urls, 1) > 0
    ORDER BY created_at ASC
  `) as unknown as Row[];

  const stamp = timestamp();
  const summary: ExportSummary = {
    total: 0,
    failed: 0,
    bySplit: { train: 0, valid: 0, test: 0 },
    byLevel: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
    stamp,
  };

  if (rows.length === 0) {
    return { files: [], summary, errors: [] };
  }

  // Asignar split a las nuevas y persistirlo.
  const toAssign = rows.filter((r) => r.training_split == null);
  if (toAssign.length > 0) {
    log(`Asignando split determinista a ${toAssign.length} filas nuevas…`);
    for (const r of toAssign) {
      const split = splitFromId(r.id);
      r.training_split = split;
      await sql`UPDATE observations SET training_split = ${split} WHERE id = ${r.id}`;
    }
  }

  // Expandir cada observación en una entrada por foto (multifoto = N entradas
  // con el mismo split/level/anotaciones, sufijo `_i` en el filename).
  type PhotoEntry = { row: Row; photoIdx: number; photoUrl: string };
  const photoEntries: PhotoEntry[] = rows.flatMap((row) =>
    row.photo_urls.map((photoUrl, photoIdx) => ({ row, photoIdx, photoUrl })),
  );

  log(
    `Descargando ${photoEntries.length} fotos de ${rows.length} observaciones (concurrencia ${concurrency})…`,
  );
  type DLResult =
    | {
        row: Row;
        photoIdx: number;
        split: TrainingSplit;
        data: Buffer;
        level: 0 | 1 | 2 | 3 | 4;
      }
    | { row: Row; photoIdx: number; error: string };

  const results: DLResult[] = await pool(
    photoEntries,
    concurrency,
    async ({ row, photoIdx, photoUrl }) => {
      try {
        const split = (row.training_split ?? splitFromId(row.id)) as TrainingSplit;
        const level = effectiveLevel(row);
        const res = await fetch(photoUrl);
        if (!res.ok) {
          return { row, photoIdx, error: `HTTP ${res.status} en ${photoUrl}` };
        }
        const data = Buffer.from(await res.arrayBuffer());
        return { row, photoIdx, split, data, level };
      } catch (e) {
        return {
          row,
          photoIdx,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    },
  );

  const ok = results.filter(
    (r): r is Extract<DLResult, { data: Buffer }> => "data" in r,
  );
  const errors = results
    .filter((r): r is Extract<DLResult, { error: string }> => "error" in r)
    .map((r) => ({
      id: `${r.row.id}_${r.photoIdx + 1}`,
      error: r.error,
    }));

  const files: ExportFile[] = [];

  // 1) Imágenes — sufijo `_{photoIdx+1}` para diferenciar las fotos de la
  //    misma observación cuando hay multifoto.
  for (const r of ok) {
    const slug = levelSlug(r.level);
    files.push({
      path: `${r.split}/${slug}/${r.row.id}_${r.photoIdx + 1}.jpg`,
      data: r.data,
    });
    summary.bySplit[r.split]++;
    summary.byLevel[r.level]++;
  }
  // summary.total cuenta FOTOS en el dataset (no observaciones), porque cada
  // foto es una entrada de entrenamiento independiente para el modelo.
  summary.total = ok.length;
  summary.failed = errors.length;

  // 2) _classes.csv por split (header + filename,class)
  for (const split of SPLITS) {
    const lines = ["filename,class"];
    for (const r of ok) {
      if (r.split !== split) continue;
      const slug = levelSlug(r.level);
      lines.push(`${slug}/${r.row.id}_${r.photoIdx + 1}.jpg,${slug}`);
    }
    files.push({
      path: `${split}/_classes.csv`,
      data: lines.join("\n") + "\n",
    });
  }

  // 3) Carpetas vacías por nivel — necesarias para el script CLI (mkdir),
  //    pero JSZip no necesita placeholders. Las omitimos: el script las crea
  //    explícitamente con mkdir antes de escribir los files.

  // 4) metadata.jsonl — una línea por foto, con `photo_count` para saber
  //    cuántas fotos hermanas tiene la misma observación.
  const metaLines = ok.map((r) =>
    JSON.stringify({
      id: r.row.id,
      photo_index: r.photoIdx + 1, // 1-based
      photo_count: r.row.photo_urls.length,
      split: r.split,
      effective_level: r.level,
      model_level: r.row.level,
      human_level: r.row.human_level,
      label: r.row.label,
      confidence: r.row.confidence,
      tree_species: r.row.tree_species,
      tree_species_common: r.row.tree_species_common,
      ai_notes: r.row.ai_notes,
      reviewer_notes: r.row.reviewer_notes,
      review_status: r.row.human_review_status,
      lat: r.row.lat,
      lng: r.row.lng,
      accuracy: r.row.accuracy,
      created_at: r.row.created_at,
      image_hash: r.row.image_hashes?.[r.photoIdx] ?? null,
      photo_url: r.row.photo_urls[r.photoIdx],
    }),
  );
  files.push({ path: "metadata.jsonl", data: metaLines.join("\n") + "\n" });

  return { files, summary, errors };
}

export const ROBOFLOW_LEVEL_SLUGS = LEVELS.map((lv) => levelSlug(lv));
export const ROBOFLOW_SPLITS = SPLITS;
