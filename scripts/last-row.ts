import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL no está configurada");
    process.exit(1);
  }
  const sql = neon(url);
  const rows = await sql`
    SELECT id, created_at, lat, lng, level, label, confidence,
           tree_species, tree_species_common, municipality,
           flagged, flag_reasons, infestation_active, photo_angle,
           classifier_version, model_version,
           length(ip_hash) AS ip_hash_len,
           photo_url
    FROM observations
    ORDER BY created_at DESC
    LIMIT 3
  `;
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
