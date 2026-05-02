import { put } from "@vercel/blob";

/**
 * Sube una foto sanitizada a Vercel Blob y devuelve su URL pública.
 * El nombre del blob es un UUID derivado del momento de subida — no usa
 * ningún identificador del usuario.
 */
export async function uploadPhoto(buf: Buffer): Promise<string> {
  const filename = `obs/${crypto.randomUUID()}.jpg`;
  const result = await put(filename, buf, {
    access: "public",
    contentType: "image/jpeg",
    addRandomSuffix: false, // ya tenemos UUID
    cacheControlMaxAge: 60 * 60 * 24 * 365, // 1 año (las fotos son inmutables)
  });
  return result.url;
}
