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
  is_photograph: boolean;
  rejection_reason: string | null;
  flag_reasons: FlagReason[];
}

/**
 * Una foto de una observación, tal como la devuelve `/api/classify` y la
 * vuelve a enviar el cliente al confirmar.
 *
 * `hash` es el sha256 hex de la imagen sanitizada que el modelo vio.
 * `base64` es la misma imagen en base64 sin prefijo data: — el servidor
 * recalcula su hash y verifica la coincidencia (defensa cripto contra
 * sustituciones del cliente).
 */
export interface PhotoPayload {
  base64: string;
  hash: string;
}

/**
 * Payload del cliente para registrar una observación tras confirmar el resultado.
 *
 * El cliente NO envía la classification: la lee el servidor del cache de Redis
 * usando `combinedHash` como llave (sha256 sobre la concatenación de hashes
 * individuales, en el orden en que se subieron). El servidor verifica el hash
 * de cada foto 1:1 y recomputa el combinedHash para que la classification quede
 * atada criptográficamente a las N fotos que el modelo realmente vio.
 *
 * El servidor rellena: `municipality`, `season_window`, `classifier_version`,
 * `model_version`, `ip_hash`, y `human_review_status = "pending"`.
 */
export interface NewObservationPayload {
  lat: number;
  lng: number;
  accuracy: number | null;
  photos: PhotoPayload[]; // 1–3 fotos del mismo árbol
  combinedHash: string; // sha256 hex sobre concat(photos[i].hash)
}

/**
 * Estado de revisión humana para una observación.
 *  - pending: aún no revisada
 *  - accepted: revisor confirmó la etiqueta del modelo
 *  - corrected: revisor cambió la etiqueta (`human_level` tendrá el valor correcto)
 *  - rejected: foto inválida (líquenes, no es heno, fuera de zona, etc.)
 */
export type HumanReviewStatus = "pending" | "accepted" | "corrected" | "rejected";

/**
 * Split de entrenamiento al exportar el dataset etiquetado.
 * Usa la convención de carpetas de Roboflow: train / valid / test.
 */
export type TrainingSplit = "train" | "valid" | "test";

/**
 * Forma de un item en la cola de revisión humana (GET /api/admin/queue).
 * Incluye toda la predicción del modelo más el estado de revisión actual.
 */
export interface ReviewItem {
  id: string;
  created_at: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  photo_urls: string[]; // 1–3 fotos del mismo árbol
  level: InfestationLevel;
  label: string;
  confidence: number | null;
  tree_species: string | null;
  tree_species_common: string | null;
  ai_notes: string | null;
  municipality: string | null;
  flagged: boolean;
  flag_reasons: string[];
  human_review_status: HumanReviewStatus;
  human_level: InfestationLevel | null;
  reviewer_notes: string | null;
  training_split: TrainingSplit | null;
  image_hashes: string[] | null; // paralelo 1:1 con photo_urls
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
  photo_urls: string[]; // 1–3 fotos del mismo árbol
  tree_species: string | null;
  tree_species_common: string | null;
  ai_notes: string | null;
  municipality: string | null;
  flagged: boolean;
}
