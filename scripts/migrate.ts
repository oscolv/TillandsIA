import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL no está configurada");
    process.exit(1);
  }

  console.log("Aplicando migraciones a la base de datos...");
  const sql = neon(url);
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ Migraciones aplicadas");
}

main().catch((err) => {
  console.error("✗ Error en migración:", err);
  process.exit(1);
});
