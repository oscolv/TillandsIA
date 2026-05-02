import { createHmac } from "node:crypto";

/**
 * Devuelve un hash HMAC-SHA-256 estable del IP del cliente, usando
 * `RATE_LIMIT_SALT` como secreto. Sirve como identificador anónimo para
 * rate limiting sin almacenar el IP plano (que sería PII).
 *
 * **Por qué HMAC y no SHA-256 plano**: SHA-256 plano de IPv4 es trivial
 * de revertir (4.3 mil millones de preimágenes — segundos en GPU).
 * HMAC con sal aleatoria larga lo vuelve infactible.
 */
export function hashIP(req: Request): string {
  const salt = process.env.RATE_LIMIT_SALT;
  if (!salt || salt.length < 16) {
    throw new Error(
      "RATE_LIMIT_SALT no está configurada o es demasiado corta (min 16 chars)",
    );
  }

  const ip = extractClientIP(req);
  return createHmac("sha256", salt).update(ip).digest("hex");
}

/**
 * Extrae el IP del cliente respetando los headers que Vercel/proxies inyectan.
 * Cuando varios IPs aparecen en `x-forwarded-for`, el primero es el cliente.
 */
function extractClientIP(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}
