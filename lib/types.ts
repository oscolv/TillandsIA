/**
 * Tipos compartidos entre cliente, servidor y schema de DB.
 *
 * El nivel de infestación va de 0 a 4 según la fracción de ramas
 * visiblemente afectadas por *Tillandsia recurvata*. El umbral 50%
 * (nivel 3) es el punto de mortalidad de brotes documentado en
 * mezquite (Flores-Palacios 2014) — ver wiki/topics/heno-motita.
 */

export type InfestationLevel = 0 | 1 | 2 | 3 | 4;

export const LEVEL_LABELS: Record<InfestationLevel, string> = {
  0: "Sin infestación",
  1: "Leve",
  2: "Moderada",
  3: "Severa",
  4: "Muy severa",
};

export type PhotoAngle = "canopy" | "trunk" | "mixed" | "insufficient";

export type FlagReason =
  | "out_of_bbox"
  | "low_confidence"
  | "non_target_host"
  | "post_treatment_appearance";

/**
 * Resultado del clasificador (estructurado por OpenAI structured outputs).
 * Si `rejection_reason` está presente, no se debe persistir la observación.
 */
export interface ClassificationResult {
  level: InfestationLevel;
  label: string;
  confidence: number; // 0..1
  tree_species: string | null;
  tree_species_common: string | null;
  ai_notes: string | null;
  infestation_active: boolean | null;
  branch_dieback: boolean;
  photo_angle: PhotoAngle;
  has_human_face: boolean;
  rejection_reason: string | null;
  flag_reasons: FlagReason[];
}

/**
 * Payload del cliente para registrar una observación tras confirmar el resultado.
 * El servidor vuelve a validar y rellena `municipality`, `season_window`,
 * `classifier_version`, `model_version`, `ip_hash`.
 */
export interface NewObservationPayload {
  lat: number;
  lng: number;
  accuracy: number | null;
  photoBase64: string; // data URL del cliente, sanitizado en server antes de subir
  classification: ClassificationResult;
}

/**
 * Forma pública de una observación (la que devuelve GET /api/observations).
 * No incluye `ip_hash` ni otros campos sensibles.
 */
export interface PublicObservation {
  id: string;
  created_at: string;
  lat: number;
  lng: number;
  level: InfestationLevel;
  label: string;
  photo_url: string;
  tree_species: string | null;
  tree_species_common: string | null;
  ai_notes: string | null;
  municipality: string | null;
  flagged: boolean;
}
