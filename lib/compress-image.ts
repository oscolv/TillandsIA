/**
 * Compresión client-side de imágenes con la canvas API antes de subirlas.
 *
 * Por qué importa: una foto de un celular típico (12 MP) pesa 4–10 MB en
 * JPEG. En zonas rurales del Valle del Mezquital con cobertura 4G débil,
 * subir 8 MB toma 30+ segundos. Tras esta compresión, ~700 KB en 3 s.
 *
 * El servidor (lib/sanitize-image.ts) re-comprime con sharp de todos modos,
 * así que esto es solo un win de bandwidth — no de seguridad ni privacidad.
 */

const MAX_DIM = 1920;
const QUALITY = 0.82;

export interface CompressionResult {
  blob: Blob;
  /** Bytes del archivo original */
  originalSize: number;
  /** Bytes tras compresión */
  compressedSize: number;
  /** Ancho final */
  width: number;
  /** Alto final */
  height: number;
}

export class CompressionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CompressionError";
  }
}

/**
 * Comprime una imagen del cliente:
 * 1. Lee como Image
 * 2. Calcula nuevas dimensiones (max 1920 px lado largo)
 * 3. Renderiza en canvas
 * 4. Exporta como JPEG quality 0.82
 *
 * Si el archivo original ya pesa < 500 KB y mide < 1920 px, lo retorna
 * tal cual (no vale la pena re-codificar y perder calidad).
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  // Atajo: si ya es chico, no re-comprimir
  if (originalSize < 500 * 1024) {
    const dims = await readDimensions(file);
    if (dims.width <= MAX_DIM && dims.height <= MAX_DIM) {
      return {
        blob: file,
        originalSize,
        compressedSize: originalSize,
        width: dims.width,
        height: dims.height,
      };
    }
  }

  const img = await loadImage(file);
  try {
    const { width, height } = scaleDimensions(
      img.naturalWidth,
      img.naturalHeight,
      MAX_DIM,
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new CompressionError("Canvas 2D context no disponible");
    }
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob) {
      throw new CompressionError("canvas.toBlob devolvió null");
    }

    return {
      blob,
      originalSize,
      compressedSize: blob.size,
      width,
      height,
    };
  } finally {
    if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new CompressionError("No se pudo cargar la imagen"));
    img.src = URL.createObjectURL(file);
  });
}

async function readDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  const img = await loadImage(file);
  const result = { width: img.naturalWidth, height: img.naturalHeight };
  if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
  return result;
}

function scaleDimensions(
  w: number,
  h: number,
  maxDim: number,
): { width: number; height: number } {
  const longer = Math.max(w, h);
  if (longer <= maxDim) return { width: w, height: h };
  const ratio = maxDim / longer;
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  };
}
