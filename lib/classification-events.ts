import { classificationEvents, db } from "@/lib/db";
import { CLASSIFIER_VERSION, MODEL_VERSION } from "@/lib/classify";

/**
 * Tipos de evento que registramos en `classification_events`.
 *
 *  - `classified`: el modelo devolvió una clasificación usable. Si el usuario
 *    confirma, queda una fila en `observations` con el mismo `image_hash`.
 *    Si no confirma, la diferencia entre eventos y observaciones revela
 *    abandono.
 *  - `rejected_face`: `has_human_face === true` en el output del modelo.
 *  - `rejected_insufficient`: `photo_angle === "insufficient"`.
 *  - `rejected_other`: cualquier `rejection_reason` distinto a face/insufficient.
 *  - `error`: excepción no recuperable en el pipeline (sharp, OpenAI, etc.).
 */
export type ClassificationOutcome =
  | "classified"
  | "rejected_face"
  | "rejected_insufficient"
  | "rejected_other"
  | "error";

export interface RecordEventInput {
  outcome: ClassificationOutcome;
  ipHash: string;
  confidence?: number | null;
  imageHash?: string | null;
}

/**
 * Inserta una fila en `classification_events`. Nunca lanza: si el insert
 * falla por la razón que sea, lo loguea y continúa — el flujo de
 * clasificación no debe abortar por una bitácora de telemetría.
 */
export async function recordClassificationEvent(
  input: RecordEventInput,
): Promise<void> {
  try {
    await db.insert(classificationEvents).values({
      outcome: input.outcome,
      confidence: input.confidence ?? null,
      ipHash: input.ipHash,
      imageHash: input.imageHash ?? null,
      classifierVersion: CLASSIFIER_VERSION,
      modelVersion: MODEL_VERSION,
    });
  } catch (err) {
    console.error("classification-event insert error:", err);
  }
}
