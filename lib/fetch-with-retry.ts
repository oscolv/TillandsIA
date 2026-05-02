/**
 * Fetch con reintentos para escenarios de mobile rural con conectividad
 * inestable. Reintenta SOLO en:
 *  - Errores de red (TypeError de fetch)
 *  - Respuestas 5xx
 *  - 408 (Request Timeout)
 *
 * NO reintenta:
 *  - 4xx (excepto 408): el cliente envió mal el request
 *  - 429 (rate limit): el cliente debe esperar más
 *  - 422 (rejected): la foto fue rechazada por el modelo
 *
 * Backoff lineal: 2s, 4s, 6s. Total ~12s en peor caso.
 */
export interface RetryOptions {
  /** Máximo de intentos totales (incluyendo el primero). Default 3. */
  maxAttempts?: number;
  /** Multiplicador de espera entre reintentos en ms. Default 2000 (2s, 4s, 6s). */
  delayMs?: number;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: RetryOptions = {},
): Promise<Response> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const delayMs = opts.delayMs ?? 2000;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (shouldRetry(res.status) && attempt < maxAttempts) {
        await sleep(delayMs * attempt);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await sleep(delayMs * attempt);
        continue;
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("Sin conexión tras varios intentos");
}

function shouldRetry(status: number): boolean {
  if (status === 408) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
