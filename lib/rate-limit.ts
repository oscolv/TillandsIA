import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Sliding-window rate limiter respaldado por Upstash Redis.
 * 10 requests por hora por hash de IP.
 *
 * Acepta ambos nombres de variables:
 *  - `KV_REST_API_URL` / `KV_REST_API_TOKEN` (lo que inyecta el Marketplace
 *    de Vercel cuando agregas Upstash desde el dashboard)
 *  - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (lo que la docs
 *    de Upstash pone como ejemplo y `Redis.fromEnv()` busca por default)
 *
 * Se inicializa lazy: falla en el primer uso real, no en import.
 * Eso permite que `npm run build` y los tests no requieran Upstash.
 */
let _ratelimiter: Ratelimit | null = null;

function getRatelimiter(): Ratelimit {
  if (_ratelimiter) return _ratelimiter;

  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Upstash Redis no configurado: faltan KV_REST_API_URL/TOKEN (o equivalentes UPSTASH_REDIS_REST_*)",
    );
  }

  _ratelimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "tillandsia:rl",
  });
  return _ratelimiter;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const rl = getRatelimiter();
  const { success, remaining, reset } = await rl.limit(identifier);
  return { success, remaining, reset };
}
