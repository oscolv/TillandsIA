import { NextResponse } from "next/server";
import {
  ImageRejectedError,
  MAX_PHOTO_BYTES,
  sanitizeImage,
} from "@/lib/sanitize-image";
import { classifyImage } from "@/lib/classify";
import { hashIP } from "@/lib/hash-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasValidBypassToken } from "@/lib/bypass-token";
import { cacheClassification, deriveHashes } from "@/lib/classification-cache";
import { recordClassificationEvent } from "@/lib/classification-events";

export const runtime = "nodejs"; // sharp no corre en edge
export const maxDuration = 30; // OpenAI vision puede tardar 5-15 s
export const dynamic = "force-dynamic";

const MAX_PHOTOS_PER_REQUEST = 3;

/**
 * POST /api/classify — recibe 1–3 fotos del MISMO árbol, las sanitiza y
 * las clasifica con una sola llamada al modelo (clasificación agregada).
 *
 * Pipeline:
 *  1. Rate limit por hash de IP (30/h normal, 200/h con bypass token).
 *     Una sesión multifoto consume UNA entrada del rate limit
 *     independientemente de cuántas fotos lleve.
 *  2. Validar Content-Length antes de leer el body (cap = N * MAX_PHOTO_BYTES).
 *  3. Sanitizar cada imagen con sharp en paralelo.
 *  4. Clasificar con GPT-5.4 mini en una sola llamada (structured outputs).
 *  5. Si has_human_face o rejection_reason → 422 sin guardar.
 *  6. Devolver el ClassificationResult agregado + las fotos sanitizadas
 *     (base64 + hash individual) + combinedHash, para que el cliente
 *     confirme en POST /api/observations.
 */
export async function POST(req: Request) {
  // 1. Rate limit
  let identifier: string;
  try {
    identifier = hashIP(req);
  } catch (err) {
    console.error("hashIP error:", err);
    return NextResponse.json(
      { error: "Configuración del servidor incompleta" },
      { status: 500 },
    );
  }

  const tier = hasValidBypassToken(req) ? "bypass" : "normal";
  let rl: { success: boolean; reset: number; limit: number };
  try {
    rl = await checkRateLimit(`classify:${identifier}`, tier);
  } catch (err) {
    console.error("rate-limit error:", err);
    return NextResponse.json(
      { error: "Configuración del servidor incompleta" },
      { status: 500 },
    );
  }

  if (!rl.success) {
    const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
    return NextResponse.json(
      {
        error: `Has alcanzado el límite de ${rl.limit} fotos por hora. Intenta más tarde.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  // 2. Content-Length pre-check (cap = N * MAX_PHOTO_BYTES)
  const contentLength = req.headers.get("content-length");
  if (
    contentLength &&
    Number.parseInt(contentLength, 10) >
      MAX_PHOTO_BYTES * MAX_PHOTOS_PER_REQUEST
  ) {
    return NextResponse.json(
      {
        error: `El conjunto de fotos pesa más de ${
          (Number(process.env.MAX_PHOTO_MB ?? 10)) * MAX_PHOTOS_PER_REQUEST
        } MB.`,
      },
      { status: 413 },
    );
  }

  // 3. Leer multipart form-data (N fotos en el campo "photo")
  let rawBufs: Buffer[];
  try {
    const formData = await req.formData();
    const files = formData.getAll("photo");
    if (files.length === 0) {
      return NextResponse.json(
        { error: "Falta el campo 'photo' en form-data." },
        { status: 400 },
      );
    }
    if (files.length > MAX_PHOTOS_PER_REQUEST) {
      return NextResponse.json(
        {
          error: `Máximo ${MAX_PHOTOS_PER_REQUEST} fotos por observación.`,
        },
        { status: 400 },
      );
    }
    rawBufs = [];
    for (const file of files) {
      if (!(file instanceof Blob)) {
        return NextResponse.json(
          { error: "Campo 'photo' inválido en form-data." },
          { status: 400 },
        );
      }
      if (file.size > MAX_PHOTO_BYTES) {
        return NextResponse.json(
          {
            error: `Una de las fotos pesa más de ${process.env.MAX_PHOTO_MB ?? 10} MB.`,
          },
          { status: 413 },
        );
      }
      rawBufs.push(Buffer.from(await file.arrayBuffer()));
    }
  } catch (err) {
    console.error("formData parse error:", err);
    return NextResponse.json(
      { error: "No se pudieron procesar las fotos enviadas." },
      { status: 400 },
    );
  }

  // 4. Sanitizar en paralelo
  let sanitized: Buffer[];
  try {
    sanitized = await Promise.all(rawBufs.map((b) => sanitizeImage(b)));
  } catch (err) {
    if (err instanceof ImageRejectedError) {
      return NextResponse.json(
        { error: err.userMessage, reason: err.reason },
        { status: 400 },
      );
    }
    console.error("sanitize error:", err);
    return NextResponse.json(
      { error: "No se pudo procesar la imagen." },
      { status: 500 },
    );
  }

  // 5. Calcular hashes (individuales + combinedHash para cache key)
  const { individual: individualHashes, combined: combinedHash } =
    deriveHashes(sanitized);
  // El evento se indexa por el hash de la primera foto (única columna en
  // `classification_events.image_hash`) — sirve como cross-ref a
  // `observations.image_hashes` vía ANY(). Para la cache key usamos el
  // combinedHash, que sí identifica al conjunto completo.
  const eventHash = individualHashes[0];

  try {
    const result = await classifyImage(sanitized);

    // Rechazos: rostros o motivo explícito
    if (result.has_human_face || result.rejection_reason) {
      const outcome = result.has_human_face
        ? "rejected_face"
        : result.is_photograph === false
          ? "rejected_synthetic"
          : "rejected_other";
      await recordClassificationEvent({
        outcome,
        ipHash: identifier,
        confidence: result.confidence,
        imageHash: eventHash,
      });
      return NextResponse.json(
        {
          rejected: true,
          reason:
            result.rejection_reason ??
            "Foto contiene rostros humanos. Toma otra sin personas.",
          classification: result,
        },
        { status: 422 },
      );
    }

    // photo_angle: insufficient → rechazo
    if (result.photo_angle === "insufficient") {
      await recordClassificationEvent({
        outcome: "rejected_insufficient",
        ipHash: identifier,
        confidence: result.confidence,
        imageHash: eventHash,
      });
      return NextResponse.json(
        {
          rejected: true,
          reason:
            "La foto no muestra suficiente del árbol para clasificar. Intenta capturar el dosel completo.",
          classification: result,
        },
        { status: 422 },
      );
    }

    // 6. Cachear classification atada al combinedHash del conjunto.
    //    `/api/observations` validará que el cliente envíe los hashes
    //    individuales + combinedHash + photos base64; recalcula y compara
    //    para leer la classification de aquí. El cliente nunca es autoridad
    //    sobre level/confidence.
    try {
      await cacheClassification(combinedHash, result);
    } catch (err) {
      console.error("classification-cache error:", err);
      await recordClassificationEvent({
        outcome: "error",
        ipHash: identifier,
        confidence: result.confidence,
        imageHash: eventHash,
      });
      return NextResponse.json(
        { error: "Configuración del servidor incompleta" },
        { status: 500 },
      );
    }

    await recordClassificationEvent({
      outcome: "classified",
      ipHash: identifier,
      confidence: result.confidence,
      imageHash: eventHash,
    });

    return NextResponse.json({
      rejected: false,
      classification: result,
      photos: sanitized.map((buf, i) => ({
        base64: buf.toString("base64"),
        hash: individualHashes[i],
      })),
      combinedHash,
    });
  } catch (err) {
    console.error("classify error:", err);
    await recordClassificationEvent({
      outcome: "error",
      ipHash: identifier,
      imageHash: eventHash,
    });
    return NextResponse.json(
      { error: "Error al clasificar la foto. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
