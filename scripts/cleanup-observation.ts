import { neon } from "@neondatabase/serverless";
import { del } from "@vercel/blob";

/**
 * Borra una observación específica + su foto de Blob.
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
    SELECT id, photo_url, tree_species_common, label
    FROM observations
    WHERE id = ${id}
  `;
  if (rows.length === 0) {
    console.log(`No existe observación con id ${id}`);
    return;
  }
  const obs = rows[0];
  console.log(`Encontrada: ${obs.tree_species_common ?? "?"} — ${obs.label}`);
  console.log(`Photo: ${obs.photo_url}`);

  // Borrar foto de Blob
  try {
    await del(obs.photo_url);
    console.log("✓ Foto borrada de Vercel Blob");
  } catch (err) {
    console.warn("⚠ No se pudo borrar foto de Blob (puede que ya no exista):", err);
  }

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
