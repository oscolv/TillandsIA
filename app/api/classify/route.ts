import { NextResponse } from "next/server";
import {
  ImageRejectedError,
  MAX_PHOTO_BYTES,
  sanitizeImage,
} from "@/lib/sanitize-image";
import { classifyImage } from "@/lib/classify";
import { hashIP } from "@/lib/hash-ip";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs"; // sharp no corre en edge
export const maxDuration = 30; // OpenAI vision puede tardar 5-15 s
export const dynamic = "force-dynamic";

/**
 * POST /api/classify — recibe una foto, la sanitiza y la clasifica.
 *
 * Pipeline:
 *  1. Rate limit por hash de IP (10/h)
 *  2. Validar Content-Length antes de leer el body
 *  3. Sanitizar imagen con sharp (re-encode + strip metadata + dim check)
 *  4. Clasificar con GPT-5.4 mini (structured outputs)
 *  5. Si has_human_face o rejection_reason → 422 sin guardar
 *  6. Devolver el ClassificationResult + imagen sanitizada (base64)
 *     para que el cliente confirme en POST /api/observations
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

  let rl: { success: boolean; reset: number };
  try {
    rl = await checkRateLimit(`classify:${identifier}`);
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
        error: "Has alcanzado el límite de 10 fotos por hora. Intenta más tarde.",
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  // 2. Content-Length pre-check
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number.parseInt(contentLength, 10) > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      {
        error: `La foto pesa más de ${process.env.MAX_PHOTO_MB ?? 10} MB.`,
      },
      { status: 413 },
    );
  }

  // 3. Leer multipart form-data
  let buf: Buffer;
  try {
    const formData = await req.formData();
    const file = formData.get("photo");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Falta el campo 'photo' en form-data." },
        { status: 400 },
      );
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        {
          error: `La foto pesa más de ${process.env.MAX_PHOTO_MB ?? 10} MB.`,
        },
        { status: 413 },
      );
    }
    buf = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    console.error("formData parse error:", err);
    return NextResponse.json(
      { error: "No se pudo procesar la foto enviada." },
      { status: 400 },
    );
  }

  // 4. Sanitizar
  let sanitized: Buffer;
  try {
    sanitized = await sanitizeImage(buf);
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

  // 5. Clasificar
  try {
    const result = await classifyImage(sanitized);

    // Rechazos: rostros o motivo explícito
    if (result.has_human_face || result.rejection_reason) {
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

    // 6. Devolver resultado + foto sanitizada en base64 para que el cliente
    // confirme con POST /api/observations.
    return NextResponse.json({
      rejected: false,
      classification: result,
      photoBase64: sanitized.toString("base64"),
    });
  } catch (err) {
    console.error("classify error:", err);
    return NextResponse.json(
      { error: "Error al clasificar la foto. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
