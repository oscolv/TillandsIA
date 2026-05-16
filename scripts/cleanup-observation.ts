import { neon } from "@neondatabase/serverless";
import { del } from "@vercel/blob";

/**
 * Borra una observación específica + todas sus fotos de Blob (1–3).
 * Uso: tsx scripts/cleanup-observation.ts <observation-id>
 */
async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Uso: tsx scripts/cleanup-observation.ts <observation-id>");
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL no configurada");
    process.exit(1);
  }
  const sql = neon(dbUrl);

  const rows = await sql`
    SELECT id, photo_urls, tree_species_common, label
    FROM observations
    WHERE id = ${id}
  `;
  if (rows.length === 0) {
    console.log(`No existe observación con id ${id}`);
    return;
  }
  const obs = rows[0] as {
    id: string;
    photo_urls: string[];
    tree_species_common: string | null;
    label: string;
  };
  console.log(`Encontrada: ${obs.tree_species_common ?? "?"} — ${obs.label}`);
  console.log(`Fotos (${obs.photo_urls.length}):`);
  for (const url of obs.photo_urls) console.log(`  - ${url}`);

  // Borrar todas las fotos de Blob en paralelo. Si alguna ya no existe, se
  // ignora (el script tolera huérfanas para no romper el cleanup global).
  await Promise.all(
    obs.photo_urls.map(async (url) => {
      try {
        await del(url);
        console.log(`✓ Borrada: ${url}`);
      } catch (err) {
        console.warn(`⚠ No se pudo borrar (puede que ya no exista): ${url}`, err);
      }
    }),
  );

  // Borrar fila de DB
  await sql`DELETE FROM observations WHERE id = ${id}`;
  console.log("✓ Fila borrada de Neon");

  // Verificar
  const remaining = await sql`SELECT COUNT(*) AS n FROM observations`;
  console.log(`Filas restantes en observations: ${remaining[0].n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
