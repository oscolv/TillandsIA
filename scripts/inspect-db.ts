import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL no está configurada");
    process.exit(1);
  }
  const sql = neon(url);

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `;
  console.log("Tablas:", tables.map((r) => r.table_name).join(", "));

  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'observations' ORDER BY ordinal_position
  `;
  console.log("\nColumnas de observations:");
  for (const c of cols) {
    console.log(`  - ${c.column_name}: ${c.data_type}${c.is_nullable === "NO" ? " NOT NULL" : ""}`);
  }

  const idx = await sql`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'observations' ORDER BY indexname
  `;
  console.log("\nÍndices:");
  for (const i of idx) console.log(`  - ${i.indexname}`);

  const count = await sql`SELECT COUNT(*) AS n FROM observations`;
  console.log(`\nFilas: ${count[0].n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
