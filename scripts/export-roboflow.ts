import { neon } from "@neondatabase/serverless";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { effectiveLevel, levelSlug, splitFromId } from "../lib/dataset";
import type { TrainingSplit } from "../lib/types";

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

const SPLITS: TrainingSplit[] = ["train", "valid", "test"];
const LEVELS = [0, 1, 2, 3, 4] as const;
const DOWNLOAD_CONCURRENCY = 6;

function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

async function downloadOne(
  row: Row,
  split: TrainingSplit,
  rootDir: string,
): Promise<{ ok: true; relPath: string } | { ok: false; error: string }> {
  try {
    const slug = levelSlug(effectiveLevel(row));
    const filename = `${row.id}.jpg`;
    const relPath = join(split, slug, filename);
    const absPath = join(rootDir, relPath);

    const res = await fetch(row.photo_url);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status} en ${row.photo_url}` };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(absPath, buf);
    return { ok: true, relPath };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
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

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL no está configurada");
    process.exit(1);
  }
  const sql = neon(url);

  console.log("Leyendo observaciones revisadas (accepted | corrected)…");
  const rows = (await sql`
    SELECT id, created_at, lat, lng, accuracy, photo_url, level, label, confidence,
           tree_species, tree_species_common, ai_notes,
           human_review_status, human_level, reviewer_notes, training_split, image_hash
    FROM observations
    WHERE human_review_status IN ('accepted', 'corrected')
      AND image_hash IS NOT NULL
    ORDER BY created_at ASC
  `) as unknown as Row[];

  if (rows.length === 0) {
    console.log("No hay observaciones revisadas con image_hash. Nada que exportar.");
    return;
  }
  console.log(`Encontradas ${rows.length} observaciones para exportar.`);

  // 1) Asignar y persistir training_split a las que aún no lo tienen.
  const toAssign = rows.filter((r) => r.training_split == null);
  if (toAssign.length > 0) {
    console.log(`Asignando split determinista a ${toAssign.length} filas nuevas…`);
    for (const r of toAssign) {
      const split = splitFromId(r.id);
      r.training_split = split;
      await sql`
        UPDATE observations SET training_split = ${split} WHERE id = ${r.id}
      `;
    }
  }

  // 2) Crear estructura de directorios.
  const stamp = timestamp();
  const rootDir = join(process.cwd(), "exports", `roboflow-${stamp}`);
  console.log(`Creando ${rootDir}…`);
  for (const split of SPLITS) {
    for (const lv of LEVELS) {
      await mkdir(join(rootDir, split, levelSlug(lv)), { recursive: true });
    }
  }

  // 3) Descargar todas las fotos en paralelo controlado.
  console.log(`Descargando ${rows.length} fotos (concurrencia ${DOWNLOAD_CONCURRENCY})…`);
  const results = await pool(rows, DOWNLOAD_CONCURRENCY, async (row) => {
    const split = (row.training_split ?? splitFromId(row.id)) as TrainingSplit;
    const r = await downloadOne(row, split, rootDir);
    if (r.ok) {
      return { row, split, relPath: r.relPath };
    }
    console.warn(`  ✗ ${row.id}: ${r.error}`);
    return { row, split, relPath: null };
  });

  const ok = results.filter((r) => r.relPath !== null);
  const failed = results.length - ok.length;

  // 4) Escribir _classes.csv por split (header: filename,class).
  for (const split of SPLITS) {
    const lines = ["filename,class"];
    for (const r of ok) {
      if (r.split !== split) continue;
      // El path en el CSV es relativo a la raíz del split.
      const relInSplit = r.relPath!.startsWith(`${split}/`)
        ? r.relPath!.slice(split.length + 1)
        : r.relPath!;
      const klass = levelSlug(effectiveLevel(r.row));
      lines.push(`${relInSplit},${klass}`);
    }
    await writeFile(join(rootDir, split, "_classes.csv"), lines.join("\n") + "\n");
  }

  // 5) metadata.jsonl con el resto de campos para análisis offline.
  const metaLines = ok.map((r) =>
    JSON.stringify({
      id: r.row.id,
      split: r.split,
      effective_level: effectiveLevel(r.row),
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
  await writeFile(join(rootDir, "metadata.jsonl"), metaLines.join("\n") + "\n");

  // 6) Resumen.
  const bySplit: Record<string, number> = { train: 0, valid: 0, test: 0 };
  const byLevel: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const r of ok) {
    bySplit[r.split]++;
    byLevel[effectiveLevel(r.row)]++;
  }

  console.log("\n=== Export completado ===");
  console.log(`  Total exportadas: ${ok.length}${failed > 0 ? ` (${failed} fallidas)` : ""}`);
  console.log(`  Por split: train=${bySplit.train}  valid=${bySplit.valid}  test=${bySplit.test}`);
  console.log(
    `  Por nivel: 0=${byLevel[0]}  1=${byLevel[1]}  2=${byLevel[2]}  3=${byLevel[3]}  4=${byLevel[4]}`,
  );
  console.log(`  Carpeta: ${rootDir}`);
  console.log("\nPara subir a Roboflow, comprime y arrastra el ZIP:");
  console.log(`  cd exports && zip -r roboflow-${stamp}.zip roboflow-${stamp}/`);
}

main().catch((e) => {
  console.error("✗ Error en export:", e);
  process.exit(1);
});
