import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { ClassificationResult } from "./types";

/**
 * Cache puente entre `/api/classify` y `/api/observations`.
 *
 * Razón: el cliente no puede ser autoridad sobre la clasificación. Si
 * `/api/observations` recibiera `level/confidence` directamente del cliente,
 * cualquiera podría falsificar el dataset enviando `level: 4` con cualquier
 * foto. En cambio:
 *
 *   1. `/api/classify` calcula sha256 de la imagen sanitizada y guarda
 *      `{imageHash → classification}` en Upstash con TTL 15 min.
 *   2. `/api/observations` recibe `imageHash` + `photoBase64` del cliente,
 *      recalcula el hash y lo compara, y lee la classification del cache.
 *
 * Esto ata la classification a la imagen exacta que el modelo vio.
 */

const TTL_SECONDS = 15 * 60;
const KEY_PREFIX = "tillandsia:classify:";

let _redis: Redis | null = null;

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

/** sha256 hex de un buffer de imagen. */
export function hashImage(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export async function cacheClassification(
  imageHash: string,
  classification: ClassificationResult,
): Promise<void> {
  const redis = getRedis();
  await redis.set(
    `${KEY_PREFIX}${imageHash}`,
    JSON.stringify(classification),
    { ex: TTL_SECONDS },
  );
}

/**
 * Lee la classification cacheada para un imageHash dado.
 * Devuelve null si no existe o expiró.
 *
 * Upstash auto-deserializa JSON que parece objeto, así que aceptamos ambas formas.
 */
export async function getCachedClassification(
  imageHash: string,
): Promise<ClassificationResult | null> {
  const redis = getRedis();
  const value = await redis.get<string | ClassificationResult>(
    `${KEY_PREFIX}${imageHash}`,
  );
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as ClassificationResult;
    } catch {
      return null;
    }
  }
  return value;
}
