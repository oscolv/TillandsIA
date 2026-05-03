import { createHash } from "node:crypto";
import type { InfestationLevel, TrainingSplit } from "@/lib/types";

/**
 * Asignación determinista de split a partir del id de la observación.
 * El mismo id siempre cae en el mismo split entre re-exports.
 *
 * Ratio: 70% train, 20% valid, 10% test sobre el primer byte de md5(id).
 *   0..178  → train  (179/256 ≈ 0.6992)
 *   179..229 → valid  (51/256 ≈ 0.1992)
 *   230..255 → test   (26/256 ≈ 0.1016)
 */
export function splitFromId(id: string): TrainingSplit {
  const n = createHash("md5").update(id).digest()[0];
  if (n < 179) return "train";
  if (n < 230) return "valid";
  return "test";
}

/**
 * Slug ASCII para el nombre de carpeta de cada nivel. Roboflow usa el nombre
 * de la carpeta como nombre de la clase, así que evitamos acentos y espacios.
 */
export const LEVEL_SLUGS: Record<InfestationLevel, string> = {
  0: "0_sin_infestacion",
  1: "1_leve",
  2: "2_moderada",
  3: "3_severa",
  4: "4_muy_severa",
};

export function levelSlug(level: number): string {
  if (level < 0 || level > 4 || !Number.isInteger(level)) {
    throw new Error(`level fuera de rango: ${level}`);
  }
  return LEVEL_SLUGS[level as InfestationLevel];
}

/**
 * Nivel efectivo a usar como etiqueta del dataset.
 * Si hay una corrección humana, prevalece sobre la del modelo.
 */
export function effectiveLevel(row: {
  level: number;
  human_level: number | null;
  human_review_status: string;
}): InfestationLevel {
  const lv =
    row.human_review_status === "corrected" && row.human_level != null
      ? row.human_level
      : row.level;
  if (lv < 0 || lv > 4) {
    throw new Error(`Nivel inválido para id: ${lv}`);
  }
  return lv as InfestationLevel;
}
