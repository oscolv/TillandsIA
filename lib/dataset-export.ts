import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { effectiveLevel, levelSlug, splitFromId } from "@/lib/dataset";
import type { TrainingSplit } from "@/lib/types";

interface Row {
  id: string;
  created_at: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  photo_url: string;
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
  image_hash: string | null;
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
 *   {split}/{nivel_slug}/{id}.jpg  ← una entrada por foto
 *   {split}/_classes.csv           ← filename,class por split
 *   metadata.jsonl                 ← una línea por foto con datos extra
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
    SELECT id, created_at, lat, lng, accuracy, photo_url, level, label, confidence,
           tree_species, tree_species_common, ai_notes,
           human_review_status, human_level, reviewer_notes, training_split, image_hash
    FROM observations
    WHERE human_review_status IN ('accepted', 'corrected')
      AND image_hash IS NOT NULL
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

  // Descargar fotos en paralelo controlado.
  log(`Descargando ${rows.length} fotos (concurrencia ${concurrency})…`);
  type DLResult =
    | { row: Row; split: TrainingSplit; data: Buffer; level: 0 | 1 | 2 | 3 | 4 }
    | { row: Row; error: string };

  const results: DLResult[] = await pool(rows, concurrency, async (row) => {
    try {
      const split = (row.training_split ?? splitFromId(row.id)) as TrainingSplit;
      const level = effectiveLevel(row);
      const res = await fetch(row.photo_url);
      if (!res.ok) {
        return { row, error: `HTTP ${res.status} en ${row.photo_url}` };
      }
      const data = Buffer.from(await res.arrayBuffer());
      return { row, split, data, level };
    } catch (e) {
      return { row, error: e instanceof Error ? e.message : String(e) };
    }
  });

  const ok = results.filter(
    (r): r is Extract<DLResult, { data: Buffer }> => "data" in r,
  );
  const errors = results
    .filter((r): r is Extract<DLResult, { error: string }> => "error" in r)
    .map((r) => ({ id: r.row.id, error: r.error }));

  const files: ExportFile[] = [];

  // 1) Imágenes
  for (const r of ok) {
    const slug = levelSlug(r.level);
    files.push({
      path: `${r.split}/${slug}/${r.row.id}.jpg`,
      data: r.data,
    });
    summary.bySplit[r.split]++;
    summary.byLevel[r.level]++;
  }
  summary.total = ok.length;
  summary.failed = errors.length;

  // 2) _classes.csv por split (header + filename,class)
  for (const split of SPLITS) {
    const lines = ["filename,class"];
    for (const r of ok) {
      if (r.split !== split) continue;
      const slug = levelSlug(r.level);
      lines.push(`${slug}/${r.row.id}.jpg,${slug}`);
    }
    files.push({
      path: `${split}/_classes.csv`,
      data: lines.join("\n") + "\n",
    });
  }

  // 3) Carpetas vacías por nivel — necesarias para el script CLI (mkdir),
  //    pero JSZip no necesita placeholders. Las omitimos: el script las crea
  //    explícitamente con mkdir antes de escribir los files.

  // 4) metadata.jsonl
  const metaLines = ok.map((r) =>
    JSON.stringify({
      id: r.row.id,
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
      image_hash: r.row.image_hash,
      photo_url: r.row.photo_url,
    }),
  );
  files.push({ path: "metadata.jsonl", data: metaLines.join("\n") + "\n" });

  return { files, summary, errors };
}

export const ROBOFLOW_LEVEL_SLUGS = LEVELS.map((lv) => levelSlug(lv));
export const ROBOFLOW_SPLITS = SPLITS;
