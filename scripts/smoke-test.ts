import sharp from "sharp";
import fs from "node:fs";

/**
 * Genera una imagen sintética y la envía a /api/classify para verificar
 * que el pipeline de seguridad y clasificación funciona end-to-end.
 *
 * NOTA: el modelo va a clasificar como "no es un árbol" o nivel 0 con
 * baja confianza, lo cual es correcto — solo validamos que NO falle el
 * pipeline (rate limit, sanitize, openai call, response parse).
 */
async function main() {
  const url = process.argv[2] ?? "http://localhost:3000/api/classify";

  // Imagen simulada de "árbol con manchas grises" — verde con círculos grises
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">
      <rect width="600" height="800" fill="#7d9a5a"/>
      <rect x="280" y="500" width="40" height="300" fill="#5e3023"/>
      <circle cx="200" cy="200" r="70" fill="#3e5a30"/>
      <circle cx="400" cy="220" r="80" fill="#3e5a30"/>
      <circle cx="300" cy="350" r="100" fill="#3e5a30"/>
      <circle cx="180" cy="180" r="20" fill="#a8a8a8"/>
      <circle cx="220" cy="220" r="18" fill="#a8a8a8"/>
      <circle cx="380" cy="200" r="22" fill="#a8a8a8"/>
    </svg>`;
  const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
  fs.writeFileSync("/tmp/test-tree.jpg", jpeg);
  console.log(`[smoke] imagen generada: ${jpeg.length} bytes`);

  const fd = new FormData();
  fd.append("photo", new Blob([jpeg], { type: "image/jpeg" }), "tree.jpg");

  console.log(`[smoke] POST ${url}`);
  const t0 = Date.now();
  const res = await fetch(url, { method: "POST", body: fd });
  const ms = Date.now() - t0;
  console.log(`[smoke] respuesta en ${ms}ms — status ${res.status}`);

  const data = await res.json();
  console.log("[smoke] body:", JSON.stringify(data, null, 2).slice(0, 1500));
}

main().catch((e) => {
  console.error("smoke test FAIL:", e);
  process.exit(1);
});
