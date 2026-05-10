import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Sliding-window rate limiter respaldado por Upstash Redis.
 *
 * Dos tiers, cada uno en su propio keyspace en Redis:
 *  - "normal" (sin token): 30 requests/hora por hash de IP. Suficiente para
 *    uso individual y suficientemente apretado para frenar abuso de bot.
 *  - "bypass" (con header `x-bypass-token` válido): 200 requests/hora por
 *    hash de IP. Pensado para brigadistas en jornadas largas de campo.
 *    El bucket se sigue clavando al IP — el token solo desbloquea el tier
 *    más alto, no es un cheque ilimitado contra OpenAI.
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

const NORMAL_LIMIT = 30;
const BYPASS_LIMIT = 200;
const WINDOW = "1 h" as const;

let _redis: Redis | null = null;
let _normal: Ratelimit | null = null;
let _bypass: Ratelimit | null = null;

function getRedis(): Redis {
  if (_redis) return _redis;

  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Upstash Redis no configurado: faltan KV_REST_API_URL/TOKEN (o equivalentes UPSTASH_REDIS_REST_*)",
    );
  }

  _redis = new Redis({ url, token });
  return _redis;
}

function getNormalRatelimiter(): Ratelimit {
  if (_normal) return _normal;
  _normal = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(NORMAL_LIMIT, WINDOW),
    analytics: true,
    prefix: "tillandsia:rl",
  });
  return _normal;
}

function getBypassRatelimiter(): Ratelimit {
  if (_bypass) return _bypass;
  _bypass = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(BYPASS_LIMIT, WINDOW),
    analytics: true,
    prefix: "tillandsia:rl-bypass",
  });
  return _bypass;
}

export type RateTier = "normal" | "bypass";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  tier: RateTier;
  limit: number;
}

export const RATE_LIMITS = {
  normal: NORMAL_LIMIT,
  bypass: BYPASS_LIMIT,
} as const;

export async function checkRateLimit(
  identifier: string,
  tier: RateTier = "normal",
): Promise<RateLimitResult> {
  const rl = tier === "bypass" ? getBypassRatelimiter() : getNormalRatelimiter();
  const limit = tier === "bypass" ? BYPASS_LIMIT : NORMAL_LIMIT;
  const { success, remaining, reset } = await rl.limit(identifier);
  return { success, remaining, reset, tier, limit };
}
