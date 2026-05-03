import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import {
  buildRoboflowExport,
  ROBOFLOW_LEVEL_SLUGS,
  ROBOFLOW_SPLITS,
} from "../lib/dataset-export";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL no está configurada");
    process.exit(1);
  }

  const result = await buildRoboflowExport({
    onProgress: (m) => console.log(m),
  });

  if (result.summary.total === 0) {
    console.log("No hay observaciones revisadas con image_hash. Nada que exportar.");
    return;
  }

  const rootDir = join(process.cwd(), "exports", `roboflow-${result.summary.stamp}`);
  console.log(`Creando ${rootDir}…`);

  // Crea las carpetas vacías por nivel para que la estructura sea predecible
  // incluso cuando un nivel no tenga muestras.
  for (const split of ROBOFLOW_SPLITS) {
    for (const slug of ROBOFLOW_LEVEL_SLUGS) {
      await mkdir(join(rootDir, split, slug), { recursive: true });
    }
  }

  for (const f of result.files) {
    const abs = join(rootDir, f.path);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, f.data);
  }

  for (const e of result.errors) {
    console.warn(`  ✗ ${e.id}: ${e.error}`);
  }

  const { total, failed, bySplit, byLevel, stamp } = result.summary;
  console.log("\n=== Export completado ===");
  console.log(
    `  Total exportadas: ${total}${failed > 0 ? ` (${failed} fallidas)` : ""}`,
  );
  console.log(
    `  Por split: train=${bySplit.train}  valid=${bySplit.valid}  test=${bySplit.test}`,
  );
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
