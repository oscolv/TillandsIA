import { timingSafeEqual } from "node:crypto";

/**
 * Verifica si la request trae un bypass token válido en el header
 * `x-bypass-token`. Los tokens permitidos vienen de la env var
 * `BYPASS_TOKENS` separados por coma (ej. `BYPASS_TOKENS=tokA,tokB,tokC`).
 *
 * El bypass desbloquea el tier de rate-limit más alto (200/h vs 30/h);
 * no salta autenticación ni autorización porque la app no tiene cuentas.
 *
 * Comparación con `timingSafeEqual` para evitar fugas por timing en caso
 * de que un atacante intente derivar el token byte por byte. Tokens de
 * distinta longitud se rechazan sin comparar.
 */
export function hasValidBypassToken(req: Request): boolean {
  const provided = req.headers.get("x-bypass-token");
  if (!provided) return false;

  const allowed = (process.env.BYPASS_TOKENS ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (allowed.length === 0) return false;

  const providedBuf = Buffer.from(provided);
  return allowed.some((tok) => {
    const tokBuf = Buffer.from(tok);
    if (tokBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(tokBuf, providedBuf);
  });
}
