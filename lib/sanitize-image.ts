import sharp from "sharp";

/**
 * Tamaño máximo en bytes (configurable vía env, default 10 MB).
 */
export const MAX_PHOTO_BYTES =
  Number.parseInt(process.env.MAX_PHOTO_MB ?? "10", 10) * 1024 * 1024;

/**
 * Lado máximo en pixeles tras decodificar. Anti image-bomb: una imagen
 * puede ser 1 KB en disco pero decodificar a 100,000 × 100,000 px (10 GB
 * en RAM). Sharp usa libvips que detecta esto razonablemente, pero
 * imponemos un límite duro adicional.
 */
export const MAX_DECODED_DIM = 8000;

/**
 * Lado máximo de la salida tras re-encode.
 */
export const OUTPUT_MAX_DIM = 1920;

export class ImageRejectedError extends Error {
  constructor(
    public readonly reason: string,
    public readonly userMessage: string,
  ) {
    super(reason);
    this.name = "ImageRejectedError";
  }
}

/**
 * Valida formato de imagen verificando los magic bytes iniciales.
 * No confía en `Content-Type` del cliente.
 */
function detectFormat(buf: Buffer): "jpeg" | "png" | "webp" | "heic" | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "png";
  }
  // WebP: "RIFF....WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "webp";
  }
  // HEIC/HEIF: "ftypheic" o "ftypmif1" o "ftypheix" entre bytes 4-12
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    return "heic";
  }
  return null;
}

/**
 * Sanitiza una imagen recibida del cliente:
 *  1. Verifica magic bytes (no confía en Content-Type)
 *  2. Verifica tamaño en bytes
 *  3. Decodifica con sharp y valida dimensiones
 *  4. Re-encode a JPEG q82 — esto strippea TODO metadata (EXIF, GPS, IPTC,
 *     XMP, ICC) y elimina cualquier polyglot (PDF/JS embebido en JPG).
 *  5. Aplica orientación EXIF antes de descartarla (`.rotate()`)
 *  6. Redimensiona si excede `OUTPUT_MAX_DIM`
 *
 * Lanza `ImageRejectedError` con mensaje user-friendly si no pasa.
 */
export async function sanitizeImage(buf: Buffer): Promise<Buffer> {
  if (buf.length === 0) {
    throw new ImageRejectedError("empty", "La foto está vacía.");
  }

  if (buf.length > MAX_PHOTO_BYTES) {
    throw new ImageRejectedError(
      "too_large",
      `La foto pesa más de ${process.env.MAX_PHOTO_MB ?? 10} MB. Intenta con una foto más pequeña.`,
    );
  }

  const format = detectFormat(buf);
  if (!format) {
    throw new ImageRejectedError(
      "invalid_format",
      "El archivo no es una imagen válida (usa JPG, PNG, WebP o HEIC).",
    );
  }

  let pipeline: sharp.Sharp;
  let metadata: sharp.Metadata;
  try {
    pipeline = sharp(buf, { failOn: "warning" });
    metadata = await pipeline.metadata();
  } catch {
    throw new ImageRejectedError(
      "decode_failed",
      "La imagen está dañada o no se pudo procesar.",
    );
  }

  const w = metadata.width ?? 0;
  const h = metadata.height ?? 0;
  if (w === 0 || h === 0) {
    throw new ImageRejectedError(
      "no_dimensions",
      "La imagen no tiene dimensiones válidas.",
    );
  }
  if (w > MAX_DECODED_DIM || h > MAX_DECODED_DIM) {
    throw new ImageRejectedError(
      "too_large_decoded",
      "La foto tiene dimensiones excesivas. Reduce la resolución antes de subir.",
    );
  }

  return pipeline
    .rotate() // Aplica orientación EXIF antes de strip
    .resize({
      width: OUTPUT_MAX_DIM,
      height: OUTPUT_MAX_DIM,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toBuffer();
}
