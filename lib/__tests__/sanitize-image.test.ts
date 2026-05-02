import { describe, it, expect, beforeAll } from "vitest";
import sharp from "sharp";
import {
  ImageRejectedError,
  MAX_DECODED_DIM,
  sanitizeImage,
} from "../sanitize-image";

let jpegWithExif: Buffer;
let plainPng: Buffer;
let oversizedJpeg: Buffer;

beforeAll(async () => {
  // Crea un JPEG 800x600 con metadata EXIF sintético
  jpegWithExif = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 100, g: 150, b: 80 },
    },
  })
    .withExif({
      IFD0: {
        Make: "TestCam",
        Model: "TestModel",
      },
      // sharp's TS types don't include GPS but it accepts it at runtime
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      GPS: {
        GPSLatitudeRef: "N",
        GPSLatitude: "20/1 30/1 0/1",
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .jpeg()
    .toBuffer();

  plainPng = await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 3,
      background: { r: 50, g: 50, b: 50 },
    },
  })
    .png()
    .toBuffer();

  // Oversized: 9000x100, viola MAX_DECODED_DIM
  oversizedJpeg = await sharp({
    create: {
      width: 9000,
      height: 100,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();
});

describe("sanitizeImage", () => {
  it("acepta JPEG válido y devuelve JPEG sin EXIF", async () => {
    const out = await sanitizeImage(jpegWithExif);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    // Después del strip, no debería haber EXIF (TestCam/TestModel/GPS)
    expect(meta.exif).toBeUndefined();
  });

  it("re-encoda PNG a JPEG", async () => {
    const out = await sanitizeImage(plainPng);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
  });

  it("rechaza buffer vacío", async () => {
    await expect(sanitizeImage(Buffer.alloc(0))).rejects.toBeInstanceOf(
      ImageRejectedError,
    );
  });

  it("rechaza archivo no-imagen", async () => {
    const txt = Buffer.from("hola, esto no es una imagen");
    await expect(sanitizeImage(txt)).rejects.toMatchObject({
      reason: "invalid_format",
    });
  });

  it("rechaza imagen con dimensión > MAX_DECODED_DIM", async () => {
    await expect(sanitizeImage(oversizedJpeg)).rejects.toMatchObject({
      reason: "too_large_decoded",
    });
  });

  it("MAX_DECODED_DIM es 8000", () => {
    expect(MAX_DECODED_DIM).toBe(8000);
  });

  it("output es razonablemente pequeño tras re-encode (<1 MB para 800x600)", async () => {
    const out = await sanitizeImage(jpegWithExif);
    expect(out.length).toBeLessThan(1024 * 1024);
  });

  it("redimensiona a max 1920px lado largo", async () => {
    // Crea un 4000x2000 — dentro del límite decoded pero sobre output max
    const wide = await sharp({
      create: {
        width: 4000,
        height: 2000,
        channels: 3,
        background: { r: 100, g: 100, b: 100 },
      },
    })
      .jpeg()
      .toBuffer();
    const out = await sanitizeImage(wide);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBeLessThanOrEqual(1920);
    expect(meta.height).toBeLessThanOrEqual(1920);
  });
});
