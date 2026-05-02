import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Sliding-window rate limiter respaldado por Upstash Redis.
 * 10 requests por hora por hash de IP.
 *
 * Si `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` no están configuradas,
 * se inicializa lazy y falla en el primer uso real (no en el módulo de import).
 * Esto permite que `npm run build` y los tests no requieran Upstash.
 */
let _ratelimiter: Ratelimit | null = null;

function getRatelimiter(): Ratelimit {
  if (_ratelimiter) return _ratelimiter;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error(
      "Upstash Redis no configurado: revisa UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN",
    );
  }

  _ratelimiter = new Ratelimit({
    redis: Redis.fromEnv(),
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
